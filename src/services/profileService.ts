/**
 * Profile Service - Supabase Direct Integration
 *
 * Provides profile CRUD operations via direct Supabase client calls.
 * Replaces the previous mock/Railway backend implementation.
 */

import { ApiResponse, UserProfile, DeepQuestionAnswer, OnboardingData, Photo } from '../types';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../utils/auth';
import { heightToInches, inchesToHeight } from '../utils/proposalMatching';

// In-memory cache for local state sync
let cachedProfile: UserProfile | null = null;

const createErrorResponse = (code: string, message: string): ApiResponse<any> => {
  return {
    ok: false,
    error: { code, message },
  };
};

/**
 * Map snake_case DB row to camelCase UserProfile
 */
function mapDbToProfile(data: any): UserProfile {
  const prefs = data.user_preferences?.[0] || data.user_preferences || {};
  const photos: Photo[] = (data.user_photos || []).map((p: any) => ({
    id: p.id,
    url: p.url,
    isMain: p.is_main,
    order: p.display_order,
  }));
  const deepQuestions: DeepQuestionAnswer[] = (data.deep_question_answers || []).map((dq: any) => ({
    questionId: dq.question_id,
    tier: dq.tier,
    question: dq.question_text,
    answer: dq.answer_text,
  }));

  const displayedQuestions = (data.deep_question_answers || [])
    .filter((dq: any) => dq.is_displayed)
    .map((dq: any) => dq.question_id);

  return {
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
    height: data.height_inches ? inchesToHeight(data.height_inches) : '',
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
    photos: photos.sort((a: Photo, b: Photo) => a.order - b.order),
    preferences: {
      ageMin: prefs.age_min ?? 18,
      ageMax: prefs.age_max ?? 99,
      gender: prefs.preferred_gender || 'both',
      lookingFor: prefs.looking_for || 'relationship',
      heightMin: prefs.height_min,
      heightMax: prefs.height_max,
      maxDistance: prefs.distance_miles,
    },
    interestedInGenders: prefs.interested_in_genders || [],
    preferredEthnicities: prefs.preferred_ethnicities || [],
    preferredPolitics: prefs.preferred_politics || [],
    preferenceVisibility: prefs.preference_visibility || {},
    nonNegotiables: prefs.non_negotiables || [],
    partnerLifestylePreferences: {
      drinking: prefs.partner_drinking || [],
      cannabis: prefs.partner_cannabis || [],
      tobacco: prefs.partner_tobacco || [],
      otherDrugs: prefs.partner_other_drugs || [],
    },
    sectionVisibility: data.section_visibility || {},
    deepQuestions,
    displayedQuestions,
    lifestyle: {
      drinking: data.drinking_frequency,
      smoking: data.tobacco_frequency,
      exercise: '',
      children: data.has_children,
      pets: [],
    },
    isVerified: data.is_verified || false,
    isPaused: data.is_paused || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as UserProfile;
}

/**
 * Get user profile from Supabase
 */
export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Fetching profile from Supabase for:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_preferences(*), deep_question_answers(*), user_photos(*)')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('PROFILE_NOT_FOUND', 'User profile does not exist yet.');
      }
      throw new Error(error.message);
    }

    const profile = mapDbToProfile(data);
    cachedProfile = profile;

    return { ok: true, data: profile };
  } catch (error: any) {
    console.error('[PROFILE] Error fetching profile:', error);
    return createErrorResponse('PROFILE_FETCH_ERROR', error.message || 'Failed to fetch profile');
  }
};

/**
 * Fetch and set user profile from Supabase, syncing to local state
 */
