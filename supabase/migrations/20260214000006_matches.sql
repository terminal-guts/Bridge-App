-- ============================================
-- Matches & Match Exits Schema for Bridge
-- ============================================
-- Active/pending/expired matches between users.
-- Column names from: matchService.ts:69-84, developmentDataService.ts:230-247
-- FK constraint names MUST match matchService.ts join aliases:
--   matches_user_id_1_fkey, matches_user_id_2_fkey

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The two matched users
    user_id_1 UUID NOT NULL
        CONSTRAINT matches_user_id_1_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,

    user_id_2 UUID NOT NULL
        CONSTRAINT matches_user_id_2_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Match status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'active', 'ended', 'expired')),

    -- Scores
    community_score NUMERIC(5,2),
    algorithm_score NUMERIC(5,2),

    -- User decisions
    user_1_decision TEXT DEFAULT 'pending',
    user_2_decision TEXT DEFAULT 'pending',

    -- Key timestamps
    proposed_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT different_match_users CHECK (user_id_1 <> user_id_2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_user_id_1 ON matches(user_id_1);
CREATE INDEX IF NOT EXISTS idx_matches_user_id_2 ON matches(user_id_2);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Match Exits Table
-- ============================================
-- Tracks when/why a user ends a match.
-- Column names from: matchService.ts:75-81

CREATE TABLE IF NOT EXISTS match_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    exiting_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exit_reason TEXT,
    exit_details TEXT,
    messages_exchanged INTEGER,
    days_since_match INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_exits_match_id ON match_exits(match_id);
CREATE INDEX IF NOT EXISTS idx_match_exits_user ON match_exits(exiting_user_id);

-- Auto-update updated_at
CREATE TRIGGER update_match_exits_updated_at
    BEFORE UPDATE ON match_exits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Add FK from messages.match_id to matches
-- ============================================
-- The messages table already exists but match_id has no FK.
-- Add it now that the matches table exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'messages_match_id_fkey'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT messages_match_id_fkey
            FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_exits ENABLE ROW LEVEL SECURITY;

-- Users can view matches they're part of
CREATE POLICY "Users can view their own matches"
    ON matches FOR SELECT
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Insert matches (via service or authenticated users)
CREATE POLICY "Authenticated users can create matches"
    ON matches FOR INSERT
    WITH CHECK (TRUE);

-- Users in the match can update it
CREATE POLICY "Users can update their own matches"
    ON matches FOR UPDATE
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Delete for cleanup
CREATE POLICY "Users can delete their own matches"
    ON matches FOR DELETE
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Match exits policies
CREATE POLICY "Users can view match exits for their matches"
    ON match_exits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = match_exits.match_id
            AND (auth.uid() = matches.user_id_1 OR auth.uid() = matches.user_id_2)
        )
    );

CREATE POLICY "Users can create match exits"
    ON match_exits FOR INSERT
    WITH CHECK (auth.uid() = exiting_user_id);

-- ============================================
-- Enable Realtime for matches
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
