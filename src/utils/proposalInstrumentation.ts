import { Proposal, ProposalStatus, ProposalVote } from '../types/community';
import {
  evaluateProposal,
  ThresholdAction,
} from './proposalThresholds';

export interface PerProposalMetrics {
  proposalId: string;
  status: ProposalStatus;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  yesWeight: number;
  noWeight: number;
  netYesWeight: number;
  votingThreshold: number;
  reachedThreshold: boolean;
  timeToConsensusMs?: number;
  timeToConsensusHours?: number;
  /** Threshold evaluation result from the proposal lifecycle engine. */
  thresholdAction: ThresholdAction;
  thresholdReason: string;
}

export interface AggregateMetrics {
  totalProposals: number;
  proposalsWithVotes: number;
  proposalsReachedThreshold: number;
  averageVotesPerProposal: number;
  medianVotesPerProposal: number;
  averageTimeToConsensusHours?: number;
  voteDistribution: {
    totalVotes: number;
    yesVotes: number;
    noVotes: number;
    yesWeight: number;
    noWeight: number;
  };
  rejectionRate: number; // rejected / (approved + rejected)
  /** Counts of proposals by their evaluated threshold action. */
  thresholdBreakdown: Record<ThresholdAction, number>;
}

export interface InstrumentationResult {
  perProposal: Record<string, PerProposalMetrics>;
  aggregate: AggregateMetrics;
}


const MS_PER_HOUR = 1000 * 60 * 60;

