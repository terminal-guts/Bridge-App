-- ============================================
-- Migration: 20260417000003_backfill_prod_only_tables.sql
-- Status: PRODUCTION (catch-up for local — tables already exist in prod)
-- Applied: Retroactive — these tables were created directly in prod via
--          exec_sql or Supabase dashboard before any migration was written.
-- Source of truth: snapshots/prod-schema-2026-04-17.json
-- Type: ADDITIVE (idempotent — IF NOT EXISTS on all objects)
-- ============================================
--
-- Purpose: make `supabase db reset` on local produce the same public schema
-- as production. Without this, local is missing 4 real production tables:
--   * profiles              (36 cols — landing / public profile card)
--   * onboarding_progress   (4 cols — per-user onboarding step state)
--   * waitlist_signups      (16 cols — landing-page capture)
--   * allowed_email_domains (5 cols — email-signup domain allowlist)
--
-- Column shapes, indexes, and RLS policies below are a byte-for-byte copy
-- of what exists in the prod dump. If prod changes, update this file and
-- re-run `supabase db reset` locally.
-- ============================================

-- NOTE on extensions:
-- Prod uses `citext` for waitlist_signups.email. The `supabase_admin` role used
-- by `supabase db reset` cannot run `CREATE EXTENSION citext;` (needs pg_read_file).
-- We create the column as TEXT here, then scripts/setup-local.sh runs as the
-- `postgres` superuser after reset to install citext and ALTER the column type.
-- After setup-local.sh finishes, local matches prod exactly (zero drift).
-- uuid-ossp is pre-installed by Supabase; safe to rely on.


-- ============================================
-- profiles — 36 cols
-- NOTE: this table coexists with user_profiles (55 cols).
-- It appears to be a simpler public-profile view used by older code paths.
-- Keep it in sync with prod until we decide whether to deprecate.
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id                      UUID PRIMARY KEY,
    first_name              TEXT NOT NULL,
    last_name               TEXT NOT NULL,
    age                     INTEGER NOT NULL,
    gender                  TEXT[] DEFAULT '{}'::TEXT[],
    pronouns                TEXT,
    pronouns_list           TEXT[] DEFAULT '{}'::TEXT[],
    custom_gender           TEXT,
    hometown                TEXT,
    location                TEXT NOT NULL,
    current_job             TEXT,
    company_position        TEXT,
    education_level         TEXT,
    school                  TEXT,
    height_inches           INTEGER,
    ethnicity               TEXT,
    religion                TEXT,
    political_leaning       TEXT,
    has_children            TEXT,
    family_plans            TEXT,
    drinking_frequency      TEXT,
    cannabis_frequency      TEXT,
    tobacco_frequency       TEXT,
    other_drugs_frequency   TEXT,
    interests               TEXT[] DEFAULT '{}'::TEXT[],
    values                  TEXT[] DEFAULT '{}'::TEXT[],
    bio                     TEXT,
    is_verified             BOOLEAN DEFAULT false,
    is_paused               BOOLEAN DEFAULT false,
    profile_completed       BOOLEAN DEFAULT false,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    last_active_at          TIMESTAMPTZ DEFAULT NOW(),
    latitude                DOUBLE PRECISION,
    longitude               DOUBLE PRECISION,
    interested_in_genders   TEXT[] DEFAULT '{}'::TEXT[]
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone"
            ON profiles FOR SELECT
            USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile"
            ON profiles FOR INSERT
            WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id);
    END IF;
END $$;


-- ============================================
-- onboarding_progress — 4 cols
-- One row per user; tracks current onboarding step + accumulated data.
-- Referenced by the delete_user_account RPC.
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
    user_id         UUID PRIMARY KEY,
    current_step    TEXT NOT NULL DEFAULT 'phone',
    data            JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_progress' AND policyname = 'Users can manage their own onboarding progress') THEN
        CREATE POLICY "Users can manage their own onboarding progress"
            ON onboarding_progress FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;


-- ============================================
-- waitlist_signups — 16 cols
-- Landing-page signup capture (email, phone, consent, etc.).
-- Service-role-only read/write. Uses citext for case-insensitive email.
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist_signups (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email                   TEXT NOT NULL,  -- upgraded to CITEXT post-reset by scripts/setup-local.sh
    phone                   TEXT,
    location                TEXT,
    source                  TEXT,
    user_agent              TEXT,
    ip                      INET,
    consent                 BOOLEAN NOT NULL DEFAULT true,
    token_hash              TEXT,
    confirmation_sent_at    TIMESTAMPTZ,
    confirmed_at            TIMESTAMPTZ,
    token_expires_at        TIMESTAMPTZ,
    name                    TEXT NOT NULL,
    interest_type           TEXT,
    student_email           TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_unique
    ON waitlist_signups (email);
CREATE INDEX IF NOT EXISTS waitlist_signups_email_idx
    ON waitlist_signups (email);
CREATE INDEX IF NOT EXISTS waitlist_signups_created_at_idx
    ON waitlist_signups (created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_signups_confirmed_at_idx
    ON waitlist_signups (confirmed_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS waitlist_signups_interest_type_idx
    ON waitlist_signups (interest_type);
CREATE INDEX IF NOT EXISTS waitlist_signups_phone_idx
    ON waitlist_signups (phone);
CREATE INDEX IF NOT EXISTS waitlist_signups_token_hash_idx
    ON waitlist_signups (token_hash)
    WHERE ((token_hash IS NOT NULL) AND (confirmed_at IS NULL));

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist_signups' AND policyname = 'Service role only insert') THEN
        CREATE POLICY "Service role only insert"
            ON waitlist_signups FOR INSERT
            TO service_role
            WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist_signups' AND policyname = 'Service role select') THEN
        CREATE POLICY "Service role select"
            ON waitlist_signups FOR SELECT
            TO service_role
            USING (true);
    END IF;
END $$;


-- ============================================
-- allowed_email_domains — 5 cols
-- Public allowlist of email domains permitted to sign up
-- (currently rice.edu; extensible as we open to new campuses).
-- ============================================
CREATE TABLE IF NOT EXISTS allowed_email_domains (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain          TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS allowed_email_domains_domain_key
    ON allowed_email_domains (domain);

ALTER TABLE allowed_email_domains ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'allowed_email_domains' AND policyname = 'Anyone can read allowed domains') THEN
        CREATE POLICY "Anyone can read allowed domains"
            ON allowed_email_domains FOR SELECT
            USING (true);
    END IF;
END $$;

-- Seed the primary allowed domain (prod always has rice.edu)
INSERT INTO allowed_email_domains (domain, description, is_active)
VALUES ('rice.edu', 'Rice University beta — primary allowlisted domain', true)
ON CONFLICT (domain) DO NOTHING;
