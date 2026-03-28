-- ============================================================
-- reset-reviewer-demo.sql
-- Run this in the Supabase SQL Editor before every App Store submission.
-- Refreshes the reviewer account so it has a full, working demo experience.
--
-- Safe to run multiple times (idempotent).
-- Does NOT touch real user data.
-- ============================================================

DO $$
DECLARE
  reviewer_id  UUID := '8b63fbb9-9b91-46eb-9d45-7ad0942affc6';
  match_id     UUID := 'b0afd4ac-ed00-41a4-837d-e31aea837cc6'; -- reviewer <-> Carter

  -- Reviewer's demo friends (permanent test accounts)
  carter_id    UUID := '8d24c252-d636-44c8-86ad-72e7381482b8';
  sam_id       UUID := '156e5f79-3950-482e-99a4-d858d6084794';
  abby_id      UUID := 'd8aa2e79-f4cf-4d52-b5aa-03a0c13a0c88';
  mo_id        UUID := 'db0bd2fd-9fb8-41ef-bdf6-0bddf0661458';
  ava_id       UUID := 'd909b1d9-60f6-4a9a-b4b7-e945e8208e87';
  oneal_id     UUID := 'e0238639-7c48-413f-a39c-9c2a04ae4812';
  devin_id     UUID := 'f0efb78a-522f-4015-84f2-e99ded20da3e';

BEGIN

  -- --------------------------------------------------------
  -- 1. Refresh the reviewer's active match with Carter
  --    Reset expiry to 14 days, keep the chat history
  -- --------------------------------------------------------
  UPDATE matches
  SET
    status          = 'active',
    expires_at      = now() + interval '14 days',
    user_1_decision = 'accepted',
    user_2_decision = 'accepted'
  WHERE id = match_id;

  -- --------------------------------------------------------
  -- 2. Wipe old demo proposals (expired or already voted on)
  --    Only deletes proposals between these known demo users.
  --    Never touches real user proposals.
  -- --------------------------------------------------------
  DELETE FROM proposal_votes
  WHERE proposal_id IN (
    SELECT id FROM proposals
    WHERE (user_a_id, user_b_id) IN (
      (carter_id, ava_id), (ava_id, carter_id),
      (oneal_id, abby_id), (abby_id, oneal_id),
      (mo_id, devin_id),   (devin_id, mo_id),
      (oneal_id, sam_id),  (sam_id, oneal_id),
      (carter_id, sam_id), (sam_id, carter_id)
    )
  );

  DELETE FROM proposals
  WHERE (user_a_id, user_b_id) IN (
    (carter_id, ava_id), (ava_id, carter_id),
    (oneal_id, abby_id), (abby_id, oneal_id),
    (mo_id, devin_id),   (devin_id, mo_id),
    (oneal_id, sam_id),  (sam_id, oneal_id),
    (carter_id, sam_id), (sam_id, carter_id)
  );

  -- --------------------------------------------------------
  -- 3. Seed 3 fresh proposals the reviewer can vote on
  --    All pool_eligible so they appear in Community tab.
  --    Staggered expiry so they don't all die on the same day.
  -- --------------------------------------------------------
  INSERT INTO proposals (
    id, user_a_id, user_b_id, status,
    compatibility_score, pool_yes_votes, pool_no_votes,
    pool_eligible, creation_type,
    voting_started_at, voting_expires_at
  ) VALUES
    -- Carter (M) + Ava (F) — reviewer knows both, feels personal
    (gen_random_uuid(), carter_id, ava_id, 'pending',
     83.0, 1, 0, true, 'algorithm',
     now(), now() + interval '6 days'),

    -- Oneal (M) + Abby (F)
    (gen_random_uuid(), oneal_id, abby_id, 'pending',
     76.0, 2, 1, true, 'algorithm',
     now(), now() + interval '4 days'),

    -- Mo (M) + Devin (F)
    (gen_random_uuid(), mo_id, devin_id, 'pending',
     79.0, 0, 0, true, 'algorithm',
     now(), now() + interval '5 days');

  -- --------------------------------------------------------
  -- 4. Clear any votes the reviewer cast on these proposals
  --    so they can vote fresh
  -- --------------------------------------------------------
  DELETE FROM proposal_votes
  WHERE voter_user_id = reviewer_id
  AND proposal_id IN (
    SELECT id FROM proposals
    WHERE status = 'pending'
    AND pool_eligible = true
    AND voting_expires_at > now()
  );

  RAISE NOTICE 'Reviewer demo reset complete.';
  RAISE NOTICE '  Match with Carter: expires in 14 days';
  RAISE NOTICE '  3 fresh proposals seeded and ready to vote';

END $$;
