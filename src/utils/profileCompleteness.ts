/**
 * Profile Completeness Utilities
 *
 * Calculates profile completion percentage based on MANDATORY fields only.
 * Optional fields (photos, company, education, school, hometown, location) do NOT count toward completion.
 */

import { UserProfile } from '../types';

/**
 * Field weights for profile completeness calculation
 * Total = 100 points — only 8 MANDATORY fields (12.5 each)
 * Everything else is optional and available in profile edit.
 */
const FIELD_WEIGHTS = {
  name: 12.5,              // firstName + lastName
  age: 12.5,
  gender: 12.5,
  photos: 12.5,            // at least 1 photo
  interestedInGenders: 12.5,
  interests: 12.5,         // 3+ required
  values: 12.5,            // 3+ required
  ageRange: 12.5,          // age preference
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
 * Calculate profile completeness percentage (8 MANDATORY FIELDS ONLY)
 * All other fields are optional and available in profile edit.
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

  // 1. Name (12.5 points) — firstName + lastName both required
  if (profile.firstName?.trim() && profile.lastName?.trim()) {
    score += FIELD_WEIGHTS.name;
  } else {
    missingFields.push({ field: 'name', label: 'Add your name', weight: FIELD_WEIGHTS.name, category: 'essential' });
  }

  // 2. Age (12.5 points)
  if (profile.age && profile.age >= 18) {
    score += FIELD_WEIGHTS.age;
  } else {
    missingFields.push({ field: 'age', label: 'Add your age', weight: FIELD_WEIGHTS.age, category: 'essential' });
  }

  // 3. Gender (12.5 points)
  if (profile.gender && profile.gender.length > 0) {
    score += FIELD_WEIGHTS.gender;
  } else {
    missingFields.push({ field: 'gender', label: 'Add your gender', weight: FIELD_WEIGHTS.gender, category: 'essential' });
  }

  // 4. Photos (12.5 points) — at least 1
  const photoCount = profile.photos?.length || 0;
  if (photoCount >= 1) {
    score += FIELD_WEIGHTS.photos;
  } else {
    missingFields.push({ field: 'photos', label: 'Add at least 1 photo', weight: FIELD_WEIGHTS.photos, category: 'essential' });
  }

  // 5. Interested-in genders (12.5 points)
  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) {
    score += FIELD_WEIGHTS.interestedInGenders;
  } else {
    missingFields.push({ field: 'interestedInGenders', label: 'Select who you want to match with', weight: FIELD_WEIGHTS.interestedInGenders, category: 'essential' });
  }

  // 6. Interests (12.5 points) — 3+ required
  const interestCount = profile.interests?.length || 0;
  if (interestCount >= 3) {
    score += FIELD_WEIGHTS.interests;
  } else {
    missingFields.push({ field: 'interests', label: `Add interests (${interestCount}/3)`, weight: FIELD_WEIGHTS.interests, category: 'essential' });
  }

  // 7. Values (12.5 points) — 3+ required
  const valueCount = profile.values?.length || 0;
  if (valueCount >= 3) {
    score += FIELD_WEIGHTS.values;
  } else {
    missingFields.push({ field: 'values', label: `Add values (${valueCount}/3)`, weight: FIELD_WEIGHTS.values, category: 'essential' });
  }

  // 8. Age range preference (12.5 points)
  if (profile.preferences?.ageMin && profile.preferences?.ageMax) {
    score += FIELD_WEIGHTS.ageRange;
  } else {
    missingFields.push({ field: 'ageRange', label: 'Set your age range preference', weight: FIELD_WEIGHTS.ageRange, category: 'essential' });
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
 * Only counts the 8 mandatory fields — everything else is optional.
 */
export const calculateEditProfileCompleteness = (
  profile: UserProfile | null
): EditProfileCompleteness => {
  if (!profile) {
    return { percentage: 0, completedCount: 0, totalCount: 8, missingFields: [] };
  }

  let completedCount = 0;
  const totalCount = 8;
  const missingFields: string[] = [];

  if (profile.firstName?.trim() && profile.lastName?.trim()) completedCount++; else missingFields.push('Name');
  if (profile.age && profile.age >= 18) completedCount++; else missingFields.push('Age');
  if (profile.gender && profile.gender.length > 0) completedCount++; else missingFields.push('Gender');
  if ((profile.photos?.length || 0) >= 1) completedCount++; else missingFields.push('Photo');
  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) completedCount++; else missingFields.push('Interested In');
  if ((profile.interests?.length || 0) >= 3) completedCount++; else missingFields.push(`Interests (${profile.interests?.length || 0}/3)`);
  if ((profile.values?.length || 0) >= 3) completedCount++; else missingFields.push(`Values (${profile.values?.length || 0}/3)`);
  if (profile.preferences?.ageMin && profile.preferences?.ageMax) completedCount++; else missingFields.push('Age Range Preference');

  return {
    percentage: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
    missingFields,
  };
};

