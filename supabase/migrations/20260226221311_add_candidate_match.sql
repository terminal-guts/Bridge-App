-- Add candidate_match to proposal_status enum (if enum exists)
-- Note: proposals table uses TEXT with CHECK constraints, not an enum type.
-- This migration is kept for history but the DO block handles the missing type gracefully.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
    EXECUTE $sql$ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'candidate_match'$sql$;
  END IF;
END $$;