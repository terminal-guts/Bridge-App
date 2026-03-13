-- ============================================
-- Notification Log — Server-Side Push Tracking
-- ============================================
-- Tracks all push notifications sent to users for:
-- - Daily cap enforcement (3/day Tier 2)
-- - Cooldown enforcement (per type)
-- - Copy variant rotation
-- - Open rate tracking

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,   -- 'match', 'message', 'deciding', 'vote_reminder', etc.
  category TEXT NOT NULL,            -- 'transactional', 'engagement', 'ritual', 'reengagement', 'weekly'
  copy_variant INT DEFAULT 0,        -- which copy rotation was used
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb -- extra context (friend_id, proposal_id, etc.)
);

-- Index for daily cap: count notifications per user per day per category
CREATE INDEX idx_notif_log_user_date_cat
  ON notification_log(user_id, category, sent_at);

-- Index for cooldown: find last notification of a given type for a user
CREATE INDEX idx_notif_log_user_type_sent
  ON notification_log(user_id, notification_type, sent_at DESC);

-- Index for cleanup: delete old logs (keep 90 days)
CREATE INDEX idx_notif_log_sent_at
  ON notification_log(sent_at);

-- RLS: service role only (no client access to notification logs)
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
-- No user-facing policies — users don't read/write this table directly
