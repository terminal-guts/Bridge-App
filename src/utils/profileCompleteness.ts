/**
 * Profile Completeness Utilities
 *
 * Calculates profile completion percentage based on MANDATORY fields only.
 * Optional fields (photos, company, education, school, hometown) do NOT count toward completion.
 */

import { UserProfile } from '../types';

/**
 * Field weights for profile completeness calculation
 * Total = 100 points (only mandatory fields)
 */
const FIELD_WEIGHTS = {
  // Photos (10 points)
  photos: 10,     // at least 1 photo required

  // Basic Info (22 points)
  firstName: 3,
  lastName: 3,
  age: 2,
  height: 2,
  ethnicity: 3,
  location: 3,
  currentJob: 3,
  religion: 3,

  // Identity (10 points)
  pronouns: 5,
  gender: 5,

  // Lifestyle (15 points)
  politicalLeaning: 3,
  hasChildren: 3,
  familyPlans: 3,
  drinkingFrequency: 1.5,
  cannabisFrequency: 1.5,
  tobaccoFrequency: 1.5,
  otherDrugsFrequency: 1.5,

  // Personal (13 points)
  values: 6.5,    // at least 1 required
  interests: 6.5, // at least 1 required

  // Match Preferences (30 points)
  ageRange: 4,
  interestedInGenders: 5,
  heightPreference: 4,
  maxDistance: 4,
  partnerLifestylePreferences: 5,  // all 4 habits
  preferredEthnicities: 4,
  preferredPolitics: 4,
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
 * Calculate profile completeness percentage (MANDATORY FIELDS ONLY)
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

  // NOTE: Company, education, school, and hometown are OPTIONAL and NOT scored
  // Photos are now MANDATORY

  // Photos (10 points) - At least 1 photo required
  const photoCount = profile.photos?.length || 0;
  if (photoCount >= 1) {
    score += FIELD_WEIGHTS.photos;
  } else {
    missingFields.push({
      field: 'photos',
      label: 'Add at least one photo',
      weight: FIELD_WEIGHTS.photos,
      category: 'essential',
    });
  }

  // First Name (3 points)
  if (profile.firstName && profile.firstName.trim()) {
    score += FIELD_WEIGHTS.firstName;
  } else {
    missingFields.push({
      field: 'firstName',
      label: 'Add your first name',
      weight: FIELD_WEIGHTS.firstName,
      category: 'essential',
    });
  }

  // Last Name (3 points)
  if (profile.lastName && profile.lastName.trim()) {
    score += FIELD_WEIGHTS.lastName;
  } else {
    missingFields.push({
      field: 'lastName',
      label: 'Add your last name',
      weight: FIELD_WEIGHTS.lastName,
      category: 'essential',
    });
  }

  // Age (3 points)
  if (profile.age && profile.age >= 18) {
    score += FIELD_WEIGHTS.age;
  } else {
    missingFields.push({
      field: 'age',
      label: 'Add your age',
      weight: FIELD_WEIGHTS.age,
      category: 'essential',
    });
  }

  // Height (3 points)
  if (profile.height && profile.height.trim()) {
    score += FIELD_WEIGHTS.height;
  } else {
    missingFields.push({
      field: 'height',
      label: 'Add your height',
      weight: FIELD_WEIGHTS.height,
      category: 'essential',
    });
  }

  // Ethnicity (3 points)
  if (profile.ethnicity && profile.ethnicity.trim()) {
    score += FIELD_WEIGHTS.ethnicity;
  } else {
    missingFields.push({
      field: 'ethnicity',
      label: 'Add your ethnicity',
      weight: FIELD_WEIGHTS.ethnicity,
      category: 'essential',
    });
  }

  // Location (3 points)
  if (profile.location && profile.location.trim()) {
    score += FIELD_WEIGHTS.location;
  } else {
    missingFields.push({
      field: 'location',
      label: 'Add your location',
      weight: FIELD_WEIGHTS.location,
      category: 'essential',
    });
  }

  // Occupation (4 points)
  if (profile.currentJob && profile.currentJob.trim()) {
    score += FIELD_WEIGHTS.currentJob;
  } else {
    missingFields.push({
      field: 'currentJob',
      label: 'Add your occupation',
      weight: FIELD_WEIGHTS.currentJob,
      category: 'essential',
    });
  }

  // Religion (3 points)
  if (profile.religion && profile.religion.trim()) {
    score += FIELD_WEIGHTS.religion;
  } else {
    missingFields.push({
      field: 'religion',
      label: 'Add your religion',
      weight: FIELD_WEIGHTS.religion,
      category: 'essential',
    });
  }

  // Pronouns (5 points)
  if (profile.pronounsList && profile.pronounsList.length > 0) {
    score += FIELD_WEIGHTS.pronouns;
  } else if (profile.pronouns && profile.pronouns !== 'prefer_not_to_say') {
    // Fallback to old field for backwards compatibility
    score += FIELD_WEIGHTS.pronouns;
  } else {
    missingFields.push({
      field: 'pronounsList',
      label: 'Add your pronouns',
      weight: FIELD_WEIGHTS.pronouns,
      category: 'important',
    });
  }

  // Gender (5 points)
  if (profile.gender && profile.gender.length > 0) {
    score += FIELD_WEIGHTS.gender;
  } else {
    missingFields.push({
      field: 'gender',
      label: 'Add your gender',
      weight: FIELD_WEIGHTS.gender,
      category: 'important',
    });
  }

  // Political Leaning (3 points)
  if (profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say') {
    score += FIELD_WEIGHTS.politicalLeaning;
  } else {
    missingFields.push({
      field: 'politicalLeaning',
      label: 'Add your political views',
      weight: FIELD_WEIGHTS.politicalLeaning,
      category: 'important',
    });
  }

  // Has Children (3 points)
  if (profile.hasChildren !== undefined && profile.hasChildren !== null) {
    score += FIELD_WEIGHTS.hasChildren;
  } else {
    missingFields.push({
      field: 'hasChildren',
      label: 'Answer if you have children',
      weight: FIELD_WEIGHTS.hasChildren,
      category: 'important',
    });
  }

  // Family Plans (3 points)
  if (profile.familyPlans && profile.familyPlans.trim()) {
    score += FIELD_WEIGHTS.familyPlans;
  } else {
    missingFields.push({
      field: 'familyPlans',
      label: 'Add your family plans',
      weight: FIELD_WEIGHTS.familyPlans,
      category: 'important',
    });
  }

  // Drinking Frequency (1.5 points)
  if (profile.drinkingFrequency && profile.drinkingFrequency.trim()) {
    score += FIELD_WEIGHTS.drinkingFrequency;
  } else {
    missingFields.push({
      field: 'drinkingFrequency',
      label: 'Add your drinking habits',
      weight: FIELD_WEIGHTS.drinkingFrequency,
      category: 'important',
    });
  }

  // Cannabis Frequency (1.5 points)
  if (profile.cannabisFrequency && profile.cannabisFrequency.trim()) {
    score += FIELD_WEIGHTS.cannabisFrequency;
  } else {
    missingFields.push({
      field: 'cannabisFrequency',
      label: 'Add your cannabis habits',
      weight: FIELD_WEIGHTS.cannabisFrequency,
      category: 'important',
    });
  }

  // Tobacco Frequency (1.5 points)
  if (profile.tobaccoFrequency && profile.tobaccoFrequency.trim()) {
    score += FIELD_WEIGHTS.tobaccoFrequency;
  } else {
    missingFields.push({
      field: 'tobaccoFrequency',
      label: 'Add your tobacco/vaping habits',
      weight: FIELD_WEIGHTS.tobaccoFrequency,
      category: 'important',
    });
  }

  // Other Drugs Frequency (1.5 points)
  if (profile.otherDrugsFrequency && profile.otherDrugsFrequency.trim()) {
    score += FIELD_WEIGHTS.otherDrugsFrequency;
  } else {
    missingFields.push({
      field: 'otherDrugsFrequency',
      label: 'Add your other substances habits',
      weight: FIELD_WEIGHTS.otherDrugsFrequency,
      category: 'important',
    });
  }

  // Values (7 points) - At least 1 required
  const valueCount = profile.values?.length || 0;
  if (valueCount >= 1) {
    score += FIELD_WEIGHTS.values;
  } else {
    missingFields.push({
      field: 'values',
      label: 'Add at least one value',
      weight: FIELD_WEIGHTS.values,
      category: 'important',
    });
  }

  // Interests (7 points) - At least 1 required
  const interestCount = profile.interests?.length || 0;
  if (interestCount >= 1) {
    score += FIELD_WEIGHTS.interests;
  } else {
    missingFields.push({
      field: 'interests',
      label: 'Add at least one interest',
      weight: FIELD_WEIGHTS.interests,
      category: 'important',
    });
  }

  // Age Range (6 points)
  if (profile.preferences?.ageMin && profile.preferences?.ageMax) {
    score += FIELD_WEIGHTS.ageRange;
  } else {
    missingFields.push({
      field: 'ageRange',
      label: 'Set your age range preference',
      weight: FIELD_WEIGHTS.ageRange,
      category: 'important',
    });
  }

  // Interested In Genders (6 points)
  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) {
    score += FIELD_WEIGHTS.interestedInGenders;
  } else {
    missingFields.push({
      field: 'interestedInGenders',
      label: 'Select genders you want to match with',
      weight: FIELD_WEIGHTS.interestedInGenders,
      category: 'important',
    });
  }

  // Height Preference (6 points)
  if (profile.preferences?.heightMin && profile.preferences?.heightMax) {
    score += FIELD_WEIGHTS.heightPreference;
  } else {
    missingFields.push({
      field: 'heightPreference',
      label: 'Set your height preference',
      weight: FIELD_WEIGHTS.heightPreference,
      category: 'important',
    });
  }

  // Max Distance (6 points)
  if (profile.preferences?.maxDistance !== undefined) {
    score += FIELD_WEIGHTS.maxDistance;
  } else {
    missingFields.push({
      field: 'maxDistance',
      label: 'Set your dating distance',
      weight: FIELD_WEIGHTS.maxDistance,
      category: 'important',
    });
  }

  // Partner Lifestyle Preferences (6 points) - All 4 habits required
  if (
    profile.partnerLifestylePreferences?.drinking &&
    profile.partnerLifestylePreferences?.cannabis &&
    profile.partnerLifestylePreferences?.tobacco &&
    profile.partnerLifestylePreferences?.otherDrugs
  ) {
    score += FIELD_WEIGHTS.partnerLifestylePreferences;
  } else {
    missingFields.push({
      field: 'partnerLifestylePreferences',
      label: 'Set partner lifestyle preferences',
      weight: FIELD_WEIGHTS.partnerLifestylePreferences,
      category: 'important',
    });
  }

  // Preferred Ethnicities (4 points)
  if (profile.preferredEthnicities && profile.preferredEthnicities.length > 0) {
    score += FIELD_WEIGHTS.preferredEthnicities;
  } else {
    missingFields.push({
      field: 'preferredEthnicities',
      label: 'Select preferred ethnicities',
      weight: FIELD_WEIGHTS.preferredEthnicities,
      category: 'important',
    });
  }

  // Preferred Politics (4 points)
  if (profile.preferredPolitics && profile.preferredPolitics.length > 0) {
    score += FIELD_WEIGHTS.preferredPolitics;
  } else {
    missingFields.push({
      field: 'preferredPolitics',
      label: 'Select preferred political views',
      weight: FIELD_WEIGHTS.preferredPolitics,
      category: 'important',
    });
  }

  // Calculate percentage
  const percentage = Math.round(score);

  // Generate suggestions
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
 * Matches the "About Me" calculation from Profile Strength Dashboard
 * All fields equally weighted (1 point each)
 * Excludes: Photos, Match Preferences, Deep Questions
 */
