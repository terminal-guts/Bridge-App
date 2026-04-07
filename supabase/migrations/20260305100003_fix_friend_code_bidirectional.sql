-- ============================================
-- Fix: add_friend_by_code — bidirectional guard
-- Mar 5 2026
-- ============================================
-- Two bugs fixed:
-- 1. Already-friends check was one-directional (only checked A→B, not B→A).
--    If B→A existed but A→B didn't, the INSERT for B→A would crash with a
--    unique violation and the whole add would silently fail.
-- 2. Both INSERTs now use ON CONFLICT DO NOTHING so the operation is
--    idempotent — any pre-existing row in either direction is handled cleanly.

CREATE OR REPLACE FUNCTION add_friend_by_code(friend_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, friend_user_id UUID) AS $$
DECLARE
    current_user_id UUID;
    target_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'You must be logged in to add friends'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    SELECT fc.user_id INTO target_user_id
    FROM friend_codes fc
    WHERE fc.code = UPPER(friend_code);

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Friend code not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF target_user_id = current_user_id THEN
        RETURN QUERY SELECT FALSE, 'You cannot add yourself as a friend'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check both directions — friendship is bidirectional, either row means already friends
    IF EXISTS (
        SELECT 1 FROM friends
        WHERE (user_id = current_user_id AND friend_id = target_user_id)
           OR (user_id = target_user_id AND friend_id = current_user_id)
    ) THEN
        RETURN QUERY SELECT FALSE, 'You are already friends with this user'::TEXT, target_user_id;
        RETURN;
    END IF;

    -- Insert both directions. ON CONFLICT DO NOTHING makes this idempotent.
    INSERT INTO friends (user_id, friend_id) VALUES (current_user_id, target_user_id) ON CONFLICT DO NOTHING;
    INSERT INTO friends (user_id, friend_id) VALUES (target_user_id, current_user_id) ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT TRUE, 'Friend added successfully'::TEXT, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
