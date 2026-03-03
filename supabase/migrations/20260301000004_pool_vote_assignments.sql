-- ============================================
-- Pool Vote Assignments for Bridge
-- ============================================
-- Tracks which proposals each pool voter is assigned to vote on.
-- Used by Edge Functions: generate-proposals, get-proposals-for-voting, process-vote
--
-- NOTE: Table may already exist from combined_migration.sql — all statements are idempotent.

CREATE TABLE IF NOT EXISTS pool_vote_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    has_voted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pool_assignment UNIQUE (proposal_id, voter_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pool_assignments_voter_date ON pool_vote_assignments(voter_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_pool_assignments_proposal ON pool_vote_assignments(proposal_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE pool_vote_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own pool assignments" ON pool_vote_assignments;
CREATE POLICY "Users can view own pool assignments"
    ON pool_vote_assignments FOR SELECT
    USING (voter_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert pool assignments" ON pool_vote_assignments;
CREATE POLICY "Service role can insert pool assignments"
    ON pool_vote_assignments FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can update own pool assignments" ON pool_vote_assignments;
CREATE POLICY "Users can update own pool assignments"
    ON pool_vote_assignments FOR UPDATE
    USING (voter_id = auth.uid());
