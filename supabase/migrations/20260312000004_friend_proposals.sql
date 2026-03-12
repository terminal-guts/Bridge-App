-- Friend Proposals: track which proposals were created by friends vs algorithm
-- Used by the friend suggestion system (generate-proposals Step 0)

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS creation_type TEXT NOT NULL DEFAULT 'algorithm'
    CHECK (creation_type IN ('algorithm', 'friend_proposal'));

-- Index for looking up proposals created by a specific friend
CREATE INDEX IF NOT EXISTS idx_proposals_created_by
  ON proposals(created_by) WHERE created_by IS NOT NULL;
