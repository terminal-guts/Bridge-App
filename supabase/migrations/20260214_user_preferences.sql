-- ============================================
-- User Preferences Schema for Bridge
-- ============================================
-- Matching preferences, separate from profile data.
-- Column names from: onboardingMapping.ts, developmentDataService.ts

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Gender preference
    preferred_gender TEXT DEFAULT 'both',

    -- Age range
    age_min INTEGER,
    age_max INTEGER,

    -- Relationship type
    looking_for TEXT DEFAULT 'relationship',

    -- Height range (in inches)
    preferred_height_min_inches INTEGER,
    preferred_height_max_inches INTEGER,

    -- Distance (miles, NULL = no limit)
    max_distance INTEGER,

    -- Ethnicity & Politics preferences
    preferred_ethnicities TEXT[] DEFAULT '{}',
    preferred_politics TEXT[] DEFAULT '{}',

    -- Partner lifestyle preferences
    partner_drinking TEXT[] DEFAULT '{}',
    partner_cannabis TEXT[] DEFAULT '{}',
    partner_tobacco TEXT[] DEFAULT '{}',
    partner_other_drugs TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read all preferences (needed for matching algorithm)
CREATE POLICY "Authenticated users can read all preferences"
    ON user_preferences FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can create their own preferences
CREATE POLICY "Users can create their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own preferences
CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);
