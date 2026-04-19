-- ============================================
-- Migration: 20260417000005_email_verification_codes_add_ip.sql
-- Status: LOCAL_ONLY (pre-requisite for email-signup edge function deploy)
-- Type: ADDITIVE
-- ============================================
--
-- The `email-signup` edge function (still LOCAL_ONLY, see EDGE_FUNCTIONS.md)
-- writes one column that was never added to the table:
--   * ip_address  — client IP for per-IP rate limiting (60 req / hour)
--
-- Apply this migration to prod at the same time `email-signup` is deployed.
-- Until then, prod will diff against local on this one column — expected.
--
-- NOTE: an earlier version of this migration also added a `flow` TEXT
-- column for signup-vs-login code differentiation. That was dropped
-- 2026-04-19 — the verify-side cross-check was belt-and-suspenders with
-- negligible security benefit, and the send-side distinction lives
-- entirely in memory now. If the flow column was already added locally
-- by an earlier run of this migration, it's harmless (vestigial, not
-- referenced by the function).
-- ============================================

ALTER TABLE email_verification_codes
    ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Index to support IP-based rate-limit lookups in email-signup/index.ts
CREATE INDEX IF NOT EXISTS idx_evc_ip_created
    ON email_verification_codes (ip_address, created_at);
