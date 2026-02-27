/**
 * Profile Service — Real Backend Implementation
 *
 * Connects to the Bridge Railway backend for profile management.
 */

import {
  ApiResponse,
  UserProfile,
  OnboardingData,
  Photo,
} from '../types';
import { Profile } from '../types/profile';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';
import { uploadMultiplePhotos } from './photoService';
import { PROFILE_CACHE_DURATION } from '../constants';

const logger = createLogger('ProfileService');

// In-memory cache for the current user's profile
let profileCache: {
  data: UserProfile;
  timestamp: number;
} | null = null;
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bridge-frontend-production.up.railway.app';

// ============================================================================
// HELPERS
// ============================================================================

const createErrorResponse = (code: string, message: string): ApiResponse<any> => ({
  ok: false,
  error: { code, message },
});

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not authenticated');
  return user.id;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Maps backend profile data to frontend UserProfile type
 */
function heightToInches(heightStr: string | undefined): number | undefined {
  if (!heightStr) return undefined;
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
    customGender: data.custom_gender,
    interestedInGenders: data.interested_in_genders || [],
    height: data.height_inches ? `${Math.floor(data.height_inches / 12)}'${data.height_inches % 12}"` : (data.height || ''),
    ethnicity: data.ethnicity || '',
    religion: data.religion || '',
    politicalLeaning: data.political_leaning || '',
    location: data.location || '',
    hometown: data.hometown,
    currentJob: data.current_job,
    companyPosition: data.company_position,
    educationLevel: data.education_level || 'bachelors',
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
    preferences: data.preferences || {},
    nonNegotiables: data.non_negotiables || [],
    deepQuestions: (data.deep_questions || []).map((dq: any) => ({
      questionId: dq.question_id,
      question: dq.question_text,
      answer: dq.answer_text,
      tier: dq.tier,
    })),
    isPaused: data.is_paused || false,
    isVerified: data.is_verified || false,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
  } as UserProfile;
}

// ============================================================================
// ONBOARDING
// ============================================================================

/**
 * Save a single onboarding step's data.
 * Calls the /onboarding/save-step endpoint on the backend.
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

    const response = await fetch(`${API_URL}/onboarding/save-step`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        user_id: finalUserId,
        step_key: stepKey,
        data: data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save step: ${response.status}`);
    }

    return { ok: true };
  } catch (error: any) {
    logger.error('[ProfileService] saveOnboardingStep error:', error);
    return createErrorResponse('SAVE_STEP_ERROR', error.message || 'Failed to save onboarding step');
  }
};

/**
 * Create the full user profile at the end of onboarding.
 * Calls the /onboarding/complete endpoint on the backend.
 */
