-- ============================================
-- C2: Tighten increment_proposal_tallies RPC with a status='pending' guard
-- ============================================
-- The UPDATE itself is already atomic — PostgreSQL holds a row lock for the
-- duration of a single-row column-expression UPDATE, and concurrent callers
-- serialize cleanly.  The remaining race is this sequence:
--
--   t0: process-vote reads proposal.status = 'pending'
--   t1: subject flips is_paused=true → trg_auto_expire_on_pause fires, sets
--       proposal.status = 'expired'
--   t2: process-vote INSERT into proposal_votes succeeds (row is preserved)
--   t3: process-vote calls increment_proposal_tallies — now the proposal is
--       expired, but the tally counter still ticks up
--
-- Today the tick is harmless because the lifecycle cron ignores non-pending
-- proposals, but the counter drifts from ground truth and shows up in
-- audit/debug queries.  The fix is to only increment when the proposal is
-- still pending at UPDATE time.
--
-- Safety:
--  * Rewrites via CREATE OR REPLACE FUNCTION — signature unchanged, existing
--    callers unaffected.
--  * Preserves GREATEST(0, ...) floor protection (no semantic change).
--  * REVOKE/GRANT re-asserts service_role-only executability.
--  * If the proposal is no longer pending, the UPDATE is a silent no-op —
--    process-vote already ignores tallyErr, and there's no error to ignore.

CREATE OR REPLACE FUNCTION increment_proposal_tallies(
  p_proposal_id UUID,
  p_pool_yes    INTEGER,
  p_pool_no     INTEGER,
  p_friend_yes  INTEGER,
  p_friend_no   INTEGER,
  p_weighted_yes NUMERIC,
  p_weighted_no  NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' <> 'service_role'
     AND SESSION_USER <> 'postgres' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE proposals
  SET
    pool_yes_votes    = GREATEST(0, pool_yes_votes    + p_pool_yes),
    pool_no_votes     = GREATEST(0, pool_no_votes     + p_pool_no),
    friend_yes_votes  = GREATEST(0, friend_yes_votes  + p_friend_yes),
    friend_no_votes   = GREATEST(0, friend_no_votes   + p_friend_no),
    weighted_yes      = GREATEST(0, weighted_yes      + p_weighted_yes),
    weighted_no       = GREATEST(0, weighted_no       + p_weighted_no),
    updated_at        = now()
  WHERE id = p_proposal_id
    AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_proposal_tallies(uuid,integer,integer,integer,integer,numeric,numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION increment_proposal_tallies(uuid,integer,integer,integer,integer,numeric,numeric) TO service_role;

COMMENT ON FUNCTION increment_proposal_tallies(uuid,integer,integer,integer,integer,numeric,numeric) IS
  'Atomic tally delta RPC. Skips non-pending proposals to avoid tick-after-expiry drift (C2 in proposal-gate-overhaul).';