function safeDateDiffMs(start: string | undefined, end: string | undefined): number | undefined {
  if (!start || !end) return undefined;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return undefined;
  return endTime - startTime;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute per-proposal and aggregate instrumentation metrics.
 *
 * Assumptions:
 * - A "proposal" is represented by the existing `Proposal` type.
 * - Consensus time is derived from `approvedAt` or `rejectedAt` when present.
 * - Threshold completion is determined via `yesVotes` vs `votingThreshold`.
 */
export function instrumentProposals(
  proposals: Proposal[],
  votes: ProposalVote[],
): InstrumentationResult {
  // Index votes by proposal
  const votesByProposal = votes.reduce<Record<string, ProposalVote[]>>((acc, vote) => {
    if (!acc[vote.proposalId]) acc[vote.proposalId] = [];
    acc[vote.proposalId].push(vote);
    return acc;
  }, {});

  const perProposal: Record<string, PerProposalMetrics> = {};

  let globalYesVotes = 0;
  let globalNoVotes = 0;
  let globalYesWeight = 0;
  let globalNoWeight = 0;
  const voteCounts: number[] = [];
  const consensusTimesHours: number[] = [];

  let proposalsWithVotes = 0;
  let proposalsReachedThreshold = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  // Threshold breakdown accumulator
  const thresholdBreakdown: Record<ThresholdAction, number> = {
    continue_showing: 0,
    approve: 0,
    reject: 0,
    expire_time: 0,
    expire_inconclusive: 0,
    expire_acceptance: 0,
  };

  for (const proposal of proposals) {
    const proposalVotes = votesByProposal[proposal.id] ?? [];

    const yesVotes = proposalVotes.filter(v => v.vote).length;
    const noVotes = proposalVotes.filter(v => !v.vote).length;
    const yesWeight = proposalVotes
      .filter(v => v.vote)
      .reduce((sum, v) => sum + (v.voteWeight ?? 1), 0);
    const noWeight = proposalVotes
      .filter(v => !v.vote)
      .reduce((sum, v) => sum + (v.voteWeight ?? 1), 0);

    const totalVotes = proposalVotes.length;
    const netYesWeight = yesWeight - noWeight;

    const reachedThreshold = yesVotes >= proposal.votingThreshold || yesWeight >= proposal.votingThreshold;

    const timeToConsensusMs = safeDateDiffMs(
      proposal.proposalDate,
      proposal.approvedAt ?? proposal.rejectedAt,
    );
    const timeToConsensusHours =
      timeToConsensusMs !== undefined ? timeToConsensusMs / MS_PER_HOUR : undefined;

    if (totalVotes > 0) {
      proposalsWithVotes += 1;
      voteCounts.push(totalVotes);
      globalYesVotes += yesVotes;
      globalNoVotes += noVotes;
      globalYesWeight += yesWeight;
      globalNoWeight += noWeight;
    }

    if (reachedThreshold) {
      proposalsReachedThreshold += 1;
    }

    if (proposal.status === 'approved' || proposal.status === 'accepted') {
      approvedCount += 1;
    } else if (proposal.status === 'rejected') {
      rejectedCount += 1;
    }

    if (timeToConsensusHours !== undefined) {
      consensusTimesHours.push(timeToConsensusHours);
    }

    // Evaluate against threshold engine
    const thresholdEval = evaluateProposal(proposal, proposalVotes);
    thresholdBreakdown[thresholdEval.action] += 1;

    perProposal[proposal.id] = {
      proposalId: proposal.id,
      status: proposal.status,
      totalVotes,
      yesVotes,
      noVotes,
      yesWeight,
      noWeight,
      netYesWeight,
      votingThreshold: proposal.votingThreshold,
      reachedThreshold,
      timeToConsensusMs: timeToConsensusMs ?? undefined,
      timeToConsensusHours,
      thresholdAction: thresholdEval.action,
      thresholdReason: thresholdEval.reason,
    };
  }

  const totalProposals = proposals.length;

  const aggregate: AggregateMetrics = {
    totalProposals,
    proposalsWithVotes,
    proposalsReachedThreshold,
    averageVotesPerProposal:
      totalProposals > 0 ? voteCounts.reduce((sum, n) => sum + n, 0) / totalProposals : 0,
    medianVotesPerProposal: median(voteCounts),
    averageTimeToConsensusHours:
      consensusTimesHours.length > 0
        ? consensusTimesHours.reduce((sum, h) => sum + h, 0) / consensusTimesHours.length
        : undefined,
    voteDistribution: {
      totalVotes: globalYesVotes + globalNoVotes,
      yesVotes: globalYesVotes,
      noVotes: globalNoVotes,
      yesWeight: globalYesWeight,
      noWeight: globalNoWeight,
    },
    rejectionRate:
      approvedCount + rejectedCount > 0
        ? rejectedCount / (approvedCount + rejectedCount)
        : 0,
    thresholdBreakdown,
  };

  return { perProposal, aggregate };
}

/**
 * Convenience helper to log a human-readable summary to the console.
 */
export function logProposalInstrumentation(result: InstrumentationResult): void {
  const { aggregate } = result;

  // eslint-disable-next-line no-console
  console.log('--- Proposal Instrumentation ---');
  // eslint-disable-next-line no-console
  console.log('Total proposals:', aggregate.totalProposals);
  // eslint-disable-next-line no-console
  console.log('Proposals with votes:', aggregate.proposalsWithVotes);
  // eslint-disable-next-line no-console
  console.log('Average votes/proposal:', aggregate.averageVotesPerProposal.toFixed(2));
  // eslint-disable-next-line no-console
  console.log('Median votes/proposal:', aggregate.medianVotesPerProposal.toFixed(2));

  if (aggregate.averageTimeToConsensusHours !== undefined) {
    // eslint-disable-next-line no-console
    console.log(
      'Avg time to consensus (hours):',
      aggregate.averageTimeToConsensusHours.toFixed(2),
    );
  }

  // eslint-disable-next-line no-console
  console.log('Vote distribution:', aggregate.voteDistribution);
  // eslint-disable-next-line no-console
  console.log('Rejection rate:', (aggregate.rejectionRate * 100).toFixed(1) + '%');
  // eslint-disable-next-line no-console
  console.log('Threshold breakdown:', aggregate.thresholdBreakdown);
}

