/**
 * useDashboardData Hook
 *
 * Fetches dashboard data with automatic fallback to mock data.
 * Respects feature flags for gradual rollout.
 *
 * Usage:
 *   const { data, isLoading, error, refresh } = useDashboardData();
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardSummary,
  DashboardSummary,
} from '../services/dashboardService';
import { isFeatureEnabled } from '../config/featureFlags';

interface UseDashboardDataReturn {
  data: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch dashboard data with automatic fallback to mock data
 * Respects feature flags for gradual rollout
 */
export const useDashboardData = (): UseDashboardDataReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isFeatureEnabled('USE_REAL_DASHBOARD_STATS')) {
        // Use new consolidated function
        if (isFeatureEnabled('LOG_DATA_FETCHING')) {
          console.log('[useDashboardData] Fetching real dashboard data for user:', user.id);
        }

        const result = await getDashboardSummary(user.id);

        if (result.ok) {
          if (isFeatureEnabled('LOG_DATA_FETCHING')) {
            console.log('[useDashboardData] Successfully fetched dashboard data:', result.data);
          }
          setData(result.data);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch dashboard data');
        }
      } else {
        // Use mock data (current behavior)
        if (isFeatureEnabled('LOG_DATA_FETCHING')) {
          console.log('[useDashboardData] Using mock dashboard data');
        }
        setData(getMockDashboardData());
      }
    } catch (err) {
      console.error('[useDashboardData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');

      // Fallback to mock data on error
      if (isFeatureEnabled('LOG_DATA_FETCHING')) {
        console.log('[useDashboardData] Falling back to mock data due to error');
      }
      setData(getMockDashboardData());
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, isLoading, error, refresh };
};

/**
 * Mock data function (current HomeScreen data)
 * This is the fallback when USE_REAL_DASHBOARD_STATS is false
 */
const getMockDashboardData = (): DashboardSummary => {
  const now = new Date();
  const surveyTime = new Date();
  surveyTime.setHours(20, 0, 0, 0);

  // If it's past 8 PM, next survey is tomorrow
  const nextSurveyTime = now >= surveyTime
    ? new Date(surveyTime.getTime() + 24 * 60 * 60 * 1000)
    : surveyTime;

  return {
    stats: {
      prospectivePartners: 342,
      totalUsersInPool: 1247,
      totalMatches: 0,
      acceptedMatches: 0,
      friendsCount: 12,
    },
    survey: {
      isAvailable: now >= surveyTime,
      hasCompletedToday: false,
      nextSurveyTime: nextSurveyTime.toISOString(),
    },
    streak: {
      currentStreak: 5,
      longestStreak: 12,
      totalSurveys: 45,
    },
    friends: {
      count: 12,
      recentFriends: [],
    },
    pricing: {
      malePricing: 12.50,
      femalePricing: 10.00,
      marketOpen: now >= surveyTime,
    },
    lastUpdated: new Date().toISOString(),
  };
};
