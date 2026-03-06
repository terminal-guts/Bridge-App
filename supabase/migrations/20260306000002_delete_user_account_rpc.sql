-- ============================================
-- RPC: delete_user_account
-- ============================================
-- Deletes all user data across all tables, then removes the auth.users row.
-- Runs as SECURITY DEFINER so it can access auth schema.
-- Called from the delete-account edge function.

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Cancel active proposals
  UPDATE proposals SET status = 'cancelled'
  WHERE (user_a_id = target_user_id OR user_b_id = target_user_id)
    AND status IN ('pending', 'active');

  -- End active matches
  UPDATE matches SET status = 'ended', ended_at = now()
  WHERE (user_a_id = target_user_id OR user_b_id = target_user_id)
    AND status = 'active';

  -- Delete from all referencing tables
  DELETE FROM proposal_votes WHERE voter_user_id = target_user_id;
  DELETE FROM match_exits WHERE exiting_user_id = target_user_id;
  DELETE FROM messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM friend_messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM friends WHERE user_id = target_user_id OR friend_id = target_user_id;
  DELETE FROM friend_codes WHERE user_id = target_user_id;
  DELETE FROM blocked_users WHERE user_id = target_user_id OR blocked_user_id = target_user_id;
  DELETE FROM karma_scores WHERE user_id = target_user_id;
  DELETE FROM user_photos WHERE user_id = target_user_id;
  DELETE FROM user_settings WHERE user_id = target_user_id;
  DELETE FROM user_preferences WHERE user_id = target_user_id;
  DELETE FROM onboarding_progress WHERE user_id = target_user_id;
  DELETE FROM deep_question_answers WHERE user_id = target_user_id;
  DELETE FROM user_profiles WHERE user_id = target_user_id;

  -- Tables that may not exist yet (wrapped in exception handlers)
  BEGIN
    DELETE FROM friend_streaks WHERE user_id = target_user_id OR friend_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM friend_recommendations WHERE recommender_id = target_user_id
      OR recommended_person_id = target_user_id
      OR recommended_to_friend_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM pool_vote_assignments WHERE voter_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM user_reports WHERE reporter_id = target_user_id OR reported_user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Finally, delete the auth user row (cascades any remaining FKs)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
