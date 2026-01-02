/**
 * useActiveMatch Hook
 *
 * Custom hook for managing active match state:
 * - Real-time timer for match duration
 * - Milestone detection
 * - Auto-update match progress
 * - Handle match actions
 */

import { useState, useEffect, useCallback } from 'react';
import { ActiveMatch } from '../types/community';
import {
  getMatchMilestone,
  shouldShowCelebration,
  getMatchProgress,
  formatMatchDuration,
} from '../utils/communityHelpers';

interface UseActiveMatchResult {
  // Computed values
  daysActive: number;
  canEndMatch: boolean;
  daysUntilCanEnd: number;
  matchProgress: number;
  milestone: string | null;
  shouldCelebrate: boolean;
  formattedDuration: string;

  // Actions
  refreshMatchData: () => void;
}

export function useActiveMatch(match: ActiveMatch | null): UseActiveMatchResult {
  const [daysActive, setDaysActive] = useState(0);
  const [canEndMatch, setCanEndMatch] = useState(false);
  const [daysUntilCanEnd, setDaysUntilCanEnd] = useState(0);

  /**
   * Calculate match duration and update states
   */
  const calculateMatchData = useCallback(() => {
    if (!match) {
      setDaysActive(0);
      setCanEndMatch(false);
      setDaysUntilCanEnd(0);
      return;
    }

    const now = new Date().getTime();
    const matchedAt = new Date(match.matchedAt).getTime();
    const diff = now - matchedAt;

    // Calculate days active
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    setDaysActive(days);

    // Can end after 3 days
    const canEnd = days >= 3;
    setCanEndMatch(canEnd);

    // Days until can end
    const daysRemaining = Math.max(0, 3 - days);
    setDaysUntilCanEnd(daysRemaining);
  }, [match]);

  /**
   * Refresh match data manually
   */
  const refreshMatchData = useCallback(() => {
    calculateMatchData();
  }, [calculateMatchData]);

  /**
   * Update match data on mount and when match changes
   */
  useEffect(() => {
    calculateMatchData();
  }, [calculateMatchData]);

  /**
   * Auto-update every minute
   */
  useEffect(() => {
    const interval = setInterval(() => {
      calculateMatchData();
    }, 60 * 1000); // 1 minute

    return () => clearInterval(interval);
  }, [calculateMatchData]);

  // Computed values
  const matchProgress = match ? getMatchProgress({ ...match, daysActive }) : 0;
  const milestone = getMatchMilestone(daysActive);
  const shouldCelebrate = shouldShowCelebration(daysActive);
  const formattedDuration = match ? formatMatchDuration(match.matchedAt) : '';

  return {
    daysActive,
    canEndMatch,
    daysUntilCanEnd,
    matchProgress,
    milestone,
    shouldCelebrate,
    formattedDuration,
    refreshMatchData,
  };
}
