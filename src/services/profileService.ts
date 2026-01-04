/**
 * Profile Service - MOCK VERSION
 *
 * Provides in-memory profile management for development without backend
 */

import { ApiResponse, UserProfile, DeepQuestionAnswer, OnboardingData, Photo } from '../types';

// In-memory storage
let mockUserProfile: UserProfile | null = null;
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

// Backend API URL
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const createErrorResponse = (code: string, message: string): ApiResponse<any> => {
  return {
    ok: false,
    error: { code, message },
  };
};

/**
 * Save a single onboarding step - MOCK VERSION
 * Stores data in memory
 */
export const saveOnboardingStep = async (
  stepKey: string,
  data: Partial<OnboardingData>
): Promise<ApiResponse<void>> => {
  try {
    console.log('[BACKEND] Saving step to Supabase:', stepKey);

    // Call real Python backend
    const response = await fetch(`${API_URL}/onboarding/save-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: MOCK_USER_ID,
        step_key: stepKey,
        data: data
      }),
    });

    if (!response.ok) {
      console.warn('[BACKEND] Failed to save step to server, falling back to local mock');
    }

    // Update mock profile with new data for local UI state
    if (!mockUserProfile) {
      mockUserProfile = {
        id: MOCK_USER_ID,
        userId: MOCK_USER_ID,
        firstName: '',
        lastName: '',
        age: 0,
        gender: [],
        pronouns: 'prefer_not_to_say',
        pronounsList: [],
        interestedInGenders: [],
        preferredEthnicities: [],
        occupation: '',
        company: '',
        educationLevel: '',
        school: '',
        height: '',
        ethnicity: '',
        religion: '',
        politicalLeaning: 'prefer_not_to_say',
        customPoliticalLeaning: '',
        customEducationLevel: '',
        marriageStatus: 'never_married',
        marriageGoal: 'unsure',
        desiredActivities: [],
        location: '',
        photos: [],
        interests: [],
        values: [],
        lifestyle: {
          drinking: 'socially',
          smoking: 'never',
          exercise: 'often',
          children: 'open',
          pets: [],
        },
        nonNegotiables: [],
        preferences: {
          ageMin: 24,
          ageMax: 32,
          gender: 'both',
          lookingFor: 'relationship',
          heightMin: 60,
          heightMax: 84,
        },
        deepQuestions: [],
        displayedQuestions: [],
        isVerified: false,
        isPaused: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as UserProfile;
    }

    // Merge the onboarding data into mock profile
    Object.assign(mockUserProfile, data);

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SAVE_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Create user profile - MOCK VERSION
 * Stores complete profile in memory
 */
export const createUserProfile = async (
  userId: string,
  data: Partial<OnboardingData>
): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[MOCK PROFILE] Creating user profile:', userId, data);

    mockUserProfile = {
      id: userId,
      userId: userId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      age: data.age || 0,
      gender: data.gender || [],
      pronouns: data.pronouns || 'prefer_not_to_say',
      pronounsList: data.pronounsList || [],
      customPronouns: data.customPronouns,
      customMyGender: data.customMyGender,
      interestedInGenders: data.interestedInGenders || [],
      customInterestedIn: data.customInterestedIn,
      preferredEthnicities: data.preferredEthnicities || [],
      occupation: data.currentJob || '',
      company: data.companyPosition || '',
      currentJob: data.currentJob,
      companyPosition: data.companyPosition,
      educationLevel: data.educationLevel || '',
      school: data.school || '',
      height: data.height || '',
      ethnicity: data.ethnicity || '',
      religion: data.religion || '',
      politicalLeaning: data.politicalLeaning || 'prefer_not_to_say',
      customPoliticalLeaning: data.customPoliticalLeaning || '',
      customEducationLevel: data.customEducationLevel || '',
      marriageStatus: 'never_married',
      marriageGoal: 'unsure',
      desiredActivities: [],
      location: data.location || 'New York',
      hometown: data.hometown,
      hasChildren: data.hasChildren,
      familyPlans: data.familyPlans,
      drinkingFrequency: data.drinkingFrequency,
      cannabisFrequency: data.cannabisFrequency,
      weedFrequency: data.weedFrequency,
      tobaccoFrequency: data.tobaccoFrequency,
      otherDrugsFrequency: data.otherDrugsFrequency,
      drugsFrequency: data.drugsFrequency,
      photos: data.photos || [],
      interests: data.interests || [],
      values: data.values || [],
      lifestyle: data.lifestyle || {
        drinking: 'socially',
        smoking: 'never',
        exercise: 'often',
        children: 'open',
        pets: [],
      },
      nonNegotiables: data.nonNegotiables || [],
      preferences: data.preferences || {
        ageMin: 24,
        ageMax: 32,
        gender: 'both',
        lookingFor: 'relationship',
        heightMin: 60,
        heightMax: 84,
      },
      partnerLifestylePreferences: data.partnerLifestylePreferences,
      deepQuestions: data.deepQuestions || [],
      displayedQuestions: data.displayedQuestions || [],
      isVerified: false,
      isPaused: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as UserProfile;

    return {
      ok: true,
      data: mockUserProfile,
    };
  } catch (error: any) {
    return createErrorResponse('PROFILE_CREATE_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Get user profile - MOCK VERSION
 * Returns stored mock profile or default mock data
 */
export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[MOCK PROFILE] Getting user profile');

    // Return mock profile if exists
    if (mockUserProfile) {
      return {
        ok: true,
        data: mockUserProfile,
      };
    }

    // Return default mock profile with COMPLETE data
    const defaultProfile: UserProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000001',
      firstName: 'Alex',
      lastName: 'Chen',
      age: 28,
      gender: ['male'],
      pronouns: 'he_him',
      pronounsList: ['He', 'Him', 'His'],
      customPronouns: undefined,
      customMyGender: undefined,
      interestedInGenders: ['female', 'non_binary'],
      customInterestedIn: undefined,
      preferredEthnicities: ['Asian', 'White / Caucasian', 'Hispanic / Latino', 'Mixed / Multiracial'],
      preferredPolitics: ['Moderate', 'Liberal'],
      occupation: 'Product Designer',
      company: 'Tech Startup',
      currentJob: 'Product Designer',
      companyPosition: 'Senior Product Designer',
      educationLevel: 'bachelors',
      customEducationLevel: '',
      school: 'UCLA',
      height: '5\'10"',
      ethnicity: 'Asian', // Updated to match new options
      religion: 'Spiritual',
      politicalLeaning: 'moderate',
      customPoliticalLeaning: '',
      marriageStatus: 'never_married',
      marriageGoal: 'unsure',
      desiredActivities: [],
      location: 'Los Angeles, CA',
      hometown: 'San Francisco, CA',
      hasChildren: 'no',
      familyPlans: 'want_someday',
      drinkingFrequency: 'socially',
      cannabisFrequency: 'socially',
      weedFrequency: 'socially',
      tobaccoFrequency: 'never',
      otherDrugsFrequency: 'never',
      drugsFrequency: 'never',
      photos: [
        {
          id: 'photo-1',
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
          isMain: true,
          order: 0,
        },
        {
          id: 'photo-2',
          url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
          isMain: false,
          order: 1,
        },
        {
          id: 'photo-3',
          url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',
          isMain: false,
          order: 2,
        },
        {
          id: 'photo-4',
          url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
          isMain: false,
          order: 3,
        },
        {
          id: 'photo-5',
          url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400',
          isMain: false,
          order: 4,
        },
        {
          id: 'photo-6',
          url: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400',
          isMain: false,
          order: 5,
        },
      ],
      interests: ['Basketball', 'Hiking', 'Yoga', 'Climbing', 'Photography', 'Cooking'],
      values: ['Honesty', 'Integrity', 'Trust', 'Authenticity', 'Ambition', 'Loyalty'],
      lifestyle: {
        drinking: 'socially',
        smoking: 'never',
        exercise: 'often',
        children: 'no',
        pets: ['dogs', 'cats'],
      },
      nonNegotiables: [
        { id: 'smoking', type: 'smoking', value: true },
        { id: 'children', type: 'children', value: true },
        { id: 'politics', type: 'politics', value: false },
      ],
      preferences: {
        ageMin: 24,
        ageMax: 34,
        gender: 'female',
        lookingFor: 'relationship',
        heightMin: 60,
        heightMax: 72,
        maxDistance: 15,
      },
      partnerLifestylePreferences: {
        drinking: 'socially',
        cannabis: 'socially',
        weed: 'socially',
        tobacco: 'never',
        otherDrugs: 'never',
        drugs: 'never',
      },
      // Removed partnerValues and partnerInterests - no longer collected in onboarding
      deepQuestions: [
        {
          questionId: 1,
          tier: 1,
          question: 'What does a perfect weekend look like for you?',
          answer: 'A perfect weekend for me starts with a morning hike to catch the sunrise, followed by brunch with close friends. I love spending afternoons exploring new neighborhoods or visiting museums, and ending the day with a home-cooked dinner and a good movie.',
        },
        {
          questionId: 2,
          tier: 1,
          question: 'What are you most passionate about?',
          answer: 'I\'m deeply passionate about creating meaningful experiences through design. Whether it\'s a digital product or a physical space, I believe good design can genuinely improve people\'s lives. I also love mentoring junior designers and helping them find their creative voice.',
        },
        {
          questionId: 3,
          tier: 2,
          question: 'What\'s a challenge you\'ve overcome that shaped who you are today?',
          answer: 'Moving across the country after college was terrifying but transformative. I had to build a new support network from scratch, which taught me resilience and the importance of being vulnerable with new people. It made me much more confident and independent.',
        },
      ],
      displayedQuestions: [1, 2, 3],
      sectionVisibility: {
        basics: true,
        lifestyle: true,
        values: true,
        interests: true,
        deepQuestions: true,
      },
      sectionOrder: ['basics', 'lifestyle', 'values', 'interests', 'deepQuestions'],
      isVerified: false,
      isPaused: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUserProfile = defaultProfile;

    return {
      ok: true,
      data: defaultProfile,
    };
  } catch (error: any) {
    return createErrorResponse('PROFILE_FETCH_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Update user profile - MOCK VERSION
 */
export const updateUserProfile = async (
  profile: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[MOCK PROFILE] Updating user profile:', profile);

    if (!mockUserProfile) {
      // Auto-create if doesn't exist
      const createResult = await createUserProfile('00000000-0000-0000-0000-000000000001', profile);
      if (!createResult.ok) {
        return createResult;
      }
    } else {
      // Merge updates - use deep merge for nested objects
      mockUserProfile = {
        ...mockUserProfile,
        ...profile,
        // Deep merge for nested objects
        preferences: profile.preferences ? {
          ...mockUserProfile.preferences,
          ...profile.preferences
        } : mockUserProfile.preferences,
        partnerLifestylePreferences: profile.partnerLifestylePreferences ? {
          ...mockUserProfile.partnerLifestylePreferences,
          ...profile.partnerLifestylePreferences
        } : mockUserProfile.partnerLifestylePreferences,
        updatedAt: new Date().toISOString(),
      };
    }

    console.log('[MOCK PROFILE] Profile updated successfully. New values:', {
      preferredPolitics: mockUserProfile.preferredPolitics,
      preferredEthnicities: mockUserProfile.preferredEthnicities,
      partnerLifestylePreferences: mockUserProfile.partnerLifestylePreferences,
    });

    return {
      ok: true,
      data: mockUserProfile!,
    };
  } catch (error: any) {
    return createErrorResponse('PROFILE_UPDATE_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Add profile photos - MOCK VERSION
 */
export const addProfilePhotos = async (
  imageUris: string[]
): Promise<ApiResponse<Photo[]>> => {
  try {
    console.log('[MOCK PROFILE] Adding photos:', imageUris);

    const newPhotos: Photo[] = imageUris.map((uri, index) => ({
      id: `photo-${Date.now()}-${index}`,
      url: uri,
      isMain: false,
      order: (mockUserProfile?.photos.length || 0) + index,
    }));

    if (mockUserProfile) {
      mockUserProfile.photos = [...mockUserProfile.photos, ...newPhotos];
    }

    return {
      ok: true,
      data: newPhotos,
    };
  } catch (error: any) {
    return createErrorResponse('ADD_PHOTOS_ERROR', error.message || 'Failed to add photos');
  }
};

/**
 * Remove profile photo - MOCK VERSION
 */
export const removeProfilePhoto = async (
  photoId: string
): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK PROFILE] Removing photo:', photoId);

    if (mockUserProfile) {
      mockUserProfile.photos = mockUserProfile.photos.filter(p => p.id !== photoId);
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REMOVE_PHOTO_ERROR', error.message || 'Failed to remove photo');
  }
};

/**
 * Reorder profile photos - MOCK VERSION
 */
export const reorderProfilePhotos = async (
  reorderedPhotos: Photo[]
): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK PROFILE] Reordering photos');

    if (mockUserProfile) {
      mockUserProfile.photos = reorderedPhotos;
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REORDER_ERROR', error.message || 'Failed to reorder photos');
  }
};

/**
 * Set main profile photo - MOCK VERSION
 */
export const setMainProfilePhoto = async (
  photoId: string
): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK PROFILE] Setting main photo:', photoId);

    if (mockUserProfile) {
      mockUserProfile.photos = mockUserProfile.photos.map(p => ({
        ...p,
        isMain: p.id === photoId,
      }));
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SET_MAIN_ERROR', error.message || 'Failed to set main photo');
  }
};

/**
 * Update profile pause status - MOCK VERSION
 */
export const updateProfilePauseStatus = async (
  isPaused: boolean
): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK PROFILE] Updating pause status:', isPaused);

    if (mockUserProfile) {
      mockUserProfile.isPaused = isPaused;
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('PAUSE_ERROR', error.message || 'Failed to update pause status');
  }
};

/**
 * Mark a guide as completed - MOCK VERSION (frontend-only)
 */
export const markGuideCompleted = async (
  guideId: 'tab_navigation_overview' | 'daily_grid_explained' | 'proposals_explained' | 'friends_area_explained' | 'profile_completion'
): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK PROFILE] Marking guide as completed:', guideId);

    if (mockUserProfile) {
      // Map guide IDs to profile fields
      const fieldMap: Record<string, keyof UserProfile> = {
        'tab_navigation_overview': 'hasCompletedTabNavigationGuide',
        'daily_grid_explained': 'hasCompletedDailyGridGuide',
        'proposals_explained': 'hasCompletedProposalsGuide',
        'friends_area_explained': 'hasCompletedFriendsGuide',
        'profile_completion': 'hasCompletedProfileGuide',
      };

      const field = fieldMap[guideId];
      if (field) {
        (mockUserProfile as any)[field] = true;
      }
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('GUIDE_ERROR', error.message || 'Failed to mark guide as completed');
  }
};

/**
 * Check if a guide has been completed - MOCK VERSION
 */
export const getGuideCompletionStatus = async (
  guideId: 'tab_navigation_overview' | 'daily_grid_explained' | 'proposals_explained' | 'friends_area_explained' | 'profile_completion'
): Promise<boolean> => {
  try {
    if (!mockUserProfile) {
      return false;
    }

    const fieldMap: Record<string, keyof UserProfile> = {
      'tab_navigation_overview': 'hasCompletedTabNavigationGuide',
      'daily_grid_explained': 'hasCompletedDailyGridGuide',
      'proposals_explained': 'hasCompletedProposalsGuide',
      'friends_area_explained': 'hasCompletedFriendsGuide',
      'profile_completion': 'hasCompletedProfileGuide',
    };

    const field = fieldMap[guideId];
    if (field) {
      return (mockUserProfile as any)[field] === true;
    }

    return false;
  } catch (error: any) {
    console.error('[MOCK PROFILE] Error checking guide completion:', error);
    return false;
  }
};
