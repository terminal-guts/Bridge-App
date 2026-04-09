-- Support reply context: tracks which user the founder is currently replying to via SMS.
-- Referenced by send-support-message (sets context) and receive-support-reply (reads context).
-- Single-row table (id=1) — acts as a global pointer.

CREATE TABLE IF NOT EXISTS support_reply_context (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    current_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the single row
INSERT INTO support_reply_context (id, current_user_id)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- No RLS — this table is only accessed by edge functions using service_role key.
-- Frontend never touches it. Enabling RLS with no policies would block edge functions
-- that don't use the admin client, but both send-support-message and receive-support-reply
-- use createAdminClient() which bypasses RLS entirely.
