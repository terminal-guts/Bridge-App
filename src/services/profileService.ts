/**
 * Profile Service — Direct Supabase Implementation
 *
 * Core profile CRUD + onboarding operations.
 * Photo operations are in profileService.photos.ts.
 * Extra operations (pause, guides, suspension, lookups) are in profileService.extras.ts.
 */

import {
  ApiResponse,
  UserProfile,
} from '../types';
import { supabase } from '../lib/supabase';
import { isReviewerBypassEmail } from './authService';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { getMultiplePhotoSignedUrls } from './photoService';
import { getQuestionById } from '../utils/deepQuestions';
import { getQuestionTier } from '../utils/questionTiers';
import { calculateProfileStrengthBreakdown } from '../utils/profileCompleteness';

// Re-export from sub-modules so existing imports keep working
export { addProfilePhotos, removeProfilePhoto, reorderProfilePhotos, setMainProfilePhoto } from './profileService.photos';
export { updateProfilePauseStatus, getProfilePauseStatus, markGuideCompleted, getGuideCompletionStatus, checkMinimalProfileStatus, getCachedMinimalProfileStatus, clearMinimalProfileStatusCache, setCachedRole, fetchAndSetUserProfile, getProfileById, getFullUserProfileById, findProfileByEmail, MinimalProfileStatus, getInMemoryMinimalStatus } from './profileService.extras';
export { saveOnboardingStep, createUserProfile } from './profileService.onboarding';

const logger = createLogger('ProfileService');

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SIGNED_URL_TTL_MS = 23 * 60 * 60 * 1000; // 23 hours — re-sign before 24h expiry
let profileCache: { data: UserProfile; ts: number; signedAt: number } | null = null;

let pendingProfileFetch: Promise<ApiResponse<UserProfile>> | null = null;

export function invalidateProfileCache(): void {
  profileCache = null;
}

// ============================================================================
// HELPERS
// ============================================================================

const createErrorResponse = <T = never>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

/**
 * Extracts the raw Supabase storage path from a signed or public URL.
 * If the input is already a plain path (not a URL), returns it unchanged.
 * e.g. "https://...supabase.co/.../profile-photos/userId/photo.jpg?token=..."
 *   -> "userId/photo.jpg"
 */
function extractStoragePath(url: string): string {
  if (!url || !url.startsWith('http')) return url;
  const match = url.match(/\/profile-photos\/(.+?)(?:\?|$)/);
  return match ? match[1] : url;
}

