/**
 * Profile Completeness Utilities
 *
 * Calculates profile completion percentage using DYNAMIC WEIGHTING.
 * Mandatory fields (collected during onboarding) always total 100 points.
 * Optional bonus fields (religion, politics) redistribute weight when filled —
 * they don't add above 100, they change the composition of the 100.
 *
 * Cosmetic fields (pronouns, lifestyle, children, occupation, etc.) have 0 weight
 * and never affect pool entry or matching.
 */

import { UserProfile } from '../types';

/**
 * BASE mandatory field weights (when no optional bonus fields are filled)
 * Total = 100 points
 */
const BASE_MANDATORY_WEIGHTS = {
  photos: 10,              // at least 1 photo required
  firstName: 5,
  lastName: 5,
  age: 5,
  gender: 10,
  interestedInGenders: 10,
  height: 5,
  heightPreference: 5,
  ethnicity: 5,
  preferredEthnicities: 5,
  interests: 15,           // at least 3 required
  values: 15,              // at least 3 required
  ageRange: 5,
};
// Total: 100

/**
 * Optional bonus fields — when filled, they take weight FROM mandatory fields
 * (proportional reduction so total stays 100)
 */
const OPTIONAL_BONUS_WEIGHTS = {
  religion: 9,
  politicalLeaning: 7,
};
// Max bonus: 16 points redistributed from mandatory fields

/**
 * Compute dynamic weights based on which optional bonus fields are filled
 */
