-- ============================================
-- LOCAL_ONLY: backfill prod-only schema so `supabase db reset` produces
-- a local DB that mirrors production.
-- ============================================
-- Every object added here exists in prod (added via manual ALTER/CREATE
-- outside the migration chain during pre-launch iteration) and is missing
-- from local.  This migration is fully idempotent and is a NO-OP in
-- production.
--
-- Rationale & drift source: snapshots/drift-report-2026-04-18.txt
-- See docs/plans/proposal-gate-overhaul.md §C5 for the ticket.
--
-- Scope:
--  * Enable `citext` extension (kills ~30 A-only noise entries).
--  * Create 4 active tables missing locally (allowed_email_domains,
--    email_unsubscribes, email_verification_codes, waitlist_signups).
--  * Add 10 missing columns on existing tables.
--  * Add 5 missing indexes.
--  * Enable RLS on support_reply_context.
--  * Add handle_updated_at() + set_onboarding_progress_updated_at trigger.
--  * Tighten user_profiles.role NOT NULL.
--
-- Deliberately SKIPPED (tracked in scripts/schema-diff-ignore.json):
--  * `profiles` legacy table (superseded by user_profiles).
--  * `set_profiles_updated_at` trigger (on dead `profiles` table).
--  * `exec_sql` RPC (intentional prod-only admin hook).
--  * `unique_proposal_vote` index (equivalent to local `unique_vote_per_proposal`).

-- --------------------------------------------
-- citext extension (needed for waitlist_signups.email + removes noise)
-- --------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;

-- --------------------------------------------
-- handle_updated_at() — trigger helper used by onboarding_progress
-- --------------------------------------------
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
-- allowed_email_domains
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS allowed_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT allowed_email_domains_domain_key UNIQUE (domain)
);

ALTER TABLE allowed_email_domains ENABLE ROW LEVEL SECURITY;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='allowed_email_domains'
      AND policyname='Anyone can read allowed domains'
  ) THEN
    CREATE POLICY "Anyone can read allowed domains"
      ON allowed_email_domains FOR SELECT
      TO public USING (true);
  END IF;
END
$block$;

-- --------------------------------------------
-- email_unsubscribes
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_unsubscribes_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_unsub_email ON email_unsubscribes(email);

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- email_verification_codes
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  code TEXT DEFAULT ''::text,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  code_hash TEXT,
  used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_user  ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_evc_email_created        ON email_verification_codes(email, created_at);
CREATE INDEX IF NOT EXISTS idx_evc_email_expires        ON email_verification_codes(email, expires_at DESC);

ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='email_verification_codes'
      AND policyname='Users can request verification'
  ) THEN
    CREATE POLICY "Users can request verification"
      ON email_verification_codes FOR INSERT
      TO public WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='email_verification_codes'
      AND policyname='Users can view own verification codes'
  ) THEN
    CREATE POLICY "Users can view own verification codes"
      ON email_verification_codes FOR SELECT
      TO public USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='email_verification_codes'
      AND policyname='Users can update own verification codes'
  ) THEN
    CREATE POLICY "Users can update own verification codes"
      ON email_verification_codes FOR UPDATE
      TO public USING (auth.uid() = user_id);
  END IF;
END
$block$;

-- --------------------------------------------
-- waitlist_signups
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email citext NOT NULL,
  phone TEXT,
  location TEXT,
  source TEXT,
  user_agent TEXT,
  ip INET,
  consent BOOLEAN NOT NULL DEFAULT true,
  token_hash TEXT,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  name TEXT NOT NULL,
  interest_type TEXT,
  student_email TEXT,
  CONSTRAINT waitlist_signups_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS waitlist_signups_confirmed_at_idx
  ON waitlist_signups (confirmed_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS waitlist_signups_created_at_idx
  ON waitlist_signups (created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_signups_email_idx
  ON waitlist_signups (email);
CREATE INDEX IF NOT EXISTS waitlist_signups_interest_type_idx
  ON waitlist_signups (interest_type);
CREATE INDEX IF NOT EXISTS waitlist_signups_phone_idx
  ON waitlist_signups (phone);
CREATE INDEX IF NOT EXISTS waitlist_signups_token_hash_idx
  ON waitlist_signups (token_hash)
  WHERE (token_hash IS NOT NULL AND confirmed_at IS NULL);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='waitlist_signups'
      AND policyname='Service role only insert'
  ) THEN
    CREATE POLICY "Service role only insert"
      ON waitlist_signups FOR INSERT
      TO service_role WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='waitlist_signups'
      AND policyname='Service role select'
  ) THEN
    CREATE POLICY "Service role select"
      ON waitlist_signups FOR SELECT
      TO service_role USING (true);
  END IF;
