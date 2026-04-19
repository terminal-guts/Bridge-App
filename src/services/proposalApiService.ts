/**
 * Proposal API Service
 *
 * Real backend integration for the proposal system.
 * Calls Supabase Edge Functions (replaces former FastAPI dependency).
 */

import { supabase } from '../lib/supabase';
import { Sentry } from '../lib/sentry';
import { getExponentialBackoff } from '../constants/timings';
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
  // Edge Function extracts user ID from JWT — no need to pass userId.
  // Retry strategy:
  //   - 401 (expired JWT): refresh session once and try again (not counted as a
  //     network-retry)
  //   - Undefined status (network error / relay timeout): up to 3 retries with
  //     exponential backoff via getExponentialBackoff()
  //   - 4xx/5xx responses: backend responded cleanly — don't retry (rate limit,
  //     bad request, etc.). Surface immediately.
  const MAX_NETWORK_RETRIES = 3;
  let networkAttempt = 0;
  let didRefresh = false;
  let lastError: Error | null = null;
  let lastStatus: number | undefined;

  // Loop bound: one refresh attempt + MAX_NETWORK_RETRIES network retries + 1
  // initial attempt. The explicit guards below terminate earlier as needed.
  for (let i = 0; i < MAX_NETWORK_RETRIES + 2; i++) {
    const { data, error, response } = await supabase.functions.invoke('get-proposals-for-voting');
    if (!error) return data;

    lastError = error;
    const status = response?.status;
    lastStatus = status;

    // 401 = expired JWT — refresh once and retry (not a network retry)
    if (status === 401 && !didRefresh) {
      didRefresh = true;
      await supabase.auth.refreshSession();
      continue;
    }

    // Undefined status = network error / relay timeout — retry with backoff
    if (status === undefined && networkAttempt < MAX_NETWORK_RETRIES) {
      await new Promise(r => setTimeout(r, getExponentialBackoff(networkAttempt)));
      networkAttempt++;
      continue;
    }

    // Any 4xx/5xx (other than the one-time 401 refresh path) is a clean backend
    // response — do not retry. Break to throw.
    break;
  }

  Sentry.captureException(
    new Error(`Fetch proposals failed: ${lastError?.message ?? 'unknown'}`),
    { extra: { status: lastStatus } },
  );
  throw new Error(`Fetch proposals failed: ${lastError?.message ?? 'unknown'}`);
}

export async function castProposalVote(
  proposalId: string,
  _voterId: string,
  voteType: ProposalVoteType,
): Promise<VoteResult> {
  // Edge Function extracts voter ID from JWT — no need to pass voterId
  // Retry once for transient relay/timeout errors (undefined status = not an HTTP error)
  let lastError: (Error & { status?: number }) | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error, response } = await supabase.functions.invoke('process-vote', {
      body: {
        proposal_id: proposalId,
        vote_type: voteType,
      },
    });

    if (!error) return data;

    const err: Error & { status?: number } = new Error(`Cast vote failed: ${error.message}`);
    err.status = response?.status;
    lastError = err;

    // 401 = expired JWT — refresh session and retry
    if (err.status === 401 && attempt === 0) {
      await supabase.auth.refreshSession();
      continue;
    }

    // Retry once for transient relay/timeout errors (undefined status = not an HTTP error)
    if (err.status === undefined && attempt === 0) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    // All other errors (400, 403, 404, 429, 500) — don't retry
    break;
  }

  // Capture vote errors in Sentry for visibility
  Sentry.captureException(lastError, {
    extra: { proposalId, voteType, status: lastError?.status },
  });

  throw lastError;
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
    .select('id, user_a_id, user_b_id, status, pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes, compatibility_score, category_scores, voting_started_at, confirmed_at, rejected_at, expired_at, sent_to_users_at, decision_deadline_at, user_a_decision, user_b_decision, user_a_decided_at, user_b_decided_at, created_at, updated_at, vote_context, voting_expires_at')
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