const computeDynamicWeights = (profile: UserProfile) => {
  const hasReligion = !!(profile.religion && profile.religion.trim());
  const hasPolitics = !!(profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say');

  // Calculate how much weight optional fields claim
  let bonusTotal = 0;
  if (hasReligion) bonusTotal += OPTIONAL_BONUS_WEIGHTS.religion;
  if (hasPolitics) bonusTotal += OPTIONAL_BONUS_WEIGHTS.politicalLeaning;

  // Reduce mandatory weights proportionally to make room
  const mandatoryScale = bonusTotal > 0 ? (100 - bonusTotal) / 100 : 1;

  const weights: Record<string, number> = {};
  for (const [key, value] of Object.entries(BASE_MANDATORY_WEIGHTS)) {
    weights[key] = value * mandatoryScale;
  }

  // Add bonus fields with their full weight (only when filled)
  if (hasReligion) weights.religion = OPTIONAL_BONUS_WEIGHTS.religion;
  if (hasPolitics) weights.politicalLeaning = OPTIONAL_BONUS_WEIGHTS.politicalLeaning;

  return weights;
};

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
 * Calculate profile completeness percentage using DYNAMIC WEIGHTING.
 * Mandatory fields always total 100. Optional bonus fields (religion, politics)
 * redistribute weight when filled — they don't add above 100.
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

  const weights = computeDynamicWeights(profile);
  let score = 0;
  const missingFields: ProfileCompleteness['missingFields'] = [];

  // Helper to check and score a field
  const check = (field: string, label: string, filled: boolean, category: ProfileCompleteness['missingFields'][0]['category'] = 'essential') => {
    const w = weights[field];
    if (!w) return; // field not in current weight set
    if (filled) {
      score += w;
    } else {
      missingFields.push({ field, label, weight: w, category });
    }
  };

  // ── Mandatory fields ──
  const photoCount = profile.photos?.length || 0;
  check('photos', `Add at least 1 photo (${photoCount}/1)`, photoCount >= 1);
  check('firstName', 'Add your first name', !!(profile.firstName?.trim()));
  check('lastName', 'Add your last name', !!(profile.lastName?.trim()));
  check('age', 'Add your age', !!(profile.age && profile.age >= 18));
  check('gender', 'Add your gender', !!(profile.gender && profile.gender.length > 0));
  check('interestedInGenders', 'Select genders you want to match with', !!(profile.interestedInGenders && profile.interestedInGenders.length > 0));
  check('height', 'Add your height', !!(profile.height?.trim()));
  check('heightPreference', 'Set your height preference', !!(profile.preferences?.heightMin && profile.preferences?.heightMax));
  check('ethnicity', 'Add your ethnicity', !!(profile.ethnicity?.trim()));
  check('preferredEthnicities', 'Select preferred ethnicities', !!(profile.preferredEthnicities && profile.preferredEthnicities.length > 0));
  check('interests', 'Add at least 3 interests', (profile.interests?.length || 0) >= 1);
  check('values', 'Add at least 3 values', (profile.values?.length || 0) >= 1);
  check('ageRange', 'Set your age range preference', !!(profile.preferences?.ageMin && profile.preferences?.ageMax));

  // ── Optional bonus fields (only scored when filled — weight already 0 if not filled) ──
  check('religion', 'Add your religion (improves match quality)', !!(profile.religion?.trim()), 'nice-to-have');
  check('politicalLeaning', 'Add your political views (improves match quality)', !!(profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say'), 'nice-to-have');

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
    suggestions.push('Your profile is complete! You can now enter the dating pool');
  }

  // Add specific suggestions for essential missing fields
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
 * Only counts MANDATORY "About Me" fields (7 fields).
 * Optional fields (pronouns, occupation, religion, politics, lifestyle, family) don't block completion.
 */
export const calculateEditProfileCompleteness = (
  profile: UserProfile | null
): EditProfileCompleteness => {
  if (!profile) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 7,
      missingFields: [],
    };
  }

  let completedCount = 0;
  const totalCount = 7; // Mandatory "About Me" fields only
  const missingFields: string[] = [];

  // Mandatory About Me fields (7)
  if (profile.firstName?.trim()) completedCount++; else missingFields.push('First Name');
  if (profile.lastName?.trim()) completedCount++; else missingFields.push('Last Name');
  if (profile.age && profile.age >= 18) completedCount++; else missingFields.push('Age');
  if (profile.height?.trim()) completedCount++; else missingFields.push('Height');
  if (profile.ethnicity?.trim()) completedCount++; else missingFields.push('Ethnicity');
  if (profile.gender && profile.gender.length > 0) completedCount++; else missingFields.push('Gender');

  // Interests + Values combined as 1 field (both must have 1+)
  const interestCount = profile.interests?.length || 0;
  const valueCount = profile.values?.length || 0;
  if (interestCount >= 1 && valueCount >= 1) completedCount++; else missingFields.push('Interests & Values');

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
 * 4 mandatory fields (collected in onboarding) + 3 optional fields
 * Only mandatory fields count toward profile completion gate
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

  // 1. Gender (interestedInGenders) — mandatory
  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) {
    completedCount++;
  } else {
    missingFields.push('Gender');
  }

  // 2. Age Range — mandatory
  if (profile.preferences?.ageMin && profile.preferences?.ageMax) {
    completedCount++;
  } else {
    missingFields.push('Age Range');
  }

  // 3. Height Preference — mandatory
  if (profile.preferences?.heightMin && profile.preferences?.heightMax) {
    completedCount++;
  } else {
    missingFields.push('Height');
  }

  // 4. Preferred Ethnicities — mandatory
  if (profile.preferredEthnicities && profile.preferredEthnicities.length > 0) {
    completedCount++;
  } else {
    missingFields.push('Ethnicity');
  }

  // Optional fields (not counted toward completion):
  // - Preferred Religions, Preferred Politics, Partner Lifestyle Preferences

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
 * Used by ProfileStrengthDashboard to display section-by-section scores
 */
export interface ProfileStrengthBreakdown {
  overall: number; // Overall percentage (0-100)
  sections: {
    aboutMe: {
      score: number; // Current score
      maxScore: number; // Maximum possible score (60)
      percentage: number; // Percentage for this section (0-100)
    };
    matchPreferences: {
      score: number; // Current score
      maxScore: number; // Maximum possible score (25)
      percentage: number; // Percentage for this section (0-100)
      completedCount: number; // Number of completed fields
      totalCount: number; // Total required fields (7)
    };
    photos: {
      score: number; // Current score
      maxScore: number; // Maximum possible score (5)
      percentage: number; // Percentage for this section (0-100)
      count: number; // Number of photos uploaded
    };
    deepQuestions: {
      score: number; // Current score
      maxScore: number; // Maximum possible score (10)
      percentage: number; // Percentage for this section (0-100)
      displayedCount: number; // Number of displayed questions
      answeredCount: number; // Number of answered questions
    };
  };
  totalScore: number; // Total score across all sections
  maxTotalScore: number; // Maximum possible total score (100)
}

