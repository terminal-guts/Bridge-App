/**
 * Survey Service
 *
 * Handles survey response submission via edge functions.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';

/**
 * Submit survey rankings
 */
export const submitSurveyRankings = async (
  surveyId: string,
  rankings: Array<{ candidate_user_id: string; rank_position: 1 | 2 | 3 }>
): Promise<ApiResponse<void>> => {
  try {
    // Call the Edge Function to record survey answers
    const { data, error } = await supabase.functions.invoke('record_survey_answers', {
      body: {
        survey_id: surveyId,
        rankings,
      },
    });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'SUBMIT_RANKINGS_FAILED',
          message: error.message,
        },
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: {
          code: data?.error?.code || 'SUBMIT_RANKINGS_FAILED',
          message: data?.error?.message || 'Failed to submit rankings',
        },
      };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'SUBMIT_RANKINGS_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};
