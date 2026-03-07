-- Prevent duplicate matches from the same proposal.
-- Guards against a race condition where both users accept simultaneously
-- and two match rows are created before either transaction commits.
CREATE UNIQUE INDEX IF NOT EXISTS unique_match_per_proposal
ON matches(proposal_id);
