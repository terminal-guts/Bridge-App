/**
 * Profile Completeness Utilities
 *
 * All onboarding steps are mandatory (no skip buttons). Every user who finishes
 * onboarding has all required fields filled → profile_completed = true.
 *
 * profile_completed is a ONE-WAY GATE — once true, it never reverts to false.
 * If a user later edits their profile and clears a field, they stay in the pool.
 *
 * Profile strength is COSMETIC / MOTIVATIONAL only — it encourages adding deep
 * questions and extra photos but does NOT gate the matching pool.
 */

import { UserProfile } from '../types';

// ─── Mandatory fields (all collected during onboarding, no skip) ───
// Every user who completes onboarding has these filled.
const MANDATORY_FIELDS = {
  firstName: 4,
  lastName: 4,
  age: 4,
  gender: 6,
  interestedInGenders: 6,
  height: 3,
  heightPreference: 3,
  ethnicity: 3,
  preferredEthnicities: 3,
  religion: 4,
  politicalLeaning: 3,
  lifestyle: 5,           // 4 substance fields combined
  commitment: 3,          // lookingFor / preferences
  interests: 9,           // at least 3 required
  values: 9,              // at least 3 required
  photos: 15,             // 5 pts per photo, 3 needed for full credit
  ageRange: 4,
  deepQuestions: 12,       // 4 pts per displayed question, 3 needed for full credit
};
// Total: 100
// Total: 100

/**
 * Profile completeness result
 */
export interface ProfileCompleteness {
  percentage: number;
  score: number;
  maxScore: number;
  missingFields: {
    field: string;
    label: string;
    weight: number;
    category: 'essential' | 'important' | 'nice-to-have';
  }[];
  suggestions: string[];
}

/**
 * Calculate profile completeness percentage.
 * All fields are mandatory — collected during onboarding with no skip buttons.
 * Total = 100 points when all fields are filled.
 */
export const calculateProfileCompleteness = (
  profile: UserProfile | null
): ProfileCompleteness => {
  if (!profile) {
    return {
      percentage: 0,
      score: 0,
      maxScore: 100,
      missingFields: [],
      suggestions: ['Complete your profile to get started'],
    };
  }

  let score = 0;
  const missingFields: ProfileCompleteness['missingFields'] = [];

  const check = (field: string, label: string, filled: boolean, category: ProfileCompleteness['missingFields'][0]['category'] = 'essential') => {
    const w = MANDATORY_FIELDS[field as keyof typeof MANDATORY_FIELDS];
    if (!w) return;
    if (filled) {
      score += w;
    } else {
      missingFields.push({ field, label, weight: w, category });
    }
  };

  // ── All fields ──
  check('firstName', 'Add your first name', !!(profile.firstName?.trim()));
  check('lastName', 'Add your last name', !!(profile.lastName?.trim()));
  check('age', 'Add your age', !!(profile.age && profile.age >= 18));
  check('gender', 'Add your gender', !!(profile.gender && profile.gender.length > 0));
  check('interestedInGenders', 'Select genders you want to match with', !!(profile.interestedInGenders && profile.interestedInGenders.length > 0));
  check('height', 'Add your height', !!(profile.height?.trim()));
  check('heightPreference', 'Set your height preference', !!(profile.preferences?.heightMin && profile.preferences?.heightMax));
  check('ethnicity', 'Add your ethnicity', !!(profile.ethnicity?.trim()));
  check('preferredEthnicities', 'Set ethnicity preferences', profile.preferredEthnicities !== undefined);
  check('religion', 'Add your religion', !!(profile.religion?.trim()));
  check('politicalLeaning', 'Add your political views', !!(profile.politicalLeaning));
  check('lifestyle', 'Add your lifestyle habits', !!(
    profile.drinkingFrequency && profile.cannabisFrequency &&
    profile.tobaccoFrequency && profile.otherDrugsFrequency
  ));
  check('commitment', 'Add what you\'re looking for', !!(profile.preferences?.lookingFor));
  check('interests', 'Add at least 3 interests', (profile.interests?.length || 0) >= 3);
  check('values', 'Add at least 3 values', (profile.values?.length || 0) >= 3);
  check('ageRange', 'Set your age range preference', !!(profile.preferences?.ageMin && profile.preferences?.ageMax));

  // Photos: proportional — 5 pts per photo, max 3 (15 pts total)
  const photoCount = Math.min(profile.photos?.length || 0, 3);
  const photoWeight = MANDATORY_FIELDS.photos;
  score += Math.round((photoCount / 3) * photoWeight);
  if (photoCount < 3) {
    missingFields.push({ field: 'photos', label: `Add ${3 - photoCount} more photo${photoCount === 2 ? '' : 's'} (${photoCount}/3)`, weight: photoWeight, category: 'essential' });
  }

  // Deep questions: proportional — 4 pts per displayed question, max 3 (12 pts total)
  const displayedCount = profile.displayedQuestions?.length || 0;
  const questionWeight = MANDATORY_FIELDS.deepQuestions;
  score += Math.round((Math.min(displayedCount, 3) / 3) * questionWeight);
  if (displayedCount < 3) {
    missingFields.push({ field: 'deepQuestions', label: `Answer ${3 - displayedCount} more question${displayedCount === 2 ? '' : 's'}`, weight: questionWeight, category: 'nice-to-have' });
  }

  const percentage = Math.round(score);
  const suggestions = generateSuggestions(percentage, missingFields);

  return {
    percentage,
    score,
    maxScore: 100,
    missingFields: missingFields.sort((a, b) => b.weight - a.weight),
    suggestions,
  };
};

