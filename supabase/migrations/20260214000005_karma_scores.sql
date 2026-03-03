-- ============================================
-- Karma Scores Schema for Bridge
-- ============================================
-- User reputation tracking for the community matching system.
-- Types from: src/types/community.ts (KarmaScore, KarmaTier)

CREATE TABLE IF NOT EXISTS karma_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Assist tracking
    total_assists INTEGER DEFAULT 0,
    total_proposals INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    accurate_votes INTEGER DEFAULT 0,

    -- Badge tier: new (0), solid (3+), trusted (10+), elite (25+)
    badge_tier TEXT DEFAULT 'new'
        CHECK (badge_tier IN ('new', 'solid', 'trusted', 'elite')),

    -- Rates
    proposal_success_rate NUMERIC(5,2) DEFAULT 0,
    voting_accuracy_rate NUMERIC(5,2) DEFAULT 0,

    -- Slow mode (for inaccurate voters)
    slow_mode_active BOOLEAN DEFAULT FALSE,

    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_karma UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_karma_scores_user_id ON karma_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_scores_tier ON karma_scores(badge_tier);

-- Auto-update updated_at
CREATE TRIGGER update_karma_scores_updated_at
    BEFORE UPDATE ON karma_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE karma_scores ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read karma scores
CREATE POLICY "Authenticated users can read karma scores"
    ON karma_scores FOR SELECT
    USING (auth.role() = 'authenticated');

-- Insert via service or self
CREATE POLICY "Users can create their own karma score"
    ON karma_scores FOR INSERT
    WITH CHECK (TRUE);

-- Update via service
CREATE POLICY "Karma scores can be updated"
    ON karma_scores FOR UPDATE
    USING (TRUE);
