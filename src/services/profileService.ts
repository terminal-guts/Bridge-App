/**
 * Profile Service — Direct Supabase Implementation
 *
 * All profile CRUD operations go directly to Supabase tables.
 */

import {
  ApiResponse,
  UserProfile,
  OnboardingData,
  Photo,
} from '../types';
import { Profile } from '../types/profile';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { uploadMultiplePhotos, getMultiplePhotoSignedUrls } from './photoService';
import { getQuestionById } from '../utils/deepQuestions';
import { getQuestionTier } from '../utils/questionTiers';
import { ONBOARDING_STEP_MAPPING } from '../config/onboardingMapping';
import { calculateProfileStrengthBreakdown } from '../utils/profileCompleteness';

const logger = createLogger('ProfileService');

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let profileCache: { data: UserProfile; ts: number } | null = null;

export function invalidateProfileCache(): void {
  profileCache = null;
}

// ============================================================================
// HELPERS
// ============================================================================

const createErrorResponse = (code: string, message: string): ApiResponse<any> => ({
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

function mapBackendToUserProfile(data: any): UserProfile {
  return {
    id: data.id,
    userId: data.user_id || data.id,
    firstName: data.first_name || 'User',
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
    photos: (data.photos || []).map((p: any) => ({
      id: p.id || p.url,
      url: p.url,
      isMain: p.is_main || false,
      order: p.display_order || 0,
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
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    karma: data.karma_score ? {
      userId: data.karma_score.user_id,
      karmaPoints: data.karma_score.karma_points ?? 0,
      totalAssists: data.karma_score.total_assists ?? 0,
      totalProposals: data.karma_score.total_proposals ?? 0,
      totalVotes: data.karma_score.total_votes ?? 0,
      accurateVotes: data.karma_score.accurate_votes ?? 0,
      badgeTier: data.karma_score.badge_tier ?? 'new',
      proposalSuccessRate: data.karma_score.proposal_success_rate ?? 0,
      votingAccuracyRate: data.karma_score.voting_accuracy_rate ?? 0,
    } : undefined,
  } as UserProfile;
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

    let transformed: Record<string, any>;
    if (mapping.transform) {
      transformed = mapping.transform(data);
    } else {
      // Default: map column names from the onboarding data
      transformed = {};
      for (const col of mapping.columns) {
        // Convert snake_case column to camelCase key
        const camelKey = col.replace(/_(\w)/g, (_: string, c: string) => c.toUpperCase());
        if ((data as any)[camelKey] !== undefined) {
          transformed[col] = (data as any)[camelKey];
        } else if ((data as any)[col] !== undefined) {
          transformed[col] = (data as any)[col];
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
  } catch (error: any) {
    logger.error('[ProfileService] saveOnboardingStep error:', error);
    return createErrorResponse('SAVE_STEP_ERROR', error.message || 'Failed to save onboarding step');
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
    let photoData: any[] = [];
    if (data.photos && data.photos.length > 0) {
      const uris = data.photos.map(p => p.url || (p as any).uri).filter(Boolean);
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
    const profilePayload: Record<string, any> = {
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
    };

    // Remove undefined values so they don't overwrite existing data
    Object.keys(profilePayload).forEach(key => {
      if (profilePayload[key] === undefined) delete profilePayload[key];
    });

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' });

    if (profileError) {
      logger.error('[ProfileService] Profile upsert error:', profileError.message);
      throw new Error(profileError.message);
    }

    // Build user_preferences payload
    const prefsPayload: Record<string, any> = {
      user_id: userId,
      looking_for: data.preferences?.lookingFor,
      age_min: data.preferences?.ageMin,
      age_max: data.preferences?.ageMax,
      preferred_height_min_inches: data.preferences?.heightMin,
      preferred_height_max_inches: data.preferences?.heightMax,
      max_distance: data.preferences?.maxDistance,
      preferred_ethnicities: data.preferredEthnicities,
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

    return { ok: true };
  } catch (error: any) {
    logger.error('[ProfileService] createUserProfile error:', error);
    return createErrorResponse('CREATE_PROFILE_ERROR', error.message || 'Failed to create profile');
  }
};

// ============================================================================
// READ / WRITE
// ============================================================================

/**
 * Get the current user's profile directly from Supabase tables.
 */
export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  // Return cached profile if still fresh
  if (profileCache && Date.now() - profileCache.ts < PROFILE_CACHE_TTL_MS) {
    return { ok: true, data: profileCache.data };
  }

  try {
    const userId = await getCurrentUserId();
    logger.info('[ProfileService] getUserProfile:', userId);

    // Query all tables in parallel
    const [profileResult, prefsResult, dqResult, karmaResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
      supabase.from('deep_question_answers').select('*').eq('user_id', userId),
      supabase.from('karma_scores').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileResult.error) {
      if (profileResult.error.code === 'PGRST116') {
        // No row found — profile doesn't exist yet
        return createErrorResponse('PROFILE_NOT_FOUND', 'Profile not found');
      }
      throw new Error(profileResult.error.message);
    }

    // Combine data for the mapper
    const combinedData = {
      ...profileResult.data,
      preferences: prefsResult.data || {},
      deep_questions: dqResult.data || [],
      karma_score: karmaResult.data || null,
    };

    const profile = mapBackendToUserProfile(combinedData);

    // Filter out invalid local file:// URIs that were incorrectly saved to the database
    if (profile.photos && profile.photos.length > 0) {
      profile.photos = profile.photos.filter(p => p.url && !p.url.startsWith('file://'));
    }

    // Resolve storage paths to signed URLs.
    if (profile.photos && profile.photos.length > 0) {
      const storagePaths = profile.photos
        .map(p => p.url)
        .filter(url => url && !url.startsWith('http'));

      if (storagePaths.length > 0) {
        const urlMapRes = await getMultiplePhotoSignedUrls(storagePaths, 86400);
        if (urlMapRes.ok && urlMapRes.data) {
          profile.photos = profile.photos.map(p => ({
            ...p,
            url: urlMapRes.data![p.url] || p.url,
          }));
        }
      }
    }

    profileCache = { data: profile, ts: Date.now() };
    return { ok: true, data: profile };
  } catch (error: any) {
    logger.error('[ProfileService] getUserProfile error:', error);
    return createErrorResponse('FETCH_PROFILE_ERROR', error.message || 'Failed to fetch profile');
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
    const profilePayload: any = {};
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
    if (updates.interestedInGenders !== undefined) profilePayload.interested_in_genders = updates.interestedInGenders;
    if ((updates as any).guideCompletions !== undefined) profilePayload.guide_completions = (updates as any).guideCompletions;
    if (updates.photos !== undefined) {
      // Always store raw storage paths — never signed/public URLs or local file:// URIs.
      profilePayload.photos = updates.photos
        .filter(p => p.url && !p.url.startsWith('file://'))
        .map(p => ({
          ...p,
          url: extractStoragePath(p.url),
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
        updates.preferredPolitics !== undefined || updates.partnerLifestylePreferences !== undefined) {
      const prefPayload: any = {};
      if (updates.preferences?.ageMin !== undefined) prefPayload.age_min = updates.preferences.ageMin;
      if (updates.preferences?.ageMax !== undefined) prefPayload.age_max = updates.preferences.ageMax;
      // preferred_gender removed — derived from interested_in_genders in user_profiles
      if (updates.preferences?.lookingFor !== undefined) prefPayload.looking_for = updates.preferences.lookingFor;
      if (updates.preferences?.heightMin !== undefined) prefPayload.preferred_height_min_inches = updates.preferences.heightMin;
      if (updates.preferences?.heightMax !== undefined) prefPayload.preferred_height_max_inches = updates.preferences.heightMax;
      if (updates.preferences?.maxDistance !== undefined) prefPayload.max_distance = updates.preferences.maxDistance;
      if (updates.preferredEthnicities !== undefined) prefPayload.preferred_ethnicities = updates.preferredEthnicities;
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
      const upsertData: any = { user_id: userId };
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

    // Check if profile strength reached 100% → set profile_completed = true
    try {
      const fullProfile = await getUserProfile();
      if (fullProfile.ok && fullProfile.data && !fullProfile.data.profileCompleted) {
        const strength = calculateProfileStrengthBreakdown(fullProfile.data);
        if (strength.overall >= 100) {
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
            } catch (proposalErr: any) {
              logger.warn('[ProfileService] Proposal generation failed (non-blocking):', proposalErr.message);
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn('[ProfileService] Profile completion check failed (non-blocking):', err.message);
    }

    invalidateProfileCache();
    return { ok: true };
  } catch (error: any) {
    logger.error('[ProfileService] updateUserProfile error:', error);
    return createErrorResponse('UPDATE_PROFILE_ERROR', error.message || 'Failed to update profile');
  }
};

// ============================================================================
// PHOTOS
// ============================================================================

/**
 * Add photos to the user's profile.
 * Uploads to Supabase Storage and then updates profile metadata.
 */
export const addProfilePhotos = async (
  imageUris: string[],
): Promise<ApiResponse<Photo[]>> => {
  try {
    logger.info('[ProfileService] addProfilePhotos:', imageUris.length);

    // 1. Upload files to Supabase Storage
    const uploadRes = await uploadMultiplePhotos(imageUris);
    if (!uploadRes.ok || !uploadRes.data) {
      return createErrorResponse('UPLOAD_FAILED', uploadRes.error?.message || 'Failed to upload photos');
    }

    const newPhotos = uploadRes.data;

    // 2. Update profile with new photo metadata
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const existing = profileRes.data.photos || [];
    const allPhotos = [...existing, ...newPhotos];

    await updateUserProfile({ photos: allPhotos as any });

    return { ok: true, data: newPhotos };
  } catch (error: any) {
    logger.error('[ProfileService] addProfilePhotos error:', error);
    return createErrorResponse('ADD_PHOTOS_ERROR', error.message || 'Failed to add photos');
  }
};

/**
 * Remove a photo from the user's profile.
 */
export const removeProfilePhoto = async (
  photoId: string,
): Promise<ApiResponse<void>> => {
  try {
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const updatedPhotos = (profileRes.data.photos || []).filter(p => p.id !== photoId);
    await updateUserProfile({ photos: updatedPhotos as any });

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REMOVE_PHOTO_ERROR', error.message || 'Failed to remove photo');
  }
};

/**
 * Reorder profile photos.
 */
export const reorderProfilePhotos = async (
  reorderedPhotos: Photo[],
): Promise<ApiResponse<void>> => {
  try {
    await updateUserProfile({ photos: reorderedPhotos as any });
    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REORDER_PHOTOS_ERROR', error.message || 'Failed to reorder photos');
  }
};

/**
 * Set the main (primary) profile photo.
 */
export const setMainProfilePhoto = async (
  photoId: string,
): Promise<ApiResponse<void>> => {
  try {
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const updatedPhotos = (profileRes.data.photos || []).map(p => ({
      ...p,
      isMain: p.id === photoId,
    }));
    await updateUserProfile({ photos: updatedPhotos as any });

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SET_MAIN_PHOTO_ERROR', error.message || 'Failed to set main photo');
  }
};

// ============================================================================
// PAUSE PROFILE
// ============================================================================

export const updateProfilePauseStatus = async (
  isPaused: boolean,
): Promise<ApiResponse<void>> => {
  try {
    await updateUserProfile({ isPaused });
    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('PAUSE_ERROR', error.message || 'Failed to update pause status');
  }
};

export const getProfilePauseStatus = async (): Promise<ApiResponse<boolean>> => {
  try {
    const res = await getUserProfile();
    if (!res.ok || !res.data) throw new Error('Could not fetch profile');
    return { ok: true, data: res.data.isPaused ?? false };
  } catch (error: any) {
    return createErrorResponse('GET_PAUSE_ERROR', error.message || 'Failed to get pause status');
  }
};

// ============================================================================
// GUIDE COMPLETION (persisted in user_profiles.guide_completions)
// ============================================================================

export const markGuideCompleted = async (
  guideId: string,
): Promise<ApiResponse<void>> => {
  try {
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const guideCompletions = (profileRes.data as any).guideCompletions || {};
    guideCompletions[guideId] = true;

    await updateUserProfile({ guideCompletions } as any);

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('GUIDE_ERROR', error.message || 'Failed to mark guide completed');
  }
};

export const getGuideCompletionStatus = async (
  guideId: string,
): Promise<boolean> => {
  try {
    const res = await getUserProfile();
    if (!res.ok || !res.data) return false;
    return !!(res.data as any).guideCompletions?.[guideId];
  } catch {
    return false;
  }
};

// ============================================================================
// FETCH AND SET (used by AppNavigator / auth flow)
// ============================================================================

export const fetchAndSetUserProfile = async (
  userId?: string,
): Promise<ApiResponse<UserProfile>> => {
  try {
    const targetUserId = userId || await getAuthenticatedUserId();
    if (!targetUserId) {
      return createErrorResponse('AUTH_REQUIRED', 'No user ID provided or found in session');
    }

    logger.info('[ProfileService] fetchAndSetUserProfile for:', targetUserId);

    const response = await fetch(`${API_URL}/profile/${targetUserId}`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return createErrorResponse('PROFILE_NOT_FOUND', 'Profile not found');
      }
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to fetch profile');
    }

    const profile = mapBackendToUserProfile(result.data);

    // Resolve signed URLs
    if (profile.photos && profile.photos.length > 0) {
      const storagePaths = profile.photos
        .map(p => p.url)
        .filter(url => url && !url.startsWith('http'));

      if (storagePaths.length > 0) {
        const urlMapRes = await getMultiplePhotoSignedUrls(storagePaths, 86400);
        if (urlMapRes.ok && urlMapRes.data) {
          profile.photos = profile.photos.map(p => ({
            ...p,
            url: urlMapRes.data![p.url] || p.url,
          }));
        }
      }
    }

    return { ok: true, data: profile };
  } catch (error: any) {
    logger.error('[ProfileService] fetchAndSetUserProfile error:', error);
    return createErrorResponse('FETCH_PROFILE_ERROR', error.message || 'Failed to fetch profile');
  }
};

/**
 * Legacy compatibility helper to map UserProfile to old Profile type
 */
function mapToLegacyProfile(up: UserProfile): Profile {
  return {
    id: up.id,
    name: up.firstName,
    age: up.age,
    image: up.photos?.[0]?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    isVerified: up.isVerified ?? false,
    karmaPoints: up.karma?.karmaPoints ?? 0,
    matchPercentage: 75,
    matchedBy: [
      'https://i.pravatar.cc/32?u=1',
      'https://i.pravatar.cc/32?u=2',
      'https://i.pravatar.cc/32?u=3',
    ],
    values: up.values.map(v => ({ emoji: '✨', text: v })),
    interests: up.interests.map(i => ({ emoji: '✨', text: i })),
    questions: (up.deepQuestions || []).map(dq => ({ q: dq.question, a: dq.answer })),
  };
}

/**
 * Get any user's profile by ID — used by ProfileMatchScreen and community features.
 */
export const getProfileById = async (id: string): Promise<Profile | null> => {
  try {
    // For the specific 'elsa' mock ID used in ProfileMatchScreen
    if (id === 'elsa') {
      const elsaProfile: Profile = {
        id: 'elsa',
        name: 'Elsa',
        age: 29,
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=375&h=451',
        isVerified: true,
        karmaPoints: 0,
        matchPercentage: 75,
        matchedBy: [
          'https://i.pravatar.cc/32?u=1',
          'https://i.pravatar.cc/32?u=2',
          'https://i.pravatar.cc/32?u=3',
        ],
        values: [
          { emoji: '💗', text: 'Kindness' },
          { emoji: '🤝', text: 'Honesty' },
          { emoji: '🌱', text: 'Growth' },
          { emoji: '👨\u200d👩\u200d👧\u200d👦', text: 'Family' },
          { emoji: '🎯', text: 'Ambition' },
          { emoji: '😂', text: 'Humor' },
          { emoji: '🤗', text: 'Empathy' },
          { emoji: '🔍', text: 'Curiosity' },
        ],
        interests: [
          { emoji: '✈️', text: 'Travel' },
          { emoji: '🎵', text: 'Live music' },
          { emoji: '☕', text: 'Coffee chats' },
          { emoji: '🥾', text: 'Hiking' },
          { emoji: '📚', text: 'Book clubs' },
          { emoji: '🍜', text: 'Food walks' },
          { emoji: '✨', text: 'Weekend getaways' },
          { emoji: '🎨', text: 'Art galleries' },
        ],
        questions: [
          {
            q: "What's your idea of a perfect weekend?",
            a: 'Exploring new places, slow mornings, and meaningful conversations with people I care about.',
          },
          {
            q: 'What are you most passionate about?',
            a: 'Finding ways to grow, create, and support the people around me.',
          },
          {
            q: "What's a life lesson that took you a while to learn?",
            a: "It's okay to change your mind and rewrite your plans when you learn more about yourself.",
          },
        ],
      };
      return elsaProfile;
    }

    // Query Supabase directly for any user's profile
    const [profileResult, prefsResult, dqResult, karmaResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', id).single(),
      supabase.from('user_preferences').select('*').eq('user_id', id).single(),
      supabase.from('deep_question_answers').select('*').eq('user_id', id),
      supabase.from('karma_scores').select('*').eq('user_id', id).maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) return null;

    const combinedData = {
      ...profileResult.data,
      preferences: prefsResult.data || {},
      deep_questions: dqResult.data || [],
      karma_score: karmaResult.data || null,
    };

    const up = mapBackendToUserProfile(combinedData);

    // Filter out invalid local file:// URIs
    if (up.photos && up.photos.length > 0) {
      up.photos = up.photos.filter(p => p.url && !p.url.startsWith('file://'));
    }

    // Resolve storage paths to signed URLs
    if (up.photos && up.photos.length > 0) {
      const storagePaths = up.photos
        .map(p => p.url)
        .filter(url => url && !url.startsWith('http'));

      if (storagePaths.length > 0) {
        const urlMapRes = await getMultiplePhotoSignedUrls(storagePaths, 86400);
        if (urlMapRes.ok && urlMapRes.data) {
          up.photos = up.photos.map(p => ({
            ...p,
            url: urlMapRes.data![p.url] || p.url,
          }));
        }
      }
    }

    return mapToLegacyProfile(up);
  } catch {
    return null;
  }
};

/**
 * Fetch any user's full UserProfile including deep question answers.
 * Used when a profile is passed without deep questions (e.g. from friends list).
 */
export const getFullUserProfileById = async (userId: string): Promise<UserProfile | null> => {
  try {
    const [profileResult, prefsResult, dqResult, karmaResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
      supabase.from('deep_question_answers').select('*').eq('user_id', userId),
      supabase.from('karma_scores').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) return null;

    const combinedData = {
      ...profileResult.data,
      preferences: prefsResult.data || {},
      deep_questions: dqResult.data || [],
      karma_score: karmaResult.data || null,
    };

    const up = mapBackendToUserProfile(combinedData);

    if (up.photos && up.photos.length > 0) {
      up.photos = up.photos.filter(p => p.url && !p.url.startsWith('file://'));
      const storagePaths = up.photos.map(p => p.url).filter(url => url && !url.startsWith('http'));
      if (storagePaths.length > 0) {
        const urlMapRes = await getMultiplePhotoSignedUrls(storagePaths, 86400);
        if (urlMapRes.ok && urlMapRes.data) {
          up.photos = up.photos.map(p => ({ ...p, url: urlMapRes.data![p.url] || p.url }));
        }
      }
    }

    return up;
  } catch {
    return null;
  }
};
