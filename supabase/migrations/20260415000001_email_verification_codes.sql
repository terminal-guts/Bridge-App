-- Email verification codes for the email-signup edge function.
-- Stores hashed OTP codes (never plaintext) with expiry and attempt tracking.
-- Used by: supabase/functions/email-signup/index.ts

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    flow TEXT NOT NULL DEFAULT 'signup',
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    attempts INTEGER NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evc_email_expires ON email_verification_codes (email, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_evc_email_created ON email_verification_codes (email, created_at);
CREATE INDEX IF NOT EXISTS idx_evc_ip_created ON email_verification_codes (ip_address, created_at);

-- RLS enabled, no policies = service_role only access
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
