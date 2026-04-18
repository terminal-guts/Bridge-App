-- ============================================
-- Migration: 20260417000004_align_local_with_prod.sql
-- Status: PRODUCTION (catch-up for local — prod already has all of this)
-- Applied: Retroactive
-- Source of truth: snapshots/prod-schema-2026-04-17.json
-- Type: BACKFILL (additive, idempotent)
-- ============================================
--
-- Closes structural drift between prod and local detected via
-- scripts/diff-schemas.py on 2026-04-17:
--   * Missing columns on deep_question_answers, user_photos, user_preferences, user_profiles
--   * Missing indexes on multiple tables
--   * Missing user-level RLS policies on email_verification_codes, friend_suggestions, matches
--   * RLS enabled on support_reply_context (was off locally)
--   * Missing triggers on profiles + onboarding_progress
--   * Missing handle_updated_at() function (trigger target)
--   * Missing exec_sql() function (used by scripts/supabase-exec.sh)
--
-- NOT backfilled (documented prod-only cruft, acceptable drift):
--   49 legacy functions from retired features (old onboarding validation,
--   daily survey/grid system, old proposal/match RPCs). These reference
--   dropped tables and are inert in prod. Safe to leave out of local.
--   If a function above becomes needed, backfill it explicitly.
-- ============================================


-- ============================================
-- 1. Missing columns
-- ============================================

-- deep_question_answers: legacy per-question columns still in prod
ALTER TABLE deep_question_answers
    ADD COLUMN IF NOT EXISTS question_id   INTEGER,
    ADD COLUMN IF NOT EXISTS question_text TEXT,
    ADD COLUMN IF NOT EXISTS answer_text   TEXT,
    ADD COLUMN IF NOT EXISTS tier          INTEGER,
    ADD COLUMN IF NOT EXISTS is_displayed  BOOLEAN DEFAULT true;

-- user_photos.url: denormalized CDN URL, still on the prod row
ALTER TABLE user_photos ADD COLUMN IF NOT EXISTS url TEXT;

-- user_preferences.partner_lifestyle_preferences: legacy jsonb blob
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_lifestyle_preferences JSONB;

-- user_profiles.email_verified_at: denormalized from auth.users for quick filters
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- user_profiles.role: prod is NOT NULL (with default 'dater'); local was NULL-allowed.
UPDATE user_profiles SET role = 'dater' WHERE role IS NULL;
ALTER TABLE user_profiles ALTER COLUMN role SET NOT NULL;


-- ============================================
-- 2. Missing indexes
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS deep_question_answers_user_id_question_id_key
    ON deep_question_answers (user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_email
    ON email_verification_codes (email);

CREATE INDEX IF NOT EXISTS idx_email_verification_user
    ON email_verification_codes (user_id);

CREATE INDEX IF NOT EXISTS idx_friends_friend_accepted
    ON friends (friend_id, user_id)
    WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_friends_user_accepted
    ON friends (user_id, friend_id)
    WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter_created
    ON proposal_votes (voter_user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS unique_proposal_vote
    ON proposal_votes (proposal_id, voter_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS unique_proposal_pair
    ON proposals (user_a_id, user_b_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email
    ON user_profiles (email)
    WHERE email IS NOT NULL;


-- ============================================
-- 3. RLS on support_reply_context (prod: ON, local was OFF)
-- ============================================
ALTER TABLE support_reply_context ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 4. Missing policies
-- ============================================

DO $$
BEGIN
    -- email_verification_codes: user-level INSERT/SELECT/UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_verification_codes' AND policyname = 'Users can request verification') THEN
        CREATE POLICY "Users can request verification"
            ON email_verification_codes FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_verification_codes' AND policyname = 'Users can view own verification codes') THEN
        CREATE POLICY "Users can view own verification codes"
            ON email_verification_codes FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_verification_codes' AND policyname = 'Users can update own verification codes') THEN
        CREATE POLICY "Users can update own verification codes"
            ON email_verification_codes FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    -- friend_suggestions: let participants expire their own suggestions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_suggestions' AND policyname = 'users_can_expire_own_suggestions') THEN
        CREATE POLICY "users_can_expire_own_suggestions"
            ON friend_suggestions FOR UPDATE
            TO authenticated
            USING (auth.uid() = suggested_by OR auth.uid() = user_a_id OR auth.uid() = user_b_id)
            WITH CHECK (status = 'expired');
    END IF;

    -- matches: friends can see match existence between their friends
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Friends can see friend match existence') THEN
        CREATE POLICY "Friends can see friend match existence"
            ON matches FOR SELECT
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
END $$;

-- friend_badges: prod uses TO authenticated on the INSERT policy.
-- Local's version defaults to public. Drop and recreate to match prod exactly.
DROP POLICY IF EXISTS "Users can award badges to friends" ON friend_badges;
CREATE POLICY "Users can award badges to friends"
    ON friend_badges FOR INSERT
    TO authenticated
    WITH CHECK (
        giver_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM friends
            WHERE friends.user_id = auth.uid()
              AND friends.friend_id = friend_badges.receiver_id
              AND friends.status = 'accepted'
        )
    );


-- ============================================
-- 5. handle_updated_at() trigger function + missing triggers
-- Both `profiles` and `onboarding_progress` in prod use this trigger
-- function (a slight variant of update_updated_at_column()). Replicate for
-- parity so local's triggers match prod byte-for-byte.
-- ============================================
CREATE OR REPLACE FUNCTION handle_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER set_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================================
-- 6. exec_sql() — LIVE RPC used by scripts/supabase-exec.sh
-- Not part of the migration chain; added directly to prod.
-- Service-role only (RLS bypass irrelevant — exec_sql executes arbitrary SQL).
-- ============================================
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    EXECUTE sql INTO result;
    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;


-- ============================================
-- 7. get_leaderboard_data volatility: prod is VOLATILE, local was STABLE
-- Fix so EXPLAIN and planner behavior match prod.
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_leaderboard_data'
    ) THEN
        ALTER FUNCTION get_leaderboard_data(uuid, integer) VOLATILE;
    END IF;
END $$;


-- ============================================
-- 8. Drop local-only unique index on proposals (prod doesn't have it)
-- Local's 20260301000006_unique_proposal_pairs.sql creates
-- unique_active_proposal_pair with stricter semantics than prod's
-- unique_proposal_pair_permanent. Drop to match prod.
-- ============================================
DROP INDEX IF EXISTS unique_active_proposal_pair;
