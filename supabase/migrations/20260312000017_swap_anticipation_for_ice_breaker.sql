-- ============================================
-- Swap: Remove anticipation cron, add ice-breaker cron
-- ============================================
-- Anticipation (6:55 PM "proposals drop in 5 min") was the weakest
-- notification — no behavioral hook, competed with streak-at-risk
-- and vote-reminder in the same evening window.
--
-- Ice-breaker fills the match→conversation conversion gap:
-- nudges both users if a match has zero messages after 18+ hours.

-- Remove anticipation cron job
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'notify-anticipation';

-- Add ice-breaker cron — every 4 hours (same cadence as match-expiring)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'notify-ice-breaker';

SELECT cron.schedule(
  'notify-ice-breaker',
  '15 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/notify-ice-breaker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
