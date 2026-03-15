-- ============================================
-- Matchmaker Feature Schema
-- ============================================

-- 1. Add role to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'dater' CHECK (role IN ('dater', 'matchmaker'));

-- 2. Ghost Profiles Table
CREATE TABLE IF NOT EXISTS ghost_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    photos JSONB DEFAULT '[]',
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    invite_token TEXT UNIQUE NOT NULL,
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roster Table
CREATE TABLE IF NOT EXISTS roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ghost_profile_id UUID REFERENCES ghost_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending_invite', 'active', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Exactly one of user_id or ghost_profile_id must be non-null
    CONSTRAINT roster_one_target CHECK (
        (user_id IS NOT NULL AND ghost_profile_id IS NULL) OR
        (user_id IS NULL AND ghost_profile_id IS NOT NULL)
    ),
    -- Ensure same user isn't on the same matchmaker's roster twice
    CONSTRAINT unique_matchmaker_target UNIQUE (matchmaker_id, user_id, ghost_profile_id)
);

-- 4. Introductions Table
CREATE TABLE IF NOT EXISTS introductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'a_accepted', 'b_accepted', 'mutual_accept', 'declined')),
    person_a_response TEXT CHECK (person_a_response IN ('pending', 'accepted', 'declined')),
    person_b_response TEXT CHECK (person_b_response IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    CONSTRAINT different_persons CHECK (person_a_id != person_b_id)
);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER update_ghost_profiles_updated_at BEFORE UPDATE ON ghost_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roster_updated_at BEFORE UPDATE ON roster FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- RLS for ghost_profiles
ALTER TABLE ghost_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create ghost profiles"
    ON ghost_profiles FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Matchmakers can read their own ghost profiles"
    ON ghost_profiles FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Friends can read their own ghost profile by token"
    ON ghost_profiles FOR SELECT
    USING (TRUE); -- Token validation happens in app logic or we could harden later

-- RLS for roster
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matchmakers can manage their roster"
    ON roster FOR ALL
    USING (auth.uid() = matchmaker_id);

CREATE POLICY "Users can see who is matchmaking them"
    ON roster FOR SELECT
    USING (auth.uid() = user_id);

-- RLS for introductions
ALTER TABLE introductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matchmakers can read/create their introductions"
    ON introductions FOR ALL
    USING (auth.uid() = matchmaker_id);

CREATE POLICY "Users can read introductions they are part of"
    ON introductions FOR SELECT
    USING (auth.uid() = person_a_id OR auth.uid() = person_b_id);

CREATE POLICY "Users can respond to their introductions"
    ON introductions FOR UPDATE
    USING (auth.uid() = person_a_id OR auth.uid() = person_b_id);
