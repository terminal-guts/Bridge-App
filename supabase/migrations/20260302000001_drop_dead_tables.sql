-- Drop dead tables from old grid model, endorsements, and daily pairings
DROP TABLE IF EXISTS public.friend_grid_completions CASCADE;
DROP TABLE IF EXISTS public.daily_surveys CASCADE;
DROP TABLE IF EXISTS public.endorsements CASCADE;
DROP TABLE IF EXISTS public.daily_pairings CASCADE;
DROP FUNCTION IF EXISTS public.record_grid_completion CASCADE;
SELECT cron.unschedule('generate-daily-pairings');
