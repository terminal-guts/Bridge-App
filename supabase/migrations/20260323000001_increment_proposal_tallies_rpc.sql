-- Atomic RPC for incrementing proposal vote tallies.
-- Called by process-vote edge function to avoid read-modify-write races.
-- All parameters are signed deltas (can be negative for vote changes).
-- SECURITY: callable only by service_role (PostgREST anon/authenticated are blocked).
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
  -- Internal authorization guard: only service_role may call this function.
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
  WHERE id = p_proposal_id;
END;
$$;

-- Restrict execute permission to service_role only.
REVOKE EXECUTE ON FUNCTION increment_proposal_tallies(uuid,integer,integer,integer,integer,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_proposal_tallies(uuid,integer,integer,integer,integer,numeric,numeric) TO service_role;
