-- ============================================
-- Enable full replica identity on proposals for Realtime
-- ============================================
-- This allows Supabase Realtime to include the full OLD row
-- in UPDATE payloads, which the notification service uses to
-- detect status transitions (e.g. voting → deciding).
ALTER TABLE proposals REPLICA IDENTITY FULL;