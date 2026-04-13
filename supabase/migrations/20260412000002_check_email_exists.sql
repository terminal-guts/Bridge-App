-- Check if an email already has an auth account.
-- Used by the signup flow to prevent sending OTP to existing accounts.
-- SECURITY DEFINER allows anon callers to check auth.users (returns boolean only).

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
STABLE
AS $$
BEGIN
  -- Reject obviously invalid input (RFC 5321 max = 320 chars)
  IF p_email IS NULL OR length(p_email) > 320 THEN
    RETURN false;
  END IF;
  RETURN EXISTS(SELECT 1 FROM auth.users WHERE email = lower(p_email));
END;
$$;

-- Allow unauthenticated (anon) callers — signup users have no session
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon;
