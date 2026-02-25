/**
 * Profile Service — Mock/In-Memory Implementation
 *
 * Provides in-memory profile management for development and testing
 * without requiring a live Supabase backend.
 *
 * TODO (Production): Replace in-memory store with Supabase calls.
 * Each function documents the intended Supabase table/column mapping.
 */

import {
  ApiResponse,
  UserProfile,
  DeepQuestionAnswer,
  OnboardingData,
  Photo,
} from '../types';
import { Profile } from '../types/profile';
import { currentUserProfile } from './mockData';

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

/**
 * In-memory profile store. Initialized to null; populated on first
 * getUserProfile() call (returns default mock data) or after createUserProfile().
 *
 * TODO (Production): Remove this store. All reads/writes go to Supabase
 * table `user_profiles`.
 */
let _mockUserProfile: UserProfile | null = null;

// ============================================================================
// HELPERS
// ============================================================================

const createErrorResponse = (code: string, message: string): ApiResponse<any> => ({
  ok: false,
  error: { code, message },
});

/**
 * Build the default mock profile from mockData.ts.
 * Falls back to a minimal hardcoded profile if the import fails.
 */
function buildDefaultProfile(): UserProfile {
  // Use the rich currentUserProfile from mockData for a realistic default
  return {
    ...currentUserProfile,
    // Ensure required fields that may differ in mock data are present
    pronouns: (currentUserProfile.pronouns as any) === 'he_him'
      ? 'he/him'
      : (currentUserProfile.pronouns ?? 'he/him'),
  } as UserProfile;
}

// ============================================================================
// ONBOARDING
// ============================================================================

/**
 * Save a single onboarding step's data.
 *
 * TODO (Production): Upsert into Supabase `user_profiles` using the column
 * mapping defined in src/config/onboardingMapping.ts.
 */
export const saveOnboardingStep = async (
  stepKey: string,
  data: Partial<OnboardingData>,
  _userId?: string,
): Promise<ApiResponse<void>> => {
  try {
    console.log('[ProfileService] saveOnboardingStep:', stepKey, data);

    if (!_mockUserProfile) {
      // Auto-init with default profile if not yet created
      _mockUserProfile = buildDefaultProfile();
    }

    // Merge onboarding data fields into the mock profile
    // Map OnboardingData fields → UserProfile fields
    const updates: Partial<UserProfile> = {};

    if (data.firstName !== undefined) updates.firstName = data.firstName;
    if (data.lastName !== undefined) updates.lastName = data.lastName;
    if (data.age !== undefined) updates.age = data.age;
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.pronounsList !== undefined) updates.pronounsList = data.pronounsList;
    if (data.interestedInGenders !== undefined) updates.interestedInGenders = data.interestedInGenders;
    if (data.height !== undefined) updates.height = data.height;
    if (data.ethnicity !== undefined) updates.ethnicity = data.ethnicity;
    if (data.preferredEthnicities !== undefined) updates.preferredEthnicities = data.preferredEthnicities;
    if (data.hasChildren !== undefined) updates.hasChildren = data.hasChildren;
    if (data.familyPlans !== undefined) updates.familyPlans = data.familyPlans;
    if (data.location !== undefined) updates.location = data.location;
    if (data.hometown !== undefined) updates.hometown = data.hometown;
    if (data.currentJob !== undefined) updates.currentJob = data.currentJob;
    if (data.companyPosition !== undefined) updates.companyPosition = data.companyPosition;
    if (data.educationLevel !== undefined) updates.educationLevel = data.educationLevel as UserProfile['educationLevel'];
    if (data.school !== undefined) updates.school = data.school;
    if (data.religion !== undefined) updates.religion = data.religion;
    if (data.politicalLeaning !== undefined) updates.politicalLeaning = data.politicalLeaning;
    if (data.drinkingFrequency !== undefined) updates.drinkingFrequency = data.drinkingFrequency;
    if (data.cannabisFrequency !== undefined) updates.cannabisFrequency = data.cannabisFrequency;
    if (data.tobaccoFrequency !== undefined) updates.tobaccoFrequency = data.tobaccoFrequency;
    if (data.otherDrugsFrequency !== undefined) updates.otherDrugsFrequency = data.otherDrugsFrequency;
    if (data.photos !== undefined) updates.photos = data.photos;
    if (data.interests !== undefined) updates.interests = data.interests;
    if (data.values !== undefined) updates.values = data.values;
    if (data.lifestyle !== undefined) updates.lifestyle = data.lifestyle;
    if (data.nonNegotiables !== undefined) updates.nonNegotiables = data.nonNegotiables;
    if (data.preferences !== undefined) updates.preferences = data.preferences;
    if (data.partnerLifestylePreferences !== undefined) {
      updates.partnerLifestylePreferences = data.partnerLifestylePreferences as UserProfile['partnerLifestylePreferences'];
    }
    if (data.deepQuestions !== undefined) updates.deepQuestions = data.deepQuestions;

    Object.assign(_mockUserProfile, updates);
    _mockUserProfile.updatedAt = new Date().toISOString();

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SAVE_STEP_ERROR', error.message || 'Failed to save onboarding step');
  }
};

