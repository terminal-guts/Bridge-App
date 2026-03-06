-- Tighten RLS on proposals table: restrict UPDATE to proposal participants only
-- Edge functions use service_role which bypasses RLS, so they are unaffected.

-- Drop the overly-permissive update policy
DROP POLICY IF EXISTS "Authenticated users can update proposals" ON proposals;

-- Create a restricted update policy: only the subject or candidate can update
CREATE POLICY "Proposal participants can update proposals"
  ON proposals FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Add vote_weight column to proposal_votes for accurate weight tracking
-- This fixes the edge case where tier changes between votes cause tally drift
ALTER TABLE proposal_votes ADD COLUMN IF NOT EXISTS vote_weight NUMERIC DEFAULT 1.0;

-- Add soft-delete columns to user_profiles for account deletion
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ DEFAULT NULL;
