-- ============================================
-- Proposals Schema for Bridge
-- ============================================
-- Community matching proposals between two users.
-- Types from: src/types/community.ts

CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The two users being proposed
    user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Proposal status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'deciding', 'rejected', 'expired', 'passed_to_match', 'declined')),

    -- Compatibility
    compatibility_score NUMERIC(5,2),
    category_scores JSONB DEFAULT '{}',

    -- Vote tallies (separated by pool and friend)
    pool_yes_votes INTEGER DEFAULT 0,
    pool_no_votes INTEGER DEFAULT 0,
    friend_yes_votes INTEGER DEFAULT 0,
    friend_no_votes INTEGER DEFAULT 0,

    -- Pool eligibility
    pool_eligible BOOLEAN DEFAULT TRUE,

    -- User decisions (after community passes)
    user_a_decision TEXT DEFAULT 'pending'
        CHECK (user_a_decision IN ('pending', 'accepted', 'declined')),
    user_b_decision TEXT DEFAULT 'pending'
        CHECK (user_b_decision IN ('pending', 'accepted', 'declined')),
    user_a_decided_at TIMESTAMPTZ,
    user_b_decided_at TIMESTAMPTZ,

    -- Lifecycle timestamps
    voting_started_at TIMESTAMPTZ DEFAULT NOW(),
    voting_expires_at TIMESTAMPTZ,
    community_decided_at TIMESTAMPTZ,
    passed_to_users_at TIMESTAMPTZ,
    decision_deadline_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT different_proposal_users CHECK (user_a_id <> user_b_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_user_a ON proposals(user_a_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_b ON proposals(user_b_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_voting_expires ON proposals(voting_expires_at);

-- Auto-update updated_at
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read proposals (needed for community voting)
CREATE POLICY "Authenticated users can read proposals"
    ON proposals FOR SELECT
    USING (auth.role() = 'authenticated');

-- Insert proposals
CREATE POLICY "Authenticated users can create proposals"
    ON proposals FOR INSERT
    WITH CHECK (TRUE);

-- Update proposals (vote tallies, status changes)
CREATE POLICY "Authenticated users can update proposals"
    ON proposals FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Enable Realtime for proposals
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
