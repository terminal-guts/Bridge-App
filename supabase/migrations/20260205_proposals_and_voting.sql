-- Migration: Proposals and Voting System
-- Creates tables for community-driven matchmaking proposals, voting, and analytics

-- ============================================================================
-- 1. Proposals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'voting'
      CHECK (status IN ('voting', 'approved', 'rejected', 'expired')),
    match_score NUMERIC(5,2),
    yes_votes INTEGER DEFAULT 0,
    no_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    yes_percentage NUMERIC(5,2) DEFAULT 0,
    confidence_score NUMERIC(5,2) DEFAULT 0,
    voting_expires_at TIMESTAMPTZ NOT NULL,
    proposal_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT proposals_unique_pair UNIQUE (user_a_id, user_b_id),
    CONSTRAINT proposals_no_self_match CHECK (user_a_id <> user_b_id)
);

-- Index for querying active proposals
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_user_a ON public.proposals(user_a_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_b ON public.proposals(user_b_id);

-- ============================================================================
-- 2. Proposal Votes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('YES', 'NO', 'PUSH_TO_FRIEND')),
    vote_weight NUMERIC(3,2) DEFAULT 1.0,
    friend_push_target_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT proposal_votes_unique UNIQUE (proposal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON public.proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_voter ON public.proposal_votes(voter_id);

-- ============================================================================
-- 3. Daily Proposal Assignments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_proposal_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    has_voted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT daily_assignments_unique UNIQUE (user_id, proposal_id, assignment_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_assignments_user_date
  ON public.daily_proposal_assignments(user_id, assignment_date);

-- ============================================================================
-- 4. Rejected Pairs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rejected_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rejection_source TEXT NOT NULL
      CHECK (rejection_source IN ('community_vote', 'expired', 'user_declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT rejected_pairs_unique UNIQUE (user_a_id, user_b_id)
);

-- ============================================================================
-- 5. Candidate Matches Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.candidate_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    community_score NUMERIC(5,2),
    confidence_score NUMERIC(5,2),
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_matches_users
  ON public.candidate_matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_candidate_matches_status
  ON public.candidate_matches(status);

-- ============================================================================
-- 6. Proposal Analytics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    total_votes INTEGER DEFAULT 0,
    time_to_consensus_hours NUMERIC(8,2),
    vote_distribution JSONB DEFAULT '{}'::jsonb,
    final_status TEXT NOT NULL
      CHECK (final_status IN ('approved', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. Triggers
-- ============================================================================

-- 7a. Update proposal aggregates on vote insert
CREATE OR REPLACE FUNCTION public.update_proposal_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_yes INTEGER;
  v_no INTEGER;
  v_total INTEGER;
  v_yes_pct NUMERIC(5,2);
  v_confidence NUMERIC(5,2);
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN vote_type = 'YES' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote_type = 'NO' THEN 1 ELSE 0 END), 0),
    COUNT(*)
  INTO v_yes, v_no, v_total
  FROM public.proposal_votes
  WHERE proposal_id = NEW.proposal_id;

  v_yes_pct := CASE WHEN v_total > 0 THEN (v_yes::NUMERIC / v_total) * 100 ELSE 0 END;

  -- Confidence score: higher with more votes, scales logarithmically
  v_confidence := LEAST(100, (LN(v_total + 1) / LN(21)) * 100);

  UPDATE public.proposals
  SET
    yes_votes = v_yes,
    no_votes = v_no,
    total_votes = v_total,
    yes_percentage = v_yes_pct,
    confidence_score = v_confidence,
    updated_at = NOW()
  WHERE id = NEW.proposal_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_proposal_aggregates ON public.proposal_votes;
CREATE TRIGGER trg_update_proposal_aggregates
  AFTER INSERT ON public.proposal_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposal_aggregates();

-- 7b. Promote approved proposal to candidate_match
CREATE OR REPLACE FUNCTION public.promote_approved_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.candidate_matches (
      proposal_id,
      user_a_id,
      user_b_id,
      community_score,
      confidence_score,
      status
    ) VALUES (
      NEW.id,
      NEW.user_a_id,
      NEW.user_b_id,
      NEW.yes_percentage,
      NEW.confidence_score,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_approved_proposal ON public.proposals;
CREATE TRIGGER trg_promote_approved_proposal
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_approved_proposal();

-- 7c. Record proposal analytics when status changes to terminal state
CREATE OR REPLACE FUNCTION public.record_proposal_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hours NUMERIC(8,2);
  v_distribution JSONB;
BEGIN
  IF NEW.status IN ('approved', 'rejected', 'expired')
     AND OLD.status NOT IN ('approved', 'rejected', 'expired') THEN

    -- Calculate time to consensus
    v_hours := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600.0;

    -- Build vote distribution
    SELECT jsonb_build_object(
      'yes', COALESCE(SUM(CASE WHEN vote_type = 'YES' THEN 1 ELSE 0 END), 0),
      'no', COALESCE(SUM(CASE WHEN vote_type = 'NO' THEN 1 ELSE 0 END), 0),
      'push_to_friend', COALESCE(SUM(CASE WHEN vote_type = 'PUSH_TO_FRIEND' THEN 1 ELSE 0 END), 0)
    ) INTO v_distribution
    FROM public.proposal_votes
    WHERE proposal_id = NEW.id;

    INSERT INTO public.proposal_analytics (
      proposal_id,
      total_votes,
      time_to_consensus_hours,
      vote_distribution,
      final_status
    ) VALUES (
      NEW.id,
      NEW.total_votes,
      v_hours,
      COALESCE(v_distribution, '{}'::jsonb),
      NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_proposal_analytics ON public.proposals;
CREATE TRIGGER trg_record_proposal_analytics
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.record_proposal_analytics();

-- Apply updated_at trigger to new tables
DROP TRIGGER IF EXISTS set_proposals_updated_at ON public.proposals;
CREATE TRIGGER set_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_candidate_matches_updated_at ON public.candidate_matches;
CREATE TRIGGER set_candidate_matches_updated_at
  BEFORE UPDATE ON public.candidate_matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 8. RLS Policies
-- ============================================================================

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_proposal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejected_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_analytics ENABLE ROW LEVEL SECURITY;

-- Proposals: users can view proposals they're assigned to vote on or are part of
DROP POLICY IF EXISTS "Users can view assigned or own proposals" ON public.proposals;
CREATE POLICY "Users can view assigned or own proposals"
  ON public.proposals FOR SELECT
  USING (
    auth.uid() = user_a_id
    OR auth.uid() = user_b_id
    OR id IN (
      SELECT proposal_id FROM public.daily_proposal_assignments
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage proposals" ON public.proposals;
CREATE POLICY "Service role can manage proposals"
  ON public.proposals FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Proposal Votes: users can only insert their own votes
DROP POLICY IF EXISTS "Users can insert own votes" ON public.proposal_votes;
CREATE POLICY "Users can insert own votes"
  ON public.proposal_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can view own votes" ON public.proposal_votes;
CREATE POLICY "Users can view own votes"
  ON public.proposal_votes FOR SELECT
  USING (auth.uid() = voter_id);

-- Daily Proposal Assignments: users can only see their own
DROP POLICY IF EXISTS "Users can view own assignments" ON public.daily_proposal_assignments;
CREATE POLICY "Users can view own assignments"
  ON public.daily_proposal_assignments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assignments" ON public.daily_proposal_assignments;
CREATE POLICY "Users can update own assignments"
  ON public.daily_proposal_assignments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage assignments" ON public.daily_proposal_assignments;
CREATE POLICY "Service role can manage assignments"
  ON public.daily_proposal_assignments FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Rejected Pairs: service role only
DROP POLICY IF EXISTS "Service role can manage rejected pairs" ON public.rejected_pairs;
CREATE POLICY "Service role can manage rejected pairs"
  ON public.rejected_pairs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Candidate Matches: users can view their own
DROP POLICY IF EXISTS "Users can view own candidate matches" ON public.candidate_matches;
CREATE POLICY "Users can view own candidate matches"
  ON public.candidate_matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

DROP POLICY IF EXISTS "Service role can manage candidate matches" ON public.candidate_matches;
CREATE POLICY "Service role can manage candidate matches"
  ON public.candidate_matches FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Analytics: service role only
DROP POLICY IF EXISTS "Service role can manage analytics" ON public.proposal_analytics;
CREATE POLICY "Service role can manage analytics"
  ON public.proposal_analytics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 9. View: proposal_stats (daily summary)
-- ============================================================================

CREATE OR REPLACE VIEW public.proposal_stats AS
SELECT
  DATE(created_at) AS stat_date,
  COUNT(*) AS total_proposals,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
  ROUND(AVG(total_votes), 1) AS avg_votes,
  ROUND(AVG(yes_percentage), 1) AS avg_yes_percentage,
  ROUND(AVG(
    CASE WHEN status IN ('approved', 'rejected', 'expired')
      THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0
      ELSE NULL
    END
  ), 1) AS avg_hours_to_resolution
FROM public.proposals
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;
