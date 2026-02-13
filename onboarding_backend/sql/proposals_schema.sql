-- ============================================================================
-- Bridge Proposals & Voting Schema
-- Supports the full proposal lifecycle: generation → voting → confirmation → user decision
-- ============================================================================

-- ============================================================================
-- 1. Proposal Status Enum
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE proposal_status AS ENUM (
        'voting',        -- Actively receiving pool + friend votes
        'confirmed',     -- Community confirmed, sent to both users for decision
        'rejected',      -- Community rejected (cancelled)
        'expired_sent',  -- 7-day expiry reached, auto-sent to both users
        'accepted',      -- Both users accepted
        'declined'       -- At least one user declined
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Proposals Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The two users being proposed
    user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Lifecycle status
    status proposal_status NOT NULL DEFAULT 'voting',

    -- Compatibility scoring
    compatibility_score FLOAT DEFAULT 0,      -- 0-100 overall score
    category_scores JSONB DEFAULT '{}'::jsonb, -- Per-category breakdown

    -- Vote tallies (denormalized for fast reads)
    pool_yes_votes INTEGER DEFAULT 0,
    pool_no_votes INTEGER DEFAULT 0,
    friend_yes_votes INTEGER DEFAULT 0,
    friend_no_votes INTEGER DEFAULT 0,

    -- Pool eligibility flag
    pool_eligible BOOLEAN DEFAULT TRUE,

    -- User decisions (after confirmed/expired_sent)
    user_a_decision VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'accepted', 'declined'
    user_b_decision VARCHAR(20) DEFAULT 'pending',
    user_a_decided_at TIMESTAMPTZ,
    user_b_decided_at TIMESTAMPTZ,

    -- Lifecycle timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    voting_started_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    sent_to_users_at TIMESTAMPTZ,
    decision_deadline_at TIMESTAMPTZ,  -- 48 hours after sent to users

    -- Enforce user_a_id < user_b_id for pair uniqueness
    CONSTRAINT ensure_proposal_user_order CHECK (user_a_id < user_b_id)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_proposals_user_a ON proposals(user_a_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_b ON proposals(user_b_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_pool_eligible ON proposals(pool_eligible) WHERE pool_eligible = TRUE;

-- ============================================================================
-- 3. Proposal Votes Table
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE proposal_vote_type AS ENUM ('YES', 'NO', 'UNSURE', 'RECOMMEND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type proposal_vote_type NOT NULL,
    is_friend_vote BOOLEAN DEFAULT FALSE,  -- TRUE if voter is friend of user_a or user_b
    friend_of VARCHAR(10),                 -- 'user_a', 'user_b', 'both', or NULL for pool
    recommend_to_id UUID REFERENCES profiles(id), -- For RECOMMEND votes: who to recommend to
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One vote per voter per proposal
    CONSTRAINT unique_proposal_vote UNIQUE (proposal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter ON proposal_votes(voter_id);

-- ============================================================================
-- 4. Pool Vote Assignments (which proposals a user sees for pool voting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pool_vote_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    has_voted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_pool_assignment UNIQUE (proposal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_assignments_voter_date ON pool_vote_assignments(voter_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_pool_assignments_proposal ON pool_vote_assignments(proposal_id);

-- ============================================================================
-- 5. Alter user_preferences to add missing columns (if not exist)
-- ============================================================================
DO $$ BEGIN
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS interested_in_genders TEXT[] DEFAULT '{}';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_ethnicities TEXT[] DEFAULT '{}';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS partner_lifestyle_preferences JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS non_negotiables TEXT[] DEFAULT '{}';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS max_distance INTEGER DEFAULT 50;
EXCEPTION WHEN others THEN null;
END $$;

-- ============================================================================
-- 6. Add last_active_at to profiles for inactivity tracking
-- ============================================================================
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN others THEN null;
END $$;

-- ============================================================================
-- 7. Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS set_proposals_updated_at ON proposals;
CREATE TRIGGER set_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 8. RLS Policies for Proposals
-- ============================================================================
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_vote_assignments ENABLE ROW LEVEL SECURITY;

-- Proposals: users can see proposals they're part of, or that are in voting status
DROP POLICY IF EXISTS "Users can view voting proposals" ON proposals;
CREATE POLICY "Users can view voting proposals"
    ON proposals FOR SELECT
    USING (status = 'voting' OR user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Proposal votes: voters can manage their own votes
DROP POLICY IF EXISTS "Voters can manage own votes" ON proposal_votes;
CREATE POLICY "Voters can manage own votes"
    ON proposal_votes FOR ALL
    USING (voter_id = auth.uid());

-- Pool assignments: users can see their own assignments
DROP POLICY IF EXISTS "Users can view own pool assignments" ON pool_vote_assignments;
CREATE POLICY "Users can view own pool assignments"
    ON pool_vote_assignments FOR SELECT
    USING (voter_id = auth.uid());