/**
 * Generate helpful suggestions based on completeness
 */
const generateSuggestions = (
  percentage: number,
  missingFields: ProfileCompleteness['missingFields']
): string[] => {
  const suggestions: string[] = [];

  if (percentage < 30) {
    suggestions.push('Complete your basic information to get started');
  } else if (percentage < 60) {
    suggestions.push('Add more details to help matches get to know you');
  } else if (percentage < 90) {
    suggestions.push('You\'re almost there! Add a few more details');
  } else if (percentage < 100) {
    suggestions.push('Your profile looks great! Just a few finishing touches');
  } else {
    suggestions.push('Your profile is complete! You\'re in the matching pool');
  }

  const essentialMissing = missingFields.filter(f => f.category === 'essential').slice(0, 2);
  if (essentialMissing.length > 0) {
    suggestions.push(...essentialMissing.map(f => f.label));
  }

  return suggestions;
};

/**
 * Match Preferences Completion
 * Calculates completion for ONLY match preferences fields (separate 100% score)
 */
export interface MatchPreferencesCompleteness {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: string[];
}

/**
 * Edit Profile Completion (About Me fields only)
 * Excludes photos and match preferences which have their own screens
 */
export interface EditProfileCompleteness {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: string[];
}

/**
 * Calculate Edit Profile completion percentage
 * Counts mandatory "About Me" fields (9 fields).
 */
export const calculateEditProfileCompleteness = (
  profile: UserProfile | null
): EditProfileCompleteness => {
  if (!profile) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 9,
      missingFields: [],
    };
  }

  let completedCount = 0;
  const totalCount = 9;
  const missingFields: string[] = [];

  if (profile.firstName?.trim()) completedCount++; else missingFields.push('First Name');
  if (profile.lastName?.trim()) completedCount++; else missingFields.push('Last Name');
  if (profile.age && profile.age >= 18) completedCount++; else missingFields.push('Age');
  if (profile.height?.trim()) completedCount++; else missingFields.push('Height');
  if (profile.ethnicity?.trim()) completedCount++; else missingFields.push('Ethnicity');
  if (profile.gender && profile.gender.length > 0) completedCount++; else missingFields.push('Gender');
  if (profile.religion?.trim()) completedCount++; else missingFields.push('Religion');
  if (profile.politicalLeaning) completedCount++; else missingFields.push('Political Views');

  // Interests + Values combined as 1 field
  const interestCount = profile.interests?.length || 0;
  const valueCount = profile.values?.length || 0;
  if (interestCount >= 3 && valueCount >= 3) completedCount++; else missingFields.push('Interests & Values');

  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    percentage,
    completedCount,
    totalCount,
    missingFields,
  };
};

/**
 * Calculate Match Preferences completion percentage
 * 4 mandatory fields (collected in onboarding)
 */
export const calculateMatchPreferencesCompleteness = (
  profile: UserProfile | null
): MatchPreferencesCompleteness => {
  if (!profile) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 4,
      missingFields: ['Gender', 'Age Range', 'Height', 'Ethnicity'],
    };
  }

  let completedCount = 0;
  const missingFields: string[] = [];

  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) {
    completedCount++;
  } else {
    missingFields.push('Gender');
  }

  if (profile.preferences?.ageMin && profile.preferences?.ageMax) {
    completedCount++;
  } else {
    missingFields.push('Age Range');
  }

  if (profile.preferences?.heightMin && profile.preferences?.heightMax) {
    completedCount++;
  } else {
    missingFields.push('Height');
  }

  // Empty array = "No Preference" (valid)
  if (profile.preferredEthnicities !== undefined) {
    completedCount++;
  } else {
    missingFields.push('Ethnicity');
  }

  const percentage = Math.round((completedCount / 4) * 100);

  return {
    percentage,
    completedCount,
    totalCount: 4,
    missingFields,
  };
};