/**
 * Create the full user profile at the end of onboarding.
 *
 * TODO (Production): Insert a new row into Supabase `user_profiles` with
 * all collected onboarding fields. Upload photos to Supabase Storage first,
 * then store the resulting URLs.
 */
export const createUserProfile = async (
  userId: string,
  data: Partial<OnboardingData>,
): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[ProfileService] createUserProfile:', userId);

    _mockUserProfile = {
      id: userId,
      userId: userId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      age: data.age || 0,
      gender: data.gender || [],
      pronouns: (data.pronounsList && data.pronounsList.length > 0
        ? data.pronounsList.join('/').toLowerCase()
        : 'prefer_not_to_say') as UserProfile['pronouns'],
      pronounsList: data.pronounsList || [],
      customPronouns: data.customPronouns,
      customMyGender: data.customMyGender,
      interestedInGenders: data.interestedInGenders || [],
      customInterestedIn: data.customInterestedIn,
      preferredEthnicities: data.preferredEthnicities || [],
      currentJob: data.currentJob || '',
      companyPosition: data.companyPosition || '',
      educationLevel: (data.educationLevel || 'bachelors') as UserProfile['educationLevel'],
      school: data.school || '',
      height: data.height || '',
      ethnicity: data.ethnicity || '',
      religion: data.religion || '',
      politicalLeaning: (data.politicalLeaning || 'prefer_not_to_say') as UserProfile['politicalLeaning'],
      location: data.location || '',
      hometown: data.hometown,
      hasChildren: data.hasChildren,
      familyPlans: data.familyPlans,
      drinkingFrequency: data.drinkingFrequency,
      cannabisFrequency: data.cannabisFrequency || data.weedFrequency,
      tobaccoFrequency: data.tobaccoFrequency,
      otherDrugsFrequency: data.otherDrugsFrequency || data.drugsFrequency,
      photos: data.photos || [],
      interests: data.interests || [],
      values: data.values || [],
      lifestyle: data.lifestyle || {},
      nonNegotiables: data.nonNegotiables || [],
      preferences: data.preferences || {
        ageMin: 24,
        ageMax: 32,
        gender: 'both',
        lookingFor: 'relationship',
        heightMin: 60,
        heightMax: 84,
      },
      partnerLifestylePreferences: data.partnerLifestylePreferences as UserProfile['partnerLifestylePreferences'],
      deepQuestions: data.deepQuestions || [],
      displayedQuestions: [],
      sectionVisibility: {
        religion: true,
        politics: true,
        family: true,
        lifestyle: true,
      },
      isPaused: false,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as UserProfile;

    return { ok: true, data: _mockUserProfile };
  } catch (error: any) {
    return createErrorResponse('CREATE_PROFILE_ERROR', error.message || 'Failed to create profile');
  }
};

// ============================================================================
// READ / WRITE
// ============================================================================

/**
 * Get the current user's profile.
 *
 * TODO (Production): Query Supabase `user_profiles` WHERE user_id = auth.uid().
 */
export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[ProfileService] getUserProfile');

    if (_mockUserProfile) {
      return { ok: true, data: _mockUserProfile };
    }

    // Initialize with the rich mock profile from mockData.ts
    _mockUserProfile = buildDefaultProfile();

    return { ok: true, data: _mockUserProfile };
  } catch (error: any) {
    return createErrorResponse('FETCH_PROFILE_ERROR', error.message || 'Failed to fetch profile');
  }
};

/**
 * Update the current user's profile (partial update).
 *
 * TODO (Production): UPSERT into Supabase `user_profiles` WHERE user_id = auth.uid().
 */
