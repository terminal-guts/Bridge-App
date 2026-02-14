-- ============================================
-- Endorsements Schema for Bridge
-- ============================================
-- Support from network members for proposals.
-- Types from: src/types/community.ts (Endorsement, EndorsementType)

CREATE TABLE IF NOT EXISTS endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    endorser_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Endorsement type
    endorsement_type TEXT NOT NULL
        CHECK (endorsement_type IN ('random_matcher', 'friend_of_a', 'friend_of_b', 'friend_of_both')),

    -- The candidate that was selected
    selected_candidate_id UUID REFERENCES auth.users(id),

    -- Reason for endorsement
    endorsement_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_endorsements_proposal ON endorsements(proposal_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_endorser ON endorsements(endorser_user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read endorsements
CREATE POLICY "Authenticated users can read endorsements"
    ON endorsements FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can create endorsements
CREATE POLICY "Authenticated users can create endorsements"
    ON endorsements FOR INSERT
    WITH CHECK (auth.uid() = endorser_user_id);
