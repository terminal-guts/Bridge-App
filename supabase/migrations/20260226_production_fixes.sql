-- ============================================
-- Production Fixes — Feb 26 2026
-- ============================================
-- 1. Drop FK constraint on user_profiles.user_id (app uses MD5-derived UUIDs,
--    not real Supabase auth.users entries)
-- 2. Make user_id nullable
-- 3. Disable RLS on all tables for beta launch

-- Fix user_profiles FK constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE user_profiles ALTER COLUMN user_id DROP NOT NULL;

-- Disable RLS on all tables
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_exits DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE deep_question_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements DISABLE ROW LEVEL SECURITY;
ALTER TABLE karma_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
