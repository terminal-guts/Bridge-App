/**
 * Proposal Threshold Engine
 *
 * Defines and evaluates the lifecycle thresholds for proposals:
 *
 * 1. CONTINUE SHOWING  — Proposal remains in the voting pool
 * 2. EXPIRE            — Proposal is removed without a match
 * 3. CANDIDATE MATCH   — Proposal is eligible to be pushed to both users
 *
 * ──────────────────────────────────────────────────────────────────────
 * Lifecycle:
 *
 *   Created (Pending) → [Community Voting] → Rejected / Expired
 *                                 ↓
 *                          Approved (Deciding) → [User Decision]
 *                                 ↓
 *                       Accepted (Passed to Match) / Declined / Expired
 * ──────────────────────────────────────────────────────────────────────
 *
 * All functions are pure — they take a proposal (and optionally votes)
 * and return a deterministic result.  No side effects.
 */

import { Proposal, ProposalVote, ProposalStatus } from '../types/community';

// ============================================================================
// Constants (single source of truth)
// ============================================================================

/** How long the community has to vote on a proposal (hours). */
export const COMMUNITY_VOTING_WINDOW_HOURS = 24;

/** Once approved, how long both users have to accept (hours). */
export const USER_DECISION_WINDOW_HOURS = 48;

/**
 * Minimum number of votes a proposal must receive before any
 * approval / rejection decision can be made.
 * Prevents premature outcomes from tiny sample sizes.
 */
export const MIN_VOTES_FOR_DECISION = 5;

/**
 * Minimum YES-vote percentage required for approval, expressed as
 * a decimal (0.60 = 60%).  Combined with votingThreshold.
 */
export const APPROVAL_PERCENTAGE = 0.60;

/**
 * If the NO-vote percentage reaches this level, the proposal is
 * immediately rejected (early kill-switch).  Expressed as a decimal.
 */
export const REJECTION_PERCENTAGE = 0.70;

/**
 * Maximum total votes allowed.  Once this count is reached the
 * proposal stops being shown regardless of outcome.
 */
export const MAX_VOTES_CAP = 50;

/**
 * If a proposal has fewer than this many votes when the voting
 * window expires, it expires as "inconclusive" rather than
 * being approved or rejected.
 */
export const MIN_VOTES_FOR_VALID_OUTCOME = 3;

// ============================================================================
// Types
// ============================================================================

export type ThresholdAction =
    | 'continue_showing'     // Keep showing to voters
    | 'community_approve'    // Enough yes-votes → move to Deciding
    | 'community_reject'     // Too many no-votes → kill proposal
    | 'community_expire'     // Voting window elapsed inconclusive
    | 'users_pass_to_match'  // Both users accepted
    | 'users_decline'        // At least one user declined
    | 'users_expire';        // Users didn't decide in time

export interface ThresholdEvaluation {
    /** The recommended action for this proposal. */
    action: ThresholdAction;

    /** Human-readable reason for the decision. */
    reason: string;

    /** Current voting statistics. */
    stats: VotingStats;
}

export interface VotingStats {
    totalVotes: number;
    yesVotes: number;
    noVotes: number;
    yesWeight: number;
    noWeight: number;
    yesPercentage: number;   // 0–100
    noPercentage: number;    // 0–100
    netYesWeight: number;
    votingThreshold: number;
    meetsThreshold: boolean;
    minutesRemaining: number; // Minutes left in voting window
    isVotingExpired: boolean;
    isAcceptanceExpired: boolean;
}

// ============================================================================
// Core Evaluation
// ============================================================================

/**
 * Evaluate a single proposal against all thresholds and return the
 * recommended lifecycle action.
 *
 * @param proposal  - The proposal to evaluate
 * @param votes     - All votes cast for this proposal
 * @param now       - Optional override for current time (useful for testing)
 */