export const fetchAndSetUserProfile = async (userId: string): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[PROFILE] Fetching and syncing profile for:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_preferences(*), deep_question_answers(*), user_photos(*)')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('PROFILE_NOT_FOUND', 'User profile does not exist in Supabase yet.');
      }
      throw new Error(error.message);
    }

    const profile = mapDbToProfile(data);
    cachedProfile = profile;
    console.log('[PROFILE] Profile loaded and synced to local state');

    return { ok: true, data: profile };
  } catch (error: any) {
    console.error('[PROFILE] Error syncing profile:', error);
    return createErrorResponse('SYNC_ERROR', error.message || 'Failed to sync profile from Supabase');
  }
};

/**
 * Update user profile in Supabase
 * Splits into parallel upserts for profiles, user_preferences, and deep_question_answers
 */
export const updateUserProfile = async (
  profile: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Updating profile in Supabase for:', userId);

    // Build profile update payload
    const profileUpdate: Record<string, any> = {};
    if (profile.firstName !== undefined) profileUpdate.first_name = profile.firstName;
    if (profile.lastName !== undefined) profileUpdate.last_name = profile.lastName;
    if (profile.age !== undefined) profileUpdate.age = profile.age;
    if (profile.gender !== undefined) profileUpdate.gender = profile.gender;
    if (profile.pronouns !== undefined) profileUpdate.pronouns = profile.pronouns;
    if (profile.pronounsList !== undefined) profileUpdate.pronouns_list = profile.pronounsList;
    if (profile.customMyGender !== undefined) profileUpdate.custom_gender = profile.customMyGender;
    if (profile.hometown !== undefined) profileUpdate.hometown = profile.hometown;
    if (profile.location !== undefined) profileUpdate.location = profile.location;
    if (profile.currentJob !== undefined) profileUpdate.current_job = profile.currentJob;
    if (profile.companyPosition !== undefined) profileUpdate.company_position = profile.companyPosition;
    if (profile.educationLevel !== undefined) profileUpdate.education_level = profile.educationLevel;
    if (profile.school !== undefined) profileUpdate.school = profile.school;
    if (profile.height !== undefined) {
      const inches = heightToInches(profile.height);
      if (inches !== null) profileUpdate.height_inches = inches;
    }
    if (profile.ethnicity !== undefined) profileUpdate.ethnicity = profile.ethnicity;
    if (profile.religion !== undefined) profileUpdate.religion = profile.religion;
    if (profile.politicalLeaning !== undefined) profileUpdate.political_leaning = profile.politicalLeaning;
    if (profile.hasChildren !== undefined) profileUpdate.has_children = profile.hasChildren;
    if (profile.familyPlans !== undefined) profileUpdate.family_plans = profile.familyPlans;
    if (profile.drinkingFrequency !== undefined) profileUpdate.drinking_frequency = profile.drinkingFrequency;
    if (profile.cannabisFrequency !== undefined) profileUpdate.cannabis_frequency = profile.cannabisFrequency;
    if (profile.tobaccoFrequency !== undefined) profileUpdate.tobacco_frequency = profile.tobaccoFrequency;
    if (profile.otherDrugsFrequency !== undefined) profileUpdate.other_drugs_frequency = profile.otherDrugsFrequency;
    if (profile.interests !== undefined) profileUpdate.interests = profile.interests;
    if (profile.values !== undefined) profileUpdate.values = profile.values;
    if (profile.bio !== undefined) profileUpdate.bio = profile.bio;
    if (profile.isPaused !== undefined) profileUpdate.is_paused = profile.isPaused;
    if (profile.sectionVisibility !== undefined) profileUpdate.section_visibility = profile.sectionVisibility;

    // Build preferences update payload
    const prefsUpdate: Record<string, any> = { user_id: userId };
    let hasPrefsUpdate = false;

    if (profile.preferences) {
      if (profile.preferences.ageMin !== undefined) { prefsUpdate.age_min = profile.preferences.ageMin; hasPrefsUpdate = true; }
      if (profile.preferences.ageMax !== undefined) { prefsUpdate.age_max = profile.preferences.ageMax; hasPrefsUpdate = true; }
      if (profile.preferences.gender !== undefined) { prefsUpdate.preferred_gender = profile.preferences.gender; hasPrefsUpdate = true; }
      if (profile.preferences.lookingFor !== undefined) { prefsUpdate.looking_for = profile.preferences.lookingFor; hasPrefsUpdate = true; }
      if (profile.preferences.heightMin !== undefined) { prefsUpdate.height_min = profile.preferences.heightMin; hasPrefsUpdate = true; }
      if (profile.preferences.heightMax !== undefined) { prefsUpdate.height_max = profile.preferences.heightMax; hasPrefsUpdate = true; }
      if (profile.preferences.maxDistance !== undefined) { prefsUpdate.distance_miles = profile.preferences.maxDistance; hasPrefsUpdate = true; }
    }
    if (profile.interestedInGenders !== undefined) { prefsUpdate.interested_in_genders = profile.interestedInGenders; hasPrefsUpdate = true; }
    if (profile.preferredEthnicities !== undefined) { prefsUpdate.preferred_ethnicities = profile.preferredEthnicities; hasPrefsUpdate = true; }
    if (profile.preferredPolitics !== undefined) { prefsUpdate.preferred_politics = profile.preferredPolitics; hasPrefsUpdate = true; }
    if (profile.preferenceVisibility !== undefined) { prefsUpdate.preference_visibility = profile.preferenceVisibility; hasPrefsUpdate = true; }
    if (profile.nonNegotiables !== undefined) { prefsUpdate.non_negotiables = profile.nonNegotiables; hasPrefsUpdate = true; }
    if (profile.partnerLifestylePreferences) {
      const plp = profile.partnerLifestylePreferences;
      if (plp.drinking !== undefined) {
        prefsUpdate.partner_drinking = Array.isArray(plp.drinking) ? plp.drinking : [plp.drinking];
        hasPrefsUpdate = true;
      }
      if (plp.cannabis !== undefined) {
        prefsUpdate.partner_cannabis = Array.isArray(plp.cannabis) ? plp.cannabis : [plp.cannabis];
        hasPrefsUpdate = true;
      }
      if (plp.tobacco !== undefined) {
        prefsUpdate.partner_tobacco = Array.isArray(plp.tobacco) ? plp.tobacco : [plp.tobacco];
        hasPrefsUpdate = true;
      }
      if (plp.otherDrugs !== undefined) {
        prefsUpdate.partner_other_drugs = Array.isArray(plp.otherDrugs) ? plp.otherDrugs : [plp.otherDrugs];
        hasPrefsUpdate = true;
      }
    }

    // Run updates in parallel
    const promises: Promise<any>[] = [];

    // 1. Profile update
    if (Object.keys(profileUpdate).length > 0) {
      promises.push(
        supabase.from('profiles').update(profileUpdate).eq('id', userId)
      );
    }

    // 2. Preferences upsert
    if (hasPrefsUpdate) {
      promises.push(
        supabase.from('user_preferences').upsert(prefsUpdate, { onConflict: 'user_id' })
      );
    }

    // 3. Deep questions upsert
    if (profile.deepQuestions && profile.deepQuestions.length > 0) {
      const dqRows = profile.deepQuestions.map((dq) => ({
        user_id: userId,
        question_id: dq.questionId,
        tier: dq.tier,
        question_text: dq.question,
        answer_text: dq.answer,
        is_displayed: profile.displayedQuestions
          ? profile.displayedQuestions.includes(dq.questionId)
          : true,
      }));
      promises.push(
        supabase
          .from('deep_question_answers')
          .upsert(dqRows, { onConflict: 'user_id,question_id' })
      );
    }

    const results = await Promise.all(promises);

    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error('[PROFILE] Update error:', result.error);
        throw new Error(result.error.message);
      }
    }

    // Update matchmaking eligibility
    const { data: eligible } = await supabase.rpc('is_matchmaking_eligible', {
      user_uuid: userId,
    });
    if (eligible !== null) {
      await supabase
        .from('profiles')
        .update({ matchmaking_eligible: eligible })
        .eq('id', userId);
    }

    // Reload full profile to return current state
    const reloadResult = await getUserProfile();
    if (reloadResult.ok && reloadResult.data) {
      cachedProfile = reloadResult.data;
      return reloadResult;
    }

    // Fallback: merge updates into cached profile
    if (cachedProfile) {
      cachedProfile = {
        ...cachedProfile,
        ...profile,
        preferences: profile.preferences
          ? { ...cachedProfile.preferences, ...profile.preferences }
          : cachedProfile.preferences,
        updatedAt: new Date().toISOString(),
      };
      return { ok: true, data: cachedProfile };
    }

    return createErrorResponse('PROFILE_UPDATE_ERROR', 'Profile updated but could not reload');
  } catch (error: any) {
    console.error('[PROFILE] Error updating profile:', error);
    return createErrorResponse('PROFILE_UPDATE_ERROR', error.message || 'Failed to update profile');
  }
};

