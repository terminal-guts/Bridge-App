-- Add candidate_match to proposal_status enum
ALTER TYPE proposal_status
ADD VALUE IF NOT EXISTS 'candidate_match';