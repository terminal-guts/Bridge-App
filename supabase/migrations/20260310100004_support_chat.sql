-- Support chat system

CREATE TABLE IF NOT EXISTS support_conversations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    has_unread_admin BOOLEAN DEFAULT FALSE,
    has_unread_user BOOLEAN DEFAULT FALSE,
    raffle_tickets INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 1000),
    sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
    is_auto_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_messages_user ON support_messages(user_id, created_at);
CREATE INDEX idx_support_conversations_last ON support_conversations(last_message_at DESC);

-- RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can read/create their own conversation
CREATE POLICY "Users own their conversation"
    ON support_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own messages
CREATE POLICY "Users read own messages"
    ON support_messages FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users send messages"
    ON support_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id AND sender = 'user');

-- Enable realtime for support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Add push_token column to user_settings if it doesn't exist
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_token TEXT;
