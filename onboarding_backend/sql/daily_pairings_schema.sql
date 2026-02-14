-- ============================================================================
-- Bridge Daily Pairings Schema
-- 
-- Stores daily user pairings computed from the 12-category scoring grid.
-- Pairings are regenerated each UTC day (at UNIVERSAL_PROPOSAL_RELEASE_HOUR).
--
-- KEY DESIGN DECISIONS:
--   • Each user receives EXACTLY ONE pairing per day.
--   • Pairings are ephemeral — old rows are soft-expired, never hard-deleted.
--   • Existing conversations/matches are NEVER rolled over or disrupted.
--   • The "coordinate" for a user on a given day is their partner_id +
--     the category_scores breakdown, enabling the frontend to render a
--     compatibility radar chart.
-- ============================================================================
-- ============================================================================
-- 1. Daily Pairings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- The date this pairing is active for (UTC date)
    pairing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- The user who receives this pairing
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- The partner they are paired with today
    partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Overall compatibility score (0-100)
    compatibility_score FLOAT NOT NULL DEFAULT 0,
    -- Per-category breakdown (the 12 scoring-grid "coordinates")
    -- Each key maps to a 0-100 score:
    --   age_range, distance, lifestyle_substances, values, interests,
    --   family, religion, politics, height, ethnicity, education, career
    category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Weighted contribution of each category to the total score
    weighted_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Whether the user has seen / interacted with this pairing
    seen BOOLEAN DEFAULT FALSE,
    seen_at TIMESTAMPTZ,
    -- Whether this pairing led to a proposal being created
    proposal_created BOOLEAN DEFAULT FALSE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE
    SET NULL,
        -- Lifecycle
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        -- When this pairing expires (next drop time)
        -- Each user gets exactly ONE pairing per day
        CONSTRAINT unique_user_daily_pairing UNIQUE (user_id, pairing_date),
        -- Prevent self-pairing
        CONSTRAINT no_self_pairing CHECK (user_id <> partner_id)
);
-- ============================================================================
-- 2. Indexes
-- ============================================================================
-- Fast lookup: "What is my pairing for today?"
CREATE INDEX IF NOT EXISTS idx_daily_pairings_user_date ON daily_pairings(user_id, pairing_date);
-- Fast lookup: "Which users were paired with this partner today?"
CREATE INDEX IF NOT EXISTS idx_daily_pairings_partner_date ON daily_pairings(partner_id, pairing_date);
-- Active pairings query (for cleanup / lifecycle)
CREATE INDEX IF NOT EXISTS idx_daily_pairings_date ON daily_pairings(pairing_date);
-- Lookup by score for analytics
CREATE INDEX IF NOT EXISTS idx_daily_pairings_score ON daily_pairings(compatibility_score DESC);
-- ============================================================================
-- 3. RLS Policies
-- ============================================================================
ALTER TABLE daily_pairings ENABLE ROW LEVEL SECURITY;
-- Users can only see their own pairings
DROP POLICY IF EXISTS "Users can view own daily pairings" ON daily_pairings;
CREATE POLICY "Users can view own daily pairings" ON daily_pairings FOR
SELECT USING (user_id = auth.uid());
-- Users can update their own pairings (mark as seen)
DROP POLICY IF EXISTS "Users can update own daily pairings" ON daily_pairings;
CREATE POLICY "Users can update own daily pairings" ON daily_pairings FOR
UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- ============================================================================
-- 4. Pairing History View (for analytics, does not affect conversations)
-- ============================================================================
CREATE OR REPLACE VIEW daily_pairing_stats AS
SELECT pairing_date,
    COUNT(*) AS total_pairings,
    ROUND(AVG(compatibility_score)::numeric, 1) AS avg_score,
    ROUND(MIN(compatibility_score)::numeric, 1) AS min_score,
    ROUND(MAX(compatibility_score)::numeric, 1) AS max_score,
    COUNT(*) FILTER (
        WHERE seen
    ) AS pairings_seen,
    COUNT(*) FILTER (
        WHERE proposal_created
    ) AS proposals_created
FROM daily_pairings
GROUP BY pairing_date
ORDER BY pairing_date DESC;