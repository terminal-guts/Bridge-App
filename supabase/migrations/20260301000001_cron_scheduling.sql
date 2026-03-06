-- ============================================
-- Cron Scheduling for Daily Edge Functions
-- ============================================
-- Uses pg_cron + pg_net to trigger Edge Functions on a schedule.
-- All times are in UTC. 7PM Central ≈ 00:00 UTC (CDT) / 01:00 UTC (CST).
--
-- BEFORE RUNNING THIS MIGRATION:
-- 1. Go to Supabase Dashboard → Settings → API → Copy your service_role key
-- 2. Run this SQL first to store the key:
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
-- 3. Then run this migration.
--
-- Schedule (UTC, targeting ~7PM Central):
--   00:00 AM UTC — proposal-lifecycle     (expire old proposals, check thresholds)
--   00:05 AM UTC — generate-proposals     (create new proposals for eligible users)
--   00:10 AM UTC — generate-daily-pairings (daily pairing suggestions)
--
-- DST note: 00:00 UTC = 7PM CDT (Mar-Nov) / 6PM CST (Nov-Mar).
-- Using 00:00 UTC means the cycle runs at 6PM CST during winter. This is acceptable
-- since it's before the 7PM target, not after.
--
-- Note: generate-daily-surveys has been REMOVED (old 3-candidate grid model).

-- Enable required extensions (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- Remove old generate-daily-surveys job (dead code)
-- ============================================
SELECT cron.unschedule('generate-daily-surveys')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-surveys');

-- ============================================
-- 1. Proposal Lifecycle — 00:00 UTC daily (= 7PM CST / 6PM CDT)
--    Runs FIRST to expire/resolve old proposals before new ones are generated.
-- ============================================
SELECT cron.unschedule('proposal-lifecycle')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'proposal-lifecycle');

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
SELECT cron.unschedule('generate-proposals')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-proposals');

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
-- 3. Generate Daily Pairings — REMOVED (not yet implemented)
-- ============================================
SELECT cron.unschedule('generate-daily-pairings')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-pairings');
