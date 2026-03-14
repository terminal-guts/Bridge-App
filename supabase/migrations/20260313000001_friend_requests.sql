-- ============================================================================
-- Friend Request System Migration
-- Adds status + requested_by columns to friends table
-- ============================================================================

-- Add status column (default 'accepted' so existing rows are unaffected)
ALTER TABLE friends ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted';

-- Add requested_by column (who initiated the request)
ALTER TABLE friends ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id);

-- Unique constraint to prevent duplicate friendship rows
-- (ON CONFLICT DO NOTHING in accept_friend_request depends on this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'friends_user_id_friend_id_key'
  ) THEN
    ALTER TABLE friends ADD CONSTRAINT friends_user_id_friend_id_key UNIQUE (user_id, friend_id);
  END IF;
END $$;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_pending_recipient ON friends(friend_id, status) WHERE status = 'pending';

-- ============================================================================
-- RPC: send_friend_request
-- Validates code, inserts ONE pending row (requester→recipient).
-- Auto-accepts if mutual request exists.
-- ============================================================================
CREATE OR REPLACE FUNCTION send_friend_request(friend_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, friend_user_id UUID, request_id UUID, was_auto_accepted BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_requester_id UUID;
  v_recipient_id UUID;
  v_existing_friendship UUID;
  v_mutual_request UUID;
  v_new_id UUID;
BEGIN
  -- Get authenticated user
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT, NULL::UUID, NULL::UUID, false;
    RETURN;
  END IF;

  -- Look up the friend code
  SELECT fc.user_id INTO v_recipient_id
  FROM friend_codes fc
  WHERE fc.code = friend_code;

  IF v_recipient_id IS NULL THEN
    RETURN QUERY SELECT false, 'Friend code not found'::TEXT, NULL::UUID, NULL::UUID, false;
    RETURN;
  END IF;

  -- Can't add yourself
  IF v_recipient_id = v_requester_id THEN
    RETURN QUERY SELECT false, 'Cannot send a request to yourself'::TEXT, NULL::UUID, NULL::UUID, false;
    RETURN;
  END IF;

  -- Check if already friends (accepted friendship exists in either direction)
  SELECT f.id INTO v_existing_friendship
  FROM friends f
  WHERE f.status = 'accepted'
    AND ((f.user_id = v_requester_id AND f.friend_id = v_recipient_id)
      OR (f.user_id = v_recipient_id AND f.friend_id = v_requester_id))
  LIMIT 1;

  IF v_existing_friendship IS NOT NULL THEN
    RETURN QUERY SELECT false, 'You are already friends'::TEXT, v_recipient_id, NULL::UUID, false;
    RETURN;
  END IF;

  -- Check if requester already has a pending outgoing request
  SELECT f.id INTO v_existing_friendship
  FROM friends f
  WHERE f.status = 'pending'
    AND f.user_id = v_requester_id
    AND f.friend_id = v_recipient_id;

  IF v_existing_friendship IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Request already sent'::TEXT, v_recipient_id, v_existing_friendship, false;
    RETURN;
  END IF;

  -- Check if recipient already sent a request to requester (mutual request → auto-accept)
  SELECT f.id INTO v_mutual_request
  FROM friends f
  WHERE f.status = 'pending'
    AND f.user_id = v_recipient_id
    AND f.friend_id = v_requester_id;

  IF v_mutual_request IS NOT NULL THEN
    -- Auto-accept: update existing pending row to accepted
    UPDATE friends SET status = 'accepted', added_at = NOW()
    WHERE id = v_mutual_request;

    -- Insert reverse direction
    INSERT INTO friends (user_id, friend_id, status, requested_by, added_at)
    VALUES (v_requester_id, v_recipient_id, 'accepted', v_requester_id, NOW());

    RETURN QUERY SELECT true, 'Friend request auto-accepted (mutual request)'::TEXT, v_recipient_id, v_mutual_request, true;
    RETURN;
  END IF;

  -- Insert new pending request (one direction only: requester → recipient)
  INSERT INTO friends (user_id, friend_id, status, requested_by, added_at)
  VALUES (v_requester_id, v_recipient_id, 'pending', v_requester_id, NOW())
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT true, 'Friend request sent'::TEXT, v_recipient_id, v_new_id, false;
END;
$$;

-- ============================================================================
-- RPC: accept_friend_request
-- Validates recipient, updates to accepted, inserts reverse row
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, friend_user_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_requester_id UUID;
  v_recipient_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get the request
  SELECT f.user_id, f.friend_id, f.status
  INTO v_requester_id, v_recipient_id, v_status
  FROM friends f
  WHERE f.id = request_id;

  IF v_requester_id IS NULL THEN
    RETURN QUERY SELECT false, 'Request not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Only the recipient can accept
  IF v_recipient_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Only the recipient can accept this request'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_status != 'pending' THEN
    RETURN QUERY SELECT false, 'Request is no longer pending'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Update to accepted
  UPDATE friends SET status = 'accepted', added_at = NOW()
  WHERE id = request_id;

  -- Insert reverse direction
  INSERT INTO friends (user_id, friend_id, status, requested_by, added_at)
  VALUES (v_user_id, v_requester_id, 'accepted', v_requester_id, NOW())
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', added_at = NOW();

  RETURN QUERY SELECT true, 'Friend request accepted'::TEXT, v_requester_id;
END;
$$;

-- ============================================================================
-- RPC: decline_friend_request
-- Validates recipient, deletes pending row (silent rejection)
-- ============================================================================
CREATE OR REPLACE FUNCTION decline_friend_request(request_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_recipient_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  SELECT f.friend_id, f.status
  INTO v_recipient_id, v_status
  FROM friends f
  WHERE f.id = request_id;

  IF v_recipient_id IS NULL THEN
    RETURN QUERY SELECT false, 'Request not found'::TEXT;
    RETURN;
  END IF;

  IF v_recipient_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Only the recipient can decline this request'::TEXT;
    RETURN;
  END IF;

  IF v_status != 'pending' THEN
    RETURN QUERY SELECT false, 'Request is no longer pending'::TEXT;
    RETURN;
  END IF;

  DELETE FROM friends WHERE id = request_id;

  RETURN QUERY SELECT true, 'Friend request declined'::TEXT;
END;
$$;

-- ============================================================================
-- RPC: cancel_friend_request
-- Validates sender, deletes pending row
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_friend_request(request_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_sender_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  SELECT f.user_id, f.status
  INTO v_sender_id, v_status
  FROM friends f
  WHERE f.id = request_id;

  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, 'Request not found'::TEXT;
    RETURN;
  END IF;

  IF v_sender_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Only the sender can cancel this request'::TEXT;
    RETURN;
  END IF;

  IF v_status != 'pending' THEN
    RETURN QUERY SELECT false, 'Request is no longer pending'::TEXT;
    RETURN;
  END IF;

  DELETE FROM friends WHERE id = request_id;

  RETURN QUERY SELECT true, 'Friend request cancelled'::TEXT;
END;
$$;

-- ============================================================================
-- RLS: Allow recipients to see pending requests targeting them
-- ============================================================================
DO $$
BEGIN
  -- Drop if exists to make migration idempotent
  DROP POLICY IF EXISTS "Users can see pending friend requests targeting them" ON friends;

  CREATE POLICY "Users can see pending friend requests targeting them"
    ON friends FOR SELECT
    USING (
      auth.uid() = friend_id AND status = 'pending'
    );
END $$;
