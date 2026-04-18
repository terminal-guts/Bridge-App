-- ============================================
-- Local alignment catch-up: profile_completed column
-- ============================================
-- This column exists in PRODUCTION but was added via a manual ALTER
-- statement outside the migration chain.  Local databases created via
-- `supabase db reset` don't have it, which breaks any edge function
-- filtering on `profile_completed` (generate-proposals, proposal-lifecycle,
-- assign-new-user-proposals, etc).
--
-- This migration is IDEMPOTENT and a NO-OP in production.
-- It's deliberately minimal — we only add what the proposal-gate
-- functions need, so this branch stays narrow in scope.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.profile_completed IS 'One-way gate: set true at onboarding completion, never reverts. Gates the matching pool.';
