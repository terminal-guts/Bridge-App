/**
 * Profile Service - Onboarding operations
 *
 * Extracted from profileService.ts for file-size management.
 * Contains: saveOnboardingStep, createUserProfile.
 */

import {
  ApiResponse,
  UserProfile,
  OnboardingData,
  Photo,
} from '../types';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { uploadMultiplePhotos } from './photoService';
import { ONBOARDING_STEP_MAPPING } from '../config/onboardingMapping';

const logger = createLogger('ProfileService');

const createErrorResponse = <T = never>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

function heightToInches(heightStr: string | undefined): number | undefined {
  if (!heightStr) return undefined;
  const raw = parseInt(heightStr, 10);
  if (!isNaN(raw) && raw >= 48 && raw <= 84) return raw;
  const match = heightStr.match(/(\d+)'(\d+)"/);
  if (match) {
    const feet = parseInt(match[1]);
    const inches = parseInt(match[2]);
    return feet * 12 + inches;
  }
  return undefined;
}

// ============================================================================
// ONBOARDING
// ============================================================================

/**
 * Save a single onboarding step's data directly to Supabase.
 * Uses the step mapping to determine which table(s) and column(s) to write.
 */
export const saveOnboardingStep = async (
  stepKey: string,
  data: Partial<OnboardingData>,
  userId?: string,
): Promise<ApiResponse<void>> => {
  try {
    let finalUserId = userId;
    if (!finalUserId) {
      try {
        finalUserId = await getCurrentUserId();
      } catch {
        // No user ID yet (pre-auth step) — skip save silently
        return { ok: true };
      }
    }
    logger.info('[ProfileService] saveOnboardingStep:', stepKey);

    const mapping = ONBOARDING_STEP_MAPPING[stepKey];
    if (!mapping || mapping.columns.length === 0) {
      return { ok: true }; // No data to save (e.g., welcome step)
    }

    let transformed: Record<string, unknown>;
    if (mapping.transform) {
      transformed = mapping.transform(data);
    } else {
      // Default: map column names from the onboarding data
      transformed = {};
      for (const col of mapping.columns) {
        // Convert snake_case column to camelCase key
        const camelKey = col.replace(/_(\w)/g, (_: string, c: string) => c.toUpperCase());
        const dataRecord = data as Record<string, unknown>;
        if (dataRecord[camelKey] !== undefined) {
          transformed[col] = dataRecord[camelKey];
        } else if (dataRecord[col] !== undefined) {
          transformed[col] = dataRecord[col];
        }
      }
    }

    // Check if transform returned multi-table format { profiles: {...}, preferences: {...} }
    if (transformed.profiles || transformed.preferences) {
      if (transformed.profiles && Object.keys(transformed.profiles).length > 0) {
        const { error } = await supabase.from('user_profiles')
          .upsert({ user_id: finalUserId, ...transformed.profiles }, { onConflict: 'user_id' });
        if (error) logger.warn('[ProfileService] Profile upsert error:', error.message);
      }
      if (transformed.preferences && Object.keys(transformed.preferences).length > 0) {
        const { error } = await supabase.from('user_preferences')
          .upsert({ user_id: finalUserId, ...transformed.preferences }, { onConflict: 'user_id' });
        if (error) logger.warn('[ProfileService] Preferences upsert error:', error.message);
      }
    } else {
      // Single-table update
      const table = mapping.table;
      if (table === 'user_profiles' || table === 'user_preferences') {
        const { error } = await supabase.from(table)
          .upsert({ user_id: finalUserId, ...transformed }, { onConflict: 'user_id' });
        if (error) logger.warn(`[ProfileService] ${table} upsert error:`, error.message);
      }
      // user_photos handled separately via photoService
    }

    return { ok: true };
  } catch (error: unknown) {
    logger.error('[ProfileService] saveOnboardingStep error:', error);
    return createErrorResponse('SAVE_STEP_ERROR', error instanceof Error ? error.message : 'Failed to save onboarding step');
  }
};

/**
 * Create the full user profile at the end of onboarding.
 * Upserts directly into user_profiles, user_preferences, and deep_question_answers.
 */
export const createUserProfile = async (
  userId: string,
  data: Partial<OnboardingData>,
): Promise<ApiResponse<UserProfile>> => {
  try {
    logger.info('[ProfileService] createUserProfile:', userId);

    // Upload photos before building the payload
    let photoData: Array<{ id: string; url: string; is_main: boolean; display_order: number }> = [];
    if (data.photos && data.photos.length > 0) {
      const uris = data.photos.map(p => p.url || (p as Photo & { uri?: string }).uri).filter((u): u is string => Boolean(u));
      if (uris.length > 0) {
        const uploadRes = await uploadMultiplePhotos(uris);
        if (uploadRes.ok && uploadRes.data) {
          photoData = uploadRes.data
            .filter((p) => p.url && !p.url.startsWith('file://')) // Never save local file URIs
            .map((p, i) => ({
              id: p.id || p.url,
              url: p.url,
              is_main: i === 0,
              display_order: i,
            }));
        } else {
          logger.error('[ProfileService] Photo upload failed — aborting profile creation');
          return createErrorResponse('PHOTO_UPLOAD_FAILED', 'Failed to upload photos. Please try again.');
        }
      }
    }

    // Build user_profiles payload
    const profilePayload: Record<string, unknown> = {
      user_id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      age: data.age,
      gender: data.gender,
      pronouns: data.pronounsList?.join('/'),
      pronouns_list: data.pronounsList,
      height_inches: heightToInches(data.height),
      ethnicity: data.ethnicity,
      location: data.location,
      hometown: data.hometown,
      current_job: data.currentJob,
      company_position: data.companyPosition,
      education_level: data.educationLevel,
      school: data.school,
      religion: data.religion,
      political_leaning: data.politicalLeaning,
      has_children: data.hasChildren,
      family_plans: data.familyPlans,
      drinking_frequency: data.drinkingFrequency,
      cannabis_frequency: data.cannabisFrequency,
      tobacco_frequency: data.tobaccoFrequency,
      other_drugs_frequency: data.otherDrugsFrequency,
      interests: data.interests,
      values: data.values,
      bio: data.bio,
      email: data.email,
      interested_in_genders: data.interestedInGenders,
      photos: photoData,
      non_negotiables: [],
      matchmaking_only: data.matchmakingOnly ?? false,
      role: data.role || 'dater',
      // Matchmakers have no profile-strength gate — mark complete immediately.
      // Daters are marked complete later by updateUserProfile once strength hits 100%.
      ...(data.role === 'matchmaker' ? { profile_completed: true } : {}),
    };

    // Strip undefined, empty arrays, and empty strings so they don't overwrite
    // data already saved by step-level saves. The DB has matching defaults
    // ('', '{}', '[]'), so omitting these from the UPSERT is safe — the ON
    // CONFLICT SET clause simply won't touch those columns.
    Object.keys(profilePayload).forEach(key => {
      if (key === 'user_id' || key === 'first_name' || key === 'last_name') return;
      const val = profilePayload[key];
      if (val === undefined) { delete profilePayload[key]; return; }
      if (Array.isArray(val) && val.length === 0) { delete profilePayload[key]; return; }
      if (val === '') { delete profilePayload[key]; return; }
    });

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' });

    if (profileError) {
      logger.error('[ProfileService] Profile upsert error:', profileError.message);
      throw new Error(profileError.message);
    }

    // Build user_preferences payload
    const prefsPayload: Record<string, unknown> = {
      user_id: userId,
      looking_for: data.preferences?.lookingFor,
      age_min: data.preferences?.ageMin,
      age_max: data.preferences?.ageMax,
      preferred_height_min_inches: data.preferences?.heightMin,
      preferred_height_max_inches: data.preferences?.heightMax,
      max_distance: data.preferences?.maxDistance,
      preferred_ethnicities: data.preferredEthnicities,
      preferred_religions: (data as Partial<OnboardingData> & { preferredReligions?: string[] }).preferredReligions,
      interested_in_genders: data.interestedInGenders,
    };

    Object.keys(prefsPayload).forEach(key => {
      if (prefsPayload[key] === undefined) delete prefsPayload[key];
    });

    if (Object.keys(prefsPayload).length > 1) {
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert(prefsPayload, { onConflict: 'user_id' });
      if (prefsError) {
        logger.warn('[ProfileService] Preferences upsert error:', prefsError.message);
      }
    }

    // Deep questions
    if (data.deepQuestions && data.deepQuestions.length > 0) {
      const answersMap = data.deepQuestions.reduce((acc, dq) => ({
        ...acc,
        [String(dq.questionId)]: dq.answer,
      }), {} as Record<string, string>);

      const { error: dqError } = await supabase
        .from('deep_question_answers')
        .upsert({
          user_id: userId,
          answers: answersMap,
          displayed_question_ids: data.displayedQuestions || [],
        }, { onConflict: 'user_id' });
      if (dqError) {
        logger.warn('[ProfileService] Deep questions upsert error:', dqError.message);
      }
    }

    // Invalidate cached profile so the next getUserProfile() fetches fresh data.
    const { invalidateProfileCache } = await import('./profileService');
    invalidateProfileCache();

    return { ok: true };
  } catch (error: unknown) {
    logger.error('[ProfileService] createUserProfile error:', error);
    return createErrorResponse('CREATE_PROFILE_ERROR', error instanceof Error ? error.message : 'Failed to create profile');
  }
};
