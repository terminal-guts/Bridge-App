/**
 * Dashboard Service
 *
 * Handles fetching and caching dashboard statistics and metrics.
 * Provides real-time updates for pricing and social proof.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';
import { createLogger } from '../utils/secureLogger';

// Create namespaced logger for this service
const logger = createLogger('DashboardService');

export interface DashboardStats {
  surveysCompleted: number;
  totalMatches: number;
  acceptedMatches: number;
  matchRate: number;
  friendsCount: number;
  currentStreak: number;
  prospectivePartners: number;
  surveysToday: number;
  matchesToday: number;
}

export interface SurveyStatus {
  isAvailable: boolean;
  hasCompletedToday: boolean;
  timeUntilNext: string;
  nextSurveyTime: Date;
}

/**
 * Get comprehensive dashboard statistics for a user
 */
export const getDashboardStats = async (userId: string): Promise<ApiResponse<DashboardStats>> => {
  try {
    // Call the database function to get all stats in one query
    const { data, error } = await supabase
      .rpc('get_dashboard_stats', { p_user_id: userId });

    if (error) {
      logger.error('Dashboard stats error:', error);
      return {
        ok: false,
        error: {
          code: 'STATS_FETCH_ERROR',
          message: error.message,
        },
      };
    }

    // The function returns a single row with all stats
    const stats = data?.[0];

    if (!stats) {
      // Return default stats for new users
      return {
        ok: true,
        data: {
          surveysCompleted: 0,
          totalMatches: 0,
          acceptedMatches: 0,
          matchRate: 0,
          friendsCount: 0,
          currentStreak: 0,
          prospectivePartners: 250, // Default starting number
          surveysToday: 0,
          matchesToday: 0,
        },
      };
    }

    return {
      ok: true,
      data: {
        surveysCompleted: stats.surveys_completed || 0,
        totalMatches: stats.total_matches || 0,
        acceptedMatches: stats.accepted_matches || 0,
        matchRate: parseFloat(stats.match_rate) || 0,
        friendsCount: stats.friends_count || 0,
        currentStreak: stats.current_streak || 0,
        prospectivePartners: stats.prospective_partners || 0,
        surveysToday: stats.surveys_today || 0,
        matchesToday: stats.matches_today || 0,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'STATS_ERROR',
        message: error.message || 'Failed to fetch dashboard statistics',
      },
    };
  }
};

/**
 * Calculate survey availability and countdown
 */
export const getSurveyStatus = async (userId: string): Promise<ApiResponse<SurveyStatus>> => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Survey time is 8 PM (20:00)
    const surveyTime = new Date(today);
    surveyTime.setHours(20, 0, 0, 0);

    // Check if user has completed survey today
    const { data: todaySurvey, error } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Survey status error:', error);
    }

    const hasCompletedToday = !!todaySurvey;

    // Determine next survey time
    let nextSurveyTime: Date;
    if (now >= surveyTime) {
      // If it's past 8 PM today, next survey is tomorrow at 8 PM
      nextSurveyTime = new Date(surveyTime);
      nextSurveyTime.setDate(nextSurveyTime.getDate() + 1);
    } else {
      // Next survey is today at 8 PM
      nextSurveyTime = surveyTime;
    }

    // Survey is available if it's past 8 PM and not completed today
    const isAvailable = now >= surveyTime && !hasCompletedToday;

    // Calculate time until next survey
    const timeUntilNext = calculateTimeUntil(nextSurveyTime);

    return {
      ok: true,
      data: {
        isAvailable,
        hasCompletedToday,
        timeUntilNext,
        nextSurveyTime,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'SURVEY_STATUS_ERROR',
        message: error.message || 'Failed to get survey status',
      },
    };
  }
};

/**
 * Calculate human-readable time difference
 */
