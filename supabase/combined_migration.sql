-- ============================================
-- BRIDGE COMPLETE DATABASE MIGRATION
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================
-- FULLY IDEMPOTENT: Safe to run multiple times.
-- Drops and recreates new tables to ensure correct schema.
-- Preserves existing friend_codes & friends tables.
-- ============================================


-- ============================================================
-- 0a. DROP NEW TABLES (reverse dependency order)
-- ============================================================
-- These tables may exist from partial previous runs with stale schemas.
-- friend_codes & friends are NOT dropped (they have real data).
-- CASCADE handles FK dependencies between dropped tables.
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS karma_scores CASCADE;
DROP TABLE IF EXISTS endorsements CASCADE;
DROP TABLE IF EXISTS proposal_votes CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS match_exits CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS daily_surveys CASCADE;
DROP TABLE IF EXISTS deep_question_answers CASCADE;
DROP TABLE IF EXISTS user_photos CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;


-- ============================================================
-- 0b. REUSABLE TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. FRIEND CODES & FRIENDS
-- ============================================================
CREATE TABLE IF NOT EXISTS friend_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_friend_code UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);

CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    i INT;
BEGIN
    LOOP
        new_code := 'BRIDGE-';
        FOR i IN 1..4 LOOP
            new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        new_code := new_code || '-';
        FOR i IN 1..4 LOOP
            new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        IF NOT EXISTS (SELECT 1 FROM friend_codes WHERE code = new_code) THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user_friend_code()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO friend_codes (user_id, code)
    VALUES (NEW.id, generate_friend_code());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_friend_code ON auth.users;
CREATE TRIGGER on_auth_user_created_friend_code
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_friend_code();

CREATE OR REPLACE FUNCTION add_friend_by_code(friend_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, friend_user_id UUID) AS $$
DECLARE
    current_user_id UUID;
    target_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'You must be logged in to add friends'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    SELECT fc.user_id INTO target_user_id
    FROM friend_codes fc
    WHERE fc.code = UPPER(friend_code);
    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Friend code not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    IF target_user_id = current_user_id THEN
        RETURN QUERY SELECT FALSE, 'You cannot add yourself as a friend'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM friends WHERE user_id = current_user_id AND friend_id = target_user_id) THEN
        RETURN QUERY SELECT FALSE, 'You are already friends with this user'::TEXT, target_user_id;
        RETURN;
    END IF;
    INSERT INTO friends (user_id, friend_id) VALUES (current_user_id, target_user_id);
    INSERT INTO friends (user_id, friend_id) VALUES (target_user_id, current_user_id);
    RETURN QUERY SELECT TRUE, 'Friend added successfully'::TEXT, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE friend_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friend code" ON friend_codes;
CREATE POLICY "Users can view their own friend code"
    ON friend_codes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view friend codes by code" ON friend_codes;
CREATE POLICY "Users can view friend codes by code"
    ON friend_codes FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can view their own friends" ON friends;
CREATE POLICY "Users can view their own friends"
    ON friends FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friends;
CREATE POLICY "Users can delete their own friendships"
    ON friends FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 2. USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    age INTEGER,
    gender TEXT[] DEFAULT '{}',
    pronouns TEXT,
    pronouns_list TEXT[] DEFAULT '{}',
    custom_gender TEXT,
    interested_in_genders TEXT[] DEFAULT '{}',
    custom_interested_in TEXT,
    height_inches INTEGER,
    ethnicity TEXT,
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    hometown TEXT,
    current_job TEXT,
    company_position TEXT,
    education_level TEXT,
    custom_education_level TEXT,
    school TEXT,
    religion TEXT,
    political_leaning TEXT,
    custom_political_leaning TEXT,
    has_children TEXT,
    family_plans TEXT,
    drinking_frequency TEXT,
    cannabis_frequency TEXT,
    tobacco_frequency TEXT,
    other_drugs_frequency TEXT,
    interests TEXT[] DEFAULT '{}',
    "values" TEXT[] DEFAULT '{}',
    bio TEXT DEFAULT '',
    photos JSONB DEFAULT '[]',
    profile_photo_path TEXT,
    phone_number TEXT,
    non_negotiables JSONB DEFAULT '[]',
    is_verified BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    section_visibility JSONB DEFAULT '{}',
    preference_visibility JSONB DEFAULT '{}',
    guide_completions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_profile UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