export function evaluateProposal(
    proposal: Proposal,
    votes: ProposalVote[],
    now: Date = new Date(),
): ThresholdEvaluation {
    const stats = computeVotingStats(proposal, votes, now);

    // ── Already in a terminal status ──────────────────────────────────
    if (isTerminalStatus(proposal.status)) {
        return {
            action: 'continue_showing', // No-op; it's already resolved
            reason: `Proposal is already in terminal status: ${proposal.status}`,
            stats,
        };
    }

    // ── PHASE 1: Voting window checks ────────────────────────────────

    // 1a. Voting window expired
    if (stats.isVotingExpired) {
        // Did we get enough votes for a meaningful outcome?
        if (stats.totalVotes < MIN_VOTES_FOR_VALID_OUTCOME) {
            return {
                action: 'community_expire',
                reason: `Voting window expired with only ${stats.totalVotes} vote(s) (minimum ${MIN_VOTES_FOR_VALID_OUTCOME}).`,
                stats,
            };
        }

        // Enough votes — decide based on final percentages
        if (stats.yesPercentage >= APPROVAL_PERCENTAGE * 100 && stats.meetsThreshold) {
            return {
                action: 'community_approve',
                reason: `Voting window closed. ${stats.yesPercentage.toFixed(1)}% approval with ${stats.yesVotes} yes-votes meets threshold of ${stats.votingThreshold}.`,
                stats,
            };
        }

        return {
            action: 'community_expire',
            reason: `Voting window expired. ${stats.yesPercentage.toFixed(1)}% approval did not meet the ${(APPROVAL_PERCENTAGE * 100).toFixed(0)}% minimum or the vote threshold of ${stats.votingThreshold}.`,
            stats,
        };
    }

    // 1b.  Max vote cap reached — stop showing immediately
    if (stats.totalVotes >= MAX_VOTES_CAP) {
        if (stats.yesPercentage >= APPROVAL_PERCENTAGE * 100 && stats.meetsThreshold) {
            return {
                action: 'community_approve',
                reason: `Vote cap (${MAX_VOTES_CAP}) reached. ${stats.yesPercentage.toFixed(1)}% approval → approved.`,
                stats,
            };
        }
        return {
            action: 'community_reject',
            reason: `Vote cap (${MAX_VOTES_CAP}) reached. ${stats.yesPercentage.toFixed(1)}% approval → rejected.`,
            stats,
        };
    }

    // 1c.  Early rejection (overwhelmingly negative)
    if (
        stats.totalVotes >= MIN_VOTES_FOR_DECISION &&
        stats.noPercentage >= REJECTION_PERCENTAGE * 100
    ) {
        return {
            action: 'community_reject',
            reason: `Early rejection: ${stats.noPercentage.toFixed(1)}% No-votes (${stats.noVotes}/${stats.totalVotes}) exceeds ${(REJECTION_PERCENTAGE * 100).toFixed(0)}% threshold.`,
            stats,
        };
    }

    // 1d.  Early approval (threshold reached + enough votes + majority)
    if (
        stats.totalVotes >= MIN_VOTES_FOR_DECISION &&
        stats.meetsThreshold &&
        stats.yesPercentage >= APPROVAL_PERCENTAGE * 100
    ) {
        return {
            action: 'community_approve',
            reason: `Approved: ${stats.yesPercentage.toFixed(1)}% Yes-votes (${stats.yesVotes}/${stats.totalVotes}) meets threshold of ${stats.votingThreshold} with ≥${MIN_VOTES_FOR_DECISION} votes.`,
            stats,
        };
    }

    // ── PHASE 2: User Decision checks ─────────────────────────────

    if (stats.isAcceptanceExpired && proposal.status === 'deciding') {
        return {
            action: 'users_expire',
            reason: `Decision deadline (${USER_DECISION_WINDOW_HOURS}h) expired before both users responded.`,
            stats,
        };
    }

    if (proposal.status === 'deciding') {
        if (proposal.userADecision === 'accepted' && proposal.userBDecision === 'accepted') {
            return {
                action: 'users_pass_to_match',
                reason: 'Both users accepted the match.',
                stats,
            };
        }
        if (proposal.userADecision === 'declined' || proposal.userBDecision === 'declined') {
            return {
                action: 'users_decline',
                reason: 'One or both users declined the match.',
                stats,
            };
        }
    }

    // ── Default: keep showing ─────────────────────────────────────────
    return {
        action: 'continue_showing',
        reason: `${stats.totalVotes} vote(s) so far — ${stats.yesPercentage.toFixed(1)}% Yes, ${stats.minutesRemaining.toFixed(0)} min remaining.`,
        stats,
    };
}

// ============================================================================
// Batch Evaluation
// ============================================================================

/**
 * Evaluate multiple proposals at once.
 * Returns a map of proposalId → ThresholdEvaluation.
 */
export function evaluateAllProposals(
    proposals: Proposal[],
    allVotes: ProposalVote[],
    now: Date = new Date(),
): Record<string, ThresholdEvaluation> {
    // Index votes by proposalId for O(1) lookup
    const votesByProposal: Record<string, ProposalVote[]> = {};
    for (const vote of allVotes) {
        if (!votesByProposal[vote.proposalId]) {
            votesByProposal[vote.proposalId] = [];
        }
        votesByProposal[vote.proposalId].push(vote);
    }

    const results: Record<string, ThresholdEvaluation> = {};
    for (const proposal of proposals) {
        const votes = votesByProposal[proposal.id] ?? [];
        results[proposal.id] = evaluateProposal(proposal, votes, now);
    }
    return results;
}

