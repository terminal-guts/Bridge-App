/**
 * Survey Service
 *
 * Handles daily survey retrieval and response submission.
 * Integrates with daily_surveys and survey_responses tables.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, DailySurvey, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';

/**
 * Get today's daily survey for the current user
 * Optimized with SQL joins to eliminate N+1 query problem
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getTodaysSurvey = async (): Promise<ApiResponse<DailySurvey | null>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // 🚨 DEVELOPMENT MODE: Check for mock Love Tab state first
    const { getMockLoveTabState } = await import('./developerService');
    const mockState = await getMockLoveTabState();

    if (mockState?.enabled && (mockState.type === 'survey' || mockState.type === 'survey_not_completed')) {
      // Return mock survey data for development testing
      const { mockDailySurvey } = await import('./mockData');
      console.log('🚨 DEVELOPMENT MODE: Returning mock survey data');
      return { ok: true, data: mockDailySurvey };
    }

    const today = new Date().toISOString().split('T')[0];

    // Use joins to fetch survey with all profiles in a single query
    const { data: survey, error } = await supabase
      .from('daily_surveys')
      .select(`
        *,
        recipient:user_profiles!daily_surveys_recipient_user_id_fkey(*),
        candidate1:user_profiles!daily_surveys_candidate_1_user_id_fkey(*),
        candidate2:user_profiles!daily_surveys_candidate_2_user_id_fkey(*),
        candidate3:user_profiles!daily_surveys_candidate_3_user_id_fkey(*)
      `)
      .eq('ranker_user_id', userId)
      .eq('survey_date', today)
      .single();

    if (error) {
      // No survey found is not an error
      if (error.code === 'PGRST116') {
        return { ok: true, data: null };
      }

      return {
        ok: false,
        error: {
          code: 'SURVEY_FETCH_FAILED',
          message: error.message,
        },
      };
    }

    if (!survey) {
      return { ok: true, data: null };
    }

    // Verify all profiles are present
    if (!survey.recipient || !survey.candidate1 || !survey.candidate2 || !survey.candidate3) {
      return {
        ok: false,
        error: {
          code: 'INCOMPLETE_SURVEY',
          message: 'Survey profiles not found',
        },
      };
    }

    // Helper function to format profiles
    const formatProfile = (p: any): UserProfile => ({
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
    });

    // Format survey data directly from joined results
    const surveyData: DailySurvey = {
      id: survey.id,
      recipientProfile: formatProfile(survey.recipient),
      candidates: [
        formatProfile(survey.candidate1),
        formatProfile(survey.candidate2),
        formatProfile(survey.candidate3),
      ],
      expiresAt: new Date(survey.created_at).toISOString(), // Expires 24 hours from creation
      completedAt: survey.completed_at,
    };

    return { ok: true, data: surveyData };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'SURVEY_FETCH_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

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
