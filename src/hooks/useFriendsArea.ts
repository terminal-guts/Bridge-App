/**
 * useFriendsArea Hook
 *
 * Custom hook for managing Friends Area state:
 * - Fetches friends, pending proposals, active match
 * - Handles refresh logic
 * - Manages loading and error states
 * - Auto-refreshes on mount and interval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FriendWithGridStatus,
  MatchProposal,
  ActiveMatch,
} from '../types/community';
import { communityService } from '../services/communityServiceIndex';
import { sortFriendsByStatus } from '../utils/communityHelpers';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('useFriendsArea');

interface UseFriendsAreaResult {
  // Data
  friends: FriendWithGridStatus[];
  pendingProposals: MatchProposal[];
  activeMatch: ActiveMatch | null;

  // States
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: Date | null;

  // Actions
  refresh: () => Promise<void>;
  proposeForFriend: (friendId: string, candidateId: string) => Promise<void>;
  clearError: () => void;
}

export function useFriendsArea(): UseFriendsAreaResult {
  const [friends, setFriends] = useState<FriendWithGridStatus[]>([]);
  const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track in-flight requests to prevent concurrent fetches
  const fetchInProgressRef = useRef(false);

  /**
   * Fetch all friends area data
   */
  const fetchData = useCallback(async (isRefreshing: boolean = false) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      logger.info('[useFriendsArea] Fetch already in progress, skipping');
      return;
    }

    fetchInProgressRef.current = true;

    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await communityService.getFriendsAreaData();

      // Sort friends intelligently
      const sortedFriends = sortFriendsByStatus(data.friends);

      setFriends(sortedFriends);
      setPendingProposals(data.pendingProposals);
      setActiveMatch(data.activeMatch);
      setLastUpdated(new Date());
    } catch (err) {
      logger.error('[useFriendsArea] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends area');
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchInProgressRef.current = false; // Mark fetch as complete
    }
  }, []);

  /**
   * Refresh data (pull-to-refresh)
   */
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  /**
   * Propose match for friend
   */
  const proposeForFriend = useCallback(
    async (friendId: string, candidateId: string) => {
      try {
        await communityService.submitFriendGridProposal(friendId, candidateId);

        // Update friend's completion status optimistically
        setFriends((prev) =>
          prev.map((f) =>
            f.friendId === friendId ? { ...f, hasCompletedGrid: true } : f
          )
        );

        // Refresh data to get latest
        await fetchData(false);
      } catch (err) {
        logger.error('[useFriendsArea] Error proposing for friend:', err);
        throw err;
      }
    },
    [fetchData]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Store latest fetchData in ref to avoid recreating interval
   */
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  /**
   * Initial load
   */
  useEffect(() => {
    fetchDataRef.current(false);
  }, []);

  /**
   * Auto-refresh every 5 minutes
   */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataRef.current(false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []); // No dependencies - interval created once

  return {
    friends,
    pendingProposals,
    activeMatch,
    loading,
    error,
    refreshing,
    lastUpdated,
    refresh,
    proposeForFriend,
    clearError,
  };
}