export const updateUserProfile = async (
  updates: Partial<UserProfile>,
): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[ProfileService] updateUserProfile:', Object.keys(updates));

    if (!_mockUserProfile) {
      _mockUserProfile = buildDefaultProfile();
    }

    Object.assign(_mockUserProfile, updates);
    _mockUserProfile.updatedAt = new Date().toISOString();

    return { ok: true, data: _mockUserProfile };
  } catch (error: any) {
    return createErrorResponse('UPDATE_PROFILE_ERROR', error.message || 'Failed to update profile');
  }
};

// ============================================================================
// PHOTOS
// ============================================================================

/**
 * Add photos to the user's profile.
 *
 * TODO (Production): Upload each image to Supabase Storage (`profile-photos/`)
 * then insert a row in `profile_photos` with the resulting public URL.
 */
export const addProfilePhotos = async (
  imageUris: string[],
): Promise<ApiResponse<Photo[]>> => {
  try {
    console.log('[ProfileService] addProfilePhotos:', imageUris.length);

    if (!_mockUserProfile) {
      _mockUserProfile = buildDefaultProfile();
    }

    const existing = _mockUserProfile.photos || [];
    const newPhotos: Photo[] = imageUris.map((uri, i) => ({
      id: `photo-${Date.now()}-${i}`,
      url: uri,
      isMain: existing.length === 0 && i === 0,
      order: existing.length + i,
    }));

    _mockUserProfile.photos = [...existing, ...newPhotos];
    _mockUserProfile.updatedAt = new Date().toISOString();

    return { ok: true, data: newPhotos };
  } catch (error: any) {
    return createErrorResponse('ADD_PHOTOS_ERROR', error.message || 'Failed to add photos');
  }
};

/**
 * Remove a photo from the user's profile.
 *
 * TODO (Production): Delete the row from Supabase `profile_photos` and the
 * corresponding file from Supabase Storage.
 */
