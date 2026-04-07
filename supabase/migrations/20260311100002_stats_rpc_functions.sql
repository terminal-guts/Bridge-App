-- Stats RPC Functions
-- Deployed via exec_sql on 2026-03-11
-- get_current_week_start: Sunday 7PM Central week boundary helper
-- get_user_stats: Personal stats (all-time + this week with trends)
-- get_campus_stats: Campus-wide stats (all-time + this week)

-- ─── Week Start Helper ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_current_week_start()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_now_central timestamp;
    v_adjusted_now timestamp;
BEGIN
    v_now_central := now() AT TIME ZONE 'America/Chicago';
    v_adjusted_now := v_now_central - interval '19 hours';
    RETURN (date_trunc('day', v_adjusted_now)
            - (EXTRACT(DOW FROM v_adjusted_now)::int * interval '1 day')
            + interval '19 hours') AT TIME ZONE 'America/Chicago';
END;
$function$;

-- ─── User Stats ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
  DECLARE
    v_week_start timestamptz;
    v_prev_week_start timestamptz;
    v_all_time json;
    v_week json;
  BEGIN
    v_week_start := get_current_week_start();
    v_prev_week_start := v_week_start - interval '7 days';

    -- All Time stats
    SELECT json_build_object(
      'couples_set_up', COALESCE(at_couples, 0),
      'total_votes_cast', COALESCE(at_total_votes, 0),
      'accuracy', CASE WHEN COALESCE(at_yes_votes, 0) = 0 THEN 0
                       ELSE ROUND((COALESCE(at_accurate_yes, 0)::numeric / at_yes_votes) * 100) END,
      'yes_rate', CASE WHEN COALESCE(at_total_votes, 0) = 0 THEN 0
                       ELSE ROUND((COALESCE(at_yes_votes, 0)::numeric / at_total_votes) * 100) END,
      'current_streak', COALESCE(at_current_streak, 0),
      'longest_streak', COALESCE(at_current_streak, 0),
      'karma_points', COALESCE(at_karma, 0),
      'assists', COALESCE(at_assists, 0),
      'friends_helped', COALESCE(at_friends_helped, 0),
      'weekly_rank', COALESCE(at_rank, 0),
      'total_users', COALESCE(at_total_users, 0),
      'percentile', CASE WHEN COALESCE(at_total_users, 0) = 0 THEN 50
                         ELSE ROUND((1.0 - (COALESCE(at_rank, 1)::numeric - 1) / GREATEST(at_total_users, 1)) * 100) END,
      'first_assist_date', at_first_assist
    ) INTO v_all_time
    FROM (
      SELECT
        (SELECT count(DISTINCT m.id)
         FROM matches m
         JOIN proposal_votes pv ON pv.proposal_id = m.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES') AS at_couples,
        (SELECT count(*) FROM proposal_votes WHERE voter_user_id = p_user_id) AS at_total_votes,
        (SELECT count(*) FROM proposal_votes WHERE voter_user_id = p_user_id AND vote_type = 'YES') AS at_yes_votes,
        (SELECT count(*)
         FROM proposal_votes pv
         JOIN matches m ON m.proposal_id = pv.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES') AS at_accurate_yes,
        (SELECT GREATEST(
          COALESCE((SELECT MAX(streak_days) FROM friends WHERE user_id = p_user_id), 0),
          COALESCE((SELECT MAX(streak_days) FROM friends WHERE friend_id = p_user_id), 0)
        )) AS at_current_streak,
        (SELECT karma_points FROM karma_scores WHERE user_id = p_user_id) AS at_karma,
        (SELECT total_assists FROM karma_scores WHERE user_id = p_user_id) AS at_assists,
        (SELECT count(DISTINCT
          CASE WHEN p.user_a_id != p_user_id AND p.user_b_id != p_user_id
               THEN p.user_a_id END)
         FROM proposal_votes pv
         JOIN proposals p ON p.id = pv.proposal_id
         WHERE pv.voter_user_id = p_user_id
           AND p.user_a_id != p_user_id AND p.user_b_id != p_user_id) AS at_friends_helped,
        (SELECT r FROM (
          SELECT user_id, ROW_NUMBER() OVER (ORDER BY karma_points DESC) AS r
          FROM karma_scores) ranked WHERE ranked.user_id = p_user_id) AS at_rank,
        (SELECT count(DISTINCT voter_user_id) FROM proposal_votes WHERE created_at >= v_week_start) AS at_total_users,
        (SELECT MIN(m.created_at)
         FROM matches m
         JOIN proposal_votes pv ON pv.proposal_id = m.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES') AS at_first_assist
    ) sub;

    -- This Week stats
    SELECT json_build_object(
      'couples_set_up', COALESCE(wk_couples, 0),
      'total_votes_cast', COALESCE(wk_total_votes, 0),
      'accuracy', CASE WHEN COALESCE(wk_yes_votes, 0) = 0 THEN 0
                       ELSE ROUND((COALESCE(wk_accurate_yes, 0)::numeric / wk_yes_votes) * 100) END,
      'yes_rate', CASE WHEN COALESCE(wk_total_votes, 0) = 0 THEN 0
                       ELSE ROUND((COALESCE(wk_yes_votes, 0)::numeric / wk_total_votes) * 100) END,
      'current_streak', (v_all_time->>'current_streak')::int,
      'longest_streak', (v_all_time->>'longest_streak')::int,
      'karma_points', COALESCE(wk_karma, 0),
      'assists', COALESCE(wk_assists, 0),
      'friends_helped', COALESCE(wk_friends_helped, 0),
      'weekly_rank', (v_all_time->>'weekly_rank')::int,
      'total_users', (v_all_time->>'total_users')::int,
      'percentile', (v_all_time->>'percentile')::int,
      'votes_trend', CASE WHEN COALESCE(prev_votes, 0) = 0 THEN 0
                          ELSE ROUND(((COALESCE(wk_total_votes, 0) - prev_votes)::numeric / GREATEST(prev_votes, 1)) * 100) END,
      'accuracy_trend', 0,
      'karma_trend', CASE WHEN COALESCE(prev_karma, 0) = 0 THEN 0
                          ELSE ROUND(((COALESCE(wk_karma, 0) - prev_karma)::numeric / GREATEST(ABS(prev_karma), 1)) * 100) END,
      'assists_trend', COALESCE(wk_assists, 0) - COALESCE(prev_assists, 0)
    ) INTO v_week
    FROM (
      SELECT
        (SELECT count(DISTINCT m.id)
         FROM matches m
         JOIN proposal_votes pv ON pv.proposal_id = m.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES'
           AND m.created_at >= v_week_start) AS wk_couples,
        (SELECT count(*) FROM proposal_votes
         WHERE voter_user_id = p_user_id AND created_at >= v_week_start) AS wk_total_votes,
        (SELECT count(*) FROM proposal_votes
         WHERE voter_user_id = p_user_id AND vote_type = 'YES' AND created_at >= v_week_start) AS wk_yes_votes,
        (SELECT count(*)
         FROM proposal_votes pv
         JOIN matches m ON m.proposal_id = pv.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES'
           AND pv.created_at >= v_week_start) AS wk_accurate_yes,
        -- Weekly karma: current - snapshot at week start
        (SELECT COALESCE(ks.karma_points, 0) - COALESCE(kws.karma_at_start, 0)
         FROM karma_scores ks
         LEFT JOIN karma_weekly_snapshots kws ON kws.user_id = ks.user_id AND kws.week_start = v_week_start
         WHERE ks.user_id = p_user_id) AS wk_karma,
        -- Weekly assists: approximate from matches created this week
        (SELECT count(DISTINCT m.id)
         FROM matches m
         JOIN proposal_votes pv ON pv.proposal_id = m.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES'
           AND m.created_at >= v_week_start) AS wk_assists,
        (SELECT count(DISTINCT
          CASE WHEN p.user_a_id != p_user_id AND p.user_b_id != p_user_id
               THEN p.user_a_id END)
         FROM proposal_votes pv
         JOIN proposals p ON p.id = pv.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.created_at >= v_week_start
           AND p.user_a_id != p_user_id AND p.user_b_id != p_user_id) AS wk_friends_helped,
        -- Previous week votes
        (SELECT count(*) FROM proposal_votes
         WHERE voter_user_id = p_user_id
           AND created_at >= v_prev_week_start AND created_at < v_week_start) AS prev_votes,
        -- Previous week karma
        (SELECT COALESCE(kws.karma_at_start, 0) - COALESCE(kws_prev.karma_at_start, 0)
         FROM karma_weekly_snapshots kws
         LEFT JOIN karma_weekly_snapshots kws_prev ON kws_prev.user_id = kws.user_id
           AND kws_prev.week_start = v_prev_week_start
         WHERE kws.user_id = p_user_id AND kws.week_start = v_week_start) AS prev_karma,
        -- Previous week assists (approximate)
        (SELECT count(DISTINCT m.id)
         FROM matches m
         JOIN proposal_votes pv ON pv.proposal_id = m.proposal_id
         WHERE pv.voter_user_id = p_user_id AND pv.vote_type = 'YES'
           AND m.created_at >= v_prev_week_start AND m.created_at < v_week_start) AS prev_assists
    ) sub;

    RETURN json_build_object('all_time', v_all_time, 'week', v_week);
  END;
  $function$;

-- ─── Campus Stats ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_campus_stats(p_university text, p_requesting_user_id uuid DEFAULT NULL)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
  DECLARE
    v_week_start timestamptz;
    v_campus_users uuid[];
    v_all_time json;
    v_week json;
  BEGIN
    v_week_start := get_current_week_start();

    -- Collect all user IDs at this campus (match both 'Rice' and 'Rice University' etc)
    SELECT array_agg(user_id) INTO v_campus_users
    FROM user_profiles
    WHERE school IS NOT NULL
      AND (school = p_university OR school ILIKE p_university || '%' OR p_university ILIKE school || '%');

    IF v_campus_users IS NULL THEN
      v_campus_users := ARRAY[]::uuid[];
    END IF;

    -- Always include the requesting user even if their school is null
    IF p_requesting_user_id IS NOT NULL AND NOT (p_requesting_user_id = ANY(v_campus_users)) THEN
      v_campus_users := v_campus_users || p_requesting_user_id;
    END IF;

    -- All Time
    SELECT json_build_object(
      'campus_name', p_university,
      'total_couples_set_up', COALESCE(at_couples, 0),
      'total_votes_cast', COALESCE(at_votes, 0),
      'avg_approval_rate', CASE WHEN COALESCE(at_votes, 0) = 0 THEN 0
                                ELSE ROUND((COALESCE(at_yes, 0)::numeric / at_votes) * 100) END,
      'active_matchmakers', COALESCE(at_active, 0),
      'proposals_this_week', COALESCE(at_proposals_week, 0),
      'top_matchmaker_name', COALESCE(at_top_name, 'None yet'),
      'top_matchmaker_assists', COALESCE(at_top_assists, 0),
      'most_popular_day', COALESCE(at_popular_day, 'N/A'),
      'streak_record', COALESCE(at_streak_record, 0),
      'match_rate', CASE WHEN COALESCE(at_total_proposals, 0) = 0 THEN 0
                         ELSE ROUND((COALESCE(at_matched_proposals, 0)::numeric / at_total_proposals) * 100) END
    ) INTO v_all_time
    FROM (
      SELECT
        (SELECT count(*) FROM matches
         WHERE user_id_1 = ANY(v_campus_users) OR user_id_2 = ANY(v_campus_users)) AS at_couples,
        (SELECT count(*) FROM proposal_votes WHERE voter_user_id = ANY(v_campus_users)) AS at_votes,
        (SELECT count(*) FROM proposal_votes WHERE voter_user_id = ANY(v_campus_users) AND vote_type = 'YES') AS at_yes,
        (SELECT count(DISTINCT voter_user_id) FROM proposal_votes WHERE voter_user_id = ANY(v_campus_users)) AS at_active,
        (SELECT count(*) FROM proposals
         WHERE (user_a_id = ANY(v_campus_users) OR user_b_id = ANY(v_campus_users))
           AND created_at >= v_week_start) AS at_proposals_week,
        (SELECT up.first_name || ' ' || LEFT(up.last_name, 1) || '.'
         FROM karma_scores ks
         JOIN user_profiles up ON up.user_id = ks.user_id
         WHERE ks.user_id = ANY(v_campus_users) AND ks.total_assists > 0
         ORDER BY ks.total_assists DESC LIMIT 1) AS at_top_name,
        (SELECT MAX(total_assists) FROM karma_scores WHERE user_id = ANY(v_campus_users)) AS at_top_assists,
        (SELECT CASE EXTRACT(DOW FROM created_at)
           WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
           WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
           WHEN 6 THEN 'Saturday' END
         FROM proposal_votes
         WHERE voter_user_id = ANY(v_campus_users)
         GROUP BY EXTRACT(DOW FROM created_at)
         ORDER BY count(*) DESC LIMIT 1) AS at_popular_day,
        (SELECT GREATEST(
          COALESCE((SELECT MAX(streak_days) FROM friends WHERE user_id = ANY(v_campus_users)), 0),
          COALESCE((SELECT MAX(streak_days) FROM friends WHERE friend_id = ANY(v_campus_users)), 0)
        )) AS at_streak_record,
        (SELECT count(*) FROM proposals
         WHERE user_a_id = ANY(v_campus_users) OR user_b_id = ANY(v_campus_users)) AS at_total_proposals,
        (SELECT count(DISTINCT m.proposal_id) FROM matches m
         JOIN proposals p ON p.id = m.proposal_id
         WHERE p.user_a_id = ANY(v_campus_users) OR p.user_b_id = ANY(v_campus_users)) AS at_matched_proposals
    ) sub;

    -- This Week
    SELECT json_build_object(
      'campus_name', p_university,
      'total_couples_set_up', COALESCE(wk_couples, 0),
      'total_votes_cast', COALESCE(wk_votes, 0),
      'avg_approval_rate', CASE WHEN COALESCE(wk_votes, 0) = 0 THEN 0
                                ELSE ROUND((COALESCE(wk_yes, 0)::numeric / wk_votes) * 100) END,
      'active_matchmakers', COALESCE(wk_active, 0),
      'proposals_this_week', COALESCE(wk_proposals, 0),
      'top_matchmaker_name', COALESCE(wk_top_name, 'None yet'),
      'top_matchmaker_assists', COALESCE(wk_top_assists, 0),
      'most_popular_day', COALESCE(wk_popular_day, 'N/A'),
      'streak_record', COALESCE(wk_streak_record, 0),
      'match_rate', CASE WHEN COALESCE(wk_proposals, 0) = 0 THEN 0
                         ELSE ROUND((COALESCE(wk_matched, 0)::numeric / wk_proposals) * 100) END
    ) INTO v_week
    FROM (
      SELECT
        (SELECT count(*) FROM matches
         WHERE (user_id_1 = ANY(v_campus_users) OR user_id_2 = ANY(v_campus_users))
           AND created_at >= v_week_start) AS wk_couples,
        (SELECT count(*) FROM proposal_votes
         WHERE voter_user_id = ANY(v_campus_users) AND created_at >= v_week_start) AS wk_votes,
        (SELECT count(*) FROM proposal_votes
         WHERE voter_user_id = ANY(v_campus_users) AND vote_type = 'YES' AND created_at >= v_week_start) AS wk_yes,
        (SELECT count(DISTINCT voter_user_id) FROM proposal_votes
         WHERE voter_user_id = ANY(v_campus_users) AND created_at >= v_week_start) AS wk_active,
        (SELECT CASE EXTRACT(DOW FROM created_at)
           WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
           WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
           WHEN 6 THEN 'Saturday' END
         FROM proposal_votes
         WHERE voter_user_id = ANY(v_campus_users) AND created_at >= v_week_start
         GROUP BY EXTRACT(DOW FROM created_at)
         ORDER BY count(*) DESC LIMIT 1) AS wk_popular_day,
        (SELECT count(*) FROM proposals
         WHERE (user_a_id = ANY(v_campus_users) OR user_b_id = ANY(v_campus_users))
           AND created_at >= v_week_start) AS wk_proposals,
        (SELECT up.first_name || ' ' || LEFT(up.last_name, 1) || '.'
         FROM proposal_votes pv
         JOIN user_profiles up ON up.user_id = pv.voter_user_id
         WHERE pv.voter_user_id = ANY(v_campus_users) AND pv.created_at >= v_week_start
         GROUP BY up.first_name, up.last_name
         ORDER BY count(*) DESC LIMIT 1) AS wk_top_name,
        (SELECT count(*)
         FROM proposal_votes pv
         WHERE pv.voter_user_id = ANY(v_campus_users) AND pv.created_at >= v_week_start
         GROUP BY pv.voter_user_id
         ORDER BY count(*) DESC LIMIT 1) AS wk_top_assists,
        (SELECT GREATEST(
          COALESCE((SELECT MAX(streak_days) FROM friends WHERE user_id = ANY(v_campus_users)), 0),
          COALESCE((SELECT MAX(streak_days) FROM friends WHERE friend_id = ANY(v_campus_users)), 0)
        )) AS wk_streak_record,
        (SELECT count(DISTINCT m.proposal_id) FROM matches m
         JOIN proposals p ON p.id = m.proposal_id
         WHERE (p.user_a_id = ANY(v_campus_users) OR p.user_b_id = ANY(v_campus_users))
           AND m.created_at >= v_week_start) AS wk_matched
    ) sub;

    RETURN json_build_object('all_time', v_all_time, 'week', v_week);
  END;
  $function$;
