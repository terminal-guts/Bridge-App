/**
 * usePendingProposals Hook
 *
 * Custom hook for managing pending proposal state:
 * - Auto-refresh expiration timers
 * - Urgency tracking
 * - Sorting by urgency
 * - Handle proposal actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MatchProposal } from '../types/community';
import {
  formatExpirationTime,
  isProposalUrgent,
  isProposalWarning,
} from '../utils/communityHelpers';

interface ProposalWithUrgency extends MatchProposal {
  expirationText: string;
  urgencyLevel: 'normal' | 'warning' | 'urgent';
  isUrgent: boolean;
  isWarning: boolean;
}

interface UsePendingProposalsResult {
  proposals: ProposalWithUrgency[];
  urgentCount: number;
  warningCount: number;
  hasUrgent: boolean;
  refreshTimers: () => void;
}

export function usePendingProposals(
  initialProposals: MatchProposal[]
): UsePendingProposalsResult {
  const [timerKey, setTimerKey] = useState(0);

  /**
   * Refresh timer display
   */
  const refreshTimers = useCallback(() => {
    setTimerKey((prev) => prev + 1);
  }, []);

  /**
   * Compute proposals with urgency data
   */
  const proposals = useMemo<ProposalWithUrgency[]>(() => {
    return initialProposals.map((proposal) => {
      const { text, urgencyLevel } = formatExpirationTime(proposal.expiresAt);
      return {
        ...proposal,
        expirationText: text,
        urgencyLevel,
        isUrgent: isProposalUrgent(proposal.expiresAt),
        isWarning: isProposalWarning(proposal.expiresAt),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProposals, timerKey]);

  /**
   * Sort by urgency (urgent first)
   */
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    });
  }, [proposals]);

  /**
   * Compute urgency counts
   */
  const urgentCount = useMemo(() => {
    return proposals.filter((p) => p.isUrgent).length;
  }, [proposals]);

  const warningCount = useMemo(() => {
    return proposals.filter((p) => p.isWarning).length;
  }, [proposals]);

  const hasUrgent = urgentCount > 0;

  /**
   * Auto-refresh timers every minute
   */
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTimers();
    }, 60 * 1000); // 1 minute

    return () => clearInterval(interval);
  }, [refreshTimers]);

  return {
    proposals: sortedProposals,
    urgentCount,
    warningCount,
    hasUrgent,
    refreshTimers,
  };
}
