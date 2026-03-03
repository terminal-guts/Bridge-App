-- ============================================
-- Drop redundant preferred_gender column
-- ============================================
-- gender preference is stored authoritatively in
-- user_profiles.interested_in_genders (TEXT[]).
-- preferred_gender in user_preferences was a
-- simplified TEXT copy that always defaulted to
-- 'both' and was never correctly populated.
-- ============================================

ALTER TABLE user_preferences DROP COLUMN IF EXISTS preferred_gender;