const calculateTimeUntil = (targetTime: Date): string => {
  const now = new Date();
  const diff = targetTime.getTime() - now.getTime();

  if (diff <= 0) {
    return '0h 0m';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

/**
 * Get user's current streak information
 */
export const getUserStreak = async (userId: string): Promise<ApiResponse<{
  currentStreak: number;
  longestStreak: number;
  lastSurveyDate: string | null;
}>> => {
  try {
    const { data, error } = await supabase
      .from('friends')
      .select('streak_days, last_mutual_date')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
      logger.error('Streak fetch error:', error);
      return {
        ok: false,
        error: {
          code: 'STREAK_FETCH_ERROR',
          message: error.message,
        },
      };
    }

    // Find the maximum streak among all friendships
    let maxStreak = 0;
    let latestMutualDate: string | null = null;

    if (data && data.length > 0) {
      for (const row of data) {
        if (row.streak_days > maxStreak) {
          maxStreak = row.streak_days;
          latestMutualDate = row.last_mutual_date;
        }
      }
    }

    return {
      ok: true,
      data: {
        currentStreak: maxStreak,
        longestStreak: maxStreak, // We don't track longest streak in the friends table yet
        lastSurveyDate: latestMutualDate,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'STREAK_ERROR',
        message: error.message || 'Failed to fetch streak information',
      },
    };
  }
};

/**
 * Subscribe to dashboard stats updates (for real-time social proof)
 */
export const subscribeToDashboardUpdates = (
  onUpdate: (surveysToday: number, matchesToday: number) => void
) => {
  // Subscribe to survey_responses for real-time survey count updates
  const surveySubscription = supabase
    .channel('dashboard_surveys')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'survey_responses',
      },
      async () => {
        // Fetch updated counts
        const { data: surveyData } = await supabase
          .rpc('get_todays_survey_count');

        const { data: matchData } = await supabase
          .rpc('get_todays_match_count');

        onUpdate(
          surveyData?.[0]?.count || 0,
          matchData?.[0]?.count || 0
        );
      }
    )
    .subscribe();

  // Subscribe to matches for real-time match count updates
  const matchSubscription = supabase
    .channel('dashboard_matches')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `status=eq.accepted`,
      },
      async () => {
        const { data: matchData } = await supabase
          .rpc('get_todays_match_count');

        const { data: surveyData } = await supabase
          .rpc('get_todays_survey_count');

        onUpdate(
          surveyData?.[0]?.count || 0,
          matchData?.[0]?.count || 0
        );
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    surveySubscription.unsubscribe();
    matchSubscription.unsubscribe();
  };
};

/**
 * Refresh dashboard stats (for pull-to-refresh)
 */
export const refreshDashboardStats = async (
  userId: string
): Promise<ApiResponse<DashboardStats>> => {
  // Simply re-fetch the stats
  return getDashboardStats(userId);
};

// ============================================================================
// PHASE 2: New Consolidated Dashboard Functions
// ============================================================================

export interface DashboardSummary {
  stats: {
    prospectivePartners: number;
    totalUsersInPool: number;
    totalMatches: number;
    acceptedMatches: number;
    friendsCount: number;
  };
  survey: {
    isAvailable: boolean;
    hasCompletedToday: boolean;
    nextSurveyTime: string;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalSurveys: number;
  };
  friends: {
    count: number;
    recentFriends: Array<{
      id: string;
      friendCode: string;
      createdAt: string;
    }>;
  };
  pricing: {
    malePricing: number;
    femalePricing: number;
    marketOpen: boolean;
  };
  lastUpdated: string;
}

export interface MatchPoolStats {
  totalEligibleUsers: number;
  alreadyMatched: number;
  prospectivePartners: number;
  filtersApplied: {
    genderFilter: string[];
    ageRange: { min: number; max: number };
    heightRange: { min: number | null; max: number | null };
  };
  breakdownByPreference: {
    totalUsers: number;
    matchingPreferences: number;
    filteredOut: number;
    alreadyMatched: number;
  };
}

export interface SurveyStatusComplete {
  isAssigned: boolean;
  isCompleted: boolean;
  isAvailable: boolean;
  availableAt: string;
  nextSurveyTime: string;
  currentStreak: number;
  longestStreak: number;
  totalSurveys: number;
}

export interface SurveyAssignment {
  surveyId: string;
  assignedAt: string;
  availableAt: string;
  isNewAssignment: boolean;
}

/**
 * Get complete dashboard data in a single optimized query
 * Replaces multiple separate calls to reduce network overhead
 */
