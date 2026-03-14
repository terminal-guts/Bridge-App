-- Increase badge message limit from 30 to 50 characters
ALTER TABLE friend_badges DROP CONSTRAINT IF EXISTS friend_badges_message_check;
ALTER TABLE friend_badges ADD CONSTRAINT friend_badges_message_check CHECK (char_length(message) <= 50);

-- Allow any authenticated user to view featured, non-hidden badges
-- (needed for proposal voting screen where community voters aren't necessarily friends)
CREATE POLICY "Anyone can view featured badges"
  ON friend_badges FOR SELECT
  USING (
    is_featured = true
    AND is_hidden = false
  );
