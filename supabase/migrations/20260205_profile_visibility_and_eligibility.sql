-- Migration: Profile Visibility and Matchmaking Eligibility
-- Adds section visibility, matchmaking eligibility, and extended preference columns

-- ============================================================================
-- 1. Alter profiles table
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS section_visibility JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS matchmaking_eligible BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 2. Alter user_preferences table
-- ============================================================================

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS interested_in_genders TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_ethnicities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_politics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preference_visibility JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS non_negotiables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS partner_drinking TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS partner_cannabis TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS partner_tobacco TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS partner_other_drugs TEXT[] DEFAULT '{}';

-- ============================================================================
-- 3. RPC function: is_matchmaking_eligible
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_matchmaking_eligible(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_prefs RECORD;
  v_photo_count INTEGER;
BEGIN
  -- Fetch profile
  SELECT
    first_name,
    age,
    gender,
    location,
    height_inches,
    is_paused
  INTO v_profile
  FROM public.profiles
  WHERE id = user_uuid;

  -- Profile must exist
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Must not be paused
  IF v_profile.is_paused = TRUE THEN
    RETURN FALSE;
  END IF;

  -- Mandatory profile fields
  IF v_profile.first_name IS NULL OR v_profile.first_name = '' THEN
    RETURN FALSE;
  END IF;

  IF v_profile.age IS NULL OR v_profile.age < 18 THEN
    RETURN FALSE;
  END IF;

  IF v_profile.gender IS NULL OR array_length(v_profile.gender, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_profile.location IS NULL OR v_profile.location = '' THEN
    RETURN FALSE;
  END IF;

  IF v_profile.height_inches IS NULL THEN
    RETURN FALSE;
  END IF;

  -- At least 1 photo
  SELECT COUNT(*) INTO v_photo_count
  FROM public.user_photos
  WHERE user_id = user_uuid;

  IF v_photo_count < 1 THEN
    RETURN FALSE;
  END IF;

  -- Preferences must exist with interested_in_genders
  SELECT interested_in_genders
  INTO v_prefs
  FROM public.user_preferences
  WHERE user_id = user_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_prefs.interested_in_genders IS NULL OR array_length(v_prefs.interested_in_genders, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_matchmaking_eligible(UUID) TO authenticated;