CREATE POLICY "Authenticated users can read all profiles"
    ON user_profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile"
    ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;
CREATE POLICY "Users can delete their own profile"
    ON user_profiles FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 3. USER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_gender TEXT DEFAULT 'both',
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

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all preferences" ON user_preferences;
CREATE POLICY "Authenticated users can read all preferences"
    ON user_preferences FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create their own preferences" ON user_preferences;
CREATE POLICY "Users can create their own preferences"
    ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
CREATE POLICY "Users can delete their own preferences"
    ON user_preferences FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 4. USER PHOTOS
-- ============================================================
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

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all photos" ON user_photos;
CREATE POLICY "Authenticated users can read all photos"
    ON user_photos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert their own photos" ON user_photos;
CREATE POLICY "Users can insert their own photos"
    ON user_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own photos" ON user_photos;
CREATE POLICY "Users can update their own photos"
    ON user_photos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own photos" ON user_photos;
CREATE POLICY "Users can delete their own photos"
    ON user_photos FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 5. DEEP QUESTION ANSWERS
-- ============================================================
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

DROP TRIGGER IF EXISTS update_deep_question_answers_updated_at ON deep_question_answers;
CREATE TRIGGER update_deep_question_answers_updated_at
    BEFORE UPDATE ON deep_question_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE deep_question_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all deep question answers" ON deep_question_answers;
CREATE POLICY "Authenticated users can read all deep question answers"
    ON deep_question_answers FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create their own deep question answers" ON deep_question_answers;
CREATE POLICY "Users can create their own deep question answers"
    ON deep_question_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own deep question answers" ON deep_question_answers;
CREATE POLICY "Users can update their own deep question answers"
    ON deep_question_answers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own deep question answers" ON deep_question_answers;
CREATE POLICY "Users can delete their own deep question answers"
    ON deep_question_answers FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 6. DAILY SURVEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ranker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL
        CONSTRAINT daily_surveys_recipient_user_id_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,
    candidate_1_user_id UUID NOT NULL
        CONSTRAINT daily_surveys_candidate_1_user_id_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,
    candidate_2_user_id UUID NOT NULL
        CONSTRAINT daily_surveys_candidate_2_user_id_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,
    candidate_3_user_id UUID NOT NULL
        CONSTRAINT daily_surveys_candidate_3_user_id_fkey
        REFERENCES auth.users(id) ON DELETE CASCADE,
    survey_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_surveys_ranker ON daily_surveys(ranker_user_id);
CREATE INDEX IF NOT EXISTS idx_daily_surveys_date ON daily_surveys(survey_date);
CREATE INDEX IF NOT EXISTS idx_daily_surveys_ranker_date ON daily_surveys(ranker_user_id, survey_date);

ALTER TABLE daily_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own surveys" ON daily_surveys;
CREATE POLICY "Users can view their own surveys"
    ON daily_surveys FOR SELECT USING (auth.uid() = ranker_user_id);
DROP POLICY IF EXISTS "Users can update their own surveys" ON daily_surveys;
CREATE POLICY "Users can update their own surveys"
    ON daily_surveys FOR UPDATE USING (auth.uid() = ranker_user_id) WITH CHECK (auth.uid() = ranker_user_id);
DROP POLICY IF EXISTS "Service role can insert surveys" ON daily_surveys;
CREATE POLICY "Service role can insert surveys"
    ON daily_surveys FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Users can delete their own surveys" ON daily_surveys;
CREATE POLICY "Users can delete their own surveys"
    ON daily_surveys FOR DELETE USING (auth.uid() = ranker_user_id);


-- ============================================================
-- 7. MATCHES + MATCH EXITS
-- ============================================================
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

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS update_match_exits_updated_at ON match_exits;
CREATE TRIGGER update_match_exits_updated_at
    BEFORE UPDATE ON match_exits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_exits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
CREATE POLICY "Users can view their own matches"
    ON matches FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
DROP POLICY IF EXISTS "Authenticated users can create matches" ON matches;
CREATE POLICY "Authenticated users can create matches"
    ON matches FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Users can update their own matches" ON matches;
CREATE POLICY "Users can update their own matches"
    ON matches FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
DROP POLICY IF EXISTS "Users can delete their own matches" ON matches;
CREATE POLICY "Users can delete their own matches"
    ON matches FOR DELETE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can view match exits for their matches" ON match_exits;
