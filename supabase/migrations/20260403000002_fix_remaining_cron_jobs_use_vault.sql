-- ============================================
-- Fix: Remaining cron jobs use vault instead of hardcoded keys
-- ============================================
-- generate-proposals, proposal-lifecycle, proposal-lifecycle-check,
-- and snapshot-weekly-karma were still using hardcoded service_role_key.
-- Migrated to vault.decrypted_secrets for consistency and security.

-- Remove stale versions
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'generate-proposals',
  'proposal-lifecycle',
  'proposal-lifecycle-check',
  'snapshot-weekly-karma'
);

-- 1. Generate Proposals — midnight UTC
SELECT cron.schedule(
  'generate-proposals',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/generate-proposals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Proposal Lifecycle — 23:55 UTC
SELECT cron.schedule(
  'proposal-lifecycle',
  '55 23 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/proposal-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. Proposal Lifecycle Check — every 4 hours
SELECT cron.schedule(
  'proposal-lifecycle-check',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/proposal-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. Snapshot Weekly Karma — Monday midnight UTC
SELECT cron.schedule(
  'snapshot-weekly-karma',
  '0 0 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/snapshot-weekly-karma',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
