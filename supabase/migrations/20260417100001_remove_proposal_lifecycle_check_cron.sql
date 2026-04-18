-- ============================================
-- Remove proposal-lifecycle-check (every 4h) cron job
-- ============================================
-- Part of the proposal-gate-overhaul: decisions only happen at the single
-- daily checkpoint (proposal-lifecycle at 0 0 * * *).  The every-4-hour
-- safety-net run is no longer needed — mid-day rules (immediate cancel,
-- rejection floor) have been removed from proposal-lifecycle itself.

SELECT cron.unschedule('proposal-lifecycle-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'proposal-lifecycle-check');
