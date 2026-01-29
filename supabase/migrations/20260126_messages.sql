-- ============================================
-- Messages Schema for Bridge Chat
-- ============================================

-- Table: messages
-- Stores all chat messages between matched users
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image')),
    content TEXT NOT NULL,
    duration INTEGER, -- Audio duration in milliseconds (for audio messages)
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_users CHECK (sender_id <> receiver_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_match_sent ON messages(match_id, sent_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can insert messages where they are the sender
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update messages they received (to mark as read)
CREATE POLICY "Users can mark received messages as read"
    ON messages FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- ============================================
-- Function: mark_messages_as_read
-- Marks all unread messages in a match as read for a user
-- ============================================
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_match_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages
    SET read_at = NOW()
    WHERE match_id = p_match_id
      AND receiver_id = p_user_id
      AND read_at IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: get_unread_count
-- Returns the count of unread messages for a user in a match
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_count(p_match_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM messages
        WHERE match_id = p_match_id
          AND receiver_id = p_user_id
          AND read_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Enable Realtime for messages table
-- This allows clients to subscribe to new messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- Storage bucket for audio messages
-- Run this in the Supabase dashboard SQL editor or via storage API
-- ============================================
-- Note: Storage buckets are typically created via the dashboard or API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-audio', 'chat-audio', false);

-- Storage policies would be:
-- CREATE POLICY "Users can upload audio to chat-audio"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'chat-audio' AND auth.uid() IS NOT NULL);
--
-- CREATE POLICY "Users can view their chat audio"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'chat-audio' AND auth.uid() IS NOT NULL);
