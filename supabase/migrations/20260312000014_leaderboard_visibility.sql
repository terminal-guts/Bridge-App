-- Add leaderboard visibility preference (anonymous by default)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS pref_leaderboard_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_settings.pref_leaderboard_visible IS
  'When true, user''s name and photo appear on the leaderboard to non-friends. Default false (anonymous).';
