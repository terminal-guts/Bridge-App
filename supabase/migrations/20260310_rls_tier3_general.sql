-- ============================================
-- RLS Tier 3: General & Lower-Risk Tables
-- ============================================
-- Migration: 20260310_rls_tier3_general.sql
-- Deploy AFTER Tier 1 + Tier 2 are verified.
--
-- Tables: deep_question_answers, friend_codes, friend_recommendations (fix),
--         pool_vote_assignments (no-op), blocked_users, user_preferences, match_exits
--
-- NOTE: endorsements table was DROPPED in 20260302000001_drop_dead_tables.sql — skipped.
--
-- ============================================
-- TABLE AUDIT
-- ============================================
--
-- 11. deep_question_answers (20260214000003_deep_question_answers.sql)
--     Columns: id, user_id, answers (JSONB), displayed_question_ids (INTEGER[]),
--              created_at, updated_at
--     Existing policies (dormant):
--       SELECT: "Authenticated users can read all deep question answers" — all auth
--       INSERT: "Users can create their own deep question answers" — auth.uid() = user_id
--       UPDATE: "Users can update their own deep question answers" — auth.uid() = user_id
--       DELETE: "Users can delete their own deep question answers" — auth.uid() = user_id
--     Frontend queries:
--       profileService.ts:377,591,605 SELECT by user_id
--       developerService.ts:121,127,158 SELECT/INSERT/UPSERT by user_id
--       developmentDataService.ts:168 INSERT
--
-- 12. friend_codes (20260118_friend_codes.sql)
--     Columns: id, user_id, code, created_at, updated_at
--     Existing policies (dormant):
--       SELECT: "Users can view their own friend code" — auth.uid() = user_id
--       SELECT: "Users can view friend codes by code" — USING (TRUE)
--     No INSERT/UPDATE/DELETE policies (codes created by trigger SECURITY DEFINER).
--     Frontend queries:
--       friendService.ts:129,208 SELECT eq('user_id', userId)
--       RPC add_friend_by_code → SECURITY DEFINER (reads friend_codes internally)
--
-- 13. friend_recommendations (20260305000001_friend_recommendations.sql)
--     Columns: id, recommender_id, recommended_person_id, recommended_to_friend_id,
--              source_proposal_id, created_at
--     RLS: ALREADY ENABLED — but has NO SELECT policy!
--     ⚠️  CURRENTLY BROKEN: Frontend queries at communityBackendService.ts:562,997
--         return 0 rows because RLS is on but no SELECT policy exists.
--     Frontend queries:
--       communityBackendService.ts:562 SELECT eq('recommender_id', userId)
--       communityBackendService.ts:997 SELECT eq('recommender_id', userId) count
--     FIX: Add SELECT policy for recommender_id.
--     No INSERT/UPDATE/DELETE needed from frontend (submit-recommendation edge fn
--     uses service role).
--
-- 14. pool_vote_assignments (20260301000004_pool_vote_assignments.sql)
--     RLS: ALREADY ENABLED with correct policies.
--     Columns: id, proposal_id, voter_id, assignment_date, has_voted, created_at
--     Existing policies:
--       SELECT: "Users can view own pool assignments" — voter_id = auth.uid()
--       INSERT: "Service role can insert pool assignments" — WITH CHECK (TRUE)
--       UPDATE: "Users can update own pool assignments" — voter_id = auth.uid()
--     Frontend queries:
--       communityBackendService.ts:376 UPDATE has_voted = true
--     No changes needed.
--
-- 15. blocked_users (20260214000001_blocked_users.sql)
--     Columns: id, user_id, blocked_user_id, created_at
--     NOT in original tier plan — added here because it has RLS disabled and
--     frontend queries it bidirectionally.
--     Existing policies (dormant):
--       SELECT: "Users can view their own blocked users" — auth.uid() = user_id ← TOO NARROW
--       INSERT: "Users can block other users" — auth.uid() = user_id
--       DELETE: "Users can unblock other users" — auth.uid() = user_id
--     ⚠️  BREAKS: blockService.ts:269 SELECT eq('blocked_user_id', userId) to find
--         incoming blocks — returns 0 rows with existing policy.
--     FIX: Widen SELECT to include auth.uid() = blocked_user_id.
--     Frontend queries:
--       blockService.ts:84     SELECT eq('user_id') AND eq('blocked_user_id') (outgoing)
--       blockService.ts:95     INSERT (user_id = current user)
--       blockService.ts:157    SELECT eq('user_id') (outgoing list)
--       blockService.ts:180    DELETE eq('user_id') AND eq('blocked_user_id') (unblock)
--       blockService.ts:264    SELECT eq('user_id') (outgoing IDs)
--       blockService.ts:269    SELECT eq('blocked_user_id') (incoming IDs) ← NEEDS FIX
--       blockService.ts:291    SELECT count eq('user_id')
--       messageService.ts:272  SELECT eq('user_id') (block check before sending)
--
-- 16. user_preferences (20260214000011_user_preferences.sql)
--     Columns: id, user_id, age_min, age_max, looking_for,
--              preferred_height_min_inches, preferred_height_max_inches, max_distance,
--              preferred_ethnicities[], preferred_politics[], partner_drinking[],
--              partner_cannabis[], partner_tobacco[], partner_other_drugs[],
--              created_at, updated_at
--     NOT in original tier plan — added here because it has RLS disabled.
--     Existing policies (dormant):
--       SELECT: "Authenticated users can read all preferences" — all auth
--       INSERT: "Users can create their own preferences" — auth.uid() = user_id
--       UPDATE: "Users can update their own preferences" — auth.uid() = user_id
--       DELETE: "Users can delete their own preferences" — auth.uid() = user_id
--     Frontend queries:
--       profileService.ts:240,362   SELECT/UPDATE by user_id
--       developmentDataService.ts:178 INSERT
--
-- 17. match_exits (20260214000006_matches.sql)
--     Columns: id, match_id, exiting_user_id, exit_reason, exit_details,
--              messages_exchanged, days_since_match, created_at, updated_at
--     NOT in original tier plan — added here because it has RLS disabled.
--     Existing policies (dormant):
--       SELECT: subquery — EXISTS match WHERE user is participant
--       INSERT: auth.uid() = exiting_user_id
--     Frontend queries:
--       communityBackendService.ts:915  INSERT exit record
--       communityBackendService.ts:1161 SELECT by match_id
--       matchService.ts:336            SELECT
--
-- ============================================

