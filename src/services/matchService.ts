/**
 * Match Service
 *
 * Handles match proposals, acceptance/rejection, and match data retrieval.
 * Integrates with matches table and Edge Functions.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, Match, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';
import { mapProfileRow } from './communityBackendService';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('MatchService');

/**
 * Get all matches for the current user
 * Optimized with SQL joins to eliminate N+1 query problem
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getUserMatches = async (): Promise<ApiResponse<Match[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    const formatProfile = (p: Record<string, any> | null): UserProfile | undefined => {
      if (!p) return undefined;
      return mapProfileRow(p);
    };

    // Format matches directly from joined data
    const formattedMatches: Match[] = matches.map(m => {
      // Find the match_exit for the current user (if exists)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
      let matchExit: Record<string, any> | null | undefined = null;
      if (m.match_exits && Array.isArray(m.match_exits) && m.match_exits.length > 0) {
        // Find the exit where the current user was the one who exited
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
        matchExit = (m.match_exits as Array<Record<string, any>>).find((exit) => exit.exiting_user_id === userId);
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
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: 'MATCHES_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
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
    const { data, error } = await supabase.functions.invoke('exit-match', {
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
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: 'EXIT_MATCH_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
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
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: 'UPDATE_FEEDBACK_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

// ============================================================================
// USER REPORTS
// ============================================================================

/**
 * Submit a user report and send a notification to the team.
 * Inserts a record into `user_reports` and fires a background edge function.
 */
export const submitUserReport = async (params: {
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
}): Promise<void> => {
  const { reporterId, reportedUserId, reason, details, reportedUserName } = params;

  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
    details: details.trim() || '',
  });
  if (error) throw error;

  // Fetch reporter's name for the notification email (fire-and-forget)
  const { data: reporterProfile } = await supabase
    .from('user_profiles')
    .select('first_name')
    .eq('user_id', reporterId)
    .single();

  supabase.functions.invoke('notify-report', {
    body: {
      reporter_name: reporterProfile?.first_name || 'Unknown',
      reported_name: reportedUserName,
      reason,
      details: details.trim() || '',
    },
  }).catch((err) => {
    logger.warn('[Report] Failed to notify founder via email:', err);
  });
};
