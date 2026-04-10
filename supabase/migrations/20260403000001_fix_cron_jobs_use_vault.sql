-- ============================================
-- Fix: Cron jobs use vault instead of current_setting
-- ============================================
-- The original cron jobs used current_setting('app.settings.service_role_key', true)
-- which returns NULL in pg_cron context, causing all notification edge functions
-- to receive 'Bearer null' and reject the request.
--
-- Fix: Read service_role_key from vault.decrypted_secrets (same approach as
-- the trigger fix in 20260312000015_fix_notification_triggers_vault.sql).

-- Remove stale versions
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'notify-streak-at-risk',
  'notify-anticipation',
  'notify-vote-reminder',
  'notify-morning-leaderboard',
  'notify-dormant-users',
  'notify-match-expiring',
  'notify-ice-breaker'
);

-- 1. Streak at Risk — 23:00 UTC (6 PM Central)
SELECT cron.schedule(
  'notify-streak-at-risk',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-streak-at-risk',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Pre-Drop Anticipation — 23:55 UTC (6:55 PM Central)
SELECT cron.schedule(
  'notify-anticipation',
  '55 23 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-anticipation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. Vote Reminder — 01:00 UTC (8 PM Central)
SELECT cron.schedule(
  'notify-vote-reminder',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-vote-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. Morning Leaderboard — 13:30 UTC (8:30 AM Central)
SELECT cron.schedule(
  'notify-morning-leaderboard',
  '30 13 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-morning-leaderboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5. Dormant Users — 17:00 UTC (12 PM Central)
SELECT cron.schedule(
  'notify-dormant-users',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-dormant-users',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 6. Match Expiring — every 4 hours
SELECT cron.schedule(
  'notify-match-expiring',
  '30 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-match-expiring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 7. Ice Breaker — every 4 hours (offset from match-expiring)
SELECT cron.schedule(
  'notify-ice-breaker',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-ice-breaker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
