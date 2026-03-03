-- ============================================
-- Proposal Enforcement Constraints
-- ============================================
-- 1. Permanently block rejected/declined pairs (same pair can never be re-proposed)
-- 2. One active proposal per user at a time
-- 3. Replace the previous unique_active_proposal_pair index

-- Drop the old partial unique index (only blocked active statuses)
DROP INDEX IF EXISTS unique_active_proposal_pair;

-- NEW: Permanent pair uniqueness — rejected/declined pairs can NEVER be re-proposed.
-- Only expired proposals allow the same pair to try again.
CREATE UNIQUE INDEX IF NOT EXISTS unique_proposal_pair_permanent
ON proposals (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
WHERE status NOT IN ('expired');

-- NEW: Each user can only be in ONE active proposal at a time (as user_a)
CREATE UNIQUE INDEX IF NOT EXISTS one_active_proposal_per_user_a
ON proposals (user_a_id)
WHERE status IN ('pending', 'deciding');

-- NEW: Each user can only be in ONE active proposal at a time (as user_b)
CREATE UNIQUE INDEX IF NOT EXISTS one_active_proposal_per_user_b
ON proposals (user_b_id)
WHERE status IN ('pending', 'deciding');