CREATE POLICY "Users can view match exits for their matches"
    ON match_exits FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id = match_exits.match_id
        AND (auth.uid() = matches.user_id_1 OR auth.uid() = matches.user_id_2)
    ));
DROP POLICY IF EXISTS "Users can create match exits" ON match_exits;
CREATE POLICY "Users can create match exits"
    ON match_exits FOR INSERT WITH CHECK (auth.uid() = exiting_user_id);

-- Safely add matches to realtime (ignore if already added)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 8. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image')),
    content TEXT NOT NULL,
    duration INTEGER,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_msg_users CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_match_sent ON messages(match_id, sent_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;
CREATE POLICY "Users can mark received messages as read"
    ON messages FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

CREATE OR REPLACE FUNCTION mark_messages_as_read(p_match_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages SET read_at = NOW()
    WHERE match_id = p_match_id AND receiver_id = p_user_id AND read_at IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_count(p_match_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER FROM messages
        WHERE match_id = p_match_id AND receiver_id = p_user_id AND read_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely add messages to realtime (ignore if already added)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 9. PROPOSALS
-- ============================================================
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

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read proposals" ON proposals;
CREATE POLICY "Authenticated users can read proposals"
    ON proposals FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can create proposals" ON proposals;
CREATE POLICY "Authenticated users can create proposals"
    ON proposals FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Authenticated users can update proposals" ON proposals;
CREATE POLICY "Authenticated users can update proposals"
    ON proposals FOR UPDATE USING (auth.role() = 'authenticated');

-- Safely add proposals to realtime (ignore if already added)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 10. PROPOSAL VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('YES', 'NO', 'UNSURE', 'RECOMMEND')),
    is_friend_vote BOOLEAN DEFAULT FALSE,
    friend_of UUID REFERENCES auth.users(id),
    recommend_to_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vote_per_proposal UNIQUE (proposal_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter ON proposal_votes(voter_user_id);

ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read votes" ON proposal_votes;
CREATE POLICY "Authenticated users can read votes"
    ON proposal_votes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can cast their own votes" ON proposal_votes;
CREATE POLICY "Users can cast their own votes"
    ON proposal_votes FOR INSERT WITH CHECK (auth.uid() = voter_user_id);


-- ============================================================
-- 11. ENDORSEMENTS
-- ============================================================
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

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read endorsements" ON endorsements;
CREATE POLICY "Authenticated users can read endorsements"
    ON endorsements FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can create endorsements" ON endorsements;
CREATE POLICY "Authenticated users can create endorsements"
    ON endorsements FOR INSERT WITH CHECK (auth.uid() = endorser_user_id);


-- ============================================================
-- 12. KARMA SCORES
-- ============================================================
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

DROP TRIGGER IF EXISTS update_karma_scores_updated_at ON karma_scores;
CREATE TRIGGER update_karma_scores_updated_at
    BEFORE UPDATE ON karma_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE karma_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read karma scores" ON karma_scores;
CREATE POLICY "Authenticated users can read karma scores"
    ON karma_scores FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create their own karma score" ON karma_scores;
CREATE POLICY "Users can create their own karma score"
    ON karma_scores FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Karma scores can be updated" ON karma_scores;
CREATE POLICY "Karma scores can be updated"
    ON karma_scores FOR UPDATE USING (TRUE);


-- ============================================================
-- 13. USER SETTINGS
-- ============================================================
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

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own settings" ON user_settings;
CREATE POLICY "Users can read their own settings"
    ON user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own settings" ON user_settings;
CREATE POLICY "Users can create their own settings"
    ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 14. BLOCKED USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_block UNIQUE (user_id, blocked_user_id),
    CONSTRAINT no_self_block CHECK (user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocked users" ON blocked_users;
CREATE POLICY "Users can view their own blocked users"
    ON blocked_users FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can block other users" ON blocked_users;
CREATE POLICY "Users can block other users"
    ON blocked_users FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unblock other users" ON blocked_users;
CREATE POLICY "Users can unblock other users"
    ON blocked_users FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- DONE! All 15 tables created.
-- ============================================================
-- NEXT STEPS:
-- 1. Go to Storage > New Bucket > "profile-photos" (Private)
-- 2. Run storage_policies.sql after creating the bucket
-- ============================================================
