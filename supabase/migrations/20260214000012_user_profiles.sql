-- ============================================
-- User Profiles Schema for Bridge
-- ============================================
-- Core profile table. 6+ frontend services already query this table.
-- Column names must match: developmentDataService.ts, matchService.ts,
-- surveyService.ts, friendService.ts, onboardingMapping.ts

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identity
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    age INTEGER,
    gender TEXT[] DEFAULT '{}',
    pronouns TEXT,
    pronouns_list TEXT[] DEFAULT '{}',
    custom_gender TEXT,

    -- Dating Preferences (who they're interested in)
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

    -- Lifestyle / Substances
    drinking_frequency TEXT,
    cannabis_frequency TEXT,
    tobacco_frequency TEXT,
    other_drugs_frequency TEXT,

    -- Content
    interests TEXT[] DEFAULT '{}',
    "values" TEXT[] DEFAULT '{}',
    bio TEXT DEFAULT '',

    -- Photos (inline JSONB array used by developmentDataService)
    photos JSONB DEFAULT '[]',
    -- Main photo storage path (used by matchService/surveyService formatProfile)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);

-- Auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed for matching, proposals, grids)
CREATE POLICY "Authenticated users can read all profiles"
    ON user_profiles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can create their own profile
CREATE POLICY "Users can create their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
    ON user_profiles FOR DELETE
    USING (auth.uid() = user_id);
