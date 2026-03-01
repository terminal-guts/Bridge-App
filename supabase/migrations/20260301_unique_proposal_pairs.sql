-- ============================================
-- Unique Pairing Constraint on Proposals
-- ============================================
-- Ensures the same two users cannot have duplicate active proposals.
-- Uses LEAST/GREATEST for order-independent matching (A,B == B,A).
-- Only enforced for active statuses — expired/rejected/declined pairs can be re-proposed.

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_proposal_pair
ON proposals (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
WHERE status NOT IN ('expired', 'rejected', 'declined');
