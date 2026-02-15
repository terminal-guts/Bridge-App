CREATE TABLE IF NOT EXISTS daily_pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    compatibility_score FLOAT NOT NULL DEFAULT 0,
    category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    weighted_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    seen BOOLEAN DEFAULT FALSE,
    seen_at TIMESTAMPTZ,
    proposal_created BOOLEAN DEFAULT FALSE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT unique_user_daily_pairing UNIQUE (user_id, pairing_date),
    CONSTRAINT no_self_pairing CHECK (user_id <> partner_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_pairings_user_date ON daily_pairings(user_id, pairing_date);
CREATE INDEX IF NOT EXISTS idx_daily_pairings_partner_date ON daily_pairings(partner_id, pairing_date);
CREATE INDEX IF NOT EXISTS idx_daily_pairings_date ON daily_pairings(pairing_date);
CREATE INDEX IF NOT EXISTS idx_daily_pairings_score ON daily_pairings(compatibility_score DESC);

ALTER TABLE daily_pairings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily pairings" ON daily_pairings;
CREATE POLICY "Users can view own daily pairings"
    ON daily_pairings FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own daily pairings" ON daily_pairings;
CREATE POLICY "Users can update own daily pairings"
    ON daily_pairings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert daily pairings" ON daily_pairings;
CREATE POLICY "Service role can insert daily pairings"
    ON daily_pairings FOR INSERT WITH CHECK (TRUE);
