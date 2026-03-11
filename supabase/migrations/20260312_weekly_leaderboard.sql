-- ============================================
-- Weekly Karma Leaderboard Infrastructure
-- ============================================

-- 1. SQL Helper Function: get_current_week_start
-- Returns the most recent Sunday 7 PM Central Time as timestamptz.
-- Accounts for DST by using 'America/Chicago' timezone.
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS timestamptz AS $$
DECLARE
    v_now_central timestamp;
    v_adjusted_now timestamp;
BEGIN
    -- Get current time in Central
    v_now_central := now() AT TIME ZONE 'America/Chicago';

    -- Subtract 19 hours so that if it's Sunday before 7PM,
    -- we fall back to the previous day (Saturday) for the DOW calculation.
    v_adjusted_now := v_now_central - interval '19 hours';

    -- date_trunc('day', ...) gives us the start of the adjusted day.
    -- Subtracting (DOW * 1 day) takes us back to the most recent Sunday 00:00.
    -- Adding 19 hours takes us to Sunday 19:00 (7 PM).
    RETURN (date_trunc('day', v_adjusted_now)
            - (EXTRACT(DOW FROM v_adjusted_now)::int * interval '1 day')
            + interval '19 hours') AT TIME ZONE 'America/Chicago';
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. New Table: karma_weekly_snapshots
CREATE TABLE IF NOT EXISTS karma_weekly_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start timestamptz NOT NULL,  -- Sunday 7PM Central when this week began
    karma_at_start integer NOT NULL DEFAULT 0,  -- snapshot of karma_points at week start
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start)
);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_karma_weekly_user_week ON karma_weekly_snapshots(week_start, user_id);

-- 4. Row Level Security (RLS)
ALTER TABLE karma_weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own snapshots
CREATE POLICY "Users can view their own snapshots"
ON karma_weekly_snapshots FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to view snapshots for the current week (for leaderboard)
CREATE POLICY "Users can view current week snapshots"
ON karma_weekly_snapshots FOR SELECT
TO authenticated
USING (week_start = get_current_week_start());

-- 5. RPC Function: snapshot_weekly_karma_rpc
-- Idempotently snapshots all users' current karma for the current week.
CREATE OR REPLACE FUNCTION snapshot_weekly_karma_rpc()
RETURNS json AS $$
DECLARE
    v_week_start timestamptz;
    v_count integer;
BEGIN
    v_week_start := get_current_week_start();

    INSERT INTO karma_weekly_snapshots (user_id, week_start, karma_at_start)
    SELECT user_id, v_week_start, karma_points
    FROM karma_scores
    ON CONFLICT (user_id, week_start) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'week_start', v_week_start,
        'rows_inserted', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC Function: get_leaderboard_data
-- Optimized retrieval of leaderboard entries with weekly karma computation.
-- Returns the top N users + the specific requesting user.
CREATE OR REPLACE FUNCTION get_leaderboard_data(
    p_current_user_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    user_id uuid,
    first_name text,
    weekly_karma integer,
    rank bigint,
    total_participants bigint
) AS $$
DECLARE
    v_week_start timestamptz := get_current_week_start();
    v_total bigint;
BEGIN
    -- Total participants count
    SELECT count(*) INTO v_total FROM karma_scores;

    RETURN QUERY
    WITH weekly_stats AS (
        SELECT
            ks.user_id,
            up.first_name,
            -- Weekly karma: current points - snapshot points.
            -- If no snapshot exists (new user who joined mid-week),
            -- we treat their baseline as their current points (0 gain)
            -- as per prompt requirement.
            (ks.karma_points - COALESCE(kws.karma_at_start, ks.karma_points)) as weekly_karma
        FROM karma_scores ks
        JOIN user_profiles up ON ks.user_id = up.user_id
        LEFT JOIN karma_weekly_snapshots kws ON ks.user_id = kws.user_id AND kws.week_start = v_week_start
    ),
    ranked_stats AS (
        SELECT *,
               RANK() OVER (ORDER BY weekly_karma DESC, first_name ASC) as rnk
        FROM weekly_stats
    )
    SELECT
        rs.user_id,
        rs.first_name,
        rs.weekly_karma,
        rs.rnk,
        v_total
    FROM ranked_stats rs
    WHERE rs.rnk <= p_limit OR rs.user_id = p_current_user_id
    ORDER BY rs.rnk ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
