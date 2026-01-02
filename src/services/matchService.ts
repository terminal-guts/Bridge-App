/**
 * Match Service
 *
 * Handles match proposals, acceptance/rejection, and match data retrieval.
 * Integrates with matches table and Edge Functions.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, Match, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';

/**
 * Get all matches for the current user
 * Optimized with SQL joins to eliminate N+1 query problem
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getUserMatches = async (): Promise<ApiResponse<Match[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // 🚨 DEVELOPMENT MODE: Check for mock Love Tab state first
    const { getMockLoveTabState } = await import('./developerService');
    const mockState = await getMockLoveTabState();

    if (mockState?.enabled) {
      const { mockProfiles, currentUserProfile } = await import('./mockData');

      if (mockState.type === 'match') {
        // Create a mock pending match with the specified time/score
        const mockPendingMatch: Match = {
          id: 'dev-mock-match',
          user1Id: userId,
          user2Id: 'mock-user-2',
          user1Profile: currentUserProfile,
          user2Profile: {
            ...mockProfiles[0],
            id: 'mock-profile-2',
            userId: 'mock-user-2',
          },
          status: 'pending',
          communityScore: mockState.communityScore || 87,
          matchedAt: new Date().toISOString(),
          expiresAt: mockState.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          currentUserId: userId,
          // Pass through autoOpenProfileModal flag for state #4
          autoOpenProfileModal: mockState.autoOpenProfileModal,
        };
        return { ok: true, data: [mockPendingMatch] };
      } else if (mockState.type === 'empty' || mockState.type === 'survey_completed') {
        // Return no matches for empty state or survey completed state
        // survey_completed: User has completed survey, waiting for next match (empty with countdown)
        return { ok: true, data: [] };
      } else if (mockState.type === 'survey' || mockState.type === 'survey_not_completed') {
        // Return no pending matches (survey will show)
        // survey_not_completed: User needs to complete survey before getting matches
        return { ok: true, data: [] };
      }
    }

    // 🚨 DEVELOPMENT MODE: Return mock matches for quick testing
    const { FEATURES } = await import('../config/features');
    if (FEATURES.DEVELOPMENT_AUTO_FILL_ONBOARDING) {
      const { mockMatches } = await import('./mockData');
      return { ok: true, data: mockMatches };
    }

    // Use joins to fetch matches with user profiles and match exits in a single query
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:user_profiles!matches_user_id_1_fkey(*),
        user2:user_profiles!matches_user_id_2_fkey(*),
        match_exits(
          exit_reason,
          exit_details,
          messages_exchanged,
          days_since_match,
          created_at,
          exiting_user_id
        )
      `)
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'MATCHES_FETCH_FAILED',
          message: error.message,
        },
      };
    }

    if (!matches || matches.length === 0) {
      return { ok: true, data: [] };
    }

    // Helper function to format profile data
    const formatProfile = (p: any): UserProfile | undefined => {
      if (!p) return undefined;
      return {
        id: p.id,
        userId: p.user_id,
        firstName: p.first_name,
        lastName: p.last_name || '',
        age: p.age,
        gender: p.gender || [],
        pronouns: p.pronouns || 'prefer_not_to_say',
        currentJob: p.current_job || '',
        companyPosition: p.company_position || '',
        educationLevel: p.education_level || 'bachelors',
        school: p.school || '',
        height: p.height_inches || '',
        ethnicity: p.ethnicity || '',
        religion: p.religion || '',
        politicalLeaning: p.political_leaning || 'prefer_not_to_say',
        location: p.location || '',
        photos: p.profile_photo_path ? [{ id: '1', url: p.profile_photo_path, isMain: true, order: 1 }] : [],
        interests: Array.isArray(p.interests) ? p.interests : [],
        values: Array.isArray(p.values) ? p.values : [],
        lifestyle: {
          drinking: p.drinking_frequency || 'socially',
          smoking: p.tobacco_frequency || 'never',
          exercise: 'often',
          children: p.has_children || 'open',
          pets: [],
        },
        dealbreakers: [],
        preferences: {
          ageMin: 24,
          ageMax: 32,
          gender: 'female',
          lookingFor: 'relationship',
        },
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    };

    // Format matches directly from joined data
    const formattedMatches: Match[] = matches.map(m => {
      // Find the match_exit for the current user (if exists)
      let matchExit: any = null;
      if (m.match_exits && Array.isArray(m.match_exits) && m.match_exits.length > 0) {
        // Find the exit where the current user was the one who exited
        matchExit = m.match_exits.find((exit: any) => exit.exiting_user_id === userId);
      }

      return {
        id: m.id,
        user1Id: m.user_id_1,
        user2Id: m.user_id_2,
        user1Profile: formatProfile(m.user1),
        user2Profile: formatProfile(m.user2),
        status: m.status,
        communityScore: m.community_score || 0,
        matchedAt: m.created_at,
        expiresAt: m.expires_at,
        acceptedAt: m.matched_at,
        currentUserId: userId,

        // Add match_exits data (from match_exits table)
        unmatchedAt: matchExit?.created_at,
        unmatchSurveyResponse: matchExit?.exit_details,
        exitReason: matchExit?.exit_reason,
        messagesExchanged: matchExit?.messages_exchanged,
        daysSinceMatch: matchExit?.days_since_match,
      };
    });

    return { ok: true, data: formattedMatches };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'MATCHES_FETCH_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Accept a match proposal
 */
export const acceptMatch = async (matchId: string): Promise<ApiResponse<Match>> => {
  try {
    const { data, error } = await supabase.functions.invoke('accept_match', {
      body: { match_id: matchId },
    });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'ACCEPT_MATCH_FAILED',
          message: error.message,
        },
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: {
          code: data?.error?.code || 'ACCEPT_MATCH_FAILED',
          message: data?.error?.message || 'Failed to accept match',
        },
      };
    }

    return { ok: true, data: data.data };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'ACCEPT_MATCH_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Reject a match proposal
 */
export const rejectMatch = async (
  matchId: string,
  reason: string
): Promise<ApiResponse<void>> => {
  try {
    const { data, error } = await supabase.functions.invoke('reject_match', {
      body: {
        match_id: matchId,
        rejection_reason: reason,
      },
    });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'REJECT_MATCH_FAILED',
          message: error.message,
        },
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: {
          code: data?.error?.code || 'REJECT_MATCH_FAILED',
          message: data?.error?.message || 'Failed to reject match',
        },
      };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'REJECT_MATCH_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Exit an active match
 */
export const exitMatch = async (
  matchId: string,
  exitReason: string,
  exitDetails?: string
): Promise<ApiResponse<void>> => {
  try {
    const { data, error } = await supabase.functions.invoke('exit_match', {
      body: {
        match_id: matchId,
        exit_reason: exitReason,
        exit_details: exitDetails,
      },
    });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'EXIT_MATCH_FAILED',
          message: error.message,
        },
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: {
          code: data?.error?.code || 'EXIT_MATCH_FAILED',
          message: data?.error?.message || 'Failed to exit match',
        },
      };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'EXIT_MATCH_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Update exit feedback for a match
 */
export const updateMatchExitFeedback = async (
  matchId: string,
  exitDetails: string
): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();

    const { error } = await supabase
      .from('match_exits')
      .update({ exit_details: exitDetails, updated_at: new Date().toISOString() })
      .eq('match_id', matchId)
      .eq('exiting_user_id', userId);

    if (error) {
      return {
        ok: false,
        error: {
          code: 'UPDATE_FEEDBACK_FAILED',
          message: error.message,
        },
      };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'UPDATE_FEEDBACK_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};
