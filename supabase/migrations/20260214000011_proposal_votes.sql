-- ============================================
-- Proposal Votes Schema for Bridge
-- ============================================
-- Individual community votes on proposals.
-- Types from: src/types/community.ts (ProposalVote, ProposalVoteType)

CREATE TABLE IF NOT EXISTS proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Vote type
    vote_type TEXT NOT NULL
        CHECK (vote_type IN ('YES', 'NO', 'UNSURE', 'RECOMMEND')),

    -- Friend vote tracking
    is_friend_vote BOOLEAN DEFAULT FALSE,
    friend_of UUID REFERENCES auth.users(id),

    -- Recommend to specific user
    recommend_to_id UUID REFERENCES auth.users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One vote per person per proposal
    CONSTRAINT unique_vote_per_proposal UNIQUE (proposal_id, voter_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter ON proposal_votes(voter_user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;

-- Users can read votes on proposals
CREATE POLICY "Authenticated users can read votes"
    ON proposal_votes FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can cast their own votes
CREATE POLICY "Users can cast their own votes"
    ON proposal_votes FOR INSERT
    WITH CHECK (auth.uid() = voter_user_id);
