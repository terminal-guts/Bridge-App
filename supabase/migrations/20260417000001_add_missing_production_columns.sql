-- ============================================
-- Catch-up migration: columns that exist in production but were
-- missing from the local migration chain.
-- These were added to production via manual ALTER TABLE commands
-- before this migration was created.
-- ============================================

-- profile_completed: one-way gate for the matching pool.
-- Set to true at end of onboarding. Never reverts to false.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- email: stored on user_profiles for quick access (also in auth.users).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- profile-photos storage bucket (needed for photo uploads)
-- Note: this runs as SQL so it won't create the bucket directly.
-- The bucket must be created via the Storage API on first start.
-- See scripts/setup-local.sh or create manually:
--   curl -X POST http://127.0.0.1:54321/storage/v1/bucket \
--     -H "Authorization: Bearer <service_role_key>" \
--     -d '{"id":"profile-photos","name":"profile-photos","public":false}'

-- interested_in_genders on user_preferences (used for matching)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS interested_in_genders TEXT[] DEFAULT '{}';

-- vote_context on proposals (used by community backend for pending decisions)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS vote_context TEXT;

-- partner preference columns on user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_politics TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_drinking TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_cannabis TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_tobacco TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_other_drugs TEXT[] DEFAULT '{}';

COMMENT ON COLUMN user_profiles.profile_completed IS 'One-way gate: set true at onboarding completion, never reverts. Gates the matching pool.';
COMMENT ON COLUMN user_profiles.email IS 'Denormalized from auth.users for quick profile lookups.';
