-- ============================================
-- Blocked Users Schema for Bridge
-- ============================================
-- Tracks user blocking relationships.
-- Referenced by: accountService.ts:170

CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_block UNIQUE (user_id, blocked_user_id),
    CONSTRAINT no_self_block CHECK (user_id <> blocked_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocked list
CREATE POLICY "Users can view their own blocked users"
    ON blocked_users FOR SELECT
    USING (auth.uid() = user_id);

-- Users can block others
CREATE POLICY "Users can block other users"
    ON blocked_users FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can unblock others
CREATE POLICY "Users can unblock other users"
    ON blocked_users FOR DELETE
    USING (auth.uid() = user_id);
