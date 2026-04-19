-- Migration: Drop 8 dead columns from user_profiles + user_preferences
-- Date: 2026-04-18
-- Status: LOCAL_ONLY (see MIGRATION_LOG.md — do NOT apply to prod without explicit user approval)
--
-- Context: These columns have no code readers/writers after the onboarding
-- simplification v2 cleanup. See docs/plans/onboarding-simplification-v2.md.
--
-- Dropped columns:
--   user_profiles.non_negotiables      — scrapped pre-launch (2026-03-05)
--   user_profiles.matchmaking_only     — superseded by `role` column (2026-04-14)
--   user_profiles.location             — never populated at Rice beta launch
--   user_profiles.latitude             — never populated
--   user_profiles.longitude            — never populated
--   user_profiles.hometown             — never populated
--   user_profiles.profile_photo_path   — legacy; `user_photos` table is source of truth
--   user_preferences.looking_for       — never collected in onboarding (commitment field)

BEGIN;

ALTER TABLE user_profiles DROP COLUMN IF EXISTS non_negotiables;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS matchmaking_only;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS location;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS latitude;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS longitude;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS hometown;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS profile_photo_path;

ALTER TABLE user_preferences DROP COLUMN IF EXISTS looking_for;

COMMIT;
