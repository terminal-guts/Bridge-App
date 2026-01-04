-- Bridge Application - Onboarding Database Schema
-- For use with Supabase (PostgreSQL)

-- ============================================================================
-- 1. Enable Required Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. User Profiles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18),
    gender TEXT[] DEFAULT '{}', -- Array of gender identities
    pronouns TEXT,
    pronouns_list TEXT[] DEFAULT '{}',
    custom_gender TEXT,
    hometown TEXT,
    location TEXT NOT NULL,
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
    values TEXT[] DEFAULT '{}',
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. User Preferences Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    age_min INTEGER DEFAULT 18,
    age_max INTEGER DEFAULT 99,
    preferred_gender TEXT, -- 'male', 'female', 'both'
    looking_for TEXT, -- 'relationship', 'casual', 'friendship', 'unsure'
    height_min INTEGER DEFAULT 0,
    height_max INTEGER DEFAULT 120,
    distance_miles INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Deep Question Answers Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deep_question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    is_displayed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- ============================================================================
-- 5. User Photos Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. Functions & Triggers
-- ============================================================================

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to tables
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Preferences Policies
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Deep Questions Policies
CREATE POLICY "Viewable by all (if profile is public)" 
ON public.deep_question_answers FOR SELECT USING (TRUE);

CREATE POLICY "Manage own answers" 
ON public.deep_question_answers FOR ALL USING (auth.uid() = user_id);

-- Photos Policies
CREATE POLICY "Viewable by all" 
ON public.user_photos FOR SELECT USING (TRUE);

CREATE POLICY "Manage own photos" 
ON public.user_photos FOR ALL USING (auth.uid() = user_id);
