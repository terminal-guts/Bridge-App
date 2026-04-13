-- ============================================================================
-- reset-reviewer-demo.sql — Refresh Demo Bubble Before App Store Submission
-- ============================================================================
-- Run in the Supabase SQL Editor (or via supabase-exec.sh) BEFORE every
-- App Store submission.  Idempotent — safe to run multiple times.
--
-- Prerequisites: seed-reviewer-data.sql must have been run first.
--
-- This script:
--   1. Cleans up stale matches, proposals, messages, and vote assignments
--   2. Creates an active match (reviewer + Emma) with chat messages
--   3. Creates a linked proposal with endorser votes (for "Matched by" avatars)
--   4. Creates 3 fresh votable proposals between demo users
--
-- ISOLATION: Everything is between demo users only. No real user data touched.
-- See docs/DEMO_ACCOUNTS.md for full bubble rules.
-- ============================================================================

DO $$
DECLARE
  reviewer_id UUID := '8b63fbb9-9b91-46eb-9d45-7ad0942affc6';

  -- Demo user IDs (must match seed-reviewer-data.sql)
  emma_id    UUID := 'd0000001-de10-4000-a000-000000000001';
  jordan_id  UUID := 'd0000002-de10-4000-a000-000000000002';
  sophie_id  UUID := 'd0000003-de10-4000-a000-000000000003';
  marcus_id  UUID := 'd0000004-de10-4000-a000-000000000004';
  lily_id    UUID := 'd0000005-de10-4000-a000-000000000005';
  alex_id    UUID := 'd0000006-de10-4000-a000-000000000006';

  -- Fixed IDs for the match and linked proposal (stable across re-runs)
  -- IMPORTANT: variable named "demo_match_id" (not "match_id") to avoid
  -- collision with the messages.match_id COLUMN in DELETE statements.
  -- PL/pgSQL resolves variable names over column names, so "match_id = match_id"
  -- would evaluate to TRUE for every row and wipe all messages in production.
  demo_match_id       UUID := 'b0000001-de10-4000-a000-000000000010';
  match_proposal_id   UUID := 'c0000001-de10-4000-a000-000000000001';

  -- Fixed IDs for votable proposals
  vote_proposal_1_id  UUID := 'c0000002-de10-4000-a000-000000000002';
  vote_proposal_2_id  UUID := 'c0000003-de10-4000-a000-000000000003';
  vote_proposal_3_id  UUID := 'c0000004-de10-4000-a000-000000000004';

  -- Stale match with Saul (from previous manual seeding)
  stale_match_id      UUID := 'a3d343e9-1d88-4bd7-8efb-27cf4d037e06';

