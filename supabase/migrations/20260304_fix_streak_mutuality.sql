-- ============================================
-- Fix Streak Mutuality — Mar 4 2026
-- ============================================
-- 1. Replace update_friend_streak with mutuality check
-- 2. Drop dead grid-based streak code (superseded by proposal-based streaks)

-- ============================================
-- 1. Fix: update_friend_streak
-- Previously it incremented on ANY one-sided vote. Now it only increments
-- when BOTH friends have voted on each other's active proposals.
-- ============================================

CREATE OR REPLACE FUNCTION update_friend_streak(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_last_mutual DATE;
    v_streak_days INT;
    v_friend_voted BOOLEAN := FALSE;
BEGIN
    -- Check: has p_friend_id voted on p_user_id's active proposal?
    SELECT EXISTS (
        SELECT 1 FROM proposals p
        JOIN proposal_votes pv ON pv.proposal_id = p.id
        WHERE (p.user_a_id = p_user_id OR p.user_b_id = p_user_id)
          AND p.status IN ('pending', 'deciding')
          AND pv.voter_user_id = p_friend_id
    ) INTO v_friend_voted;

    -- If the other friend hasn't voted yet, do nothing.
    -- Their future vote will trigger the mutual check from the other side.
    IF NOT v_friend_voted THEN RETURN; END IF;

    -- Mutual voting confirmed — apply streak logic
    SELECT last_mutual_date, streak_days INTO v_last_mutual, v_streak_days
    FROM friends
    WHERE user_id = p_user_id AND friend_id = p_friend_id
    LIMIT 1;

    IF v_last_mutual = v_today THEN
        -- Already updated today, no-op (prevents double-increment on simultaneous votes)
        RETURN;
    ELSIF v_last_mutual = v_yesterday THEN
        -- Consecutive day — increment
        UPDATE friends
        SET streak_days = COALESCE(v_streak_days, 0) + 1,
            last_mutual_date = v_today,
            streak_frozen = false
        WHERE (user_id = p_user_id AND friend_id = p_friend_id)
           OR (user_id = p_friend_id AND friend_id = p_user_id);
    ELSE
        -- Gap or first time — start/reset to 1
        UPDATE friends
        SET streak_days = 1,
            last_mutual_date = v_today,
            streak_frozen = false
        WHERE (user_id = p_user_id AND friend_id = p_friend_id)
           OR (user_id = p_friend_id AND friend_id = p_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Fix: kill_dead_streaks
-- Previously only checked proposals with status IN ('pending', 'deciding').
-- But proposal-lifecycle runs BEFORE this in the same cron cycle and may
-- have already transitioned proposals to 'rejected'/'expired'/'declined'.
-- Now also checks proposals that were resolved TODAY (same cron run).
-- ============================================

CREATE OR REPLACE FUNCTION kill_dead_streaks()
RETURNS VOID AS $$
BEGIN
    WITH dead_friendships AS (
        SELECT user_id, friend_id
        FROM friends f
        WHERE f.streak_days > 0
          AND f.streak_frozen = false
          AND EXISTS (
            SELECT 1 FROM proposals p
            WHERE (p.user_a_id = f.friend_id OR p.user_b_id = f.friend_id)
              AND (
                -- Still active
                p.status IN ('pending', 'deciding')
                -- OR was resolved today (same cron cycle)
                OR (p.status IN ('rejected', 'expired', 'declined') AND p.updated_at::date = CURRENT_DATE)
              )
              AND NOT EXISTS (
                SELECT 1 FROM proposal_votes pv
                WHERE pv.proposal_id = p.id AND pv.voter_user_id = f.user_id
              )
          )
    )
    UPDATE friends f
    SET streak_days = 0, last_mutual_date = NULL, streak_frozen = false
    FROM dead_friendships df
    WHERE (f.user_id = df.user_id AND f.friend_id = df.friend_id)
       OR (f.user_id = df.friend_id AND f.friend_id = df.user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Fix: freeze_inactive_streaks
-- Same timing issue — also check proposals resolved today so we don't
-- incorrectly freeze when the friend DID have a proposal (just resolved).
-- ============================================

CREATE OR REPLACE FUNCTION freeze_inactive_streaks()
RETURNS VOID AS $$
BEGIN
    UPDATE friends SET streak_frozen = false WHERE streak_frozen = true;

    UPDATE friends f SET streak_frozen = true
    WHERE f.streak_days > 0
      AND (
        -- friend_id had NO proposal at all (not active, not resolved today)
        NOT EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.user_a_id = f.friend_id OR p.user_b_id = f.friend_id)
            AND (
              p.status IN ('pending', 'deciding')
              OR (p.status IN ('rejected', 'expired', 'declined') AND p.updated_at::date = CURRENT_DATE)
            )
        )
        OR
        -- user_id had NO proposal at all (not active, not resolved today)
        NOT EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.user_a_id = f.user_id OR p.user_b_id = f.user_id)
            AND (
              p.status IN ('pending', 'deciding')
              OR (p.status IN ('rejected', 'expired', 'declined') AND p.updated_at::date = CURRENT_DATE)
            )
        )
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Drop dead grid-based streak code
-- record_grid_completion and friend_grid_completions were from the old
-- 3-candidate grid model. Streaks now use proposal_votes directly.
-- ============================================

DROP FUNCTION IF EXISTS record_grid_completion(UUID, UUID);
DROP TABLE IF EXISTS friend_grid_completions;
