-- Revoke anon access to check_email_exists to prevent email enumeration.
-- The new email-signup edge function handles account-exists checks server-side
-- with anti-enumeration (returns ok silently, never reveals if email has an account).
-- The old sendOtpToEmail flow that called this RPC is being replaced.

REVOKE EXECUTE ON FUNCTION check_email_exists(TEXT) FROM anon;