/**
 * Calculate Match Preferences completion percentage
 * Only 2 mandatory preference fields: interestedInGenders + ageRange
 * Everything else (height, ethnicity, religion, politics, lifestyle prefs) is optional.
 */
export const calculateMatchPreferencesCompleteness = (
  profile: UserProfile | null
): MatchPreferencesCompleteness => {
  if (!profile) {
    return { percentage: 0, completedCount: 0, totalCount: 2, missingFields: ['Gender', 'Age Range'] };
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

  return {
    percentage: Math.round((completedCount / 2) * 100),
    completedCount,
    totalCount: 2,
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
 *
 * Only 8 mandatory fields — each worth 12.5 points.
 * Sections are kept for UI compatibility but simplified.
 */
export const calculateProfileStrengthBreakdown = (
  profile: UserProfile | null
): ProfileStrengthBreakdown => {
  if (!profile) {
    return {
      overall: 0,
      sections: {
        aboutMe: { score: 0, maxScore: 50, percentage: 0 },
        matchPreferences: { score: 0, maxScore: 25, percentage: 0, completedCount: 0, totalCount: 2 },
        photos: { score: 0, maxScore: 12, percentage: 0, count: 0 },
        deepQuestions: { score: 0, maxScore: 13, percentage: 0, displayedCount: 0, answeredCount: 0 },
      },
      totalScore: 0,
      maxTotalScore: 100,
    };
  }

  // ── About Me section: name, age, gender, interests, values (5 of 8 fields) ──
  let aboutCount = 0;
  const aboutTotal = 5;
  if (profile.firstName?.trim() && profile.lastName?.trim()) aboutCount++;
  if (profile.age && profile.age >= 18) aboutCount++;
  if (profile.gender && profile.gender.length > 0) aboutCount++;
  if ((profile.interests?.length || 0) >= 3) aboutCount++;
  if ((profile.values?.length || 0) >= 3) aboutCount++;
  const aboutMePercentage = Math.round((aboutCount / aboutTotal) * 100);
  const aboutMePoints = Math.round((aboutCount / aboutTotal) * 50);

  // ── Match Preferences section: interestedInGenders, ageRange (2 of 8 fields) ──
  let prefsCount = 0;
  const prefsTotal = 2;
  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) prefsCount++;
  if (profile.preferences?.ageMin && profile.preferences?.ageMax) prefsCount++;
  const prefsPercentage = Math.round((prefsCount / prefsTotal) * 100);
  const prefsPoints = Math.round((prefsCount / prefsTotal) * 25);

  // ── Photos section: 1+ photo (1 of 8 fields) ──
  const photoCount = profile.photos?.length || 0;
  const photosPoints = photoCount >= 1 ? 12 : 0;
  const photosPercentage = photoCount >= 1 ? 100 : 0;

  // ── Deep Questions: optional (not required for 100%) ──
  const displayedCount = profile.displayedQuestions?.length || 0;
  const answeredCount = profile.deepQuestions?.length || 0;
  const questionsPoints = displayedCount >= 3 ? 13 : Math.round((displayedCount / 3) * 13);
  const questionsPercentage = displayedCount >= 3 ? 100 : Math.round((displayedCount / 3) * 100);

  // ── Total: 8 fields = 100 points ──
  // aboutMe (5 fields × 12.5 = 62.5, mapped to 50pts) + prefs (2 × 12.5 = 25pts) + photo (12.5pts mapped to 12pts) + questions (bonus)
  // Simplified: use the 8-field calculateProfileCompleteness for the real gate number
  const completion = calculateProfileCompleteness(profile);

  return {
    overall: completion.percentage,
    sections: {
      aboutMe: { score: aboutMePoints, maxScore: 50, percentage: aboutMePercentage },
      matchPreferences: { score: prefsPoints, maxScore: 25, percentage: prefsPercentage, completedCount: prefsCount, totalCount: prefsTotal },
      photos: { score: photosPoints, maxScore: 12, percentage: photosPercentage, count: photoCount },
      deepQuestions: { score: questionsPoints, maxScore: 13, percentage: questionsPercentage, displayedCount, answeredCount },
    },
    totalScore: completion.score,
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