export const calculateEditProfileCompleteness = (
  profile: UserProfile | null
): EditProfileCompleteness => {
  if (!profile) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 19,
      missingFields: [],
    };
  }

  let completedCount = 0;
  const totalCount = 19; // Total mandatory fields in "About Me" section
  const missingFields: string[] = [];

  // Basic Demographics (11 fields)
  if (profile.firstName?.trim()) completedCount++; else missingFields.push('First Name');
  if (profile.lastName?.trim()) completedCount++; else missingFields.push('Last Name');
  if (profile.age && profile.age >= 18) completedCount++; else missingFields.push('Age');
  if (profile.height?.trim()) completedCount++; else missingFields.push('Height');
  if (profile.ethnicity?.trim()) completedCount++; else missingFields.push('Ethnicity');
  if (profile.location?.trim()) completedCount++; else missingFields.push('Location');
  if (profile.currentJob?.trim()) completedCount++; else missingFields.push('Occupation');

  // Identity (3 fields)
  if ((profile.pronounsList && profile.pronounsList.length > 0) ||
      (profile.pronouns && profile.pronouns !== 'prefer_not_to_say')) {
    completedCount++;
  } else {
    missingFields.push('Pronouns');
  }
  if (profile.gender && profile.gender.length > 0) completedCount++; else missingFields.push('Gender');
  if (profile.religion?.trim()) completedCount++; else missingFields.push('Religion');
  if (profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say') {
    completedCount++;
  } else {
    missingFields.push('Political Leaning');
  }

  // Family (2 fields)
  if (profile.hasChildren !== undefined && profile.hasChildren !== null) completedCount++; else missingFields.push('Children Status');
  if (profile.familyPlans?.trim()) completedCount++; else missingFields.push('Family Plans');

  // Lifestyle/Substances (4 fields - each counts separately)
  if (profile.drinkingFrequency?.trim()) completedCount++; else missingFields.push('Drinking');
  if (profile.cannabisFrequency?.trim()) completedCount++; else missingFields.push('Cannabis');
  if (profile.tobaccoFrequency?.trim()) completedCount++; else missingFields.push('Tobacco/Vaping');
  if (profile.otherDrugsFrequency?.trim()) completedCount++; else missingFields.push('Other Drugs');

  // Personal (2 fields - require 3+ each)
  const interestCount = profile.interests?.length || 0;
  const valueCount = profile.values?.length || 0;

  if (interestCount >= 3) completedCount++; else missingFields.push(`Interests (${interestCount}/3)`);
  if (valueCount >= 3) completedCount++; else missingFields.push(`Values (${valueCount}/3)`);

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
 * Only considers the 8 mandatory match preference fields
 */
