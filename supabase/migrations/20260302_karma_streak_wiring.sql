-- ============================================
-- Karma & Streaks Wiring — Mar 2 2026
-- ============================================

-- 1. Karma Scores Table Updates
ALTER TABLE karma_scores ADD COLUMN IF NOT EXISTS karma_points INTEGER DEFAULT 0;

-- Function to increment total_proposals
CREATE OR REPLACE FUNCTION increment_total_proposals(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO karma_scores (user_id, total_proposals)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET total_proposals = karma_scores.total_proposals + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment karma for casting a vote
CREATE OR REPLACE FUNCTION increment_karma_for_vote(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO karma_scores (user_id, total_votes, karma_points)
    VALUES (p_user_id, 1, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET total_votes = karma_scores.total_votes + 1,
        karma_points = karma_scores.karma_points + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE karma_scores ADD COLUMN IF NOT EXISTS total_inaccurate_votes INTEGER DEFAULT 0;

-- Update badge_tier based on karma_points logic
CREATE OR REPLACE FUNCTION compute_karma_tier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.karma_points >= 500 THEN
        NEW.badge_tier := 'elite';
    ELSIF NEW.karma_points >= 150 THEN
        NEW.badge_tier := 'trusted';
    ELSIF NEW.karma_points >= 50 THEN
        NEW.badge_tier := 'solid';
    ELSE
        NEW.badge_tier := 'new';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_karma_tier ON karma_scores;
CREATE TRIGGER trg_compute_karma_tier
    BEFORE INSERT OR UPDATE OF karma_points ON karma_scores
    FOR EACH ROW EXECUTE FUNCTION compute_karma_tier();

-- 2. Proposals Table Updates
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS weighted_yes NUMERIC DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS weighted_no NUMERIC DEFAULT 0;

-- Function to apply karma points based on proposal outcome
CREATE OR REPLACE FUNCTION apply_karma_on_outcome(
    p_proposal_id UUID,
    p_outcome TEXT -- 'passed_to_match' or 'rejected'
)
RETURNS VOID AS $$
DECLARE
    v_proposed_by UUID;
BEGIN
    -- 1. Get proposer
    SELECT proposed_by INTO v_proposed_by FROM proposals WHERE id = p_proposal_id;

    IF p_outcome = 'passed_to_match' THEN
        -- Proposer: +10 points, +1 assist
        IF v_proposed_by IS NOT NULL THEN
            INSERT INTO karma_scores (user_id, karma_points, total_assists)
            VALUES (v_proposed_by, 10, 1)
            ON CONFLICT (user_id) DO UPDATE
            SET karma_points = karma_scores.karma_points + 10,
                total_assists = karma_scores.total_assists + 1,
                updated_at = NOW();
        END IF;

        -- Accurate "yes" voters: +3 points, +1 accurate_vote
        INSERT INTO karma_scores (user_id, karma_points, accurate_votes)
        SELECT voter_user_id, 3, 1
        FROM proposal_votes
        WHERE proposal_id = p_proposal_id AND vote_type = 'YES'
        ON CONFLICT (user_id) DO UPDATE
        SET karma_points = karma_scores.karma_points + 3,
            accurate_votes = karma_scores.accurate_votes + 1,
            updated_at = NOW();

        -- Inaccurate "no" voters: -1 point (floor 0), +1 inaccurate_vote
        INSERT INTO karma_scores (user_id, karma_points, total_inaccurate_votes)
        SELECT voter_user_id, 0, 1
        FROM proposal_votes
        WHERE proposal_id = p_proposal_id AND vote_type = 'NO'
        ON CONFLICT (user_id) DO UPDATE
        SET karma_points = GREATEST(0, karma_scores.karma_points - 1),
            total_inaccurate_votes = karma_scores.total_inaccurate_votes + 1,
            updated_at = NOW();

    ELSIF p_outcome = 'rejected' THEN
        -- Accurate "no" voters: +2 points, +1 accurate_vote
        INSERT INTO karma_scores (user_id, karma_points, accurate_votes)
        SELECT voter_user_id, 2, 1
        FROM proposal_votes
        WHERE proposal_id = p_proposal_id AND vote_type = 'NO'
        ON CONFLICT (user_id) DO UPDATE
        SET karma_points = karma_scores.karma_points + 2,
            accurate_votes = karma_scores.accurate_votes + 1,
            updated_at = NOW();

        -- Inaccurate "yes" voters: -1 point (floor 0), +1 inaccurate_vote
        INSERT INTO karma_scores (user_id, karma_points, total_inaccurate_votes)
        SELECT voter_user_id, 0, 1
        FROM proposal_votes
        WHERE proposal_id = p_proposal_id AND vote_type = 'YES'
        ON CONFLICT (user_id) DO UPDATE
        SET karma_points = GREATEST(0, karma_scores.karma_points - 1),
            total_inaccurate_votes = karma_scores.total_inaccurate_votes + 1,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Friend Streaks Updates
ALTER TABLE friends ADD COLUMN IF NOT EXISTS streak_frozen BOOLEAN DEFAULT FALSE;

-- Function to freeze streaks for inactive friends
CREATE OR REPLACE FUNCTION freeze_inactive_streaks()
RETURNS VOID AS $$
BEGIN
    -- First reset all frozen flags to re-evaluate for the current cycle
    UPDATE friends SET streak_frozen = false WHERE streak_frozen = true;

    -- Freeze streaks where either friend had NO active proposal today
    UPDATE friends f SET streak_frozen = true
    WHERE f.streak_days > 0
      AND (
        NOT EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.user_a_id = f.friend_id OR p.user_b_id = f.friend_id)
            AND p.status IN ('pending', 'deciding')
        )
        OR NOT EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.user_a_id = f.user_id OR p.user_b_id = f.user_id)
            AND p.status IN ('pending', 'deciding')
        )
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to kill dead streaks (Bidirectional to ensure consistency)
CREATE OR REPLACE FUNCTION kill_dead_streaks()
RETURNS VOID AS $$
BEGIN
    -- Identify friendships where at least one person failed to vote when they should have
    WITH dead_friendships AS (
        SELECT user_id, friend_id
        FROM friends f
        WHERE f.streak_days > 0
          AND f.streak_frozen = false
          AND EXISTS (
            SELECT 1 FROM proposals p
            WHERE (p.user_a_id = f.friend_id OR p.user_b_id = f.friend_id)
              AND p.status IN ('pending', 'deciding')
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

-- RPC: update_friend_streak
-- Called when a user votes on a friend's proposal.
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
BEGIN
    -- Get current streak state from one of the friendship rows
    SELECT last_mutual_date, streak_days INTO v_last_mutual, v_streak_days
    FROM friends
    WHERE user_id = p_user_id AND friend_id = p_friend_id
    LIMIT 1;

    IF v_last_mutual = v_today THEN
        -- Already updated today, no-op
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