BEGIN

  -- ========================================================================
  -- 1. CLEANUP — Delete all stale demo data
  --    Scoped to reviewer + demo user IDs only. Never touches real users.
  -- ========================================================================

  -- Delete old messages for the stale match with Saul
  DELETE FROM messages WHERE match_id = stale_match_id;

  -- Delete the stale match with Saul
  DELETE FROM matches WHERE id = stale_match_id;

  -- Delete old messages for the demo match
  -- CRITICAL: use "messages.match_id = demo_match_id" to avoid column/variable collision
  DELETE FROM messages WHERE messages.match_id = demo_match_id;

  -- Delete the old demo match (if exists from a previous run)
  DELETE FROM matches WHERE id = demo_match_id;

  -- Delete all pool_vote_assignments for the reviewer
  -- (clears stale assignments so the reviewer sees only demo proposals)
  DELETE FROM pool_vote_assignments WHERE voter_id = reviewer_id;

  -- NOTE: We do NOT blanket-delete all proposal_votes for the reviewer.
  -- Doing so would leave denormalized counts (pool_yes_votes, pool_no_votes)
  -- on real proposals inconsistent.  Votes on demo proposals are cleaned up
  -- by the targeted DELETEs below (by demo proposal_id and demo user_id).

  -- Delete old demo proposals and their votes
  DELETE FROM proposal_votes WHERE proposal_id IN (
    match_proposal_id, vote_proposal_1_id, vote_proposal_2_id, vote_proposal_3_id
  );
  DELETE FROM proposals WHERE id IN (
    match_proposal_id, vote_proposal_1_id, vote_proposal_2_id, vote_proposal_3_id
  );

  -- Also clean up any stale proposals between demo users from previous seed runs
  DELETE FROM proposal_votes WHERE proposal_id IN (
    SELECT id FROM proposals
    WHERE user_a_id IN (emma_id, jordan_id, sophie_id, marcus_id, lily_id, alex_id)
       OR user_b_id IN (emma_id, jordan_id, sophie_id, marcus_id, lily_id, alex_id)
  );
  DELETE FROM proposals
  WHERE user_a_id IN (emma_id, jordan_id, sophie_id, marcus_id, lily_id, alex_id)
     OR user_b_id IN (emma_id, jordan_id, sophie_id, marcus_id, lily_id, alex_id);

  -- Delete any stale proposals involving the reviewer
  DELETE FROM proposal_votes WHERE proposal_id IN (
    SELECT id FROM proposals
    WHERE user_a_id = reviewer_id OR user_b_id = reviewer_id
  );
  DELETE FROM proposals
  WHERE user_a_id = reviewer_id OR user_b_id = reviewer_id;

  RAISE NOTICE 'Cleanup complete — stale demo data removed.';

  -- ========================================================================
  -- 2. CREATE THE MATCHED PROPOSAL (reviewer + Emma)
  --    Status = 'passed_to_match' — this is the normal end state for a
  --    successful proposal.  The match card reads endorser votes from this.
  -- ========================================================================
  INSERT INTO proposals (
    id, user_a_id, user_b_id, status,
    compatibility_score, pool_yes_votes, pool_no_votes,
    friend_yes_votes, friend_no_votes,
    pool_eligible, creation_type,
    voting_started_at, voting_expires_at
  ) VALUES (
    match_proposal_id, reviewer_id, emma_id, 'passed_to_match',
    85.0, 5, 1,
    3, 0,
    true, 'algorithm',
    now() - interval '5 days', now() - interval '2 days'
  );

  -- Insert 3 YES endorser votes from demo friends
  -- These show as "Matched by" avatars on the match card.
  INSERT INTO proposal_votes (proposal_id, voter_user_id, vote_type, is_friend_vote, created_at) VALUES
    (match_proposal_id, jordan_id, 'YES', true, now() - interval '4 days'),
    (match_proposal_id, sophie_id, 'YES', true, now() - interval '4 days'),
    (match_proposal_id, marcus_id, 'YES', false, now() - interval '3 days');

  RAISE NOTICE 'Matched proposal created with 3 endorser YES votes.';

  -- ========================================================================
  -- 3. CREATE THE ACTIVE MATCH (reviewer + Emma)
  --    Linked to the proposal via proposal_id for endorser avatar display.
  -- ========================================================================
  INSERT INTO matches (
    id, user_id_1, user_id_2, status,
    community_score, algorithm_score,
    user_1_decision, user_2_decision,
    proposal_id, matched_at, expires_at
  ) VALUES (
    demo_match_id, reviewer_id, emma_id, 'active',
    85.0, 82.0,
    'accepted', 'accepted',
    match_proposal_id, now() - interval '2 days', now() + interval '14 days'
  );

  RAISE NOTICE 'Active match created: reviewer <-> Emma (ID: %, expires in 14 days).', demo_match_id;

  -- ========================================================================
  -- 4. SEED CHAT MESSAGES (reviewer <-> Emma)
  --    Natural college-student conversation spread over 2 days.
  --    Mix of read and unread messages.
  -- ========================================================================
  INSERT INTO messages (match_id, sender_id, receiver_id, type, content, sent_at, read_at) VALUES
    -- Day 1: Getting to know each other
    (demo_match_id, emma_id, reviewer_id, 'text',
     'Hey! So excited we matched. My friends have been telling me about you!',
     now() - interval '2 days', now() - interval '2 days'),

    (demo_match_id, reviewer_id, emma_id, 'text',
     'Hi Emma! I know right? I saw we both love cooking and travel. Have you been anywhere fun recently?',
     now() - interval '2 days' + interval '5 minutes', now() - interval '2 days' + interval '10 minutes'),

    (demo_match_id, emma_id, reviewer_id, 'text',
     'I just got back from Austin actually! The food scene there is amazing. Have you been?',
     now() - interval '1 day' - interval '18 hours', now() - interval '1 day' - interval '17 hours'),

    (demo_match_id, reviewer_id, emma_id, 'text',
     'Not yet but it is on my list! Any restaurant recommendations?',
     now() - interval '1 day' - interval '17 hours' + interval '15 minutes', now() - interval '1 day' - interval '16 hours'),

    -- Day 2: Deeper conversation
    (demo_match_id, emma_id, reviewer_id, 'text',
     'Oh definitely! Ill send you my whole list. We should check them out together sometime',
     now() - interval '1 day', now() - interval '23 hours'),

    (demo_match_id, reviewer_id, emma_id, 'text',
     'Id love that! What are you studying at Rice?',
     now() - interval '22 hours', now() - interval '21 hours'),

    (demo_match_id, emma_id, reviewer_id, 'text',
     'Kinesiology! I want to go into sports medicine eventually. What about you?',
     now() - interval '20 hours', now() - interval '19 hours'),

    (demo_match_id, reviewer_id, emma_id, 'text',
     'Thats so cool! Im in economics but honestly Im more passionate about the startup Im working on',
     now() - interval '18 hours', now() - interval '17 hours'),

    -- Recent messages (one unread from Emma)
    (demo_match_id, emma_id, reviewer_id, 'text',
     'Ooh tell me about it! I love hearing about peoples side projects',
     now() - interval '4 hours', now() - interval '3 hours'),

    (demo_match_id, reviewer_id, emma_id, 'text',
     'Its a social app that helps people find meaningful connections. Kinda meta that we matched on one haha',
     now() - interval '2 hours', now() - interval '1 hour'),

    -- Last message from Emma — UNREAD (read_at = null)
    (demo_match_id, emma_id, reviewer_id, 'text',
     'Haha thats amazing! We should grab coffee this week and you can tell me all about it',
     now() - interval '30 minutes', null);

  RAISE NOTICE 'Chat messages seeded (11 messages, last one unread).';

  -- ========================================================================
  -- 5. CREATE 3 VOTABLE PROPOSALS (between demo users only)
  --    These appear in the Community tab voting gate.
  --    Staggered expiry so they don't all die on the same day.
  --
  --    CRITICAL: pool_eligible = FALSE so real users never see these.
  --    The reviewer sees them via pre-created pool_vote_assignments +
  --    a filter in get-proposals-for-voting that includes pre-assigned
  --    proposals regardless of pool_eligible.
  -- ========================================================================
  INSERT INTO proposals (
    id, user_a_id, user_b_id, status,
    compatibility_score, pool_yes_votes, pool_no_votes,
    pool_eligible, creation_type,
    voting_started_at, voting_expires_at
  ) VALUES
    -- Jordan (M) + Lily (F) — 83% compatibility
    (vote_proposal_1_id, jordan_id, lily_id, 'pending',
     83.0, 1, 0, false, 'algorithm',
     now(), now() + interval '6 days'),

    -- Sophie (F) + Alex (M) — 79% compatibility (reversed genders for variety)
    (vote_proposal_2_id, alex_id, sophie_id, 'pending',
     79.0, 0, 0, false, 'algorithm',
     now(), now() + interval '5 days'),

    -- Marcus (M) + Emma (F) — 76% compatibility
    -- Emma is user_b in the 'passed_to_match' proposal, but that status is
    -- excluded from the one_active_proposal_per_user_b unique index
    -- (only 'pending'/'deciding' count), so this is allowed.
    -- NOTE: pool_yes/no set to 0 to prevent immediate lifecycle transition
    -- when the reviewer votes (threshold is 3 pool votes).
    (vote_proposal_3_id, marcus_id, emma_id, 'pending',
     76.0, 0, 0, false, 'algorithm',
     now(), now() + interval '4 days');

  RAISE NOTICE '3 votable proposals created (all between demo users).';

  -- ========================================================================
  -- 6. CREATE POOL VOTE ASSIGNMENTS for the reviewer
  --    These ensure the reviewer can vote on the demo proposals.
  --    The get-proposals-for-voting function also creates assignments
  --    dynamically, but pre-creating them guarantees they appear.
  -- ========================================================================
  INSERT INTO pool_vote_assignments (proposal_id, voter_id, has_voted) VALUES
    (vote_proposal_1_id, reviewer_id, false),
    (vote_proposal_2_id, reviewer_id, false),
    (vote_proposal_3_id, reviewer_id, false)
  ON CONFLICT (proposal_id, voter_id) DO UPDATE SET has_voted = false;

  RAISE NOTICE 'Pool vote assignments created for reviewer.';

  -- ========================================================================
  -- DONE
  -- ========================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo bubble reset complete!';
  RAISE NOTICE '  Match: reviewer <-> Emma (expires in 14 days)';
  RAISE NOTICE '  Chat: 11 messages (last one unread)';
  RAISE NOTICE '  Endorsers: Jordan, Sophie, Marcus (YES votes)';
  RAISE NOTICE '  Votable proposals: Jordan+Lily, Alex+Sophie, Marcus+Lily';
  RAISE NOTICE '========================================';

END $$;