-- -----------------------------------------------
-- 11. deep_question_answers — re-enable RLS
-- -----------------------------------------------
-- Existing SELECT/INSERT/UPDATE/DELETE policies are correct.
ALTER TABLE deep_question_answers ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 12. friend_codes — re-enable RLS
-- -----------------------------------------------
-- Existing SELECT policies are correct (own code + public lookup by code value).
-- No INSERT policy needed — codes created by handle_new_user_friend_code() trigger
-- which is SECURITY DEFINER.
ALTER TABLE friend_codes ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 13. friend_recommendations — ADD missing SELECT policy
-- -----------------------------------------------
-- RLS is already enabled but has NO policies, causing frontend queries to return 0 rows.
-- This has been broken since the table was created. Adding the missing SELECT policy.

-- Users can see their own recommendations (where they are the recommender)
CREATE POLICY "Users can view their own recommendations"
    ON friend_recommendations FOR SELECT
    USING (auth.uid() = recommender_id);

-- No INSERT/UPDATE/DELETE policies: all writes via submit-recommendation edge function
-- (service role bypasses RLS).

-- -----------------------------------------------
-- 14. pool_vote_assignments — NO CHANGES (RLS already enabled)
-- -----------------------------------------------
-- Policies verified correct:
--   "Users can view own pool assignments" SELECT (voter_id = auth.uid())
--   "Service role can insert pool assignments" INSERT (TRUE)
--   "Users can update own pool assignments" UPDATE (voter_id = auth.uid())

