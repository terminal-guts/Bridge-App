-- Add sent_to_users_at column to proposals table.
-- Tracks when a confirmed proposal was surfaced to the matched users (user_a and user_b).
-- Nullable: NULL means the proposal has not yet been sent to users.
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS sent_to_users_at TIMESTAMPTZ;
