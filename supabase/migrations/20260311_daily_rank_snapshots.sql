-- ============================================
-- Daily Rank Snapshots for Rank Change Arrows
-- ============================================

-- 1. Table: karma_rank_snapshots
-- Stores each user's leaderboard rank at each 7PM Central cycle.
CREATE TABLE IF NOT EXISTS karma_rank_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date date NOT NULL,  -- The date (Central time) this snapshot was taken
    rank integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, snapshot_date)
);

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_karma_rank_snap_date_user
ON karma_rank_snapshots(snapshot_date, user_id);

-- 3. RLS
ALTER TABLE karma_rank_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rank snapshots"
ON karma_rank_snapshots FOR SELECT
TO authenticated
USING (true);

-- 4. Function: snapshot_daily_ranks()
-- Called by the 7PM cron (proposal-lifecycle). Snapshots current leaderboard ranks.
-- Idempotent: ON CONFLICT DO NOTHING.
CREATE OR REPLACE FUNCTION snapshot_daily_ranks()
RETURNS json AS $$
DECLARE
    v_today date;
    v_week_start timestamptz;
    v_count integer;
BEGIN
    v_today := (now() AT TIME ZONE 'America/Chicago')::date;
    v_week_start := get_current_week_start();

    INSERT INTO karma_rank_snapshots (user_id, snapshot_date, rank)
    SELECT
        sub.user_id,
        v_today,
        sub.rnk::integer
    FROM (
        SELECT
            ks.user_id,
            RANK() OVER (
                ORDER BY (ks.karma_points - COALESCE(kws.karma_at_start, 0)) DESC,
                         up.first_name ASC
            ) as rnk
        FROM karma_scores ks
        JOIN user_profiles up ON ks.user_id = up.user_id
        LEFT JOIN karma_weekly_snapshots kws
            ON ks.user_id = kws.user_id AND kws.week_start = v_week_start
    ) sub
    ON CONFLICT (user_id, snapshot_date) DO UPDATE
        SET rank = EXCLUDED.rank;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'snapshot_date', v_today,
        'rows_upserted', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update get_leaderboard_data to include rank_change
-- rank_change = previous_rank - current_rank (positive = moved up, negative = moved down)
-- NOTE: Must DROP first since return type changed (added rank_change column).
DROP FUNCTION IF EXISTS get_leaderboard_data(uuid, integer);

CREATE OR REPLACE FUNCTION get_leaderboard_data(
    p_current_user_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    user_id uuid,
    first_name text,
    weekly_karma integer,
    rank bigint,
    total_participants bigint,
    rank_change integer
) AS $fn$
DECLARE
    v_week_start timestamptz := get_current_week_start();
    v_total bigint;
    v_yesterday date;
BEGIN
    SELECT count(*) INTO v_total FROM karma_scores;
    v_yesterday := ((now() AT TIME ZONE 'America/Chicago')::date - interval '1 day')::date;

    RETURN QUERY
    WITH weekly_stats AS (
        SELECT
            ks.user_id AS ws_user_id,
            up.first_name AS ws_first_name,
            (ks.karma_points - COALESCE(kws.karma_at_start, 0))::integer AS ws_weekly_karma
        FROM karma_scores ks
        JOIN user_profiles up ON ks.user_id = up.user_id
        LEFT JOIN karma_weekly_snapshots kws ON ks.user_id = kws.user_id AND kws.week_start = v_week_start
    ),
    ranked_stats AS (
        SELECT
            ws_user_id,
            ws_first_name,
            ws_weekly_karma,
            RANK() OVER (ORDER BY ws_weekly_karma DESC, ws_first_name ASC) AS rnk
        FROM weekly_stats
    )
    SELECT
        rs.ws_user_id,
        rs.ws_first_name,
        rs.ws_weekly_karma,
        rs.rnk,
        v_total,
        CASE
            WHEN krs.rank IS NOT NULL THEN (krs.rank - rs.rnk::integer)
            ELSE 0
        END::integer AS rank_change
    FROM ranked_stats rs
    LEFT JOIN karma_rank_snapshots krs
        ON rs.ws_user_id = krs.user_id AND krs.snapshot_date = v_yesterday
    WHERE rs.rnk <= p_limit OR rs.ws_user_id = p_current_user_id
    ORDER BY rs.rnk ASC;
END;
$fn$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
