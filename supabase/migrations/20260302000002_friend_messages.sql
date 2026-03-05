-- ============================================
-- Friend Messages Table for Bridge
-- ============================================
-- Enables real-time chat between friends.
-- Mirrors the match messages table structure but uses friendship_id.

CREATE TABLE IF NOT EXISTS friend_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friendship_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image')),
    content TEXT,
    duration INTEGER,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_friend_messages_friendship_id ON friend_messages(friendship_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_sender_id ON friend_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_receiver_id ON friend_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_sent_at ON friend_messages(friendship_id, sent_at);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE friend_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their friendships
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their friend messages' AND tablename = 'friend_messages') THEN
    CREATE POLICY "Users can view their friend messages" ON friend_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;

-- Users can send messages to their friends
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send friend messages' AND tablename = 'friend_messages') THEN
    CREATE POLICY "Users can send friend messages" ON friend_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM friends WHERE id = friendship_id AND (user_id = auth.uid() OR friend_id = auth.uid())));
  END IF;
END $$;

-- Users can mark received messages as read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can mark friend messages as read' AND tablename = 'friend_messages') THEN
    CREATE POLICY "Users can mark friend messages as read" ON friend_messages FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
  END IF;
END $$;

-- ============================================
-- Helper Functions
-- ============================================

-- Mark all unread friend messages as read
CREATE OR REPLACE FUNCTION mark_friend_messages_as_read(
    p_friendship_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE friend_messages
    SET read_at = NOW()
    WHERE friendship_id = p_friendship_id
      AND receiver_id = p_user_id
      AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread friend message count
CREATE OR REPLACE FUNCTION get_friend_unread_count(
    p_friendship_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    count_val INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO count_val
    FROM friend_messages
    WHERE friendship_id = p_friendship_id
      AND receiver_id = p_user_id
      AND read_at IS NULL;
    RETURN count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Enable Realtime
-- ============================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE friend_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
