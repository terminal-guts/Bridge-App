-- ============================================
-- RLS Tier 2: Important Tables
-- ============================================
-- Migration: 20260310_rls_tier2_important.sql
-- Deploy AFTER Tier 1 is verified. Test voting flow + friend features carefully.
--
-- Tables: proposals, proposal_votes, friends, friend_messages (no-op), karma_scores,
--         pool_vote_assignments (INSERT tightened)
--
-- ============================================
-- TABLE AUDIT
-- ============================================
--
-- 6. proposals (20260214000008_proposals.sql + 20260305120000_tighten_proposals_rls.sql)
--    Columns: id, user_a_id, user_b_id, status, compatibility_score, category_scores,
--             pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes,
--             pool_eligible, user_a_decision, user_b_decision, user_a_decided_at,
--             user_b_decided_at, voting_started_at, voting_expires_at, community_decided_at,
--             passed_to_users_at, decision_deadline_at, confirmed_at, rejected_at,
--             declined_at, expired_at, weighted_yes, weighted_no, created_at, updated_at
--    Realtime: YES
--    Existing policies (dormant):
--      SELECT: "Authenticated users can read proposals" — auth.role() = 'authenticated'
--              (intentionally broad — needed for community voting flow)
--      INSERT: "Authenticated users can create proposals" — WITH CHECK (TRUE) ← DROPPING
--      UPDATE: "Proposal participants can update proposals" — user_a_id OR user_b_id = auth.uid()
--              (tightened in 20260305120000)
--    Frontend queries:
--      proposalApiService.ts:92    SELECT with user_a_id/user_b_id OR filter
--      communityBackendService.ts:478,484,1083 SELECT with various filters
--      blockService.ts:108-115     UPDATE status to 'rejected' (current user is participant)
--
-- 7. proposal_votes (20260214000007_proposal_votes.sql)
--    Columns: id, proposal_id, voter_user_id, vote_type, is_friend_vote, friend_of,
--             recommend_to_id, vote_weight, created_at
--    Existing policies (dormant):
--      SELECT: "Authenticated users can read votes" — auth.role() = 'authenticated'
--      INSERT: "Users can cast their own votes" — auth.uid() = voter_user_id
--    Frontend queries:
--      communityBackendService.ts:361  INSERT vote record
--      communityBackendService.ts:557,748,992 SELECT by voter_user_id
--
-- 8. friends (20260118_friend_codes.sql + 20260301000003_friend_streaks.sql)
--    Columns: id, user_id, friend_id, added_at, streak_days, last_mutual_date,
--             streak_frozen, created_at
--    Existing policies (dormant, TOO NARROW):
--      SELECT: "Users can view their own friends" — auth.uid() = user_id
--      DELETE: "Users can delete their own friendships" — auth.uid() = user_id
--    ⚠️  BREAKS: Frontend queries BOTH directions of the bidirectional friendship rows.
--      communityBackendService.ts:441 SELECT eq('friend_id', userId) → returns 0 rows
--      friendService.ts:492-496 DELETE reverse row → silently fails
--      blockService.ts:128-133 DELETE both directions → reverse fails
--    FIX: Widen SELECT and DELETE to include auth.uid() = friend_id
--
-- 9. friend_messages — ALREADY HAS RLS ENABLED (20260302000002_friend_messages.sql)
--    No changes needed. Included in this tier for documentation only.
--    Existing policies:
--      SELECT: sender_id OR receiver_id = auth.uid()
--      INSERT: sender_id = auth.uid() AND friendship exists
--      UPDATE: receiver_id = auth.uid() (mark as read)
--    Realtime: YES
--
-- 10. karma_scores (20260214000005_karma_scores.sql + 20260302000003_karma_streak_wiring.sql)
--     Columns: id, user_id, total_assists, total_proposals, total_votes, accurate_votes,
--              total_inaccurate_votes, badge_tier, proposal_success_rate,
--              voting_accuracy_rate, slow_mode_active, karma_points, updated_at, created_at
--     Existing policies (dormant):
--       SELECT: "Authenticated users can read karma scores" — auth.role() = 'authenticated'
--       INSERT: "Users can create their own karma score" — WITH CHECK (TRUE) ← DROPPING
--       UPDATE: "Karma scores can be updated" — USING (TRUE) ← DROPPING
--     Frontend queries:
--       profileService.ts:429-432          SELECT by user_id
--       communityBackendService.ts:508,948 SELECT by user_id
--       communityBackendService.ts:375     RPC increment_karma_for_vote (SECURITY DEFINER)
--     No direct frontend INSERT/UPDATE on this table. All writes via SECURITY DEFINER
--     RPCs (increment_karma_for_vote, apply_karma_on_outcome, etc.) or edge functions.
--
-- ============================================

-- -----------------------------------------------
-- 6. proposals — re-enable RLS + tighten INSERT
-- -----------------------------------------------
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive INSERT policy.
-- Proposals are created exclusively by edge functions (generate-proposals,
-- generate-proposal-for-user, assign-new-user-proposals) using service role.
DROP POLICY IF EXISTS "Authenticated users can create proposals" ON proposals;

-- Remaining policies (already exist, now enforced):
--   SELECT: "Authenticated users can read proposals" — all auth can read (voting flow)
--   UPDATE: "Proposal participants can update proposals" — participants only