/**
 * Profile strength breakdown for detailed analysis
 * Used by ProfileStrengthDashboard to display section-by-section scores.
 * This is COSMETIC / MOTIVATIONAL — it does NOT gate the matching pool.
 */
export interface ProfileStrengthBreakdown {
  overall: number;
  sections: {
    aboutMe: {
      score: number;
      maxScore: number;
      percentage: number;
    };
    matchPreferences: {
      score: number;
      maxScore: number;
      percentage: number;
      completedCount: number;
      totalCount: number;
    };
    photos: {
      score: number;
      maxScore: number;
      percentage: number;
      count: number;
    };
    deepQuestions: {
      score: number;
      maxScore: number;
      percentage: number;
      displayedCount: number;
      answeredCount: number;
    };
  };
  totalScore: number;
  maxTotalScore: number;
}

/**
 * MASTER CALCULATION FUNCTION
 * Calculate comprehensive profile strength breakdown.
 * This is COSMETIC — profile_completed (set at end of onboarding) gates the pool.
 */
export const calculateProfileStrengthBreakdown = (
  profile: UserProfile | null
): ProfileStrengthBreakdown => {
  if (!profile) {
    return {
      overall: 0,
      sections: {
        aboutMe: { score: 0, maxScore: 50, percentage: 0 },
        matchPreferences: { score: 0, maxScore: 30, percentage: 0, completedCount: 0, totalCount: 4 },
        photos: { score: 0, maxScore: 15, percentage: 0, count: 0 },
        deepQuestions: { score: 0, maxScore: 12, percentage: 0, displayedCount: 0, answeredCount: 0 },
      },
      totalScore: 0,
      maxTotalScore: 100,
    };
  }

  // Use the main completeness calculation as the overall score
  const completeness = calculateProfileCompleteness(profile);
  const totalScore = Math.round(completeness.score);
  const finalPercentage = completeness.percentage;

  // 1. ABOUT ME SECTION (9 mandatory fields)
  const aboutCompletion = calculateEditProfileCompleteness(profile);
  const aboutMePercentage = aboutCompletion.percentage;
  const aboutMePoints = Math.round((aboutCompletion.completedCount / aboutCompletion.totalCount) * 50);

  // 2. MATCH PREFERENCES SECTION (4 mandatory fields)
  const matchPrefsCompletion = calculateMatchPreferencesCompleteness(profile);
  const preferencesPoints = Math.round((matchPrefsCompletion.percentage / 100) * 30);

  // 3. PHOTOS SECTION — 3 photos needed for 100%
  const photoCount = Math.min(profile.photos?.length || 0, 3);
  const photosPercentage = Math.round((photoCount / 3) * 100);
  const photosPoints = Math.round((photoCount / 3) * 15);

  // 4. DEEP QUESTIONS SECTION — 3 displayed questions needed for 100%
  const displayedCount = Math.min(profile.displayedQuestions?.length || 0, 3);
  const answeredCount = profile.deepQuestions?.length || 0;
  const questionsPercentage = Math.round((displayedCount / 3) * 100);
  const questionsPoints = Math.round((displayedCount / 3) * 12);

  return {
    overall: finalPercentage,
    sections: {
      aboutMe: {
        score: aboutMePoints,
        maxScore: 50,
        percentage: aboutMePercentage,
      },
      matchPreferences: {
        score: preferencesPoints,
        maxScore: 30,
        percentage: matchPrefsCompletion.percentage,
        completedCount: matchPrefsCompletion.completedCount,
        totalCount: matchPrefsCompletion.totalCount,
      },
      photos: {
        score: photosPoints,
        maxScore: 15,
        percentage: Math.min(photosPercentage, 100),
        count: photoCount,
      },
      deepQuestions: {
        score: questionsPoints,
        maxScore: 12,
        percentage: questionsPercentage,
        displayedCount,
        answeredCount,
      },
    },
    totalScore,
    maxTotalScore: 100,
  };
};

/**
 * Calculate overall profile strength (SIMPLIFIED WRAPPER)
 * Returns just the overall percentage for backwards compatibility
 * @deprecated Use calculateProfileStrengthBreakdown for detailed information
 */
export const calculateOverallProfileStrength = (profile: UserProfile | null): number => {
  return calculateProfileStrengthBreakdown(profile).overall;
};