/**
 * Save a single onboarding step to Supabase
 */
export const saveOnboardingStep = async (
  stepKey: string,
  data: Partial<OnboardingData>
): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Saving onboarding step:', stepKey);

    // Save to onboarding_progress table
    await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: userId,
        current_step: stepKey,
        data: data,
      }, { onConflict: 'user_id' });

    // Also merge into local cache
    if (cachedProfile) {
      Object.assign(cachedProfile, data);
      if (data.pronouns) cachedProfile.pronouns = data.pronouns;
      if (data.customPronouns) cachedProfile.customPronouns = data.customPronouns;
      if (data.pronounsList) cachedProfile.pronounsList = data.pronounsList;
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('SAVE_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Create user profile in Supabase
 */
export const createUserProfile = async (
  userId: string,
  data: Partial<OnboardingData>
): Promise<ApiResponse<UserProfile>> => {
  try {
    console.log('[PROFILE] Creating user profile in Supabase:', userId);

    // 1. Insert profile
    const profilePayload: Record<string, any> = {
      id: userId,
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      age: data.age || 0,
      gender: data.gender || [],
      location: data.location || '',
      pronouns: data.pronouns,
      pronouns_list: data.pronounsList,
      custom_gender: data.customMyGender,
      hometown: data.hometown,
      current_job: data.currentJob,
      company_position: data.companyPosition,
      education_level: data.educationLevel,
      school: data.school,
      height_inches: data.height ? heightToInches(data.height) : null,
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
      bio: '',
      profile_completed: true,
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) throw new Error(profileError.message);

    // 2. Insert preferences
    const prefsPayload: Record<string, any> = {
      user_id: userId,
      age_min: data.preferences?.ageMin ?? 18,
      age_max: data.preferences?.ageMax ?? 99,
      preferred_gender: data.preferences?.gender || 'both',
      looking_for: data.preferences?.lookingFor || 'relationship',
      height_min: data.preferences?.heightMin || 0,
      height_max: data.preferences?.heightMax || 120,
      distance_miles: data.preferences?.maxDistance || 50,
      interested_in_genders: data.interestedInGenders || [],
      preferred_ethnicities: data.preferredEthnicities || [],
      preferred_politics: data.preferredPolitics || [],
      non_negotiables: data.nonNegotiables || [],
    };

    if (data.partnerLifestylePreferences) {
      const plp = data.partnerLifestylePreferences;
      prefsPayload.partner_drinking = Array.isArray(plp.drinking) ? plp.drinking : plp.drinking ? [plp.drinking] : [];
      prefsPayload.partner_cannabis = Array.isArray(plp.cannabis) ? plp.cannabis : plp.cannabis ? [plp.cannabis] : [];
      prefsPayload.partner_tobacco = Array.isArray(plp.tobacco) ? plp.tobacco : plp.tobacco ? [plp.tobacco] : [];
      prefsPayload.partner_other_drugs = Array.isArray(plp.otherDrugs) ? plp.otherDrugs : plp.otherDrugs ? [plp.otherDrugs] : [];
    }

    const { error: prefsError } = await supabase
      .from('user_preferences')
      .upsert(prefsPayload, { onConflict: 'user_id' });

    if (prefsError) throw new Error(prefsError.message);

    // 3. Insert deep questions
    if (data.deepQuestions && data.deepQuestions.length > 0) {
      const dqRows = data.deepQuestions.map((dq) => ({
        user_id: userId,
        question_id: dq.questionId,
        tier: dq.tier,
        question_text: dq.question,
        answer_text: dq.answer,
        is_displayed: true,
      }));

      const { error: dqError } = await supabase
        .from('deep_question_answers')
        .upsert(dqRows, { onConflict: 'user_id,question_id' });

      if (dqError) throw new Error(dqError.message);
    }

    // 4. Insert photos
    if (data.photos && data.photos.length > 0) {
      const photoRows = data.photos.map((p: any, idx: number) => ({
        user_id: userId,
        url: typeof p === 'string' ? p : p.url,
        storage_path: typeof p === 'string' ? p : (p.storagePath || p.url),
        is_main: idx === 0,
        display_order: idx,
      }));

      const { error: photoError } = await supabase
        .from('user_photos')
        .upsert(photoRows);

      if (photoError) console.warn('[PROFILE] Photo insert warning:', photoError.message);
    }

    // 5. Update matchmaking eligibility
    const { data: eligible } = await supabase.rpc('is_matchmaking_eligible', {
      user_uuid: userId,
    });
    if (eligible !== null) {
      await supabase
        .from('profiles')
        .update({ matchmaking_eligible: eligible })
        .eq('id', userId);
    }

    // 6. Reload full profile
    const result = await fetchAndSetUserProfile(userId);
    if (result.ok) return result;

    return createErrorResponse('PROFILE_CREATE_ERROR', 'Profile created but could not reload');
  } catch (error: any) {
    console.error('[PROFILE] Error creating profile:', error);
    return createErrorResponse('PROFILE_CREATE_ERROR', error.message || 'An unexpected error occurred');
  }
};

/**
 * Add profile photos
 */
export const addProfilePhotos = async (
  imageUris: string[]
): Promise<ApiResponse<Photo[]>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Adding photos:', imageUris.length);

    // Get current max display_order
    const { data: existing } = await supabase
      .from('user_photos')
      .select('display_order')
      .eq('user_id', userId)
      .order('display_order', { ascending: false })
      .limit(1);

    const startOrder = (existing?.[0]?.display_order ?? -1) + 1;

    const newPhotos: any[] = imageUris.map((uri, index) => ({
      user_id: userId,
      url: uri,
      storage_path: uri,
      is_main: startOrder + index === 0,
      display_order: startOrder + index,
    }));

    const { data, error } = await supabase
      .from('user_photos')
      .insert(newPhotos)
      .select();

    if (error) throw new Error(error.message);

    const photos: Photo[] = (data || []).map((p: any) => ({
      id: p.id,
      url: p.url,
      isMain: p.is_main,
      order: p.display_order,
    }));

    if (cachedProfile) {
      cachedProfile.photos = [...cachedProfile.photos, ...photos];
    }

    return { ok: true, data: photos };
  } catch (error: any) {
    return createErrorResponse('ADD_PHOTOS_ERROR', error.message || 'Failed to add photos');
  }
};