export const createUserProfile = async (
  userId: string,
  data: Partial<OnboardingData>,
): Promise<ApiResponse<UserProfile>> => {
  try {
    logger.info('[ProfileService] createUserProfile:', userId);

    // Upload photos before building the payload
    let photoUrls: string[] = [];
    if (data.photos && data.photos.length > 0) {
      const uris = data.photos.map(p => p.url || (p as any).uri).filter(Boolean);
      if (uris.length > 0) {
        const uploadRes = await uploadMultiplePhotos(uris);
        if (uploadRes.ok && uploadRes.data) {
          photoUrls = uploadRes.data.map(p => p.url);
        }
      }
    }

    // Map frontend camelCase to backend snake_case
    const payload = {
      user_id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      age: data.age,
      gender: data.gender,
      location: data.location,
      photos: photoUrls,
      pronouns: data.pronounsList?.join('/'),
      pronouns_list: data.pronounsList,
      hometown: data.hometown,
      current_job: data.currentJob,
      company_position: data.companyPosition,
      education_level: data.educationLevel,
      school: data.school,
      height_inches: heightToInches(data.height),
      ethnicity: data.ethnicity,
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
      looking_for: data.preferences?.lookingFor,
      interested_in_genders: data.interestedInGenders,
      age_min: data.preferences?.ageMin,
      age_max: data.preferences?.ageMax,
      height_min: data.preferences?.heightMin,
      height_max: data.preferences?.heightMax,
      max_distance: data.preferences?.maxDistance,
      preferred_ethnicities: data.preferredEthnicities,
      partner_lifestyle_preferences: data.partnerLifestylePreferences,
      deep_questions: (data.deepQuestions || []).map(dq => ({
        question_id: dq.questionId,
        question_text: dq.question,
        answer_text: dq.answer,
        tier: dq.tier,
      })),
    };

    const response = await fetch(`${API_URL}/onboarding/complete`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete onboarding: ${response.status}`);
    }

    // After completion, fetch the profile to return it
    return getUserProfile();
  } catch (error: any) {
    logger.error('[ProfileService] createUserProfile error:', error);
    return createErrorResponse('CREATE_PROFILE_ERROR', error.message || 'Failed to create profile');
  }
};

// ============================================================================
// READ / WRITE
// ============================================================================

/**
 * Get the current user's profile.
 * Calls the /profile/{user_id} endpoint on the backend.
 * Uses in-memory caching to reduce redundant network requests.
 */
export const getUserProfile = async (forceRefresh: boolean = false): Promise<ApiResponse<UserProfile>> => {
  try {
    const userId = await getCurrentUserId();

    // Check cache if not forcing refresh
    if (!forceRefresh && profileCache && (Date.now() - profileCache.timestamp < PROFILE_CACHE_DURATION)) {
      logger.info('[ProfileService] Returning cached profile for:', userId);
      return { ok: true, data: profileCache.data };
    }

    logger.info('[ProfileService] Fetching profile from backend for:', userId);

    const response = await fetch(`${API_URL}/profile/${userId}`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to fetch profile');
    }

    const profile = mapBackendToUserProfile(result.data);

    // Update cache
    profileCache = {
      data: profile,
      timestamp: Date.now(),
    };

    return { ok: true, data: profile };
  } catch (error: any) {
    logger.error('[ProfileService] getUserProfile error:', error);
    return createErrorResponse('FETCH_PROFILE_ERROR', error.message || 'Failed to fetch profile');
  }
};

/**
 * Update the current user's profile (partial update).
 * Calls the PUT /profile/{user_id} endpoint on the backend.
 */
export const updateUserProfile = async (
  updates: Partial<UserProfile>,
): Promise<ApiResponse<UserProfile>> => {
  try {
    const userId = await getCurrentUserId();
    logger.info('[ProfileService] updateUserProfile:', userId);

    // Map UserProfile camelCase updates to backend snake_case
    const payload: any = {};
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.age !== undefined) payload.age = updates.age;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.pronouns !== undefined) payload.pronouns = updates.pronouns;
    if (updates.pronounsList !== undefined) payload.pronouns_list = updates.pronounsList;
    if (updates.customGender !== undefined) payload.custom_gender = updates.customGender;
    if (updates.hometown !== undefined) payload.hometown = updates.hometown;
    if (updates.currentJob !== undefined) payload.current_job = updates.currentJob;
    if (updates.companyPosition !== undefined) payload.company_position = updates.companyPosition;
    if (updates.educationLevel !== undefined) payload.education_level = updates.educationLevel;
    if (updates.school !== undefined) payload.school = updates.school;
    if (updates.height !== undefined) payload.height_inches = heightToInches(updates.height);
    if (updates.ethnicity !== undefined) payload.ethnicity = updates.ethnicity;
    if (updates.religion !== undefined) payload.religion = updates.religion;
    if (updates.politicalLeaning !== undefined) payload.political_leaning = updates.politicalLeaning;
    if (updates.hasChildren !== undefined) payload.has_children = updates.hasChildren;
    if (updates.familyPlans !== undefined) payload.family_plans = updates.familyPlans;
    if (updates.drinkingFrequency !== undefined) payload.drinking_frequency = updates.drinkingFrequency;
    if (updates.cannabisFrequency !== undefined) payload.cannabis_frequency = updates.cannabisFrequency;
    if (updates.tobaccoFrequency !== undefined) payload.tobacco_frequency = updates.tobaccoFrequency;
    if (updates.otherDrugsFrequency !== undefined) payload.other_drugs_frequency = updates.otherDrugsFrequency;
    if (updates.interests !== undefined) payload.interests = updates.interests;
    if (updates.values !== undefined) payload.values = updates.values;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.isPaused !== undefined) payload.is_paused = updates.isPaused;
    if (updates.photos !== undefined) payload.photos = updates.photos;
    if (updates.preferences !== undefined) payload.preferences = updates.preferences;
    if (updates.deepQuestions !== undefined) payload.deep_questions = updates.deepQuestions;

    const response = await fetch(`${API_URL}/profile/${userId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.status}`);
    }

    // Invalidate cache after update to ensure next fetch gets fresh data
    profileCache = null;

    return getUserProfile(true);
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
  _userId?: string,
): Promise<ApiResponse<UserProfile>> => {
  return getUserProfile(true); // Always force refresh during explicit fetch-and-set
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
    isVerified: up.isVerified,
    karmaPoints: 80,
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
 * Legacy compatibility - used by ProfileMatchScreen
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
        karmaPoints: 80,
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
          { emoji: '👨‍👩‍👧‍👦', text: 'Family' },
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

    const response = await fetch(`${API_URL}/profile/${id}`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status === 'success') {
      const up = mapBackendToUserProfile(result.data);
      return mapToLegacyProfile(up);
    }
    return null;
  } catch {
    return null;
  }
};
