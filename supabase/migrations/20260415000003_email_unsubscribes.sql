-- Track email unsubscribe preferences for deliverability compliance.
-- Used by: supabase/functions/email-unsubscribe/index.ts
-- Note: Bridge verification codes are transactional (user-requested), so
-- unsubscribing won't block codes the user explicitly requests. This table
-- exists primarily to support List-Unsubscribe headers for sender reputation.

CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unsub_email ON email_unsubscribes (email);

-- RLS enabled, no policies = service_role only access
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
