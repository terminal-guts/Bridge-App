-- ============================================
-- Karma outcome v2 (proposal-gate-overhaul)
-- ============================================
-- Simplifies the karma-on-outcome model:
--   +3 for "accurate" votes (matched the community's eventual decision)
--   -1 for "inaccurate" votes (went against the community's decision)
--
-- "Accurate" definitions:
--   vote YES + proposal moved to deciding  → accurate → +3
--   vote NO  + proposal moved to deciding  → inaccurate → -1
--   vote NO  + proposal rejected            → accurate → +3
--   vote YES + proposal rejected            → inaccurate → -1
--
-- Old model had a +10 "assist" bonus and a +2/+3 accurate split — both removed
-- for simplicity.  The +1-per-vote participation reward is unchanged; it still
-- fires via increment_karma_for_vote in process-vote.
--
-- Idempotency: each proposal carries a karma_applied flag.  First call to
-- apply_karma_on_outcome flips it to true and disburses karma; subsequent
-- calls are no-ops.
--
-- Scope: forward-only.  Proposals currently in 'deciding' or 'rejected' that
-- were evaluated under the old RPC will NOT get retroactive karma.  New calls
-- to this RPC apply the new model.

-- 1. Idempotency column on proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS karma_applied BOOLEAN DEFAULT false;

-- 2. Rewrite the RPC.  Note: CREATE OR REPLACE preserves grants/privileges.
CREATE OR REPLACE FUNCTION apply_karma_on_outcome(p_proposal_id UUID, p_outcome TEXT)
RETURNS void AS $$
DECLARE
  v_was_unapplied INTEGER;
BEGIN
  -- Atomically check-and-set the idempotency flag.
  UPDATE proposals
  SET karma_applied = true
  WHERE id = p_proposal_id AND karma_applied = false;

  GET DIAGNOSTICS v_was_unapplied = ROW_COUNT;

  IF v_was_unapplied = 0 THEN
    -- Already applied (or proposal doesn't exist) — no-op.
    RETURN;
  END IF;

  -- Apply +3 (accurate) or -1 (inaccurate) per vote on this proposal.
  -- GREATEST(0, ...) prevents negative karma.
  -- UNSURE and RECOMMEND votes get no outcome karma (only the +1 at vote time).
  -- Voters whose karma_scores row is missing (deleted account) are silently skipped
  -- via the join — no error, no insert.
  UPDATE karma_scores k
  SET karma_points = GREATEST(0, k.karma_points + CASE
    WHEN p_outcome = 'deciding' AND pv.vote_type = 'YES' THEN 3
    WHEN p_outcome = 'deciding' AND pv.vote_type = 'NO'  THEN -1
    WHEN p_outcome = 'rejected' AND pv.vote_type = 'NO'  THEN 3
    WHEN p_outcome = 'rejected' AND pv.vote_type = 'YES' THEN -1
    ELSE 0
  END),
  updated_at = NOW()
  FROM proposal_votes pv
  WHERE pv.proposal_id = p_proposal_id
    AND k.user_id = pv.voter_user_id
    AND pv.vote_type IN ('YES', 'NO');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN proposals.karma_applied IS 'Set true by apply_karma_on_outcome on first call; prevents double-grant.';
COMMENT ON FUNCTION apply_karma_on_outcome IS 'v2 model: +3 accurate, -1 inaccurate. Idempotent via proposals.karma_applied. Silently skips voters whose karma_scores row is missing.';