END
$block$;

-- --------------------------------------------
-- Missing columns on existing tables
-- --------------------------------------------

-- deep_question_answers: 5 columns
ALTER TABLE deep_question_answers ADD COLUMN IF NOT EXISTS answer_text   TEXT;
ALTER TABLE deep_question_answers ADD COLUMN IF NOT EXISTS is_displayed  BOOLEAN DEFAULT true;
ALTER TABLE deep_question_answers ADD COLUMN IF NOT EXISTS question_id   INT;
ALTER TABLE deep_question_answers ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE deep_question_answers ADD COLUMN IF NOT EXISTS tier          INT;

-- user_photos: url column (prod has it alongside photo_url)
ALTER TABLE user_photos ADD COLUMN IF NOT EXISTS url TEXT;

-- user_preferences: 2 columns
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS interested_in_genders        TEXT[] DEFAULT '{}'::text[];
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_lifestyle_preferences JSONB;

-- user_profiles: email_verified_at
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- user_profiles.role: tighten to NOT NULL (prod enforces; local does not)
-- Backfill any existing NULLs first so the constraint succeeds.
UPDATE user_profiles SET role = 'dater' WHERE role IS NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles'
      AND column_name='role' AND is_nullable='YES'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN role SET NOT NULL;
  END IF;
END
$block$;

-- --------------------------------------------
-- Missing indexes on existing tables
-- --------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS deep_question_answers_user_id_question_id_key
  ON deep_question_answers (user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_friends_friend_accepted
  ON friends (friend_id, user_id)
  WHERE status = 'accepted'::text;

CREATE INDEX IF NOT EXISTS idx_friends_user_accepted
  ON friends (user_id, friend_id)
  WHERE status = 'accepted'::text;

CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter_created
  ON proposal_votes (voter_user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email
  ON user_profiles (email)
  WHERE email IS NOT NULL;

-- --------------------------------------------
-- RLS on support_reply_context
-- --------------------------------------------
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='support_reply_context') THEN
    ALTER TABLE support_reply_context ENABLE ROW LEVEL SECURITY;
  END IF;
END
$block$;

-- --------------------------------------------
-- onboarding_progress updated_at trigger (matches prod)
-- --------------------------------------------
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='onboarding_progress') THEN
    DROP TRIGGER IF EXISTS set_onboarding_progress_updated_at ON onboarding_progress;
    CREATE TRIGGER set_onboarding_progress_updated_at
      BEFORE UPDATE ON onboarding_progress
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END
$block$;

-- --------------------------------------------
-- friend_suggestions: expire-own policy (prod has it, local doesn't)
-- --------------------------------------------
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='friend_suggestions')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='friend_suggestions'
         AND policyname='users_can_expire_own_suggestions'
     )
  THEN
    CREATE POLICY "users_can_expire_own_suggestions"
      ON friend_suggestions FOR UPDATE
      TO authenticated
      USING (
        (auth.uid() = suggested_by)
        OR (auth.uid() = user_a_id)
        OR (auth.uid() = user_b_id)
      )
      WITH CHECK (status = 'expired'::text);
  END IF;
END
$block$;

-- --------------------------------------------
-- matches: "Friends can see friend match existence" policy
-- --------------------------------------------
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='matches')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='matches'
         AND policyname='Friends can see friend match existence'
     )
  THEN
    CREATE POLICY "Friends can see friend match existence"
      ON matches FOR SELECT
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM friends f
          WHERE f.user_id = auth.uid()
            AND f.friend_id = ANY (ARRAY[matches.user_id_1, matches.user_id_2])
        )
        OR EXISTS (
          SELECT 1 FROM friends f
          WHERE f.friend_id = auth.uid()
            AND f.user_id = ANY (ARRAY[matches.user_id_1, matches.user_id_2])
        )
      );
  END IF;
END
$block$;

-- --------------------------------------------
-- Comments (searchable marker for drift audits)
-- --------------------------------------------
COMMENT ON TABLE allowed_email_domains    IS 'LOCAL_ALIGN: backfilled by 20260418100001.';
COMMENT ON TABLE email_unsubscribes       IS 'LOCAL_ALIGN: backfilled by 20260418100001.';
COMMENT ON TABLE email_verification_codes IS 'LOCAL_ALIGN: backfilled by 20260418100001.';
COMMENT ON TABLE waitlist_signups         IS 'LOCAL_ALIGN: backfilled by 20260418100001.';