export const calculateMatchPreferencesCompleteness = (
  profile: UserProfile | null
): MatchPreferencesCompleteness => {
  if (!profile) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 8,
      missingFields: [
        "I'm Looking For",
        'Gender',
        'Age Range',
        'Height',
        'Dating Distance',
        'Ethnicity',
        'Politics',
        'Lifestyle',
      ],
    };
  }

  let completedCount = 0;
  const missingFields: string[] = [];

  // 1. I'm Looking For (relationship type)
  if (profile.preferences?.lookingFor && profile.preferences.lookingFor.trim()) {
    completedCount++;
  } else {
    missingFields.push("I'm Looking For");
  }

  // 2. Gender (interestedInGenders)
  if (profile.interestedInGenders && profile.interestedInGenders.length > 0) {
    completedCount++;
  } else {
    missingFields.push('Gender');
  }

  // 3. Age Range
  if (profile.preferences?.ageMin && profile.preferences?.ageMax) {
    completedCount++;
  } else {
    missingFields.push('Age Range');
  }

  // 4. Height Preference
  if (profile.preferences?.heightMin && profile.preferences?.heightMax) {
    completedCount++;
  } else {
    missingFields.push('Height');
  }

  // 5. Dating Distance
  if (profile.preferences?.maxDistance !== undefined) {
    completedCount++;
  } else {
    missingFields.push('Dating Distance');
  }

  // 6. Preferred Ethnicities
  if (profile.preferredEthnicities && profile.preferredEthnicities.length > 0) {
    completedCount++;
  } else {
    missingFields.push('Ethnicity');
  }

  // 7. Preferred Politics
  if (profile.preferredPolitics && profile.preferredPolitics.length > 0) {
    completedCount++;
  } else {
    missingFields.push('Politics');
  }

  // 8. Partner Lifestyle Preferences (all 4 required - arrays must have at least one selection each)
  const drinkingValid = Array.isArray(profile.partnerLifestylePreferences?.drinking)
    ? profile.partnerLifestylePreferences.drinking.length > 0
    : (profile.partnerLifestylePreferences?.drinking && profile.partnerLifestylePreferences.drinking.trim() !== '');

  const cannabisValid = Array.isArray(profile.partnerLifestylePreferences?.cannabis)
    ? profile.partnerLifestylePreferences.cannabis.length > 0
    : (profile.partnerLifestylePreferences?.cannabis && profile.partnerLifestylePreferences.cannabis.trim() !== '');

  const tobaccoValid = Array.isArray(profile.partnerLifestylePreferences?.tobacco)
    ? profile.partnerLifestylePreferences.tobacco.length > 0
    : (profile.partnerLifestylePreferences?.tobacco && profile.partnerLifestylePreferences.tobacco.trim() !== '');

  const otherDrugsValid = Array.isArray(profile.partnerLifestylePreferences?.otherDrugs)
    ? profile.partnerLifestylePreferences.otherDrugs.length > 0
    : (profile.partnerLifestylePreferences?.otherDrugs && profile.partnerLifestylePreferences.otherDrugs.trim() !== '');

  const hasAllLifestylePrefs = drinkingValid && cannabisValid && tobaccoValid && otherDrugsValid;

  if (hasAllLifestylePrefs) {
    completedCount++;
  } else {
    missingFields.push('Lifestyle');
  }

  const percentage = Math.round((completedCount / 8) * 100);

  return {
    percentage,
    completedCount,
    totalCount: 8,
    missingFields,
  };
};
