-- ============================================
-- Cron Jobs for Notification System V2
-- ============================================
-- Adds server-side push notification edge functions to the cron schedule.
-- All times UTC. 7PM Central = 00:00 UTC (CDT) / 01:00 UTC (CST).
--
-- New jobs:
--   23:00 UTC (6 PM Central) — notify-streak-at-risk
--   23:55 UTC (6:55 PM Central) — notify-anticipation
--   01:00 UTC (8 PM Central) — notify-vote-reminder
--   13:30 UTC (8:30 AM Central) — notify-morning-leaderboard
--   17:00 UTC (12 PM Central) — notify-dormant-users
--   (notify-match-expiring piggybacks on existing 4h lifecycle check)

-- Remove any stale versions of these jobs
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'notify-streak-at-risk',
  'notify-anticipation',
  'notify-vote-reminder',
  'notify-morning-leaderboard',
  'notify-dormant-users',
  'notify-match-expiring'
);

-- ============================================
-- 1. Streak at Risk — 23:00 UTC (6 PM Central)
--    Fires 1 hour before proposal-lifecycle kills streaks.
--    Users with at-risk streaks get a warning push.
-- ============================================
SELECT cron.schedule(
  'notify-streak-at-risk',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-streak-at-risk',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 2. Pre-Drop Anticipation — 23:55 UTC (6:55 PM Central)
--    "New proposals drop in 5 min."
-- ============================================
SELECT cron.schedule(
  'notify-anticipation',
  '55 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-anticipation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 3. Vote Reminder — 01:00 UTC (8 PM Central)
--    "Friend needs your vote." Highest-impact engagement notification.
-- ============================================
SELECT cron.schedule(
  'notify-vote-reminder',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-vote-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 4. Morning Leaderboard — 13:30 UTC (8:30 AM Central)
--    "{leader} is #1 with {karma}. You're {gap} behind."
-- ============================================
SELECT cron.schedule(
  'notify-morning-leaderboard',
  '30 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-morning-leaderboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 5. Dormant Users — 17:00 UTC (12 PM Central)
--    Escalating re-engagement for inactive users.
-- ============================================
SELECT cron.schedule(
  'notify-dormant-users',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-dormant-users',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 6. Match Expiring — every 4 hours
--    Checks deciding proposals 36h+ old.
-- ============================================
SELECT cron.schedule(
  'notify-match-expiring',
  '30 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-match-expiring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