function heightToInches(heightStr: string | undefined): number | undefined {
  if (!heightStr) return undefined;
  // Handle raw inches value saved by HeightStep (e.g. "68")
  const raw = parseInt(heightStr, 10);
  if (!isNaN(raw) && raw >= 48 && raw <= 84) return raw;
  // Handle formatted string (e.g. "5'8"")
  const match = heightStr.match(/(\d+)'(\d+)"/);
  if (match) {
    const feet = parseInt(match[1]);
    const inches = parseInt(match[2]);
    return feet * 12 + inches;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
function mapBackendToUserProfile(data: Record<string, any>): UserProfile {
  return {
    id: data.id,
    userId: data.user_id || data.id,
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    age: (data.age && data.age > 0) ? data.age : undefined,
    gender: data.gender || [],
    pronouns: data.pronouns || '',
    pronounsList: data.pronouns_list || [],
    customMyGender: data.custom_gender,
    interestedInGenders: data.interested_in_genders || data.preferences?.interested_in_genders || [],
    height: data.height_inches ? `${Math.floor(data.height_inches / 12)}'${data.height_inches % 12}"` : (data.height || ''),
    ethnicity: data.ethnicity || '',
    religion: data.religion || '',
    politicalLeaning: data.political_leaning || '',
    location: data.location || '',
    hometown: data.hometown,
    currentJob: data.current_job,
    companyPosition: data.company_position,
    educationLevel: data.education_level || '',
    school: data.school,
    hasChildren: data.has_children,
    familyPlans: data.family_plans,
    drinkingFrequency: data.drinking_frequency,
    cannabisFrequency: data.cannabis_frequency,
    tobaccoFrequency: data.tobacco_frequency,
    otherDrugsFrequency: data.other_drugs_frequency,
    interests: data.interests || [],
    values: data.values || [],
    bio: data.bio || '',
    photos: ((data.photos as Array<Record<string, unknown>>) || []).map((p) => ({
      id: p.id || p.url,
      url: p.url,
      isMain: p.is_main || false,
      order: p.display_order || 0,
      ...(p.blurhash ? { blurhash: p.blurhash as string } : {}),
    })),
    preferences: {
      ageMin: data.preferences?.age_min ?? data.preferences?.ageMin ?? 22,
      ageMax: data.preferences?.age_max ?? data.preferences?.ageMax ?? 30,
      gender: (() => {
        const genders: string[] = data.interested_in_genders || data.preferences?.interested_in_genders || [];
        if (genders.length === 1) {
          if (genders[0] === 'male') return 'male' as const;
          if (genders[0] === 'female') return 'female' as const;
        }
        return 'both' as const;
      })(),
      lookingFor: (data.preferences?.looking_for ?? data.preferences?.lookingFor ?? 'relationship') as 'relationship' | 'casual' | 'friendship' | 'unsure',
      heightMin: data.preferences?.preferred_height_min_inches ?? data.preferences?.height_min ?? data.preferences?.heightMin ?? 60,
      heightMax: data.preferences?.preferred_height_max_inches ?? data.preferences?.height_max ?? data.preferences?.heightMax ?? 84,
      maxDistance: data.preferences?.max_distance ?? data.preferences?.maxDistance ?? 50,
    },
    preferredEthnicities: data.preferred_ethnicities || data.preferences?.preferred_ethnicities || [],
    preferredReligions: data.preferred_religions || data.preferences?.preferred_religions || [],
    preferredPolitics: data.preferred_politics || data.preferences?.preferred_politics || [],
    partnerLifestylePreferences: (
      data.preferences?.partner_drinking !== undefined ||
      data.preferences?.partner_cannabis !== undefined
    ) ? {
      drinking: data.preferences?.partner_drinking || [],
      cannabis: data.preferences?.partner_cannabis || [],
      tobacco: data.preferences?.partner_tobacco || [],
      otherDrugs: data.preferences?.partner_other_drugs || [],
    } : (data.partner_lifestyle_preferences || data.preferences?.partner_lifestyle_preferences || undefined),
    lifestyle: data.lifestyle || {},
    nonNegotiables: [],
    deepQuestions: (() => {
      const dqRow = Array.isArray(data.deep_questions) ? data.deep_questions[0] : null;
      const answersMap: Record<string, string> = dqRow?.answers || {};
      return Object.entries(answersMap).map(([qId, answer]) => {
        const questionId = parseInt(qId, 10);
        const tier = getQuestionTier(questionId) as 1 | 2 | 3;
        const questionObj = getQuestionById(questionId);
        return {
          questionId,
          question: questionObj?.question || '',
          answer: answer as string,
          tier,
          updatedAt: new Date().toISOString(),
        };
      });
    })(),
    displayedQuestions: (() => {
      const dqRow = Array.isArray(data.deep_questions) ? data.deep_questions[0] : null;
      return dqRow?.displayed_question_ids || [];
    })(),
    isPaused: data.is_paused || false,
    isVerified: data.is_verified || false,
    profileCompleted: data.profile_completed || false,
    matchmakingOnly: data.matchmaking_only || false,
    isSuspended: data.is_suspended ?? false,
    suspensionReason: data.suspension_reason ?? null,
    role: data.role || 'dater',
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    karma: data.karma_score ? {
      karma_points: data.karma_score.karma_points ?? 0,
      badge_tier: data.karma_score.badge_tier ?? 'new',
      total_assists: data.karma_score.total_assists ?? 0,
      total_votes: data.karma_score.total_votes ?? 0,
      voting_accuracy_rate: data.karma_score.voting_accuracy_rate ?? 0,
    } : undefined,
  } as unknown as UserProfile;
}

// Onboarding operations (saveOnboardingStep, createUserProfile) are in profileService.onboarding.ts

// ============================================================================
// READ / WRITE
// ============================================================================

/**
 * Get the current user's profile directly from Supabase tables.
 * Uses stale-while-revalidate: returns stale cache immediately + refreshes in background.
 * If signed URLs have expired (>23h), forces a fresh fetch to avoid gray circles.
 */
export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  // Return cached profile if still fresh
  if (profileCache && Date.now() - profileCache.ts < PROFILE_CACHE_TTL_MS) {
    // Even if the profile data is fresh, check if signed URLs are about to expire
    if (Date.now() - profileCache.signedAt < SIGNED_URL_TTL_MS) {
      return { ok: true, data: profileCache.data };
    }
    // Signed URLs expired — fall through to re-fetch
  }

  // Stale-while-revalidate: if cache exists but profile data expired (not signed URLs),
  // return stale + refresh in background. But if signed URLs are expired, we MUST
  // wait for a fresh fetch — stale signed URLs render as gray circles.
  if (profileCache && Date.now() - profileCache.signedAt < SIGNED_URL_TTL_MS) {
    // Trigger background refresh (deduplicated)
    if (!pendingProfileFetch) {
      pendingProfileFetch = _fetchUserProfile().finally(() => { pendingProfileFetch = null; });
    }
    return { ok: true, data: profileCache.data };
  }

  // No cache, or signed URLs expired — must wait for network
  if (pendingProfileFetch) {
    return pendingProfileFetch;
  }

  pendingProfileFetch = _fetchUserProfile();
  return pendingProfileFetch.finally(() => { pendingProfileFetch = null; });
};

const _fetchUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    const userId = await getCurrentUserId();
    logger.info('[ProfileService] getUserProfile:', userId);

    // Fire profile query first — we need it to identify photo paths for signing
    const profilePromise = supabase.from('user_profiles').select('*').eq('user_id', userId).single();

    // Fire the other queries in parallel (don't await yet)
    const prefsPromise = supabase.from('user_preferences').select('*').eq('user_id', userId).single();
    const dqPromise = supabase.from('deep_question_answers').select('*').eq('user_id', userId);
    const karmaPromise = supabase.from('karma_scores').select('*').eq('user_id', userId).maybeSingle();

    // Wait for profile first to start photo signing ASAP
    const profileResult = await profilePromise;

    if (profileResult.error) {
      if (profileResult.error.code === 'PGRST116') {
        return createErrorResponse('PROFILE_NOT_FOUND', 'Profile not found');
      }
      throw new Error(profileResult.error.message);
    }

    // Extract photo storage paths and start signing in parallel with remaining queries.
    // Photos may be stored as raw paths ("userId/photo.jpg") or legacy full URLs
    // ("https://...supabase.co/.../profile-photos/userId/photo.jpg"). Both need
    // signed URLs now that the bucket is private.
    const rawPhotos: Array<{ url: string }> = profileResult.data?.photos || [];
    const validPhotos = rawPhotos.filter((p) => p.url && !p.url.startsWith('file://'));
    const storagePaths = validPhotos
      .map((p) => extractStoragePath(p.url))
      .filter((path: string) => !!path);

    // Start photo signing NOW — runs in parallel with prefs/dq/karma queries
    const signedUrlsPromise = storagePaths.length > 0
      ? getMultiplePhotoSignedUrls(storagePaths, 86400)
      : Promise.resolve(null);

    // Wait for everything else
    const [prefsResult, dqResult, karmaResult, urlMapRes] = await Promise.all([
      prefsPromise,
      dqPromise,
      karmaPromise,
      signedUrlsPromise,
    ]);

    const combinedData = {
      ...profileResult.data,
      preferences: prefsResult.data || {},
      deep_questions: dqResult.data || [],
      karma_score: karmaResult.data || null,
    };

    const profile = mapBackendToUserProfile(combinedData);

    // Filter out invalid local file:// URIs
    if (profile.photos && profile.photos.length > 0) {
      profile.photos = profile.photos.filter(p => p.url && !p.url.startsWith('file://'));
    }

    // Apply signed URLs (already resolved in parallel).
    // Look up by extracted storage path so both raw paths and legacy full URLs resolve.
    if (urlMapRes && urlMapRes.ok && urlMapRes.data && profile.photos) {
      const urlMap = urlMapRes.data!;
      profile.photos = profile.photos.map(p => {
        const path = extractStoragePath(p.url);
        return { ...p, url: urlMap[path] || p.url };
      });
    }

    // Fallback: if any photo URL is still a raw storage path (signing failed or was
    // skipped), generate a public URL so the image component has a valid HTTP URL.
    // Private buckets will 403 on public URLs, but that is a better failure mode than
    // a non-HTTP string which guarantees a gray circle with no retry possible.
    if (profile.photos) {
      profile.photos = profile.photos.map(p => {
        if (p.url && !p.url.startsWith('http')) {
          const { data } = supabase.storage.from('profile-photos').getPublicUrl(p.url);
          return { ...p, url: data.publicUrl };
        }
        return p;
      });
    }

    const now = Date.now();
    profileCache = { data: profile, ts: now, signedAt: now };
    return { ok: true, data: profile };
  } catch (error: unknown) {
    logger.error('[ProfileService] getUserProfile error:', error);
    return createErrorResponse('FETCH_PROFILE_ERROR', error instanceof Error ? error.message : 'Failed to fetch profile');
  }
};

