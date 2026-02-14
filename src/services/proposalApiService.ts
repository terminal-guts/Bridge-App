/**
 * Proposal API Service
 *
 * Real backend integration for the proposal system.
 * Calls the FastAPI /proposals endpoints.
 */

import type {
  Proposal,
  ProposalVoteType,
  VoteResult,
} from '../types/community';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bridge-frontend-production.up.railway.app';

// ============================================================================
// Proposal Generation (Admin/Cron)
// ============================================================================

export async function generateProposals(maxProposals: number = 50): Promise<{
  status: string;
  eligible_users: number;
  proposals_created: number;
  pool_voters_assigned: number;
}> {
  const response = await fetch(`${API_URL}/proposals/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_proposals: maxProposals }),
  });
  if (!response.ok) throw new Error(`Generate proposals failed: ${response.status}`);
  return response.json();
}

export async function assignDailyVoters(): Promise<{
  status: string;
  total_assigned: number;
}> {
  const response = await fetch(`${API_URL}/proposals/assign-daily-voters`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Assign voters failed: ${response.status}`);
  return response.json();
}

// ============================================================================
// Voting
// ============================================================================

export async function getProposalsForVoting(userId: string): Promise<{
  proposals: any[];
  pool_count: number;
  friend_count: number;
}> {
  const response = await fetch(`${API_URL}/proposals/for-voting?user_id=${userId}`);
  if (!response.ok) throw new Error(`Fetch proposals failed: ${response.status}`);
  return response.json();
}

export async function castProposalVote(
  proposalId: string,
  voterId: string,
  voteType: ProposalVoteType,
  recommendToId?: string,
): Promise<VoteResult> {
  const response = await fetch(`${API_URL}/proposals/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proposal_id: proposalId,
      voter_id: voterId,
      vote_type: voteType,
      recommend_to_id: recommendToId,
    }),
  });
  if (!response.ok) throw new Error(`Cast vote failed: ${response.status}`);
  return response.json();
}

// ============================================================================
// User Decisions (Accept/Decline)
// ============================================================================

export async function getPendingDecisions(userId: string): Promise<{
  proposals: any[];
}> {
  const response = await fetch(`${API_URL}/proposals/pending-decisions?user_id=${userId}`);
  if (!response.ok) throw new Error(`Fetch pending decisions failed: ${response.status}`);
  return response.json();
}

export async function decideOnProposal(
  proposalId: string,
  userId: string,
  decision: 'accepted' | 'declined',
): Promise<{
  status: string;
  proposal_status: string;
  your_decision: string;
}> {
  const response = await fetch(`${API_URL}/proposals/${proposalId}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, decision }),
  });
  if (!response.ok) throw new Error(`Decision failed: ${response.status}`);
  return response.json();
}

// ============================================================================
// Query
// ============================================================================

export async function getProposal(proposalId: string): Promise<any> {
  const response = await fetch(`${API_URL}/proposals/${proposalId}`);
  if (!response.ok) throw new Error(`Fetch proposal failed: ${response.status}`);
  return response.json();
}

export async function getUserProposalHistory(userId: string): Promise<{
  proposals: any[];
}> {
  const response = await fetch(`${API_URL}/proposals/user/${userId}/history`);
  if (!response.ok) throw new Error(`Fetch history failed: ${response.status}`);
  return response.json();
}

// ============================================================================
// Lifecycle
// ============================================================================

export async function triggerLifecycleCheck(): Promise<{
  status: string;
  proposals_checked: number;
  confirmed: number;
  rejected: number;
  expired_sent: number;
}> {
  const response = await fetch(`${API_URL}/proposals/lifecycle-check`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Lifecycle check failed: ${response.status}`);
  return response.json();
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

// ============================================================================
// Daily Pairing API (Scoring-Grid Coordinates)
// ============================================================================

/**
 * Trigger daily pairing generation.
 * Each user gets exactly ONE partner per day based on the 12-category scoring grid.
 *
 * SAFE: Only writes to daily_pairings. Does NOT touch conversations or matches.
 */
export async function generateDailyPairings(): Promise<{
  status: string;
  date: string;
  eligible_users: number;
  pairings_created: number;
  avg_score: number;
  top_score: number;
  min_score: number;
  unmatched_users: number;
}> {
  const response = await fetch(`${API_URL}/proposals/generate-daily-pairings`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Generate daily pairings failed: ${response.status}`);
  return response.json();
}

/**
 * Fetch a user's daily pairing for a given date.
 * Returns the partner profile + full 12-category compatibility coordinates.
 */
export async function getDailyPairing(userId: string, date?: string): Promise<{
  status: string;
  pairing?: {
    id: string;
    pairing_date: string;
    user_id: string;
    partner_id: string;
    compatibility_score: number;
    category_scores: Record<string, number>;
    weighted_scores: Record<string, number>;
    seen: boolean;
    partner_profile: {
      id: string;
      first_name: string;
      age: number;
      gender: string[];
      location: string;
      interests: string[];
      values: string[];
      bio: string;
      photos: Array<{ url: string; is_main: boolean }>;
    };
    expires_at: string;
  };
  message?: string;
}> {
  const params = new URLSearchParams({ user_id: userId });
  if (date) params.append('date', date);

  const response = await fetch(`${API_URL}/proposals/daily-pairing?${params}`);
  if (!response.ok) throw new Error(`Get daily pairing failed: ${response.status}`);
  return response.json();
}

/**
 * Get daily pairing stats for the last N days.
 */
export async function getDailyPairingStats(days: number = 7): Promise<{
  status: string;
  days: number;
  stats: Array<{
    date: string;
    total_pairings: number;
    avg_score: number;
    min_score: number;
    max_score: number;
    seen_count: number;
    seen_rate: number;
    proposal_count: number;
  }>;
}> {
  const response = await fetch(`${API_URL}/proposals/daily-pairing/stats?days=${days}`);
  if (!response.ok) throw new Error(`Get daily pairing stats failed: ${response.status}`);
  return response.json();
}
