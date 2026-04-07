-- PENDING MANUAL APPLY: Run the updated INSERT policy via Supabase Dashboard SQL Editor
-- Friend Badges: social validation system
-- Each friend can give one badge to another friend (one per giver-receiver pair)

CREATE TABLE friend_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_giver_profile FOREIGN KEY (giver_id) REFERENCES user_profiles(user_id),
  CONSTRAINT fk_receiver_profile FOREIGN KEY (receiver_id) REFERENCES user_profiles(user_id),
  icon_name TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 30),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_giver_receiver UNIQUE (giver_id, receiver_id),
  CONSTRAINT no_self_badge CHECK (giver_id <> receiver_id)
);

-- Indexes
CREATE INDEX idx_friend_badges_receiver ON friend_badges(receiver_id);
CREATE INDEX idx_friend_badges_giver ON friend_badges(giver_id);
CREATE INDEX idx_friend_badges_featured ON friend_badges(receiver_id) WHERE is_featured = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_friend_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_friend_badges_updated_at
  BEFORE UPDATE ON friend_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_badges_updated_at();

-- Enforce max 3 featured badges per receiver
CREATE OR REPLACE FUNCTION enforce_max_featured_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    IF (SELECT COUNT(*) FROM friend_badges WHERE receiver_id = NEW.receiver_id AND is_featured = true AND id <> NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 featured badges per user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_max_featured_badges
  BEFORE INSERT OR UPDATE ON friend_badges
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_featured_badges();

-- RLS
ALTER TABLE friend_badges ENABLE ROW LEVEL SECURITY;

-- SELECT: own badges (given or received) + non-hidden badges of friends
CREATE POLICY "Users can view own badges"
  ON friend_badges FOR SELECT
  USING (
    receiver_id = auth.uid()
    OR giver_id = auth.uid()
    OR (
      is_hidden = false
      AND EXISTS (
        SELECT 1 FROM friends
        WHERE (user_id = auth.uid() AND friend_id = receiver_id)
           OR (user_id = receiver_id AND friend_id = auth.uid())
      )
    )
  );

-- INSERT: giver must be auth.uid(), and friendship must exist and be accepted
CREATE POLICY "Users can award badges to friends"
  ON friend_badges FOR INSERT
  WITH CHECK (
    giver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM friends
      WHERE (user_id = auth.uid() AND friend_id = receiver_id AND status = 'accepted')
    )
  );

-- UPDATE: giver can edit icon/message, receiver can edit featured/hidden
CREATE POLICY "Giver can update badge content"
  ON friend_badges FOR UPDATE
  USING (giver_id = auth.uid() OR receiver_id = auth.uid());

-- DELETE: giver only
CREATE POLICY "Giver can delete badge"
  ON friend_badges FOR DELETE
  USING (giver_id = auth.uid());
