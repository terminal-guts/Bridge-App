-- ============================================
-- Auto-expire proposals when subject pauses/suspends (proposal-gate-overhaul)
-- ============================================
-- When a user toggles is_paused=true or is_suspended=true, any pending or
-- deciding proposals involving them are immediately marked 'expired'.
-- This frees the other subject for the next matchmaking cycle and removes
-- the proposal from every gate (gate filters by status='pending').
--
-- No karma is adjusted on this expiration — the community had no way to
-- predict the subject's action, so accuracy is undefined.  Voters who
-- already got karma at a prior 'deciding' transition keep that karma
-- (consistent with subject-no-show-on-deciding behavior).
--
-- The trigger fires on UPDATE OF is_paused or is_suspended only, so routine
-- profile edits don't run it.

CREATE OR REPLACE FUNCTION auto_expire_user_active_proposals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when the flag transitions false→true.  NULL treated as false
  -- via COALESCE to handle first-time sets cleanly.
  IF (NEW.is_paused = true AND COALESCE(OLD.is_paused, false) = false)
     OR (NEW.is_suspended = true AND COALESCE(OLD.is_suspended, false) = false) THEN
    UPDATE proposals
    SET status = 'expired',
        expired_at = NOW(),
        updated_at = NOW()
    WHERE (user_a_id = NEW.user_id OR user_b_id = NEW.user_id)
      AND status IN ('pending', 'deciding');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_expire_on_pause ON user_profiles;
CREATE TRIGGER trg_auto_expire_on_pause
AFTER UPDATE OF is_paused, is_suspended ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION auto_expire_user_active_proposals();

COMMENT ON FUNCTION auto_expire_user_active_proposals IS 'Expires pending/deciding proposals when subject pauses or is suspended. Part of gate-overhaul-v2 — ensures stale proposals disappear from gates instantly.';
COMMENT ON TRIGGER trg_auto_expire_on_pause ON user_profiles IS 'Auto-expire any pending/deciding proposals a user is subject of when they pause or are suspended.';
