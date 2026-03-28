/**
 * Profile Service - Extra operations
 *
 * Extracted from profileService.ts for file-size management.
 * Contains: pause profile, guide completion, suspension check,
 * fetchAndSetUserProfile, getProfileById, getFullUserProfileById,
 * email lookup functions, and the legacy Profile mapper.
 */

import { ApiResponse, UserProfile } from '../types';
import { Profile } from '../types/profile';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/secureLogger';
import { getMultiplePhotoSignedUrls } from './photoService';
import { getQuestionById } from '../utils/deepQuestions';
import { getQuestionTier } from '../utils/questionTiers';

const logger = createLogger('ProfileService');

const createErrorResponse = <T = never>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

async function getCurrentUserId(): Promise<string> {
  const { getAuthenticatedUserId } = await import('../utils/auth');
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// Lazy import to avoid circular dependency
const getProfileFns = () => import('./profileService');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
function mapBackendToUserProfile(data: Record<string, any>): UserProfile {
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
    photos: ((data.photos as Array<Record<string, unknown>>) || []).map((p) => ({
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
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    karma: data.karma_score ? {
      karma_points: data.karma_score.karma_points ?? 0,
      badge_tier: data.karma_score.badge_tier ?? 'new',
      total_assists: data.karma_score.total_assists ?? 0,
    } : undefined,
    role: data.role || 'dater',
  } as unknown as UserProfile;
}

// ============================================================================
// PAUSE PROFILE
// ============================================================================

export const updateProfilePauseStatus = async (
  isPaused: boolean,
): Promise<ApiResponse<void>> => {
  try {
    const { updateUserProfile } = await getProfileFns();
    await updateUserProfile({ isPaused });
    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('PAUSE_ERROR', error instanceof Error ? error.message : 'Failed to update pause status');
  }
};

export const getProfilePauseStatus = async (): Promise<ApiResponse<boolean>> => {
  try {
    const { getUserProfile } = await getProfileFns();
    const res = await getUserProfile();
    if (!res.ok || !res.data) throw new Error('Could not fetch profile');
    return { ok: true, data: res.data.isPaused ?? false };
  } catch (error: unknown) {
    return createErrorResponse('GET_PAUSE_ERROR', error instanceof Error ? error.message : 'Failed to get pause status');
  }
};

// ============================================================================
// GUIDE COMPLETION (persisted in user_profiles.guide_completions)
// ============================================================================

export const markGuideCompleted = async (
  guideId: string,
): Promise<ApiResponse<void>> => {
  try {
    const { getUserProfile, updateUserProfile } = await getProfileFns();
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const guideCompletions: Record<string, boolean> = (profileRes.data as UserProfile & { guideCompletions?: Record<string, boolean> }).guideCompletions || {};
    guideCompletions[guideId] = true;

    await updateUserProfile({ guideCompletions } as Partial<UserProfile> & { guideCompletions: Record<string, boolean> });

    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('GUIDE_ERROR', error instanceof Error ? error.message : 'Failed to mark guide completed');
  }
};

export const getGuideCompletionStatus = async (
  guideId: string,
): Promise<boolean> => {
  try {
    const { getUserProfile } = await getProfileFns();
    const res = await getUserProfile();
    if (!res.ok || !res.data) return false;
    return !!(res.data as UserProfile & { guideCompletions?: Record<string, boolean> }).guideCompletions?.[guideId];
  } catch {
    return false;
  }
};

// ============================================================================
// SUSPENSION CHECK
// ============================================================================

const MINIMAL_STATUS_CACHE_KEY = 'bridge_minimal_profile_status';
const MINIMAL_STATUS_DEFAULT = { isSuspended: false, reason: null as string | null, role: 'dater' as const };

export type MinimalProfileStatus = {
  isSuspended: boolean;
  reason: string | null;
  role: 'dater' | 'matchmaker';
  // userId enables optimistic auth on cold start: AppNavigator can render the main
  // UI immediately after reading this one small cache entry, without waiting for
  // supabase.auth.getSession() (which reads a larger blob and validates the JWT).
  userId?: string;
};

// In-memory mirror — avoids AsyncStorage read on the auth critical path
let inMemoryMinimalStatus: MinimalProfileStatus | null = null;

/**
 * Synchronous accessor for the in-memory minimal status mirror.
 * Returns null on cold start (process was killed), populated value on warm start.
 * Used by AppNavigator to initialize auth state without any async overhead.
 */
export function getInMemoryMinimalStatus(): MinimalProfileStatus | null {
  return inMemoryMinimalStatus;
}

/**
 * Read cached minimal profile status — in-memory first, then AsyncStorage.
 * Returns null if nothing is cached yet.
 */
export async function getCachedMinimalProfileStatus(): Promise<MinimalProfileStatus | null> {
  if (inMemoryMinimalStatus) return inMemoryMinimalStatus;
  try {
    const raw = await AsyncStorage.getItem(MINIMAL_STATUS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    inMemoryMinimalStatus = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear cached minimal profile status (call on sign-out).
 */
export function clearMinimalProfileStatusCache(): void {
  inMemoryMinimalStatus = null;
  AsyncStorage.removeItem(MINIMAL_STATUS_CACHE_KEY).catch(() => {});
}

/**
 * Update the cached role immediately (e.g., when matchmaker is selected during onboarding).
 * This ensures app reloads mid-onboarding route to the correct tab navigator.
 */
export function setCachedRole(role: 'dater' | 'matchmaker'): void {
  const current = inMemoryMinimalStatus ?? { ...MINIMAL_STATUS_DEFAULT };
  const updated = { ...current, role };
  inMemoryMinimalStatus = updated;
  AsyncStorage.setItem(MINIMAL_STATUS_CACHE_KEY, JSON.stringify(updated)).catch(() => {});
}

export async function checkMinimalProfileStatus(): Promise<MinimalProfileStatus> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_suspended, suspension_reason, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return MINIMAL_STATUS_DEFAULT;
    const result: MinimalProfileStatus = {
      isSuspended: data.is_suspended ?? false,
      reason: data.suspension_reason ?? null,
      role: (data.role || 'dater') as 'dater' | 'matchmaker',
      // Store userId so cold-start optimistic auth can skip supabase.auth.getSession()
      userId,
    };

    // Persist for instant startup on next launch
    inMemoryMinimalStatus = result;
    AsyncStorage.setItem(MINIMAL_STATUS_CACHE_KEY, JSON.stringify(result)).catch(() => {});

    return result;
  } catch {
    return MINIMAL_STATUS_DEFAULT;
  }
}

// ============================================================================
// FETCH AND SET (used by AppNavigator / auth flow)
// ============================================================================

export const fetchAndSetUserProfile = async (
  userId?: string,
): Promise<ApiResponse<UserProfile>> => {
  const { getUserProfile } = await getProfileFns();
  return getUserProfile();
};

/**
 * Legacy compatibility helper to map UserProfile to old Profile type
 */
function mapToLegacyProfile(up: UserProfile): Profile {
  return {
    id: up.id,
    name: up.firstName,
    age: up.age,
    image: { uri: up.photos?.[0]?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800' },
    isVerified: up.isVerified ?? false,
    karmaPoints: up.karma?.karma_points ?? 0,
    matchPercentage: 75,
    matchedBy: [
      'https://i.pravatar.cc/32?u=1',
      'https://i.pravatar.cc/32?u=2',
      'https://i.pravatar.cc/32?u=3',
    ],
    values: up.values.map(v => ({ emoji: '', text: v })),
    interests: up.interests.map(i => ({ emoji: '', text: i })),
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
        image: { uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=375&h=451' },
        isVerified: true,
        karmaPoints: 0,
        matchPercentage: 75,
        matchedBy: [
          'https://i.pravatar.cc/32?u=1',
          'https://i.pravatar.cc/32?u=2',
          'https://i.pravatar.cc/32?u=3',
        ],
        values: [
          { emoji: '', text: 'Kindness' },
          { emoji: '', text: 'Honesty' },
          { emoji: '', text: 'Growth' },
          { emoji: '', text: 'Family' },
          { emoji: '', text: 'Ambition' },
          { emoji: '', text: 'Humor' },
          { emoji: '', text: 'Empathy' },
          { emoji: '', text: 'Curiosity' },
        ],
        interests: [
          { emoji: '', text: 'Travel' },
          { emoji: '', text: 'Live music' },
          { emoji: '', text: 'Coffee chats' },
          { emoji: '', text: 'Hiking' },
          { emoji: '', text: 'Book clubs' },
          { emoji: '', text: 'Food walks' },
          { emoji: '', text: 'Weekend getaways' },
          { emoji: '', text: 'Art galleries' },
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

// ============================================================================
// EMAIL LOOKUP
// ============================================================================

/**
 * Check if an email address is already registered in user_profiles.
 * Returns true if an account exists with this email.
 */
export const checkEmailRegistered = async (email: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();
  return !!data;
};

/**
 * Find a user profile by email address.
 * Returns basic profile info (user_id, first_name, last_name) or null.
 */
export const findProfileByEmail = async (
  email: string
): Promise<{ userId: string; firstName: string; lastName: string } | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return {
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
  };
};
