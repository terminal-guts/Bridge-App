-- ============================================
-- BRIDGE DATABASE RESTORATION SCRIPT
-- ============================================
-- Run this in the Supabase SQL Editor to create all missing tables.
--
-- EXISTING TABLES (from backup): blocked_users, daily_surveys, friend_codes, friends, messages
-- THIS SCRIPT CREATES: everything else the codebase expects
--
-- Run this as a SINGLE statement in the SQL Editor.
-- ============================================

-- ============================================
-- STEP 0: Extensions & Shared Functions
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable updated_at trigger (used by many tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Second version used by onboarding backend
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- STEP 1: profiles (onboarding backend table)
-- ============================================
-- Used by: Python onboarding backend (main.py), proposal_engine, daily_pairing_engine, scoring

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18),
    gender TEXT[] DEFAULT '{}',
    pronouns TEXT,
    pronouns_list TEXT[] DEFAULT '{}',
    custom_gender TEXT,
    hometown TEXT,
    location TEXT NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    interested_in_genders TEXT[] DEFAULT '{}',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    current_job TEXT,
    company_position TEXT,
    education_level TEXT,
    school TEXT,
    height_inches INTEGER,
    ethnicity TEXT,
    religion TEXT,
    political_leaning TEXT,
    has_children TEXT,
    family_plans TEXT,
    drinking_frequency TEXT,
    cannabis_frequency TEXT,
    tobacco_frequency TEXT,
    other_drugs_frequency TEXT,
    interests TEXT[] DEFAULT '{}',
    "values" TEXT[] DEFAULT '{}',
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- ============================================
-- STEP 2: user_profiles (frontend table)
-- ============================================
-- Used by: profileService, communityBackendService, matchService, friendService, etc.

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identity
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    age INTEGER,
    gender TEXT[] DEFAULT '{}',
    pronouns TEXT,
    pronouns_list TEXT[] DEFAULT '{}',
    custom_gender TEXT,

    -- Dating Preferences
    interested_in_genders TEXT[] DEFAULT '{}',
    custom_interested_in TEXT,

    -- Physical
    height_inches INTEGER,
    ethnicity TEXT,

    -- Location
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    hometown TEXT,

    -- Career & Education
    current_job TEXT,
    company_position TEXT,
    education_level TEXT,
    custom_education_level TEXT,
    school TEXT,

    -- Beliefs
    religion TEXT,
    political_leaning TEXT,
    custom_political_leaning TEXT,

    -- Family
    has_children TEXT,
    family_plans TEXT,

    -- Lifestyle
    drinking_frequency TEXT,
    cannabis_frequency TEXT,
    tobacco_frequency TEXT,
    other_drugs_frequency TEXT,

    -- Content
    interests TEXT[] DEFAULT '{}',
    "values" TEXT[] DEFAULT '{}',
    bio TEXT DEFAULT '',

    -- Photos
    photos JSONB DEFAULT '[]',
    profile_photo_path TEXT,

    -- Contact
    phone_number TEXT,

    -- Matching
    non_negotiables JSONB DEFAULT '[]',

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,

    -- Visibility
    section_visibility JSONB DEFAULT '{}',
    preference_visibility JSONB DEFAULT '{}',

    -- Guide completion tracking
    guide_completions JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_profile UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Production fix: drop FK and make user_id nullable (app uses MD5-derived UUIDs)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE user_profiles ALTER COLUMN user_id DROP NOT NULL;


-- ============================================
-- STEP 3: user_preferences
-- ============================================
-- Used by: profileService, proposal_engine, daily_pairing_engine

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    age_min INTEGER,
    age_max INTEGER,
    looking_for TEXT DEFAULT 'relationship',
    preferred_height_min_inches INTEGER,
    preferred_height_max_inches INTEGER,
    max_distance INTEGER,
    preferred_ethnicities TEXT[] DEFAULT '{}',
    preferred_politics TEXT[] DEFAULT '{}',
    partner_drinking TEXT[] DEFAULT '{}',
    partner_cannabis TEXT[] DEFAULT '{}',
    partner_tobacco TEXT[] DEFAULT '{}',
    partner_other_drugs TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: preferred_gender column intentionally NOT included (dropped by 20260301 migration)


-- ============================================
-- STEP 4: user_photos
-- ============================================
-- Used by: photoService, communityBackendService, proposals router

CREATE TABLE IF NOT EXISTS user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_main ON user_photos(user_id, is_main) WHERE is_main = TRUE;

-- Storage bucket policies for profile-photos
DO $$
BEGIN
    -- Create bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('profile-photos', 'profile-photos', false)
    ON CONFLICT (id) DO NOTHING;
END $$;

CREATE POLICY "Users can upload own photos to storage"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Authenticated users can read profile photos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'profile-photos'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own photos from storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own photos in storage"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );


-- ============================================
-- STEP 5: user_settings
-- ============================================
-- Used by: settingsService, notificationService, accountService

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_settings UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- STEP 6: deep_question_answers
-- ============================================
-- Used by: profileService, developerService, daily_pairing_engine

