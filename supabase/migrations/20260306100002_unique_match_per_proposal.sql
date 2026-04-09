-- Prevent duplicate matches from the same proposal.
-- Guards against a race condition where both users accept simultaneously
-- and two match rows are created before either transaction commits.

-- First ensure the column exists (may have been added directly on production)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_match_per_proposal
ON matches(proposal_id);
