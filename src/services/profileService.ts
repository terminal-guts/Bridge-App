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
// Backend API URL
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bridge-frontend-production.up.railway.app'; // Default to Railway hosted backend

const createErrorResponse = (code: string, message: string): ApiResponse<any> => {
  return {
    ok: false,
    error: { code, message },
  };
};

/**
 * Fetch and set user profile from backend - Task: Invoke Supabase to load profile
 */
export const fetchAndSetUserProfile = async (userId: string): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[BACKEND] Fetching profile for user from Supabase:', userId);

    const response = await fetch(`${API_URL}/profile/${userId}`);

    if (!response.ok) {
      const err = await response.text();
      console.error('[BACKEND] Failed to fetch profile:', err);
      // If profile doesn't exist yet, that's okay for new users
      if (response.status === 404) {
        return createErrorResponse('PROFILE_NOT_FOUND', 'User profile does not exist in Supabase yet.');
      }
      throw new Error('Backend profile fetch failed: ' + err);
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('[BACKEND] Parse error on profile fetch:', responseText.slice(0, 100));
      throw new Error('Server returned invalid data format. Check your backend console.');
    }
    const data = result.data;

    // Map snake_case from DB to camelCase for frontend UserProfile
    const mappedProfile: UserProfile = {
      id: data.id,
      userId: data.id,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      age: data.age || 0,
      gender: data.gender || [],
      pronouns: data.pronouns || 'prefer_not_to_say',
      pronounsList: data.pronouns_list || [],
      customMyGender: data.custom_gender,
      hometown: data.hometown,
      location: data.location || '',
      currentJob: data.current_job,
      companyPosition: data.company_position,
      educationLevel: data.education_level || '',
      school: data.school || '',
      height: data.height_inches ? `${Math.floor(data.height_inches / 12)}'${data.height_inches % 12}"` : '',
      ethnicity: data.ethnicity || '',
      religion: data.religion || '',
      politicalLeaning: data.political_leaning || 'prefer_not_to_say',
      hasChildren: data.has_children,
      familyPlans: data.family_plans,
      drinkingFrequency: data.drinking_frequency,
      cannabisFrequency: data.cannabis_frequency,
      tobaccoFrequency: data.tobacco_frequency,
      otherDrugsFrequency: data.other_drugs_frequency,
      interests: data.interests || [],
      values: data.values || [],
      bio: data.bio || '',
      photos: data.photos?.map((p: any) => ({
        id: p.id,
        url: p.url,
        isMain: p.is_main,
        order: p.display_order
      })) || [],
      preferences: data.preferences ? {
        ageMin: data.preferences.age_min,
        ageMax: data.preferences.age_max,
        gender: data.preferences.preferred_gender,
        lookingFor: data.preferences.looking_for,
        heightMin: data.preferences.height_min,
        heightMax: data.preferences.height_max,
        maxDistance: data.preferences.distance_miles,
      } as any : {
        ageMin: 18,
        ageMax: 99,
        gender: 'both',
        lookingFor: 'relationship',
      },
      deepQuestions: data.deep_questions?.map((dq: any) => ({
        questionId: dq.question_id,
        tier: dq.tier,
        question: dq.question_text,
        answer: dq.answer_text,
      })) || [],
      isVerified: data.is_verified || false,
      isPaused: data.is_paused || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as any;

    mockUserProfile = mappedProfile;
    console.log('[BACKEND] Profile loaded and synced to local state');

    return {
      ok: true,
      data: mappedProfile
    };
  } catch (error: any) {
    console.error('[BACKEND] Error syncing profile:', error);
    return createErrorResponse('SYNC_ERROR', error.message || 'Failed to sync profile from Supabase');
  }
};

/**
 * Save a single onboarding step - MOCK VERSION
 * Stores data in memory
 */
