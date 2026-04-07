-- ============================================
-- RPC: delete_user_account
-- ============================================
-- Deletes all user data across all tables, then removes the auth.users row.
-- Runs as SECURITY DEFINER so it can access auth schema.
-- Called from the delete-account edge function.

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Clean up all pool_vote_assignments for proposals involving this user
  -- (OTHER voters assigned to this user's proposals — prevents them from
  -- being served dead proposals in the voting gate)
  BEGIN
    DELETE FROM pool_vote_assignments
    WHERE proposal_id IN (
      SELECT id FROM proposals WHERE user_a_id = target_user_id OR user_b_id = target_user_id
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete proposals involving this user entirely (not soft-expire).
  -- Soft-expiring leaves rows with user_a/user_b pointing to a deleted user,
  -- which crashes profile lookups when other users' screens try to render them.
  -- Must clear referencing tables first to avoid FK violations.
  DELETE FROM proposal_votes
  WHERE proposal_id IN (
    SELECT id FROM proposals WHERE user_a_id = target_user_id OR user_b_id = target_user_id
  );
  -- friend_suggestions.converted_proposal_id has no ON DELETE CASCADE — null it out
  BEGIN
    UPDATE friend_suggestions SET converted_proposal_id = NULL
    WHERE converted_proposal_id IN (
      SELECT id FROM proposals WHERE user_a_id = target_user_id OR user_b_id = target_user_id
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  DELETE FROM proposals WHERE user_a_id = target_user_id OR user_b_id = target_user_id;

  -- End active matches
  UPDATE matches SET status = 'ended', updated_at = now()
  WHERE (user_id_1 = target_user_id OR user_id_2 = target_user_id)
    AND status = 'active';

  -- Clean up proposal_votes referencing this user (voter, friend_of, recommend_to)
  -- friend_of and recommend_to_id FKs have NO CASCADE, so must be handled explicitly
  DELETE FROM proposal_votes WHERE voter_user_id = target_user_id;
  UPDATE proposal_votes SET friend_of = NULL WHERE friend_of = target_user_id;
  UPDATE proposal_votes SET recommend_to_id = NULL WHERE recommend_to_id = target_user_id;

  -- Delete from all referencing tables
  DELETE FROM match_exits WHERE exiting_user_id = target_user_id;
  DELETE FROM messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM friend_messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM friend_suggestions WHERE suggested_by = target_user_id OR user_a_id = target_user_id OR user_b_id = target_user_id;
  DELETE FROM friends WHERE user_id = target_user_id OR friend_id = target_user_id;
  DELETE FROM friend_codes WHERE user_id = target_user_id;
  DELETE FROM blocked_users WHERE user_id = target_user_id OR blocked_user_id = target_user_id;
  DELETE FROM karma_scores WHERE user_id = target_user_id;
  DELETE FROM user_photos WHERE user_id = target_user_id;
  DELETE FROM user_settings WHERE user_id = target_user_id;
  DELETE FROM user_preferences WHERE user_id = target_user_id;
  DELETE FROM onboarding_progress WHERE user_id = target_user_id;
  DELETE FROM deep_question_answers WHERE user_id = target_user_id;

  -- Friend badges (FKs to user_profiles without CASCADE)
  BEGIN
    DELETE FROM friend_badges WHERE giver_id = target_user_id OR receiver_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  DELETE FROM user_profiles WHERE user_id = target_user_id;

  -- Support tables
  DELETE FROM support_messages WHERE user_id = target_user_id;
  DELETE FROM support_conversations WHERE user_id = target_user_id;

  -- Karma snapshots
  BEGIN
    DELETE FROM karma_weekly_snapshots WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM karma_rank_snapshots WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

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

  -- pool_vote_assignments already cleaned up above (both as voter and for this user's proposals)

  BEGIN
    DELETE FROM user_reports WHERE reporter_id = target_user_id OR reported_user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM support_reply_context WHERE current_user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM email_verification_codes WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Finally, delete the auth user row (cascades any remaining FKs like profiles, sessions, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