/**
 * MASTER CALCULATION FUNCTION
 * Calculate comprehensive profile strength breakdown
 * This is the SINGLE SOURCE OF TRUTH for all profile strength calculations
 * Used by: ProfileStrengthDashboard, ProfileCompletionBanner, all screens
 */
export const calculateProfileStrengthBreakdown = (
  profile: UserProfile | null
): ProfileStrengthBreakdown => {
  if (!profile) {
    return {
      overall: 0,
      sections: {
        aboutMe: { score: 0, maxScore: 60, percentage: 0 },
        matchPreferences: { score: 0, maxScore: 25, percentage: 0, completedCount: 0, totalCount: 7 },
        photos: { score: 0, maxScore: 5, percentage: 0, count: 0 },
        deepQuestions: { score: 0, maxScore: 10, percentage: 0, displayedCount: 0, answeredCount: 0 },
      },
      totalScore: 0,
      maxTotalScore: 100,
    };
  }

  // 1. ABOUT ME SECTION (max 7 mandatory fields — optional fields don't count)
  let aboutScore = 0;
  const aboutTotal = 7;

  if (profile.firstName?.trim()) aboutScore += 1;
  if (profile.lastName?.trim()) aboutScore += 1;
  if (profile.age) aboutScore += 1;
  if (profile.height) aboutScore += 1;
  if (profile.ethnicity) aboutScore += 1;
  if (profile.gender && profile.gender.length > 0) aboutScore += 1;

  // Interests + Values combined as 1 field
  const interestCount = profile.interests?.length || 0;
  const valueCount = profile.values?.length || 0;
  if (interestCount >= 1 && valueCount >= 1) aboutScore += 1;

  const aboutMePercentage = Math.round((aboutScore / aboutTotal) * 100);

  // 2. MATCH PREFERENCES SECTION (4 mandatory fields)
  const matchPrefsCompletion = calculateMatchPreferencesCompleteness(profile);
  const preferencesScore = Math.round((matchPrefsCompletion.percentage / 100) * 25);

  // 3. PHOTOS SECTION - 1 photo = 100%
  const photoCount = profile.photos?.length || 0;
  const photosPercentage = photoCount >= 1 ? 100 : 0;

  // 4. DEEP QUESTIONS SECTION (optional bonus — not required for pool entry)
  const displayedCount = profile.displayedQuestions?.length || 0;
  const answeredCount = profile.deepQuestions?.length || 0;
  const questionsPercentage = displayedCount >= 3 ? 100 : Math.round((displayedCount / 3) * 100);

  // TOTAL CALCULATION — uses dynamic weighting from calculateProfileCompleteness
  const completeness = calculateProfileCompleteness(profile);
  const totalScore = Math.round(completeness.score);
  const maxTotal = 100;
  const finalPercentage = completeness.percentage;

  // Section points for dashboard display
  const aboutMePoints = Math.round((aboutScore / aboutTotal) * 50);
  const preferencesPoints = Math.round((matchPrefsCompletion.percentage / 100) * 30);
  const photosPoints = photoCount >= 1 ? 10 : 0;
  const questionsPoints = displayedCount >= 3 ? 10 : Math.round((displayedCount / 3) * 10);

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
        maxScore: 10,
        percentage: Math.min(photosPercentage, 100),
        count: photoCount,
      },
      deepQuestions: {
        score: questionsPoints,
        maxScore: 10,
        percentage: questionsPercentage,
        displayedCount,
        answeredCount,
      },
    },
    totalScore,
    maxTotalScore: maxTotal,
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
