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
import type { UserProfile } from '../types';

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
  proposals: Record<string, unknown>[];
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
): Promise<VoteResult> {
  // Edge Function extracts voter ID from JWT — no need to pass voterId
  const { data, error } = await supabase.functions.invoke('process-vote', {
    body: {
      proposal_id: proposalId,
      vote_type: voteType,
    },
  });
  if (error) throw new Error(`Cast vote failed: ${error.message}`);
  return data;
}

// ============================================================================
// User Decisions (Accept/Decline)
// ============================================================================

export async function getPendingDecisions(userId: string): Promise<{
  proposals: Record<string, unknown>[];
}> {
  // Direct Supabase query — no Edge Function needed
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .eq('status', 'deciding');

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

  const profileMap = new Map<string, Record<string, unknown>>();
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
  if (error) {
    // If the user already accepted and the proposal moved to passed_to_match
    // (e.g. retry after app backgrounded), treat it as a success — don't surface an error.
    const serverMsg: string = data?.error ?? error.message ?? '';
    if (decision === 'accepted' && serverMsg.includes('passed_to_match')) {
      return { status: 'success', proposal_status: 'passed_to_match', your_decision: 'accepted' };
    }
    throw new Error(`Decision failed: ${error.message}`);
  }
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

export async function generateProposalForUser(): Promise<{
  status: string;
  proposal_created?: boolean;
  compatibility_score?: number;
  voters_backfilled?: number;
}> {
  const { data, error } = await supabase.functions.invoke('generate-proposal-for-user');
  if (error) throw new Error(`Generate proposal for user failed: ${error.message}`);
  return data;
}

export async function assignNewUserProposals(): Promise<{ assigned: number }> {
  const { data, error } = await supabase.functions.invoke('assign-new-user-proposals');
  if (error) throw new Error(`Assign new user proposals failed: ${error.message}`);
  return data;
}

// ============================================================================
// Helper: Transform backend proposal to frontend Proposal type
// ============================================================================

export function transformBackendProposal(raw: Record<string, unknown>): Partial<Proposal> {
  // Cast raw DB row — fields are validated by the database schema
  // Safe cast: DB row fields are validated by the database schema
  const r = raw as Record<string, string | number | boolean | null | undefined>;
  return {
    id: r.id as string | undefined,
    status: r.status as Proposal['status'],
    poolYesVotes: (r.pool_yes_votes as number) || 0,
    poolNoVotes: (r.pool_no_votes as number) || 0,
    friendYesVotes: (r.friend_yes_votes as number) || 0,
    friendNoVotes: (r.friend_no_votes as number) || 0,
    yesVotes: ((r.pool_yes_votes as number) || 0) + ((r.friend_yes_votes as number) || 0),
    noVotes: ((r.pool_no_votes as number) || 0) + ((r.friend_no_votes as number) || 0),
    totalVotes:
      ((r.pool_yes_votes as number) || 0) + ((r.pool_no_votes as number) || 0) +
      ((r.friend_yes_votes as number) || 0) + ((r.friend_no_votes as number) || 0),
    compatibilityScore: (r.compatibility_score as number) || 0,
    categoryScores: raw.category_scores as Proposal['categoryScores'],
    votingStartedAt: r.voting_started_at as string | undefined,
    confirmedAt: r.confirmed_at as string | undefined,
    rejectedAt: r.rejected_at as string | undefined,
    expiredAt: r.expired_at as string | undefined,
    sentToUsersAt: r.sent_to_users_at as string | undefined,
    decisionDeadlineAt: r.decision_deadline_at as string | undefined,
    userADecision: r.user_a_decision as 'pending' | 'accepted' | 'declined' | undefined,
    userBDecision: r.user_b_decision as 'pending' | 'accepted' | 'declined' | undefined,
    userADecidedAt: r.user_a_decided_at as string | undefined,
    userBDecidedAt: r.user_b_decided_at as string | undefined,
    createdAt: r.created_at as string | undefined,
    updatedAt: r.updated_at as string | undefined,
    voteContext: r.vote_context as 'pool' | 'friend' | undefined,
    isFriendVote: r.is_friend_vote as boolean | undefined,
    userAProfile: raw.user_a_profile as Partial<UserProfile> | undefined,
    userBProfile: raw.user_b_profile as Partial<UserProfile> | undefined,
    createdBy: r.created_by as string | undefined,
    creationType: r.creation_type as 'algorithm' | 'friend_proposal' | undefined,
  };
}

