-- Look up a user by email with profile completion status.
-- Used by: supabase/functions/email-signup/index.ts (send + verify actions)
-- Access: service_role only (revoked from anon/authenticated to prevent email enumeration)

CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT, profile_completed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public STABLE AS $$
BEGIN
  RETURN QUERY
    SELECT au.id, au.email::TEXT,
           COALESCE(up.profile_completed, FALSE)
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON up.user_id = au.id
    WHERE au.email = lower(p_email)
    LIMIT 1;
END; $$;

-- Lock down access — only service_role can call this
REVOKE EXECUTE ON FUNCTION get_user_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_by_email(TEXT) FROM authenticated;
