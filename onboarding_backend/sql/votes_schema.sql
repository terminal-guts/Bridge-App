-- Create Enum type for votes if it doesn't exist
DO $$ BEGIN
    CREATE TYPE vote_type AS ENUM ('YES', 'NO', 'UNSURE', 'RECOMMEND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table for tracking votes
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store recipient_id for RECOMMEND, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_vote_pair UNIQUE (voter_id, candidate_id)
);

-- Table for Daily Grid (who you see today)
CREATE TABLE IF NOT EXISTS daily_grids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_grid_entry UNIQUE (user_id, candidate_id) 
);

-- Index for faster querying of daily grids
CREATE INDEX IF NOT EXISTS idx_daily_grid_user_date ON daily_grids(user_id, assignment_date);
