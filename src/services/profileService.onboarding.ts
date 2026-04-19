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
// EARLY PROFILE ROW
// ============================================================================

/**
 * Ensure a minimal profile row exists for this user right after email verification.
 * This runs before the user finishes onboarding so we can track abandonment
 * and re-engage users who drop off mid-onboarding.
 *
 * Idempotent — safe to call multiple times (upsert with ignoreDuplicates).
 * Non-blocking — failures are logged but never block the user.
 */
export const ensureProfileRow = async (userId: string, email: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: userId, email, profile_completed: false },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
    if (error) {
      logger.warn('[ProfileService] ensureProfileRow error (non-blocking):', error.message);
    } else {
      logger.info('[ProfileService] ensureProfileRow: minimal row ensured for', userId);
    }
  } catch (err) {
    logger.warn('[ProfileService] ensureProfileRow exception (non-blocking):', err);
  }
};

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

    // Track errors across the (possibly two) upserts so the caller can decide
    // whether to warn the user. We previously logged.warn and returned ok:true
    // unconditionally, which masked real data-loss scenarios — a 4G dropout
    // mid-step left columns NULL with no signal.
    const errors: string[] = [];

    if (transformed.profiles || transformed.preferences) {
      if (transformed.profiles && Object.keys(transformed.profiles).length > 0) {
        const { error } = await supabase.from('user_profiles')
          .upsert({ user_id: finalUserId, ...transformed.profiles }, { onConflict: 'user_id' });
        if (error) {
          logger.error(`[ProfileService] user_profiles upsert error (step=${stepKey}):`, error.message);
          errors.push(`user_profiles: ${error.message}`);
        }
      }
      if (transformed.preferences && Object.keys(transformed.preferences).length > 0) {
        const { error } = await supabase.from('user_preferences')
          .upsert({ user_id: finalUserId, ...transformed.preferences }, { onConflict: 'user_id' });
        if (error) {
          logger.error(`[ProfileService] user_preferences upsert error (step=${stepKey}):`, error.message);
          errors.push(`user_preferences: ${error.message}`);
        }
      }
    } else {
      // Single-table update
      const table = mapping.table;
      if (table === 'user_profiles' || table === 'user_preferences') {
        const { error } = await supabase.from(table)
          .upsert({ user_id: finalUserId, ...transformed }, { onConflict: 'user_id' });
        if (error) {
          logger.error(`[ProfileService] ${table} upsert error (step=${stepKey}):`, error.message);
          errors.push(`${table}: ${error.message}`);
        }
      }
      // user_photos handled separately via photoService
    }

    if (errors.length > 0) {
      return createErrorResponse('SAVE_STEP_PARTIAL', errors.join('; '));
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
 *
 * Photo failure handling: if the user picked photo(s) but every upload failed,
 * the profile is still created so they can enter the app — but profile_completed
 * stays false so the matches gate keeps them in the locked view until they
 * successfully add a photo from EditPhotos. Returns `data.photoUploadFailed`
 * so the caller can surface a toast.
 */
export const createUserProfile = async (
  userId: string,
  data: Partial<OnboardingData>,
): Promise<ApiResponse<{ photoUploadFailed: boolean }>> => {
  try {
    logger.info('[ProfileService] createUserProfile:', userId);

    // Upload photos before building the payload
    let photoData: Array<{ id: string; url: string; is_main: boolean; display_order: number }> = [];
    let photoUploadFailed = false;
    if (data.photos && data.photos.length > 0) {
      const allUrls = data.photos.map(p => p.url || (p as Photo & { uri?: string }).uri).filter((u): u is string => Boolean(u));
      // Separate already-uploaded CDN URLs from local file:// URIs that need uploading
      const cdnUrls = allUrls.filter(u => !u.startsWith('file://'));
      const localUris = allUrls.filter(u => u.startsWith('file://'));
      const userTriedToUpload = allUrls.length > 0;

      // Keep CDN URLs as-is (from eager upload)
      photoData = cdnUrls.map((url, i) => ({
        id: url,
        url,
        is_main: i === 0 && localUris.length === 0,
        display_order: i,
      }));

      // Upload any remaining local files
      if (localUris.length > 0) {
        const uploadRes = await uploadMultiplePhotos(localUris);
        if (uploadRes.ok && uploadRes.data) {
          const uploaded = uploadRes.data
            .filter((p) => p.url && !p.url.startsWith('file://'))
            .map((p, i) => ({
              id: p.id || p.url,
              url: p.url,
              is_main: photoData.length === 0 && i === 0,
              display_order: photoData.length + i,
            }));
          photoData = [...photoData, ...uploaded];
        } else {
          logger.warn('[ProfileService] Photo upload failed — continuing without photos');
        }
      }

      if (userTriedToUpload && photoData.length === 0) {
        photoUploadFailed = true;
        logger.warn('[ProfileService] No photos persisted — profile_completed will stay false');
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
      role: data.role || 'dater',
      // Mandatory: at least one photo. If photo upload failed, profile_completed
      // stays false so the matches gate keeps the user in the locked view.
      // Auto-promote in updateUserProfile flips it to true when they add a photo
      // from EditPhotos later.
      profile_completed: photoData.length > 0,
    };

    // Strip undefined, empty arrays, and empty strings so they don't overwrite
    // data already saved by step-level saves. The DB has matching defaults
    // ('', '{}', '[]'), so omitting these from the UPSERT is safe — the ON
    // CONFLICT SET clause simply won't touch those columns.
    Object.keys(profilePayload).forEach(key => {
      if (key === 'user_id' || key === 'first_name' || key === 'last_name' || key === 'profile_completed') return;
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
      preferred_religions: data.preferredReligions,
      preferred_politics: data.preferredPolitics,
      interested_in_genders: data.interestedInGenders,
      partner_drinking: data.partnerLifestylePreferences?.drinking,
      partner_cannabis: data.partnerLifestylePreferences?.cannabis,
      partner_tobacco: data.partnerLifestylePreferences?.tobacco,
      partner_other_drugs: data.partnerLifestylePreferences?.otherDrugs,
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

    return { ok: true, data: { photoUploadFailed } };
  } catch (error: unknown) {
    logger.error('[ProfileService] createUserProfile error:', error);
    return createErrorResponse('CREATE_PROFILE_ERROR', error instanceof Error ? error.message : 'Failed to create profile');
  }
};
