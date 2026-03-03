/**
 * Proposal API Service
 *
 * Real backend integration for the proposal system.
 * Calls Supabase Edge Functions (replaces former FastAPI dependency).
 */

import { supabase } from '../lib/supabase';
import type {
  Proposal,
  ProposalVoteType,
  VoteResult,
} from '../types/community';

// ============================================================================
// Proposal Generation (Admin/Cron)
// ============================================================================

export async function generateProposals(maxProposals: number = 50): Promise<{
  status: string;
  eligible_users: number;
  proposals_created: number;
  pool_voters_assigned: number;
}> {
  const { data, error } = await supabase.functions.invoke('generate-proposals', {
    body: { max_proposals: maxProposals },
  });
  if (error) throw new Error(`Generate proposals failed: ${error.message}`);
  return data;
}

// ============================================================================
// Voting
// ============================================================================

export async function getProposalsForVoting(_userId: string): Promise<{
  proposals: any[];
  pool_count: number;
  friend_count: number;
}> {
  // Edge Function extracts user ID from JWT — no need to pass userId
  const { data, error } = await supabase.functions.invoke('get-proposals-for-voting');
  if (error) throw new Error(`Fetch proposals failed: ${error.message}`);
  return data;
}

export async function castProposalVote(
  proposalId: string,
  _voterId: string,
  voteType: ProposalVoteType,
  recommendToId?: string,
): Promise<VoteResult> {
  // Edge Function extracts voter ID from JWT — no need to pass voterId
  const { data, error } = await supabase.functions.invoke('process-vote', {
    body: {
      proposal_id: proposalId,
      vote_type: voteType,
      recommend_to_id: recommendToId,
    },
  });
  if (error) throw new Error(`Cast vote failed: ${error.message}`);
  return data;
}

// ============================================================================
// User Decisions (Accept/Decline)
// ============================================================================

export async function getPendingDecisions(userId: string): Promise<{
  proposals: any[];
}> {
  // Direct Supabase query — no Edge Function needed
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .in('status', ['deciding', 'expired']);

  if (error) throw new Error(`Fetch pending decisions failed: ${error.message}`);

  if (!proposals || proposals.length === 0) {
    return { proposals: [] };
  }

  // Collect partner IDs for profile enrichment
  const partnerIds = proposals.map(p =>
    p.user_a_id === userId ? p.user_b_id : p.user_a_id
  );

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', partnerIds);

  const profileMap = new Map<string, any>();
  (profiles || []).forEach(p => profileMap.set(p.user_id, p));

  // Enrich proposals with partner profile
  const enriched = proposals.map(p => {
    const partnerId = p.user_a_id === userId ? p.user_b_id : p.user_a_id;
    return {
      ...p,
      partner_profile: profileMap.get(partnerId) || null,
    };
  });

  return { proposals: enriched };
}

export async function decideOnProposal(
  proposalId: string,
  _userId: string,
  decision: 'accepted' | 'declined',
): Promise<{
  status: string;
  proposal_status: string;
  your_decision: string;
}> {
  // Edge Function extracts user ID from JWT — no need to pass userId
  const { data, error } = await supabase.functions.invoke('process-decision', {
    body: { proposal_id: proposalId, decision },
  });
  if (error) throw new Error(`Decision failed: ${error.message}`);
  return data;
}

// ============================================================================
// Lifecycle (Admin/Cron)
// ============================================================================

export async function triggerLifecycleCheck(): Promise<{
  status: string;
  proposals_checked: number;
  confirmed: number;
  rejected: number;
  expired_sent: number;
}> {
  const { data, error } = await supabase.functions.invoke('proposal-lifecycle');
  if (error) throw new Error(`Lifecycle check failed: ${error.message}`);
  return data;
}

// ============================================================================
// New User Assignment
// ============================================================================

export async function assignNewUserProposals(): Promise<{ assigned: number }> {
  const { data, error } = await supabase.functions.invoke('assign-new-user-proposals');
  if (error) throw new Error(`Assign new user proposals failed: ${error.message}`);
  return data;
}

// ============================================================================
// Helper: Transform backend proposal to frontend Proposal type
// ============================================================================

export function transformBackendProposal(raw: any): Partial<Proposal> {
  return {
    id: raw.id,
    status: raw.status,
    poolYesVotes: raw.pool_yes_votes || 0,
    poolNoVotes: raw.pool_no_votes || 0,
    friendYesVotes: raw.friend_yes_votes || 0,
    friendNoVotes: raw.friend_no_votes || 0,
    yesVotes: (raw.pool_yes_votes || 0) + (raw.friend_yes_votes || 0),
    noVotes: (raw.pool_no_votes || 0) + (raw.friend_no_votes || 0),
    totalVotes:
      (raw.pool_yes_votes || 0) + (raw.pool_no_votes || 0) +
      (raw.friend_yes_votes || 0) + (raw.friend_no_votes || 0),
    poolEligible: raw.pool_eligible ?? true,
    compatibilityScore: raw.compatibility_score || 0,
    categoryScores: raw.category_scores,
    votingStartedAt: raw.voting_started_at,
    confirmedAt: raw.confirmed_at,
    rejectedAt: raw.rejected_at,
    expiredAt: raw.expired_at,
    sentToUsersAt: raw.sent_to_users_at,
    decisionDeadlineAt: raw.decision_deadline_at,
    userADecision: raw.user_a_decision,
    userBDecision: raw.user_b_decision,
    userADecidedAt: raw.user_a_decided_at,
    userBDecidedAt: raw.user_b_decided_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    voteContext: raw.vote_context,
    isFriendVote: raw.is_friend_vote,
    userAProfile: raw.user_a_profile,
    userBProfile: raw.user_b_profile,
  };
}

