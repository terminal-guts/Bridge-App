-- Add `has_profile` to `get_user_by_email` so the email-signup edge function
-- can distinguish "no profile row at all" from "profile row with
-- profile_completed=false" (e.g. user deleted a photo post-onboarding).
--
-- Rule B: signup is blocked if a `user_profiles` row exists for the email —
-- regardless of completion state — to prevent accidental data overwrite
-- from users re-running onboarding.
--
-- Used by: supabase/functions/email-signup/index.ts
-- Access: service_role only (grants preserved from 20260415000002)

-- Postgres can't change a function's return-row shape in place — drop first.
DROP FUNCTION IF EXISTS get_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  profile_completed BOOLEAN,
  has_profile BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public STABLE AS $$
BEGIN
  RETURN QUERY
    SELECT au.id,
           au.email::TEXT,
           COALESCE(up.profile_completed, FALSE),
           (up.user_id IS NOT NULL)
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON up.user_id = au.id
    WHERE au.email = lower(p_email)
    LIMIT 1;
END; $$;

-- Re-lock (CREATE OR REPLACE can reset grants in some cases)
REVOKE EXECUTE ON FUNCTION get_user_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_by_email(TEXT) FROM authenticated;
