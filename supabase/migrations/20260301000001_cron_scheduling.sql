-- ============================================
-- Cron Scheduling for Daily Edge Functions
-- ============================================
-- Uses pg_cron + pg_net to trigger Edge Functions on a schedule.
-- All times are in UTC. 7PM Central ≈ 00:00 UTC (CDT) / 01:00 UTC (CST).
--
-- IMPORTANT: The service_role key is read from DB config at runtime via
-- current_setting('app.settings.service_role_key'). If the key is ever
-- rotated in the Supabase Dashboard, update it with:
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'new-key-here';
--
-- Schedule (UTC, targeting ~7PM Central):
--   00:00 AM UTC daily  — proposal-lifecycle       (expire old proposals, check thresholds)
--   00:05 AM UTC daily  — generate-proposals       (create new proposals for eligible users)
--   Every 4h            — proposal-lifecycle-check  (safety net, same as lifecycle)
--   00:00 AM UTC Monday — snapshot-weekly-karma    (snapshot karma baselines, then chains send-weekly-summary)
--
-- DST note: 00:00 UTC = 7PM CDT (Mar-Nov) / 6PM CST (Nov-Mar).
-- Using 00:00 UTC means the cycle runs at 6PM CST during winter. This is acceptable
-- since it's before the 7PM target, not after.

-- Enable required extensions (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- Remove any stale jobs before re-creating
-- ============================================
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'proposal-lifecycle',
  'generate-proposals',
  'proposal-lifecycle-check',
  'snapshot-weekly-karma',
  'generate-daily-surveys',
  'generate-daily-pairings',
  'daily-generate-proposals',
  'daily-generate-pairings'
);

-- ============================================
-- 1. Proposal Lifecycle — 00:00 UTC daily (= 7PM CDT / 6PM CST)
--    Runs FIRST to expire/resolve old proposals before new ones are generated.
-- ============================================
SELECT cron.schedule(
  'proposal-lifecycle',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/proposal-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 2. Generate Proposals — 00:05 UTC daily
--    Runs AFTER lifecycle so expired proposals are cleared first.
-- ============================================
SELECT cron.schedule(
  'generate-proposals',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/generate-proposals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 3. Proposal Lifecycle Check — every 4 hours (safety net)
--    Catches any proposals that need processing between daily runs.
-- ============================================
SELECT cron.schedule(
  'proposal-lifecycle-check',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/proposal-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 4. Snapshot Weekly Karma — Monday 00:00 UTC (= Sunday 7PM Central)
--    Captures karma baselines at start of each leaderboard week.
--    Idempotent — safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================
SELECT cron.schedule(
  'snapshot-weekly-karma',
  '0 0 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/snapshot-weekly-karma',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 5. Weekly Summary Notification
--    NOT a standalone cron — chained from snapshot-weekly-karma to avoid
--    double-send. snapshot-weekly-karma calls send-weekly-summary after
--    completing the karma snapshot. Edge function is deployed separately.
-- ============================================

-- ============================================
-- MANUAL TESTING
-- ============================================
-- To manually trigger the lifecycle:
--   curl -s "https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/proposal-lifecycle" \
--     --header "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--     --header "Content-Type: application/json" -d '{}'
--
-- To manually trigger proposal generation:
--   curl -s "https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/generate-proposals" \
--     --header "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--     --header "Content-Type: application/json" -d '{}'
--
-- To manually trigger weekly summary notification (use ?force=true to bypass day check):
--   curl -s "https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/send-weekly-summary?force=true" \
--     --header "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--     --header "Content-Type: application/json" -d '{}'
--
-- To check cron status:
--   SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
--
-- To check recent cron runs:
--   SELECT jobid, status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