-- -----------------------------------------------
-- 15. blocked_users — re-enable RLS + widen SELECT
-- -----------------------------------------------
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Drop the too-narrow SELECT policy (only checked user_id for outgoing blocks)
DROP POLICY IF EXISTS "Users can view their own blocked users" ON blocked_users;

-- New SELECT: users can see blocks where they are either the blocker or the blocked.
-- Required because getBlockedUserIds() (blockService.ts:259-277) queries BOTH
-- outgoing (user_id = me) and incoming (blocked_user_id = me) to build the full
-- bidirectional block list.
CREATE POLICY "Users can view blocks involving them"
    ON blocked_users FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = blocked_user_id);

-- INSERT and DELETE policies remain unchanged:
--   "Users can block other users" INSERT (auth.uid() = user_id) — correct
--   "Users can unblock other users" DELETE (auth.uid() = user_id) — correct

-- -----------------------------------------------
-- 16. user_preferences — re-enable RLS
-- -----------------------------------------------
-- Existing SELECT/INSERT/UPDATE/DELETE policies are correct.
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 17. match_exits — re-enable RLS
-- -----------------------------------------------
-- Existing SELECT (match participant subquery) and INSERT (exiting user) policies
-- are correct.
ALTER TABLE match_exits ENABLE ROW LEVEL SECURITY;


-- ============================================
-- FRONTEND IMPACT REPORT — TIER 3
-- ============================================
--
-- deep_question_answers:
--   ✅ profileService.ts SELECT → authenticated read-all ✓
--   ✅ developerService.ts SELECT/UPSERT → eq('user_id') ✓
--   ✅ developmentDataService.ts:168 INSERT → auth.uid() = user_id ✓
--
-- friend_codes:
--   ✅ friendService.ts:129,208 SELECT → eq('user_id') matches own-code policy ✓
--   ✅ RPC add_friend_by_code → SECURITY DEFINER ✓
--   ⚠️  developmentDataService.ts:328 INSERT → WILL FAIL (no INSERT policy)
--       FOLLOW-UP: Dev data service needs RPC or trigger for test friend codes.
--
-- friend_recommendations:
--   ✅ communityBackendService.ts:562 SELECT eq('recommender_id') → NEW policy ✓
--       (Previously returned 0 rows — this fixes an existing bug!)
--   ✅ communityBackendService.ts:997 SELECT eq('recommender_id') → NEW policy ✓
--   ✅ Edge fn submit-recommendation INSERT → service role ✓
--
-- pool_vote_assignments:
--   ✅ No changes — existing policies verified correct ✓
--   ✅ communityBackendService.ts:376 UPDATE → voter_id = auth.uid() ✓
--
-- blocked_users:
--   ✅ blockService.ts:84 SELECT outgoing → auth.uid() = user_id ✓
--   ✅ blockService.ts:95 INSERT → auth.uid() = user_id ✓
--   ✅ blockService.ts:157 SELECT outgoing → auth.uid() = user_id ✓
--   ✅ blockService.ts:180 DELETE → auth.uid() = user_id ✓
--   ✅ blockService.ts:264 SELECT outgoing → auth.uid() = user_id ✓
--   ✅ blockService.ts:269 SELECT incoming → auth.uid() = blocked_user_id → NEW policy ✓
--       (Previously would have returned 0 rows)
--   ✅ blockService.ts:291 SELECT count → auth.uid() = user_id ✓
--   ✅ messageService.ts:272 SELECT → auth.uid() = user_id ✓
--
-- user_preferences:
--   ✅ profileService.ts SELECT/UPDATE → policies match ✓
--   ✅ developmentDataService.ts INSERT → auth.uid() = user_id ✓
--
-- match_exits:
--   ✅ communityBackendService.ts:915 INSERT → exiting_user_id = auth.uid() ✓
--   ✅ communityBackendService.ts:1161 SELECT → match participant subquery ✓
--   ✅ matchService.ts:336 SELECT → match participant subquery ✓
--
