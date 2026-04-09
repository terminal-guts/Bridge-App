-- ============================================
-- Friend Codes & Friends Schema for Bridge
-- ============================================

-- Table: friend_codes
-- Stores unique friend codes for each user.
CREATE TABLE IF NOT EXISTS friend_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_friend_code UNIQUE (user_id)
);

-- Table: friends
-- Stores bidirectional friendships between users.
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);

-- ============================================
-- Function: generate_friend_code
-- Generates a unique BRIDGE-XXXX-XXXX code.
-- ============================================
CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes I, O, 0, 1 for clarity
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
        
        -- Check for uniqueness
        IF NOT EXISTS (SELECT 1 FROM public.friend_codes WHERE code = new_code) THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: auto_create_friend_code
-- Automatically creates a friend code when a user signs up.
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user_friend_code()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.friend_codes (user_id, code)
    VALUES (NEW.id, public.generate_friend_code());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to auth.users (run once)
DROP TRIGGER IF EXISTS on_auth_user_created_friend_code ON auth.users;
CREATE TRIGGER on_auth_user_created_friend_code
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_friend_code();

-- ============================================
-- RPC: add_friend_by_code
-- Adds a friend by looking up their friend code.
-- Returns: success (bool), message (text), friend_user_id (uuid)
-- ============================================
CREATE OR REPLACE FUNCTION add_friend_by_code(friend_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, friend_user_id UUID) AS $$
DECLARE
    current_user_id UUID;
    target_user_id UUID;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'You must be logged in to add friends'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Look up the friend code
    SELECT fc.user_id INTO target_user_id
    FROM friend_codes fc
    WHERE fc.code = UPPER(friend_code);

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Friend code not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check for self-add
    IF target_user_id = current_user_id THEN
        RETURN QUERY SELECT FALSE, 'You cannot add yourself as a friend'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check if already friends
    IF EXISTS (SELECT 1 FROM friends WHERE user_id = current_user_id AND friend_id = target_user_id) THEN
        RETURN QUERY SELECT FALSE, 'You are already friends with this user'::TEXT, target_user_id;
        RETURN;
    END IF;

    -- Add friendship bidirectionally
    INSERT INTO friends (user_id, friend_id) VALUES (current_user_id, target_user_id);
    INSERT INTO friends (user_id, friend_id) VALUES (target_user_id, current_user_id);

    RETURN QUERY SELECT TRUE, 'Friend added successfully'::TEXT, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE friend_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Policies for friend_codes
CREATE POLICY "Users can view their own friend code"
    ON friend_codes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view friend codes by code" 
    ON friend_codes FOR SELECT
    USING (TRUE); -- Anyone can look up a code to add a friend

-- Policies for friends
CREATE POLICY "Users can view their own friends"
    ON friends FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
    ON friends FOR DELETE
    USING (auth.uid() = user_id);
