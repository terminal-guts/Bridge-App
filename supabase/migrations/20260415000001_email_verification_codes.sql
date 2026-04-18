-- ============================================
-- Migration: 20260415000001_email_verification_codes.sql
-- Status: PRODUCTION
-- Applied: 2026-04-15
-- Type: ADDITIVE
-- ============================================
-- Email verification codes for the email-signup edge function.
-- Stores OTP codes with expiry and attempt tracking.
-- Used by: supabase/functions/email-signup/index.ts
-- ============================================

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT NOT NULL,
    code TEXT DEFAULT ''::text,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    code_hash TEXT,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_evc_email_expires ON email_verification_codes (email, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_evc_email_created ON email_verification_codes (email, created_at);

-- RLS enabled, no policies = service_role only access
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
