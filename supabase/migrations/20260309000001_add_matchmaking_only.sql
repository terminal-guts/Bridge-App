-- Add matchmaking_only flag to user_profiles
-- When true, user gets matched but does not participate in pool voting.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS matchmaking_only BOOLEAN DEFAULT FALSE;