export const getDashboardSummary = async (
  userId: string
): Promise<ApiResponse<DashboardSummary>> => {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_summary', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('Dashboard summary error:', error);
      return {
        ok: false,
        error: {
          code: 'SUMMARY_FETCH_ERROR',
          message: error.message,
        },
      };
    }

    if (!data) {
      return {
        ok: false,
        error: {
          code: 'NO_DATA',
          message: 'No dashboard data returned',
        },
      };
    }

    return {
      ok: true,
      data: {
        stats: data.stats,
        survey: data.survey,
        streak: data.streak,
        friends: data.friends,
        pricing: data.pricing,
        lastUpdated: data.lastUpdated,
      },
    };
  } catch (error: any) {
    logger.error('Dashboard summary error:', error);
    return {
      ok: false,
      error: {
        code: 'SUMMARY_ERROR',
        message: error.message || 'Failed to fetch dashboard summary',
      },
    };
  }
};

/**
 * Get detailed match pool statistics
 * Shows breakdown of prospective partners and filters applied
 */
export const getMatchPoolStats = async (
  userId: string
): Promise<ApiResponse<MatchPoolStats>> => {
  try {
    const { data, error } = await supabase.rpc('get_match_pool_stats', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('Match pool stats error:', error);
      return {
        ok: false,
        error: {
          code: 'MATCH_POOL_ERROR',
          message: error.message,
        },
      };
    }

    // RPC returns array with single row, extract first element
    const stats = Array.isArray(data) ? data[0] : data;

    if (!stats) {
      return {
        ok: false,
        error: {
          code: 'NO_DATA',
          message: 'No match pool data returned',
        },
      };
    }

    return {
      ok: true,
      data: {
        totalEligibleUsers: stats.total_eligible_users,
        alreadyMatched: stats.already_matched,
        prospectivePartners: stats.prospective_partners,
        filtersApplied: stats.filters_applied,
        breakdownByPreference: stats.breakdown_by_preference,
      },
    };
  } catch (error: any) {
    logger.error('Match pool stats error:', error);
    return {
      ok: false,
      error: {
        code: 'MATCH_POOL_ERROR',
        message: error.message || 'Failed to fetch match pool stats',
      },
    };
  }
};

/**
 * Get complete survey status including assignment and availability
 * Consolidates multiple survey-related queries
 */
export const getSurveyStatusComplete = async (
  userId: string
): Promise<ApiResponse<SurveyStatusComplete>> => {
  try {
    const { data, error } = await supabase.rpc('get_user_survey_status', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('Survey status error:', error);
      return {
        ok: false,
        error: {
          code: 'SURVEY_STATUS_ERROR',
          message: error.message,
        },
      };
    }

    if (!data) {
      return {
        ok: false,
        error: {
          code: 'NO_DATA',
          message: 'No survey status data returned',
        },
      };
    }

    return {
      ok: true,
      data: {
        isAssigned: data.isAssigned,
        isCompleted: data.isCompleted,
        isAvailable: data.isAvailable,
        availableAt: data.availableAt,
        nextSurveyTime: data.nextSurveyTime,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        totalSurveys: data.totalSurveys,
      },
    };
  } catch (error: any) {
    logger.error('Survey status error:', error);
    return {
      ok: false,
      error: {
        code: 'SURVEY_STATUS_ERROR',
        message: error.message || 'Failed to fetch survey status',
      },
    };
  }
};

/**
 * Assign daily survey to user (call once per day)
 * Should be called when user opens app if no survey assigned for today
 */
export const assignDailySurvey = async (
  userId: string
): Promise<ApiResponse<SurveyAssignment>> => {
  try {
    const { data, error } = await supabase.rpc('assign_daily_survey_to_user', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('Survey assignment error:', error);
      return {
        ok: false,
        error: {
          code: 'ASSIGNMENT_ERROR',
          message: error.message,
        },
      };
    }

    if (!data) {
      return {
        ok: false,
        error: {
          code: 'NO_DATA',
          message: 'No assignment data returned',
        },
      };
    }

    return {
      ok: true,
      data: {
        surveyId: data.surveyId,
        assignedAt: data.assignedAt,
        availableAt: data.availableAt,
        isNewAssignment: data.isNewAssignment,
      },
    };
  } catch (error: any) {
    logger.error('Survey assignment error:', error);
    return {
      ok: false,
      error: {
        code: 'ASSIGNMENT_ERROR',
        message: error.message || 'Failed to assign survey',
      },
    };
  }
};