export const saveOnboardingStep = async (
  stepKey: string,
  data: Partial<OnboardingData>,
  userId?: string
): Promise<ApiResponse<void>> => {
  try {
    const effectiveUserId = userId || MOCK_USER_ID;
    console.log('[BACKEND] Saving step to Supabase:', stepKey, 'for user:', effectiveUserId);

    // Call real Python backend
    const response = await fetch(`${API_URL}/onboarding/save-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: effectiveUserId,
        step_key: stepKey,
        data: data
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[BACKEND] Failed to save step to server:', errorText.slice(0, 100));
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
          drinking: 'Sometimes',
          smoking: 'No',
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

    if (!mockUserProfile) return createErrorResponse('NO_LOCAL_PROFILE', 'No local profile found');
    mockUserProfile.pronouns = data.pronouns || mockUserProfile.pronouns;
    mockUserProfile.customPronouns = data.customPronouns;
    mockUserProfile.pronounsList = data.pronounsList || mockUserProfile.pronounsList;

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
    console.log('[MOCK PROFILE] Creating user profile (calling backend):', userId);

    // 1. Construct the payload for the backend
    const payload = {
      user_id: userId,
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      age: data.age || 0,
      gender: data.gender || [],
      location: data.location || '',
      photos: Array.isArray(data.photos)
        ? data.photos.map(p => typeof p === 'string' ? p : p.url)
        : [],

      // Extended fields
      pronouns: data.pronouns,
      pronouns_list: data.pronounsList,
      custom_gender: data.customMyGender, // mapped from customMyGender
      hometown: data.hometown,
      current_job: data.currentJob,
      company_position: data.companyPosition,
      education_level: data.educationLevel,
      school: data.school,
      height_inches: data.height ? parseInt(data.height) : undefined, // rudimentary parse, ideally parse 5'10"
      ethnicity: data.ethnicity,
      religion: data.religion,
      political_leaning: data.politicalLeaning,
      has_children: data.hasChildren,
      family_plans: data.familyPlans,
      drinking_frequency: data.drinkingFrequency,
      cannabis_frequency: data.cannabisFrequency,
      tobacco_frequency: data.tobaccoFrequency,
      other_drugs_frequency: data.otherDrugsFrequency,
      interests: data.interests || [],
      values: data.values || [],
      bio: '', // OnboardingData might not have bio yet?

      deep_questions: data.deepQuestions?.map(dq => ({
        question_id: dq.questionId,
        question_text: dq.question,
        answer_text: dq.answer,
        tier: dq.tier
      })) || []
    };

    // 2. Call the backend
    const response = await fetch(`${API_URL}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[BACKEND] Failed to complete onboarding:', err);
      throw new Error('Backend onboarding completion failed: ' + err);
    }

    console.log('[BACKEND] Onboarding completed successfully');

    // 3. Update local mock state (legacy behavior)
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
      tobaccoFrequency: data.tobaccoFrequency,
      otherDrugsFrequency: data.otherDrugsFrequency,
      photos: data.photos || [],
      interests: data.interests || [],
      values: data.values || [],
      lifestyle: data.lifestyle || {
        drinking: 'Sometimes',
        smoking: 'No',
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
      pronouns: 'he/him',
      pronounsList: ['He', 'Him', 'His'],
      customPronouns: undefined,
      customMyGender: undefined,
      interestedInGenders: ['female'],
      customInterestedIn: undefined,
      preferredEthnicities: ['Asian', 'White / Caucasian', 'Hispanic / Latino'],
      preferredPolitics: ['Moderate', 'Liberal'],
      occupation: 'Product Designer',
      company: 'Tech Startup',
      currentJob: 'Software Engineer',
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
      drinkingFrequency: 'Sometimes',
      cannabisFrequency: 'Sometimes',
      tobaccoFrequency: 'No',
      otherDrugsFrequency: 'No',
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
        drinking: 'Sometimes',
        smoking: 'No',
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
        drinking: 'Sometimes',
        cannabis: 'Sometimes',
        tobacco: 'No',
        otherDrugs: 'No',
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
 * Sync profile changes to the backend.
 * Converts camelCase frontend fields to snake_case for the API.
 */
const syncProfileToBackend = async (userId: string, profile: Partial<UserProfile>): Promise<void> => {
  const payload: Record<string, any> = {};

  // Map camelCase to snake_case for profile fields
  if (profile.firstName !== undefined) payload.first_name = profile.firstName;
  if (profile.lastName !== undefined) payload.last_name = profile.lastName;
  if (profile.age !== undefined) payload.age = profile.age;
  if (profile.gender !== undefined) payload.gender = profile.gender;
  if (profile.location !== undefined) payload.location = profile.location;
  if (profile.pronouns !== undefined) payload.pronouns = profile.pronouns;
  if (profile.pronounsList !== undefined) payload.pronouns_list = profile.pronounsList;
  if (profile.customMyGender !== undefined) payload.custom_gender = profile.customMyGender;
  if (profile.hometown !== undefined) payload.hometown = profile.hometown;
  if (profile.currentJob !== undefined) payload.current_job = profile.currentJob;
  if (profile.companyPosition !== undefined) payload.company_position = profile.companyPosition;
  if (profile.educationLevel !== undefined) payload.education_level = profile.educationLevel;
  if (profile.school !== undefined) payload.school = profile.school;
  if (profile.ethnicity !== undefined) payload.ethnicity = profile.ethnicity;
  if (profile.religion !== undefined) payload.religion = profile.religion;
  if (profile.politicalLeaning !== undefined) payload.political_leaning = profile.politicalLeaning;
  if (profile.hasChildren !== undefined) payload.has_children = profile.hasChildren;
  if (profile.familyPlans !== undefined) payload.family_plans = profile.familyPlans;
  if (profile.drinkingFrequency !== undefined) payload.drinking_frequency = profile.drinkingFrequency;
  if (profile.cannabisFrequency !== undefined) payload.cannabis_frequency = profile.cannabisFrequency;
  if (profile.tobaccoFrequency !== undefined) payload.tobacco_frequency = profile.tobaccoFrequency;
  if (profile.otherDrugsFrequency !== undefined) payload.other_drugs_frequency = profile.otherDrugsFrequency;
  if (profile.interests !== undefined) payload.interests = profile.interests;
  if (profile.values !== undefined) payload.values = profile.values;
  if (profile.bio !== undefined) payload.bio = profile.bio;
  if (profile.isPaused !== undefined) payload.is_paused = profile.isPaused;
  if (profile.height !== undefined) {
    // Parse height string like 5'10" to inches
    const match = profile.height.match(/(\d+)'(\d+)/);
    if (match) {
      payload.height_inches = parseInt(match[1]) * 12 + parseInt(match[2]);
    }
  }

  if (profile.photos !== undefined) {
    payload.photos = profile.photos.map((p: any) => ({
      url: p.url,
      order: p.order,
      isMain: p.isMain,
    }));
  }

  if (profile.preferences !== undefined) {
    payload.preferences = {
      age_min: profile.preferences.ageMin,
      age_max: profile.preferences.ageMax,
      preferred_gender: profile.preferences.gender,
      looking_for: profile.preferences.lookingFor,
      height_min: profile.preferences.heightMin,
      height_max: profile.preferences.heightMax,
      distance_miles: profile.preferences.maxDistance,
    };
  }

  if (profile.deepQuestions !== undefined) {
    payload.deep_questions = profile.deepQuestions.map((dq: any) => ({
      question_id: dq.questionId,
      question_text: dq.question,
      answer_text: dq.answer,
      tier: dq.tier,
    }));
  }

  const response = await fetch(`${API_URL}/profile/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn('[BACKEND] Profile sync failed:', err);
  } else {
    console.log('[BACKEND] Profile synced to backend successfully');
  }
};

/**
 * Update user profile - updates local state and syncs to backend
 */
export const updateUserProfile = async (
  profile: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[PROFILE] Updating user profile:', Object.keys(profile));

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
      };

      if (profile.partnerLifestylePreferences && mockUserProfile.partnerLifestylePreferences) {
        mockUserProfile.partnerLifestylePreferences.drinking = profile.partnerLifestylePreferences.drinking || mockUserProfile.partnerLifestylePreferences.drinking;
        mockUserProfile.partnerLifestylePreferences.cannabis = profile.partnerLifestylePreferences.cannabis || mockUserProfile.partnerLifestylePreferences.cannabis;
        mockUserProfile.partnerLifestylePreferences.tobacco = profile.partnerLifestylePreferences.tobacco || mockUserProfile.partnerLifestylePreferences.tobacco;
        mockUserProfile.partnerLifestylePreferences.otherDrugs = profile.partnerLifestylePreferences.otherDrugs || mockUserProfile.partnerLifestylePreferences.otherDrugs;
      }
      mockUserProfile.updatedAt = new Date().toISOString();
    }

    // Sync to backend
    const userId = mockUserProfile?.userId || mockUserProfile?.id;
    if (userId) {
      syncProfileToBackend(userId, profile).catch(err => {
        console.warn('[PROFILE] Background sync failed:', err);
      });
    }

    return {
      ok: true,
      data: mockUserProfile!,
    };
  } catch (error: any) {
    return createErrorResponse('PROFILE_UPDATE_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Add profile photos - updates local state and syncs to backend
 */
export const addProfilePhotos = async (
  imageUris: string[]
): Promise<ApiResponse<Photo[]>> => {
  try {
    console.log('[PROFILE] Adding photos:', imageUris);

    const newPhotos: Photo[] = imageUris.map((uri, index) => ({
      id: `photo-${Date.now()}-${index}`,
      url: uri,
      isMain: false,
      order: (mockUserProfile?.photos.length || 0) + index,
    }));

    if (mockUserProfile) {
      mockUserProfile.photos = [...mockUserProfile.photos, ...newPhotos];

      // Sync all photos to backend
      const userId = mockUserProfile.userId || mockUserProfile.id;
      if (userId) {
        syncProfileToBackend(userId, { photos: mockUserProfile.photos }).catch(err => {
          console.warn('[PROFILE] Photo sync failed:', err);
        });
      }
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
 * Remove profile photo - updates local state and syncs to backend
 */
export const removeProfilePhoto = async (
  photoId: string
): Promise<ApiResponse<void>> => {
  try {
    console.log('[PROFILE] Removing photo:', photoId);

    if (mockUserProfile) {
      mockUserProfile.photos = mockUserProfile.photos.filter(p => p.id !== photoId);

      // Sync remaining photos to backend
      const userId = mockUserProfile.userId || mockUserProfile.id;
      if (userId) {
        syncProfileToBackend(userId, { photos: mockUserProfile.photos }).catch(err => {
          console.warn('[PROFILE] Photo sync failed:', err);
        });
      }
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REMOVE_PHOTO_ERROR', error.message || 'Failed to remove photo');
  }
};

/**
 * Reorder profile photos - updates local state and syncs to backend
 */
export const reorderProfilePhotos = async (
  reorderedPhotos: Photo[]
): Promise<ApiResponse<void>> => {
  try {
    console.log('[PROFILE] Reordering photos');

    if (mockUserProfile) {
      mockUserProfile.photos = reorderedPhotos;

      const userId = mockUserProfile.userId || mockUserProfile.id;
      if (userId) {
        syncProfileToBackend(userId, { photos: reorderedPhotos }).catch(err => {
          console.warn('[PROFILE] Photo reorder sync failed:', err);
        });
      }
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REORDER_ERROR', error.message || 'Failed to reorder photos');
  }
};

/**
 * Set main profile photo - updates local state and syncs to backend
 */
export const setMainProfilePhoto = async (
  photoId: string
): Promise<ApiResponse<void>> => {
  try {
    console.log('[PROFILE] Setting main photo:', photoId);

    if (mockUserProfile) {
      mockUserProfile.photos = mockUserProfile.photos.map(p => ({
        ...p,
        isMain: p.id === photoId,
      }));

      const userId = mockUserProfile.userId || mockUserProfile.id;
      if (userId) {
        syncProfileToBackend(userId, { photos: mockUserProfile.photos }).catch(err => {
          console.warn('[PROFILE] Main photo sync failed:', err);
        });
      }
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SET_MAIN_ERROR', error.message || 'Failed to set main photo');
  }
};

/**
 * Update profile pause status - updates local state and syncs to backend
 */
export const updateProfilePauseStatus = async (
  isPaused: boolean
): Promise<ApiResponse<void>> => {
  try {
    console.log('[PROFILE] Updating pause status:', isPaused);

    if (mockUserProfile) {
      mockUserProfile.isPaused = isPaused;

      const userId = mockUserProfile.userId || mockUserProfile.id;
      if (userId) {
        syncProfileToBackend(userId, { isPaused } as any).catch(err => {
          console.warn('[PROFILE] Pause status sync failed:', err);
        });
      }
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