/**
 * Update the current user's profile (partial update).
 * Writes directly to user_profiles, user_preferences, and deep_question_answers.
 */
export const updateUserProfile = async (
  updates: Partial<UserProfile>,
): Promise<ApiResponse<UserProfile>> => {
  try {
    const userId = await getCurrentUserId();
    logger.info('[ProfileService] updateUserProfile:', userId);

    // Build user_profiles payload
    const profilePayload: Record<string, unknown> = {};
    if (updates.firstName !== undefined) profilePayload.first_name = updates.firstName;
    if (updates.lastName !== undefined) profilePayload.last_name = updates.lastName;
    if (updates.age !== undefined) profilePayload.age = updates.age;
    if (updates.gender !== undefined) profilePayload.gender = updates.gender;
    if (updates.location !== undefined) profilePayload.location = updates.location;
    if (updates.pronouns !== undefined) profilePayload.pronouns = updates.pronouns;
    if (updates.pronounsList !== undefined) profilePayload.pronouns_list = updates.pronounsList;
    if (updates.customMyGender !== undefined) profilePayload.custom_gender = updates.customMyGender;
    if (updates.hometown !== undefined) profilePayload.hometown = updates.hometown;
    if (updates.currentJob !== undefined) profilePayload.current_job = updates.currentJob;
    if (updates.companyPosition !== undefined) profilePayload.company_position = updates.companyPosition;
    if (updates.educationLevel !== undefined) profilePayload.education_level = updates.educationLevel;
    if (updates.school !== undefined) profilePayload.school = updates.school;
    if (updates.height !== undefined) profilePayload.height_inches = heightToInches(updates.height);
    if (updates.ethnicity !== undefined) profilePayload.ethnicity = updates.ethnicity;
    if (updates.religion !== undefined) profilePayload.religion = updates.religion;
    if (updates.politicalLeaning !== undefined) profilePayload.political_leaning = updates.politicalLeaning;
    if (updates.hasChildren !== undefined) profilePayload.has_children = updates.hasChildren;
    if (updates.familyPlans !== undefined) profilePayload.family_plans = updates.familyPlans;
    if (updates.drinkingFrequency !== undefined) profilePayload.drinking_frequency = updates.drinkingFrequency;
    if (updates.cannabisFrequency !== undefined) profilePayload.cannabis_frequency = updates.cannabisFrequency;
    if (updates.tobaccoFrequency !== undefined) profilePayload.tobacco_frequency = updates.tobaccoFrequency;
    if (updates.otherDrugsFrequency !== undefined) profilePayload.other_drugs_frequency = updates.otherDrugsFrequency;
    if (updates.interests !== undefined) profilePayload.interests = updates.interests;
    if (updates.values !== undefined) profilePayload.values = updates.values;
    if (updates.bio !== undefined) profilePayload.bio = updates.bio;
    if (updates.isPaused !== undefined) profilePayload.is_paused = updates.isPaused;
    if (updates.role !== undefined) profilePayload.role = updates.role;
    if (updates.interestedInGenders !== undefined) profilePayload.interested_in_genders = updates.interestedInGenders;
    if ((updates as UserProfile & { guideCompletions?: Record<string, boolean> }).guideCompletions !== undefined) profilePayload.guide_completions = (updates as UserProfile & { guideCompletions?: Record<string, boolean> }).guideCompletions;
    if (updates.photos !== undefined) {
      // Always store raw storage paths — never signed/public URLs or local file:// URIs.
      profilePayload.photos = updates.photos
        .filter(p => p.url && !p.url.startsWith('file://'))
        .map(p => ({
          id: p.id,
          url: extractStoragePath(p.url),
          is_main: p.isMain,
          display_order: p.order,
          ...(p.blurhash ? { blurhash: p.blurhash } : {}),
        }));
    }

    // Update user_profiles
    if (Object.keys(profilePayload).length > 0) {
      profilePayload.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('user_profiles')
        .update(profilePayload)
        .eq('user_id', userId);
      if (error) {
        logger.error('[ProfileService] Profile update error:', error.message);
        throw new Error(error.message);
      }
    }

    // Build and update user_preferences
    if (updates.preferences !== undefined || updates.preferredEthnicities !== undefined ||
        updates.preferredReligions !== undefined || updates.preferredPolitics !== undefined ||
        updates.partnerLifestylePreferences !== undefined) {
      const prefPayload: Record<string, unknown> = {};
      if (updates.preferences?.ageMin !== undefined) prefPayload.age_min = updates.preferences.ageMin;
      if (updates.preferences?.ageMax !== undefined) prefPayload.age_max = updates.preferences.ageMax;
      // preferred_gender removed — derived from interested_in_genders in user_profiles
      if (updates.preferences?.lookingFor !== undefined) prefPayload.looking_for = updates.preferences.lookingFor;
      if (updates.preferences?.heightMin !== undefined) prefPayload.preferred_height_min_inches = updates.preferences.heightMin;
      if (updates.preferences?.heightMax !== undefined) prefPayload.preferred_height_max_inches = updates.preferences.heightMax;
      if (updates.preferences?.maxDistance !== undefined) prefPayload.max_distance = updates.preferences.maxDistance;
      if (updates.preferredEthnicities !== undefined) prefPayload.preferred_ethnicities = updates.preferredEthnicities;
      if (updates.preferredReligions !== undefined) prefPayload.preferred_religions = updates.preferredReligions;
      if (updates.preferredPolitics !== undefined) prefPayload.preferred_politics = updates.preferredPolitics;
      if (updates.partnerLifestylePreferences !== undefined) {
        prefPayload.partner_drinking = updates.partnerLifestylePreferences.drinking;
        prefPayload.partner_cannabis = updates.partnerLifestylePreferences.cannabis;
        prefPayload.partner_tobacco = updates.partnerLifestylePreferences.tobacco;
        prefPayload.partner_other_drugs = updates.partnerLifestylePreferences.otherDrugs;
      }
      if (Object.keys(prefPayload).length > 0) {
        prefPayload.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('user_preferences')
          .upsert({ user_id: userId, ...prefPayload }, { onConflict: 'user_id' });
        if (error) {
          logger.warn('[ProfileService] Preferences update error:', error.message);
        }
      }
    }

    // Deep question answers
    if (updates.deepQuestions !== undefined || updates.displayedQuestions !== undefined) {
      const upsertData: Record<string, unknown> = { user_id: userId };
      if (updates.deepQuestions !== undefined) {
        upsertData.answers = updates.deepQuestions.reduce((acc, dq) => ({
          ...acc,
          [String(dq.questionId)]: dq.answer,
        }), {} as Record<string, string>);
      }
      if (updates.displayedQuestions !== undefined) {
        upsertData.displayed_question_ids = updates.displayedQuestions;
      }
      const { error: dqError } = await supabase
        .from('deep_question_answers')
        .upsert(upsertData, { onConflict: 'user_id' });
      if (dqError) {
        logger.warn('[ProfileService] Could not save deep question answers:', dqError.message);
      }
    }

    // Fetch fresh profile for the completion check below.
    // Use _fetchUserProfile directly (bypasses cache-read layer) so we always
    // get post-update data from the DB.  As a side-effect it repopulates the
    // cache with fresh signed URLs — so the Profile screen never sees a null
    // cache and photos don't flash blank during background saves.
    try {
      const fullProfile = await _fetchUserProfile();
      const isReviewer = fullProfile.ok && isReviewerBypassEmail(fullProfile.data?.email ?? '');
      if (fullProfile.ok && fullProfile.data && !fullProfile.data.profileCompleted && !isReviewer) {
        // Check mandatory fields only (not cosmetic photos/questions score).
        // The overall score includes photos+questions which are cosmetic —
        // profile_completed should be set when mandatory fields are done.
        const strength = calculateProfileStrengthBreakdown(fullProfile.data);
        const mandatoryComplete =
          strength.sections.aboutMe.percentage === 100 &&
          strength.sections.matchPreferences.percentage === 100;
        if (mandatoryComplete) {
          const { error: completeError } = await supabase
            .from('user_profiles')
            .update({ profile_completed: true, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          if (completeError) {
            logger.warn('[ProfileService] Failed to set profile_completed:', completeError.message);
          } else {
            logger.info('[ProfileService] Profile strength reached 100% — profile_completed set to true');
            // Trigger proposal generation immediately (don't wait for 7PM cron)
            try {
              const { generateProposalForUser } = await import('./proposalApiService');
              await generateProposalForUser();
              logger.info('[ProfileService] Proposal generation triggered on profile completion');
            } catch (proposalErr: unknown) {
              logger.warn('[ProfileService] Proposal generation failed (non-blocking):', proposalErr instanceof Error ? proposalErr.message : String(proposalErr));
            }
          }
        }
      }
    } catch (err: unknown) {
      logger.warn('[ProfileService] Profile completion check failed (non-blocking):', err instanceof Error ? err.message : String(err));
    }

    // Soft-invalidate: mark data as stale so the next getUserProfile() triggers
    // a background refresh, but keep the cached signed URLs so photos render
    // instantly instead of flashing blank for ~10s.
    if (profileCache) {
      profileCache.ts = 0;
    }
    return { ok: true };
  } catch (error: unknown) {
    logger.error('[ProfileService] updateUserProfile error:', error);
    return createErrorResponse('UPDATE_PROFILE_ERROR', error instanceof Error ? error.message : 'Failed to update profile');
  }
};