CREATE TABLE IF NOT EXISTS deep_question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '{}',
    displayed_question_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_deep_questions UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_deep_question_answers_user_id ON deep_question_answers(user_id);

CREATE TRIGGER update_deep_question_answers_updated_at
    BEFORE UPDATE ON deep_question_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- STEP 7: proposals (must come before proposal_votes, endorsements, pool_vote_assignments)
-- ============================================
-- Used by: proposalApiService, communityBackendService, proposal_engine, proposal_lifecycle

CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'deciding', 'rejected', 'expired', 'passed_to_match', 'declined')),
    compatibility_score NUMERIC(5,2),
    category_scores JSONB DEFAULT '{}',
    pool_yes_votes INTEGER DEFAULT 0,
    pool_no_votes INTEGER DEFAULT 0,
    friend_yes_votes INTEGER DEFAULT 0,
    friend_no_votes INTEGER DEFAULT 0,
    pool_eligible BOOLEAN DEFAULT TRUE,
    user_a_decision TEXT DEFAULT 'pending'
        CHECK (user_a_decision IN ('pending', 'accepted', 'declined')),
    user_b_decision TEXT DEFAULT 'pending'
        CHECK (user_b_decision IN ('pending', 'accepted', 'declined')),
    user_a_decided_at TIMESTAMPTZ,
    user_b_decided_at TIMESTAMPTZ,
    voting_started_at TIMESTAMPTZ DEFAULT NOW(),
    voting_expires_at TIMESTAMPTZ,
    community_decided_at TIMESTAMPTZ,
    passed_to_users_at TIMESTAMPTZ,
    decision_deadline_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_proposal_users CHECK (user_a_id <> user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_user_a ON proposals(user_a_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_b ON proposals(user_b_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_voting_expires ON proposals(voting_expires_at);

CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE proposals;


-- ============================================
-- STEP 8: proposal_votes (depends on proposals)
-- ============================================
-- Used by: communityBackendService, proposal_lifecycle, process-vote edge function

CREATE TABLE IF NOT EXISTS proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL
        CHECK (vote_type IN ('YES', 'NO', 'UNSURE', 'RECOMMEND')),
    is_friend_vote BOOLEAN DEFAULT FALSE,
    friend_of UUID REFERENCES auth.users(id),
    recommend_to_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vote_per_proposal UNIQUE (proposal_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter ON proposal_votes(voter_user_id);


-- ============================================
-- STEP 9: matches & match_exits (depends on nothing except auth.users)
-- ============================================
-- Used by: matchService, communityBackendService, process-decision, exit-match

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID NOT NULL
        CONSTRAINT matches_user_id_1_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL
        CONSTRAINT matches_user_id_2_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'active', 'ended', 'expired')),
    community_score NUMERIC(5,2),
    algorithm_score NUMERIC(5,2),
    user_1_decision TEXT DEFAULT 'pending',
    user_2_decision TEXT DEFAULT 'pending',
    proposed_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_match_users CHECK (user_id_1 <> user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_id_1 ON matches(user_id_1);
CREATE INDEX IF NOT EXISTS idx_matches_user_id_2 ON matches(user_id_2);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Match Exits
CREATE TABLE IF NOT EXISTS match_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    exiting_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exit_reason TEXT,
    exit_details TEXT,
    messages_exchanged INTEGER,
    days_since_match INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_exits_match_id ON match_exits(match_id);
CREATE INDEX IF NOT EXISTS idx_match_exits_user ON match_exits(exiting_user_id);

CREATE TRIGGER update_match_exits_updated_at
    BEFORE UPDATE ON match_exits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK from messages.match_id -> matches (messages table already exists from backup)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'messages_match_id_fkey'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT messages_match_id_fkey
            FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
    END IF;
END $$;


-- ============================================
-- STEP 10: endorsements (depends on proposals)
-- ============================================

CREATE TABLE IF NOT EXISTS endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    endorser_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endorsement_type TEXT NOT NULL
        CHECK (endorsement_type IN ('random_matcher', 'friend_of_a', 'friend_of_b', 'friend_of_both')),
    selected_candidate_id UUID REFERENCES auth.users(id),
    endorsement_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_endorsements_proposal ON endorsements(proposal_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_endorser ON endorsements(endorser_user_id);


-- ============================================
-- STEP 11: karma_scores
-- ============================================
-- Used by: profileService, communityBackendService (reads only — nothing writes yet)

CREATE TABLE IF NOT EXISTS karma_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_assists INTEGER DEFAULT 0,
    total_proposals INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    accurate_votes INTEGER DEFAULT 0,
    badge_tier TEXT DEFAULT 'new'
        CHECK (badge_tier IN ('new', 'solid', 'trusted', 'elite')),
    proposal_success_rate NUMERIC(5,2) DEFAULT 0,
    voting_accuracy_rate NUMERIC(5,2) DEFAULT 0,
    slow_mode_active BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_karma UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_karma_scores_user_id ON karma_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_scores_tier ON karma_scores(badge_tier);

CREATE TRIGGER update_karma_scores_updated_at
    BEFORE UPDATE ON karma_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- STEP 12: pool_vote_assignments (depends on proposals)
-- ============================================
-- Used by: generate-proposals, get-proposals-for-voting, process-vote

CREATE TABLE IF NOT EXISTS pool_vote_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    has_voted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pool_assignment UNIQUE (proposal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_assignments_voter_date ON pool_vote_assignments(voter_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_pool_assignments_proposal ON pool_vote_assignments(proposal_id);


-- ============================================
-- STEP 13: friend_grid_completions + streak columns on friends
-- ============================================
-- Used by: record_grid_completion RPC (not yet wired up)

ALTER TABLE friends ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0;
ALTER TABLE friends ADD COLUMN IF NOT EXISTS last_mutual_date DATE;

CREATE TABLE IF NOT EXISTS friend_grid_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_daily_completion UNIQUE (user_id, friend_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_fgc_user_date ON friend_grid_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_fgc_friend_date ON friend_grid_completions(friend_id, completed_date);

-- record_grid_completion RPC
CREATE OR REPLACE FUNCTION record_grid_completion(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS TABLE(new_streak INT, is_mutual BOOLEAN) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_mutual BOOLEAN := FALSE;
    v_prev_streak INT := 0;
    v_last_mutual DATE;
    v_new_streak INT := 0;
BEGIN
    INSERT INTO friend_grid_completions (user_id, friend_id, completed_date)
    VALUES (p_user_id, p_friend_id, v_today)
    ON CONFLICT (user_id, friend_id, completed_date) DO NOTHING;

    SELECT EXISTS (
        SELECT 1 FROM friend_grid_completions
        WHERE user_id = p_friend_id
          AND friend_id = p_user_id
          AND completed_date = v_today
    ) INTO v_mutual;

    IF v_mutual THEN
        SELECT streak_days, last_mutual_date INTO v_prev_streak, v_last_mutual
        FROM friends
        WHERE (user_id = p_user_id AND friend_id = p_friend_id)
        LIMIT 1;

        IF v_last_mutual = v_today THEN
            v_new_streak := COALESCE(v_prev_streak, 0);
        ELSIF v_last_mutual = v_yesterday THEN
            v_new_streak := COALESCE(v_prev_streak, 0) + 1;
        ELSE
            v_new_streak := 1;
        END IF;

        UPDATE friends
        SET streak_days = v_new_streak, last_mutual_date = v_today
        WHERE (user_id = p_user_id AND friend_id = p_friend_id)
           OR (user_id = p_friend_id AND friend_id = p_user_id);
    END IF;

    RETURN QUERY SELECT v_new_streak, v_mutual;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEP 14: onboarding_progress (Python backend)
-- ============================================

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    user_id UUID PRIMARY KEY,
    current_step TEXT NOT NULL DEFAULT 'phone',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Users can manage their own onboarding progress"
    ON public.onboarding_progress
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER set_onboarding_progress_updated_at
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- STEP 15: Proposal enforcement indexes
-- ============================================

-- Permanent pair uniqueness — rejected/declined pairs can NEVER be re-proposed
CREATE UNIQUE INDEX IF NOT EXISTS unique_proposal_pair_permanent
ON proposals (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
WHERE status NOT IN ('expired');

-- Each user can only be in ONE active proposal at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_proposal_per_user_a
ON proposals (user_a_id)
WHERE status IN ('pending', 'deciding');

CREATE UNIQUE INDEX IF NOT EXISTS one_active_proposal_per_user_b
ON proposals (user_b_id)
WHERE status IN ('pending', 'deciding');


-- ============================================
-- STEP 16: DISABLE RLS on all tables (production fix for beta)
-- ============================================

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
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_grid_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_vote_assignments DISABLE ROW LEVEL SECURITY;


-- ============================================
-- STEP 17: Cron scheduling (pg_cron + pg_net)
-- ============================================
-- NOTE: Run this SEPARATELY if it fails — pg_cron may need to be enabled
-- in Supabase Dashboard > Database > Extensions first.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old dead job
SELECT cron.unschedule('generate-daily-surveys')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-surveys');

-- 1. Proposal Lifecycle — 00:00 UTC daily
SELECT cron.unschedule('proposal-lifecycle')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'proposal-lifecycle');

SELECT cron.schedule(
  'proposal-lifecycle',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/proposal-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Generate Proposals — 00:05 UTC daily
SELECT cron.unschedule('generate-proposals')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-proposals');

SELECT cron.schedule(
  'generate-proposals',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/generate-proposals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. Generate Daily Pairings — 00:10 UTC daily
SELECT cron.unschedule('generate-daily-pairings')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-pairings');

SELECT cron.schedule(
  'generate-daily-pairings',
  '10 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/generate-daily-pairings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);


-- ============================================
-- DONE!
-- ============================================
-- After running this, verify with:
--   SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
-- Expected tables (20):
--   blocked_users, daily_surveys, deep_question_answers, endorsements,
--   friend_codes, friend_grid_completions, friends, karma_scores,
--   match_exits, matches, messages, onboarding_progress,
--   pool_vote_assignments, profiles, proposal_votes, proposals,
--   user_photos, user_preferences, user_profiles, user_settings
