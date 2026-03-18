-- ============================================================================
-- Crush System
--
-- Partiful-style secret crushes between friends.
-- When both friends crush each other, a mutual crush is detected and
-- a proposal is automatically created to add the pair to the grid.
-- ============================================================================

-- Crush table: one row per crush (unidirectional)
CREATE TABLE IF NOT EXISTS crushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crush_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent self-crush and duplicate crushes
  CONSTRAINT crushes_no_self CHECK (user_id <> crush_id),
  CONSTRAINT crushes_unique UNIQUE (user_id, crush_id)
);

-- Index for fast lookups: "who has crushed on me?" and "have I crushed on them?"
CREATE INDEX IF NOT EXISTS idx_crushes_user_id ON crushes(user_id);
CREATE INDEX IF NOT EXISTS idx_crushes_crush_id ON crushes(crush_id);

-- Composite index for mutual crush detection: given (A, B), quickly check if (B, A) exists
CREATE INDEX IF NOT EXISTS idx_crushes_pair ON crushes(crush_id, user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE crushes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own crushes (sent)
CREATE POLICY crushes_select_own ON crushes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert crushes from themselves
CREATE POLICY crushes_insert_own ON crushes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own crushes (un-crush)
CREATE POLICY crushes_delete_own ON crushes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Mutual crush detection RPC
--
-- Called after inserting a crush. Returns TRUE if the other person has also
-- crushed on the caller, creating a mutual crush.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_mutual_crush(p_crush_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM crushes
    WHERE user_id = p_crush_id
      AND crush_id = auth.uid()
  );
END;
$$;

-- ============================================================================
-- Batch RPC: get all users who have crushed on the caller
--
-- Needed because RLS only lets you read your own sent crushes.
-- This lets the client detect mutual crushes without revealing identities
-- until the match happens.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_crushes_on_me()
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT c.user_id
    FROM crushes c
    WHERE c.crush_id = auth.uid();
END;
$$;