/**
 * Convenience: return only proposals that should continue being shown.
 */
export function getShowableProposals(
    proposals: Proposal[],
    allVotes: ProposalVote[],
    now: Date = new Date(),
): Proposal[] {
    const evaluations = evaluateAllProposals(proposals, allVotes, now);
    return proposals.filter(
        (p) => evaluations[p.id]?.action === 'continue_showing',
    );
}

/**
 * Convenience: return proposals that are ready to be pushed to both users.
 */
export function getApprovableProposals(
    proposals: Proposal[],
    allVotes: ProposalVote[],
    now: Date = new Date(),
): Proposal[] {
    const evaluations = evaluateAllProposals(proposals, allVotes, now);
    return proposals.filter(
        (p) => evaluations[p.id]?.action === 'community_approve',
    );
}

/**
 * Convenience: return proposals that should be expired or rejected.
 */
export function getRemovableProposals(
    proposals: Proposal[],
    allVotes: ProposalVote[],
    now: Date = new Date(),
): Proposal[] {
    const evaluations = evaluateAllProposals(proposals, allVotes, now);
    const removableActions: ThresholdAction[] = [
        'community_reject',
        'community_expire',
        'users_expire',
        'users_decline',
    ];
    return proposals.filter(
        (p) => removableActions.includes(evaluations[p.id]?.action),
    );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute voting statistics for a proposal.
 */
export function computeVotingStats(
    proposal: Proposal,
    votes: ProposalVote[],
    now: Date = new Date(),
): VotingStats {
    const friendWeight = 1.25;

    const yesVotes = votes.filter((v) => v.voteType === 'YES' || v.voteType === 'RECOMMEND').length;
    const noVotes = votes.filter((v) => v.voteType === 'NO').length;
    const totalVotes = votes.length;

    const yesWeight = votes
        .filter((v) => v.voteType === 'YES' || v.voteType === 'RECOMMEND')
        .reduce((sum, v) => sum + (v.isFriendVote ? friendWeight : 1), 0);
    const noWeight = votes
        .filter((v) => v.voteType === 'NO')
        .reduce((sum, v) => sum + (v.isFriendVote ? friendWeight : 1), 0);

    const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
    const noPercentage = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;

    const votingExpiresAtMs = new Date(proposal.votingExpiresAt).getTime();
    const decisionDeadlineAtMs = proposal.decisionDeadlineAt ? new Date(proposal.decisionDeadlineAt).getTime() : 0;
    const nowMs = now.getTime();

    const msRemaining = votingExpiresAtMs - nowMs;
    const minutesRemaining = Math.max(0, msRemaining / (1000 * 60));

    // The proposal's own votingThreshold (can be adjusted by friend endorsements)
    const meetsThreshold =
        yesVotes >= proposal.votingThreshold || yesWeight >= proposal.votingThreshold;

    return {
        totalVotes,
        yesVotes,
        noVotes,
        yesWeight,
        noWeight,
        yesPercentage,
        noPercentage,
        netYesWeight: yesWeight - noWeight,
        votingThreshold: proposal.votingThreshold,
        meetsThreshold,
        minutesRemaining,
        isVotingExpired: nowMs >= votingExpiresAtMs,
        isAcceptanceExpired: decisionDeadlineAtMs > 0 && nowMs >= decisionDeadlineAtMs,
    };
}

/**
 * Returns true if the proposal status is terminal (no further action needed).
 */
function isTerminalStatus(status: ProposalStatus): boolean {
    return ['passed_to_match', 'declined', 'expired', 'rejected'].includes(status);
}

/**
 * Map a ThresholdAction to the ProposalStatus it should transition to.
 * Useful for persisting the result back to the Proposal record.
 */
export function actionToStatus(action: ThresholdAction): ProposalStatus | null {
    switch (action) {
        case 'community_approve':
            return 'deciding';
        case 'community_reject':
            return 'rejected';
        case 'community_expire':
        case 'users_expire':
            return 'expired';
        case 'users_pass_to_match':
            return 'passed_to_match';
        case 'users_decline':
            return 'declined';
        case 'continue_showing':
        default:
            return null; // No status change
    }
}
