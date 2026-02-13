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
 *   Created → [Voting Window] → Approved / Rejected / Expired
 *                                    ↓
 *                              [Acceptance Window]
 *                                    ↓
 *                              Accepted / Declined / Expired
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
export const VOTING_WINDOW_HOURS = 24;

/** Once approved, how long both users have to accept (hours). */
export const ACCEPTANCE_WINDOW_HOURS = 48;

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
    | 'continue_showing'   // Keep showing to voters
    | 'approve'            // Enough yes-votes → push to both users
    | 'reject'             // Too many no-votes → kill proposal
    | 'expire_time'        // Voting window elapsed
    | 'expire_inconclusive' // Time ran out with too few votes
    | 'expire_acceptance';  // Both users didn't accept in time

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
                action: 'expire_inconclusive',
                reason: `Voting window expired with only ${stats.totalVotes} vote(s) (minimum ${MIN_VOTES_FOR_VALID_OUTCOME}).`,
                stats,
            };
        }

        // Enough votes — decide based on final percentages
        if (stats.yesPercentage >= APPROVAL_PERCENTAGE * 100 && stats.meetsThreshold) {
            return {
                action: 'approve',
                reason: `Voting window closed. ${stats.yesPercentage.toFixed(1)}% approval with ${stats.yesVotes} yes-votes meets threshold of ${stats.votingThreshold}.`,
                stats,
            };
        }

        return {
            action: 'expire_time',
            reason: `Voting window expired. ${stats.yesPercentage.toFixed(1)}% approval did not meet the ${(APPROVAL_PERCENTAGE * 100).toFixed(0)}% minimum or the vote threshold of ${stats.votingThreshold}.`,
            stats,
        };
    }

    // 1b.  Max vote cap reached — stop showing immediately
    if (stats.totalVotes >= MAX_VOTES_CAP) {
        if (stats.yesPercentage >= APPROVAL_PERCENTAGE * 100 && stats.meetsThreshold) {
            return {
                action: 'approve',
                reason: `Vote cap (${MAX_VOTES_CAP}) reached. ${stats.yesPercentage.toFixed(1)}% approval → approved.`,
                stats,
            };
        }
        return {
            action: 'reject',
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
            action: 'reject',
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
            action: 'approve',
            reason: `Approved: ${stats.yesPercentage.toFixed(1)}% Yes-votes (${stats.yesVotes}/${stats.totalVotes}) meets threshold of ${stats.votingThreshold} with ≥${MIN_VOTES_FOR_DECISION} votes.`,
            stats,
        };
    }

    // ── PHASE 2: Acceptance window checks ─────────────────────────────

    if (stats.isAcceptanceExpired && proposal.status === 'approved') {
        return {
            action: 'expire_acceptance',
            reason: `Acceptance window (${ACCEPTANCE_WINDOW_HOURS}h) expired before both users responded.`,
            stats,
        };
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
        (p) => evaluations[p.id]?.action === 'approve',
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
        'reject',
        'expire_time',
        'expire_inconclusive',
        'expire_acceptance',
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
    const yesVotes = votes.filter((v) => v.vote === true).length;
    const noVotes = votes.filter((v) => v.vote === false).length;
    const totalVotes = votes.length;

    const yesWeight = votes
        .filter((v) => v.vote === true)
        .reduce((sum, v) => sum + (v.voteWeight ?? 1), 0);
    const noWeight = votes
        .filter((v) => v.vote === false)
        .reduce((sum, v) => sum + (v.voteWeight ?? 1), 0);

    const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
    const noPercentage = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;

    const votingExpiresAtMs = new Date(proposal.votingExpiresAt).getTime();
    const proposalExpiresAtMs = new Date(proposal.proposalExpiresAt).getTime();
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
        isAcceptanceExpired: nowMs >= proposalExpiresAtMs,
    };
}

/**
 * Returns true if the proposal status is terminal (no further action needed).
 */
function isTerminalStatus(status: ProposalStatus): boolean {
    return ['accepted', 'declined', 'expired', 'rejected'].includes(status);
}

/**
 * Map a ThresholdAction to the ProposalStatus it should transition to.
 * Useful for persisting the result back to the Proposal record.
 */
export function actionToStatus(action: ThresholdAction): ProposalStatus | null {
    switch (action) {
        case 'approve':
            return 'approved';
        case 'reject':
            return 'rejected';
        case 'expire_time':
        case 'expire_inconclusive':
        case 'expire_acceptance':
            return 'expired';
        case 'continue_showing':
        default:
            return null; // No status change
    }
}