export const removeProfilePhoto = async (
  photoId: string,
): Promise<ApiResponse<void>> => {
  try {
    console.log('[ProfileService] removeProfilePhoto:', photoId);

    if (_mockUserProfile) {
      _mockUserProfile.photos = (_mockUserProfile.photos || []).filter(p => p.id !== photoId);
      _mockUserProfile.updatedAt = new Date().toISOString();
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REMOVE_PHOTO_ERROR', error.message || 'Failed to remove photo');
  }
};

/**
 * Reorder profile photos.
 *
 * TODO (Production): Update `order` column on each row in Supabase `profile_photos`.
 */
export const reorderProfilePhotos = async (
  reorderedPhotos: Photo[],
): Promise<ApiResponse<void>> => {
  try {
    console.log('[ProfileService] reorderProfilePhotos');

    if (_mockUserProfile) {
      _mockUserProfile.photos = reorderedPhotos;
      _mockUserProfile.updatedAt = new Date().toISOString();
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REORDER_PHOTOS_ERROR', error.message || 'Failed to reorder photos');
  }
};

/**
 * Set the main (primary) profile photo.
 *
 * TODO (Production): Set `is_main = true` for the given photo row and
 * `is_main = false` for all others in Supabase `profile_photos`.
 */
export const setMainProfilePhoto = async (
  photoId: string,
): Promise<ApiResponse<void>> => {
  try {
    console.log('[ProfileService] setMainProfilePhoto:', photoId);

    if (_mockUserProfile) {
      _mockUserProfile.photos = (_mockUserProfile.photos || []).map(p => ({
        ...p,
        isMain: p.id === photoId,
      }));
      _mockUserProfile.updatedAt = new Date().toISOString();
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SET_MAIN_PHOTO_ERROR', error.message || 'Failed to set main photo');
  }
};

// ============================================================================
// PAUSE PROFILE
// ============================================================================

/**
 * Toggle the paused state of the user's profile.
 *
 * When isPaused = true the user is REMOVED from the matching pool:
 * - They will NOT appear as anchor or candidate in any daily grid.
 * - They will NOT receive new match proposals.
 * - No profile data is deleted.
 *
 * Enforcement in matching logic:
 * - communityService.getTodaysGrid() should filter out paused anchors/candidates.
 * - communityService.getProposalsToVote() should exclude proposals where either
 *   party has isPaused = true.
 * - See the matching enforcement comment block in communityService.ts.
 *
 * TODO (Production): Update `is_paused` column in Supabase `user_profiles`
 * WHERE user_id = auth.uid(). The matching pool query (in the backend or RPC)
 * must include a WHERE is_paused = false filter.
 */
export const updateProfilePauseStatus = async (
  isPaused: boolean,
): Promise<ApiResponse<void>> => {
  try {
    console.log('[ProfileService] updateProfilePauseStatus:', isPaused);

    if (!_mockUserProfile) {
      _mockUserProfile = buildDefaultProfile();
    }

    _mockUserProfile.isPaused = isPaused;
    _mockUserProfile.updatedAt = new Date().toISOString();

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('PAUSE_ERROR', error.message || 'Failed to update pause status');
  }
};

/**
 * Read the current paused state of the user's profile.
 *
 * TODO (Production): Read `is_paused` from Supabase `user_profiles`.
 */
export const getProfilePauseStatus = async (): Promise<ApiResponse<boolean>> => {
  try {
    if (!_mockUserProfile) {
      _mockUserProfile = buildDefaultProfile();
    }

    return { ok: true, data: _mockUserProfile.isPaused ?? false };
  } catch (error: any) {
    return createErrorResponse('GET_PAUSE_ERROR', error.message || 'Failed to get pause status');
  }
};

// ============================================================================
// GUIDE COMPLETION (frontend-only)
// ============================================================================

type GuideId =
  | 'tab_navigation_overview'
  | 'daily_grid_explained'
  | 'proposals_explained'
  | 'friends_area_explained'
  | 'profile_completion';

const GUIDE_FIELD_MAP: Record<GuideId, keyof UserProfile> = {
  tab_navigation_overview: 'hasCompletedTabNavigationGuide',
  daily_grid_explained: 'hasCompletedDailyGridGuide',
  proposals_explained: 'hasCompletedProposalsGuide',
  friends_area_explained: 'hasCompletedFriendsGuide',
  profile_completion: 'hasCompletedProfileGuide',
};

/**
 * Mark a guide as completed (frontend-only flag).
 *
 * TODO (Production): Persist in Supabase `user_profiles` or a separate
 * `user_guide_completions` table.
 */
export const markGuideCompleted = async (
  guideId: GuideId,
): Promise<ApiResponse<void>> => {
  try {
    if (!_mockUserProfile) {
      _mockUserProfile = buildDefaultProfile();
    }

    const field = GUIDE_FIELD_MAP[guideId];
    if (field) {
      (_mockUserProfile as any)[field] = true;
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('GUIDE_ERROR', error.message || 'Failed to mark guide completed');
  }
};

/**
 * Check whether a guide has been completed (frontend-only).
 */
export const getGuideCompletionStatus = async (
  guideId: GuideId,
): Promise<boolean> => {
  try {
    if (!_mockUserProfile) return false;

    const field = GUIDE_FIELD_MAP[guideId];
    if (field) {
      return (_mockUserProfile as any)[field] === true;
    }

    return false;
  } catch {
    return false;
  }
};

// ============================================================================
// FETCH AND SET (used by AppNavigator / auth flow)
// ============================================================================

/**
 * Fetch user profile and return it.
 * Alias used by older imports that reference `fetchAndSetUserProfile`.
 *
 * Accepts an optional userId argument for compatibility with callers that
 * pass the Supabase auth user ID (e.g. AppNavigator.tsx line 198).
 * The mock implementation ignores the userId — it always returns the
 * in-memory profile for the current session.
 *
 * TODO (Production): Use the userId to query Supabase:
 *   SELECT * FROM user_profiles WHERE user_id = userId
 */
export const fetchAndSetUserProfile = async (
  _userId?: string,
): Promise<ApiResponse<UserProfile>> => {
  return getUserProfile();
};

// ============================================================================
// LEGACY / COMPAT
// ============================================================================

/**
 * Legacy function — returns a Profile (old type from src/types/profile.ts),
 * NOT a UserProfile. Used exclusively by src/screens/ProfileMatchScreen.tsx,
 * which expects the old Profile shape (name, image, karmaPoints, matchedBy,
 * values as TagItem[], interests as TagItem[], questions as QuestionItem[]).
 *
 * The old implementation returned a hard-coded mock Profile keyed by id
 * (defaulting to 'elsa'). That exact contract is preserved here so that
 * ProfileMatchScreen.tsx continues to compile and render correctly.
 *
 * @deprecated Do not use for new code. Use getUserProfile() for UserProfile data.
 */
const _LEGACY_MOCK_PROFILES: Record<string, Profile> = {
  elsa: {
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
  },
};

export const getProfileById = async (id: string): Promise<Profile | null> => {
  // Simulate async behaviour (mirrors original implementation)
  await new Promise(resolve => setTimeout(resolve, 0));
  return _LEGACY_MOCK_PROFILES[id] ?? _LEGACY_MOCK_PROFILES['elsa'] ?? null;
};
