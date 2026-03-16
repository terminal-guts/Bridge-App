/**
 * Match Service
 *
 * Handles match proposals, acceptance/rejection, and match data retrieval.
 * Integrates with matches table and Edge Functions.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('MatchService');

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
