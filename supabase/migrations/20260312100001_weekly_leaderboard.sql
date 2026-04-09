-- ============================================
-- Weekly Karma Leaderboard Infrastructure
-- ============================================

-- 1. SQL Helper Function: get_current_week_start
-- Defined in 20260311_stats_rpc_functions.sql (canonical version with STABLE).
-- DO NOT redefine here — the 20260311 version is authoritative.

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
-- Superseded by 20260311_daily_rank_snapshots.sql which adds rank_change column.
-- DO NOT redefine here — the 20260311 version is authoritative.