-- -----------------------------------------------
-- 7. proposal_votes — re-enable RLS
-- -----------------------------------------------
-- Existing SELECT/INSERT policies are correct.
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 8. friends — re-enable RLS + fix bidirectional access
-- -----------------------------------------------
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Drop the too-narrow SELECT policy (only checked user_id, not friend_id)
DROP POLICY IF EXISTS "Users can view their own friends" ON friends;

-- New SELECT: users can see friendship rows where they are either party.
-- Required because frontend queries BOTH eq('user_id', uid) and eq('friend_id', uid)
-- to merge bidirectional friendship data (communityBackendService.ts:437-443).
CREATE POLICY "Users can view their friendships"
    ON friends FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Drop the too-narrow DELETE policy (only checked user_id)
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friends;

-- New DELETE: users can delete friendship rows where they are either party.
-- Required for removeFriend() (friendService.ts:483-496) which deletes both
-- directions, and blockUser() (blockService.ts:128-133) which does the same.
CREATE POLICY "Users can delete their friendships"
    ON friends FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- No INSERT policy needed: friendships created via add_friend_by_code() SECURITY DEFINER
-- No UPDATE policy needed: streaks updated via update_friend_streak() SECURITY DEFINER

-- -----------------------------------------------
-- 9. friend_messages — NO CHANGES (RLS already enabled)
-- -----------------------------------------------
-- Policies verified correct:
--   "Users can view their friend messages" SELECT (sender/receiver)
--   "Users can send friend messages" INSERT (sender + friendship check)
--   "Users can mark friend messages as read" UPDATE (receiver)

-- -----------------------------------------------
-- 10. karma_scores — re-enable RLS + remove permissive write policies
-- -----------------------------------------------
ALTER TABLE karma_scores ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive INSERT (WITH CHECK TRUE).
-- Karma rows are created by edge functions (service role) and SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Users can create their own karma score" ON karma_scores;

-- Drop overly-permissive UPDATE (USING TRUE).
-- Karma is updated exclusively via SECURITY DEFINER RPCs:
--   increment_karma_for_vote(), apply_karma_on_outcome(), increment_total_proposals()
-- and the compute_karma_tier() trigger.
DROP POLICY IF EXISTS "Karma scores can be updated" ON karma_scores;

-- SELECT policy remains: "Authenticated users can read karma scores"
-- Needed for profile display and leaderboard features.

-- -----------------------------------------------
-- 10b. pool_vote_assignments — tighten INSERT
-- -----------------------------------------------
-- RLS is already enabled (20260301000004_pool_vote_assignments.sql).
-- The existing INSERT policy WITH CHECK (TRUE) is overly-permissive —
-- it allows any authenticated user to insert their own vote assignments.
-- Vote assignments should only be created by edge functions (service role).
DROP POLICY IF EXISTS "Service role can insert pool assignments" ON pool_vote_assignments;
-- No replacement INSERT policy needed: service role bypasses RLS.


-- ============================================
-- FRONTEND IMPACT REPORT — TIER 2
-- ============================================
--
-- proposals:
--   ✅ proposalApiService.ts:92    SELECT → authenticated read-all ✓
--   ✅ communityBackendService.ts  SELECT various → authenticated read-all ✓
--   ✅ blockService.ts:108         UPDATE → current user is participant ✓
--   ✅ Realtime subscription (proposals) → authenticated can see all updates ✓
--   ℹ️  NOTE: All authenticated users can read ALL proposals. This is intentional
--       for the community voting flow. Vote assignment is enforced by the edge
--       function (get-proposals-for-voting), not by RLS.
--
-- proposal_votes:
--   ✅ communityBackendService.ts:361 INSERT → voter_user_id = auth.uid() ✓
--   ✅ communityBackendService.ts:557,748,992 SELECT → authenticated read-all ✓
--
-- friends:
--   ✅ friendService.ts:410        SELECT eq('user_id') → new policy covers ✓
--   ✅ communityBackendService.ts:437 SELECT eq('user_id') → ✓
--   ✅ communityBackendService.ts:441 SELECT eq('friend_id') → new policy covers ✓
--   ✅ contactsService.ts:186      SELECT eq('user_id') → ✓
--   ✅ friendService.ts:483-496    DELETE both directions → new policy covers ✓
--   ✅ blockService.ts:128-133     DELETE both directions → new policy covers ✓
--   ✅ friendService.ts:527        SELECT/COUNT eq('user_id') → ✓
--   ⚠️  developmentDataService.ts:321 INSERT → WILL FAIL (no INSERT policy)
--       FOLLOW-UP: Dev data service needs RPC or service role for mock friendships.
--   ✅ RPC add_friend_by_code → SECURITY DEFINER, bypasses RLS ✓
--   ✅ RPC update_friend_streak → SECURITY DEFINER, bypasses RLS ✓
--
-- friend_messages:
--   ✅ No changes — existing policies verified correct ✓
--
-- karma_scores:
--   ✅ profileService.ts SELECT → authenticated read-all ✓
--   ✅ communityBackendService.ts SELECT → authenticated read-all ✓
--   ✅ RPC increment_karma_for_vote → SECURITY DEFINER, bypasses RLS ✓
--   ✅ Edge functions (process-vote, proposal-lifecycle) → service role ✓
--
-- pool_vote_assignments:
--   ✅ communityBackendService.ts:376 UPDATE has_voted → voter_id = auth.uid() ✓
--   ✅ Edge functions INSERT (assign-new-user-proposals, generate-proposals) → service role ✓
--   ✅ Permissive INSERT policy dropped — no frontend code inserts directly ✓
--
