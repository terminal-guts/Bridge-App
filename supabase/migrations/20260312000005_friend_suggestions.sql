-- Friend Suggestions: queued friend-to-friend match recommendations
-- Suggestions are queued and converted to proposals at the 7PM cycle

CREATE TABLE friend_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID NOT NULL REFERENCES auth.users(id),
  user_a_id UUID NOT NULL REFERENCES auth.users(id),
  user_b_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'stashed', 'converted', 'expired', 'discarded')),
  stashed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  converted_proposal_id UUID REFERENCES proposals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce user_a_id < user_b_id ordering
  CHECK (user_a_id < user_b_id)
);

-- Only one active suggestion per user (queued or stashed)
CREATE UNIQUE INDEX idx_friend_suggestions_user_a_active
  ON friend_suggestions(user_a_id) WHERE status IN ('queued', 'stashed');
CREATE UNIQUE INDEX idx_friend_suggestions_user_b_active
  ON friend_suggestions(user_b_id) WHERE status IN ('queued', 'stashed');

-- Index for efficient lookup by status
CREATE INDEX idx_friend_suggestions_status ON friend_suggestions(status) WHERE status IN ('queued', 'stashed');

-- RLS
ALTER TABLE friend_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_insert_suggestions" ON friend_suggestions
  FOR INSERT WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "users_can_read_own_suggestions" ON friend_suggestions
  FOR SELECT USING (auth.uid() = suggested_by);