/**
 * Remove profile photo
 */
export const removeProfilePhoto = async (
  photoId: string
): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Removing photo:', photoId);

    const { error } = await supabase
      .from('user_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    if (cachedProfile) {
      cachedProfile.photos = cachedProfile.photos.filter(p => p.id !== photoId);
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REMOVE_PHOTO_ERROR', error.message || 'Failed to remove photo');
  }
};

/**
 * Reorder profile photos
 */
export const reorderProfilePhotos = async (
  reorderedPhotos: Photo[]
): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Reordering photos');

    const updates = reorderedPhotos.map((photo, index) =>
      supabase
        .from('user_photos')
        .update({ display_order: index, is_main: index === 0 })
        .eq('id', photo.id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);

    if (cachedProfile) {
      cachedProfile.photos = reorderedPhotos.map((p, i) => ({
        ...p,
        order: i,
        isMain: i === 0,
      }));
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('REORDER_ERROR', error.message || 'Failed to reorder photos');
  }
};

/**
 * Set main profile photo
 */
export const setMainProfilePhoto = async (
  photoId: string
): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Setting main photo:', photoId);

    // Unset all as main first
    await supabase
      .from('user_photos')
      .update({ is_main: false })
      .eq('user_id', userId);

    // Set selected as main
    const { error } = await supabase
      .from('user_photos')
      .update({ is_main: true })
      .eq('id', photoId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    if (cachedProfile) {
      cachedProfile.photos = cachedProfile.photos.map(p => ({
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
 * Update profile pause status
 */
export const updateProfilePauseStatus = async (
  isPaused: boolean
): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();
    console.log('[PROFILE] Updating pause status:', isPaused);

    const { error } = await supabase
      .from('profiles')
      .update({ is_paused: isPaused })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    if (cachedProfile) {
      cachedProfile.isPaused = isPaused;
    }

    // Re-evaluate matchmaking eligibility
    const { data: eligible } = await supabase.rpc('is_matchmaking_eligible', {
      user_uuid: userId,
    });
    if (eligible !== null) {
      await supabase
        .from('profiles')
        .update({ matchmaking_eligible: eligible })
        .eq('id', userId);
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('PAUSE_ERROR', error.message || 'Failed to update pause status');
  }
};

/**
 * Mark a guide as completed
 */
export const markGuideCompleted = async (
  guideId: 'tab_navigation_overview' | 'daily_grid_explained' | 'proposals_explained' | 'friends_area_explained' | 'profile_completion'
): Promise<ApiResponse<void>> => {
  try {
    console.log('[PROFILE] Marking guide as completed:', guideId);

    if (cachedProfile) {
      const fieldMap: Record<string, keyof UserProfile> = {
        'tab_navigation_overview': 'hasCompletedTabNavigationGuide',
        'daily_grid_explained': 'hasCompletedDailyGridGuide',
        'proposals_explained': 'hasCompletedProposalsGuide',
        'friends_area_explained': 'hasCompletedFriendsGuide',
        'profile_completion': 'hasCompletedProfileGuide',
      };

      const field = fieldMap[guideId];
      if (field) {
        (cachedProfile as any)[field] = true;
      }
    }

    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('GUIDE_ERROR', error.message || 'Failed to mark guide as completed');
  }
};

/**
 * Check if a guide has been completed
 */
export const getGuideCompletionStatus = async (
  guideId: 'tab_navigation_overview' | 'daily_grid_explained' | 'proposals_explained' | 'friends_area_explained' | 'profile_completion'
): Promise<boolean> => {
  try {
    if (!cachedProfile) return false;

    const fieldMap: Record<string, keyof UserProfile> = {
      'tab_navigation_overview': 'hasCompletedTabNavigationGuide',
      'daily_grid_explained': 'hasCompletedDailyGridGuide',
      'proposals_explained': 'hasCompletedProposalsGuide',
      'friends_area_explained': 'hasCompletedFriendsGuide',
      'profile_completion': 'hasCompletedProfileGuide',
    };

    const field = fieldMap[guideId];
    if (field) {
      return (cachedProfile as any)[field] === true;
    }

    return false;
  } catch (error: any) {
    console.error('[PROFILE] Error checking guide completion:', error);
    return false;
  }
};
