-- Friend Recommendations table
-- Stores when a user recommends a person (from a proposal they're viewing) to one of their friends.
-- This does NOT count as a vote. It creates an algorithmic boost so the recommended person
-- is more likely to be proposed to the friend in the future.

CREATE TABLE IF NOT EXISTS friend_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_person_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_to_friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One recommendation per recommender per (person, friend) pair
    UNIQUE (recommender_id, recommended_person_id, recommended_to_friend_id)
);

-- Index for fast lookup during proposal generation
CREATE INDEX idx_friend_recommendations_pair
    ON friend_recommendations (recommended_person_id, recommended_to_friend_id);

-- RLS: only service role should access this table
ALTER TABLE friend_recommendations ENABLE ROW LEVEL SECURITY;
