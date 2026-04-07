-- Add preferred_religions column to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS preferred_religions TEXT[] DEFAULT '{}';
