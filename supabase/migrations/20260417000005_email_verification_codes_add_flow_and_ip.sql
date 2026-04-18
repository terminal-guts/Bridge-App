-- ============================================
-- Migration: 20260417000005_email_verification_codes_add_flow_and_ip.sql
-- Status: LOCAL_ONLY (pre-requisite for email-signup edge function deploy)
-- Type: ADDITIVE
-- ============================================
--
-- The `email-signup` edge function (still LOCAL_ONLY, see EDGE_FUNCTIONS.md)
-- writes two columns that were never added to the table:
--   * flow        — 'signup' | 'login', enforces the guard that a login
--                   code cannot create a new user account
--   * ip_address  — client IP for per-IP rate limiting (5 req / hour)
--
-- Both are required for the function to run. Apply this migration to prod
-- at the same time `email-signup` is deployed. Until then, prod will diff
-- against local on these two columns — that's expected.
-- ============================================

ALTER TABLE email_verification_codes
    ADD COLUMN IF NOT EXISTS flow TEXT NOT NULL DEFAULT 'signup';

ALTER TABLE email_verification_codes
    ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Index to support IP-based rate-limit lookups in email-signup/index.ts:165
CREATE INDEX IF NOT EXISTS idx_evc_ip_created
    ON email_verification_codes (ip_address, created_at);
