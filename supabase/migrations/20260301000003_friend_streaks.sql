-- ============================================
-- Friend Streaks & Grid Completions — Mar 1 2026
-- ============================================
-- Tracks daily grid completions per friendship direction
-- and maintains streak counters on the friends table.

-- 1. Add streak columns to friends table
ALTER TABLE friends ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0;
ALTER TABLE friends ADD COLUMN IF NOT EXISTS last_mutual_date DATE;

-- 2. Disable RLS on friends for beta (consistent with other tables)
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;

-- 3. Table: friend_grid_completions
-- Records that user_id completed a grid for friend_id on a given date.
CREATE TABLE IF NOT EXISTS friend_grid_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_daily_completion UNIQUE (user_id, friend_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_fgc_user_date ON friend_grid_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_fgc_friend_date ON friend_grid_completions(friend_id, completed_date);

-- Disable RLS for beta
ALTER TABLE friend_grid_completions DISABLE ROW LEVEL SECURITY;

-- 4. RPC: record_grid_completion
-- Called when user A completes a grid for friend B.
-- Inserts the completion record, checks for mutual help today,
-- and updates streaks on both friendship rows.
CREATE OR REPLACE FUNCTION record_grid_completion(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS TABLE(new_streak INT, is_mutual BOOLEAN) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_mutual BOOLEAN := FALSE;
    v_prev_streak INT := 0;
    v_last_mutual DATE;
    v_new_streak INT := 0;
BEGIN
    -- Record that user helped friend today (ignore if already exists)
    INSERT INTO friend_grid_completions (user_id, friend_id, completed_date)
    VALUES (p_user_id, p_friend_id, v_today)
    ON CONFLICT (user_id, friend_id, completed_date) DO NOTHING;

    -- Check if friend also helped user today
    SELECT EXISTS (
        SELECT 1 FROM friend_grid_completions
        WHERE user_id = p_friend_id
          AND friend_id = p_user_id
          AND completed_date = v_today
    ) INTO v_mutual;

    IF v_mutual THEN
        -- Both helped each other today — update streak
        -- Get current streak state from either friendship row
        SELECT streak_days, last_mutual_date INTO v_prev_streak, v_last_mutual
        FROM friends
        WHERE (user_id = p_user_id AND friend_id = p_friend_id)
        LIMIT 1;

        IF v_last_mutual = v_today THEN
            -- Already counted today, no change
            v_new_streak := COALESCE(v_prev_streak, 0);
        ELSIF v_last_mutual = v_yesterday THEN
            -- Consecutive day — increment
            v_new_streak := COALESCE(v_prev_streak, 0) + 1;
        ELSE
            -- Gap or first time — start fresh
            v_new_streak := 1;
        END IF;

        -- Update both friendship rows (bidirectional)
        UPDATE friends
        SET streak_days = v_new_streak, last_mutual_date = v_today
        WHERE (user_id = p_user_id AND friend_id = p_friend_id)
           OR (user_id = p_friend_id AND friend_id = p_user_id);
    END IF;

    RETURN QUERY SELECT v_new_streak, v_mutual;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
