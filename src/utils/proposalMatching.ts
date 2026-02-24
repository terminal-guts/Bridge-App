/**
 * Proposal Matching Logic
 *
 * Utility functions for calculating compatibility between two users
 * in the ProposalReviewView component.
 *
 * Core principle: Preference-based matching (not equality-based)
 * - Check if Person A's profile meets Person B's preferences
 * - Check if Person B's profile meets Person A's preferences
 * - Exception: Values and Interests use overlap-based matching
 */

import { UserProfile } from '../types';

/**
 * Match status for a single attribute
 */
export type MatchStatus = 'both_happy' | 'left_happy' | 'right_happy' | 'neither_happy' | 'unknown';

/**
 * Match result with status and optional details
 */
export interface MatchResult {
  status: MatchStatus;
  leftValue: string;
  rightValue: string;
  details?: string;
}

/**
 * Section compatibility summary
 */
export interface SectionCompatibility {
  compatible: number;
  total: number;
  percentage: number;
  status: 'high' | 'medium' | 'low'; // high: >=66%, medium: 33-66%, low: <33%
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two lat/long coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format height from string to inches
 */
export function heightToInches(height: string): number | null {
  if (!height) return null;

  // Handle format like "5'10"" or "5'10\""
  const match = height.match(/(\d+)'(\d+)/);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = parseInt(match[2], 10);
    return feet * 12 + inches;
  }

  // Handle numeric string (already in inches)
  const numeric = parseInt(height, 10);
  if (!isNaN(numeric)) {
    return numeric;
  }

  return null;
}

/**
 * Format inches to height string
 */
export function inchesToHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

// ============================================================================
// Age Matching
// ============================================================================

export function matchAge(userA: UserProfile, userB: UserProfile): MatchResult {
  const aAge = userA.age;
  const bAge = userB.age;

  const aAgeMin = userA.preferences?.ageMin || 18;
  const aAgeMax = userA.preferences?.ageMax || 99;
  const bAgeMin = userB.preferences?.ageMin || 18;
  const bAgeMax = userB.preferences?.ageMax || 99;

  const aHappy = bAge >= aAgeMin && bAge <= aAgeMax;
  const bHappy = aAge >= bAgeMin && aAge <= bAgeMax;

  let status: MatchStatus;
  if (aHappy && bHappy) {
    status = 'both_happy';
  } else if (aHappy && !bHappy) {
    status = 'left_happy';
  } else if (!aHappy && bHappy) {
    status = 'right_happy';
  } else {
    status = 'neither_happy';
  }

  return {
    status,
    leftValue: aAge.toString(),
    rightValue: bAge.toString(),
  };
}

// ============================================================================
// Height Matching
// ============================================================================

export function matchHeight(userA: UserProfile, userB: UserProfile): MatchResult {
  const aHeightInches = heightToInches(userA.height);
  const bHeightInches = heightToInches(userB.height);

  if (!aHeightInches || !bHeightInches) {
    return {
      status: 'unknown',
      leftValue: userA.height || '—',
      rightValue: userB.height || '—',
    };
  }

  const aHeightMin = userA.preferences?.heightMin;
  const aHeightMax = userA.preferences?.heightMax;
  const bHeightMin = userB.preferences?.heightMin;
  const bHeightMax = userB.preferences?.heightMax;

  const aHappy = (!aHeightMin || bHeightInches >= aHeightMin) &&
                  (!aHeightMax || bHeightInches <= aHeightMax);
  const bHappy = (!bHeightMin || aHeightInches >= bHeightMin) &&
                  (!bHeightMax || aHeightInches <= bHeightMax);

  let status: MatchStatus;
  if (aHappy && bHappy) {
    status = 'both_happy';
  } else if (aHappy && !bHappy) {
    status = 'left_happy';
  } else if (!aHappy && bHappy) {
    status = 'right_happy';
  } else {
    status = 'neither_happy';
  }

  return {
    status,
    leftValue: inchesToHeight(aHeightInches),
    rightValue: inchesToHeight(bHeightInches),
  };
}

// ============================================================================
// Dating Distance Matching
// ============================================================================

export function matchDatingDistance(
  userA: UserProfile,
  userB: UserProfile,
  actualDistance: number
): MatchResult {
  const aMaxDistance = userA.preferences?.maxDistance;
  const bMaxDistance = userB.preferences?.maxDistance;

  // null means no limit (always happy)
  const aHappy = aMaxDistance === null || aMaxDistance === undefined || actualDistance <= aMaxDistance;
  const bHappy = bMaxDistance === null || bMaxDistance === undefined || actualDistance <= bMaxDistance;

  let status: MatchStatus;
  if (aHappy && bHappy) {
    status = 'both_happy';
  } else if (aHappy && !bHappy) {
    status = 'left_happy';
  } else if (!aHappy && bHappy) {
    status = 'right_happy';
  } else {
    status = 'neither_happy';
  }

  const aMaxStr = aMaxDistance === null || aMaxDistance === undefined ? 'Any' : `${aMaxDistance} mi`;
  const bMaxStr = bMaxDistance === null || bMaxDistance === undefined ? 'Any' : `${bMaxDistance} mi`;

  return {
    status,
    leftValue: aMaxStr,
    rightValue: bMaxStr,
    details: `Actual distance: ${actualDistance} mi`,
  };
}

// ============================================================================
// Ethnicity Matching
// ============================================================================

export function matchEthnicity(userA: UserProfile, userB: UserProfile): MatchResult {
  const aEthnicity = userA.ethnicity;
  const bEthnicity = userB.ethnicity;

  // Check if hidden
  if (!aEthnicity || !bEthnicity) {
    return {
      status: 'unknown',
      leftValue: aEthnicity || '—',
      rightValue: bEthnicity || '—',
    };
  }

  const aPreferredEthnicities = userA.preferredEthnicities || [];
  const bPreferredEthnicities = userB.preferredEthnicities || [];

  // Empty preference list means open to all
  const aHappy = aPreferredEthnicities.length === 0 || aPreferredEthnicities.includes(bEthnicity);
  const bHappy = bPreferredEthnicities.length === 0 || bPreferredEthnicities.includes(aEthnicity);

  let status: MatchStatus;
  if (aHappy && bHappy) {
    status = 'both_happy';
  } else if (aHappy && !bHappy) {
    status = 'left_happy';
  } else if (!aHappy && bHappy) {
    status = 'right_happy';
  } else {
    status = 'neither_happy';
  }

  return {
    status,
    leftValue: aEthnicity,
    rightValue: bEthnicity,
  };
}

// ============================================================================
// Politics Matching (Equality-based)
// ============================================================================

export function matchPolitics(userA: UserProfile, userB: UserProfile): MatchResult {
  const aPolitics = userA.politicalLeaning;
  const bPolitics = userB.politicalLeaning;

  if (!aPolitics || !bPolitics || aPolitics === 'prefer_not_to_say' || bPolitics === 'prefer_not_to_say') {
    return {
      status: 'unknown',
      leftValue: aPolitics === 'prefer_not_to_say' ? '—' : (aPolitics || '—'),
      rightValue: bPolitics === 'prefer_not_to_say' ? '—' : (bPolitics || '—'),
    };
  }

  const status = aPolitics === bPolitics ? 'both_happy' : 'neither_happy';

  return {
    status,
    leftValue: formatPoliticalLeaning(aPolitics),
    rightValue: formatPoliticalLeaning(bPolitics),
  };
}

function formatPoliticalLeaning(leaning: string): string {
  return leaning.replace(/_/g, ' ').split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// ============================================================================
// Religion Matching (Equality-based)
// ============================================================================

export function matchReligion(userA: UserProfile, userB: UserProfile): MatchResult {
  const aReligion = userA.religion;
  const bReligion = userB.religion;

  if (!aReligion || !bReligion) {
    return {
      status: 'unknown',
      leftValue: aReligion || '—',
      rightValue: bReligion || '—',
    };
  }

  const status = aReligion === bReligion ? 'both_happy' : 'neither_happy';

  return {
    status,
    leftValue: aReligion,
    rightValue: bReligion,
  };
}

// ============================================================================
// Lifestyle Matching (Complex Logic)
// ============================================================================

export function matchLifestyleAttribute(
  aRoutine: string | undefined,
  aPreferences: string | string[] | undefined,
  bRoutine: string | undefined,
  bPreferences: string | string[] | undefined,
  attributeName: string
): MatchResult {
  // Step 1: Check for "prefer not to say"
  if (aRoutine === 'prefer_not_to_say' || bRoutine === 'prefer_not_to_say') {
    return {
      status: 'unknown',
      leftValue: aRoutine === 'prefer_not_to_say' ? '—' : (aRoutine || '—'),
      rightValue: bRoutine === 'prefer_not_to_say' ? '—' : (bRoutine || '—'),
    };
  }

  // Handle missing data
  if (!aRoutine || !bRoutine || !aPreferences || !bPreferences) {
    return {
      status: 'unknown',
      leftValue: aRoutine || '—',
      rightValue: bRoutine || '—',
    };
  }

  // Normalize preferences to arrays
  const aPreferenceArray = Array.isArray(aPreferences) ? aPreferences : [aPreferences];
  const bPreferenceArray = Array.isArray(bPreferences) ? bPreferences : [bPreferences];

  // Step 2: Check for "don't care"
  const aDontCare = aPreferenceArray.includes("don't care");
  const bDontCare = bPreferenceArray.includes("don't care");

  if (aDontCare && bDontCare) {
    return {
      status: 'both_happy',
      leftValue: formatLifestyleValue(aRoutine),
      rightValue: formatLifestyleValue(bRoutine),
      details: 'Both don\'t care',
    };
  }

  // Step 3: Match routine with preference array
  // Person A is happy if Person B's routine is in Person A's preference list OR Person A doesn't care
  const aHappy = aDontCare || aPreferenceArray.includes(bRoutine);
  const bHappy = bDontCare || bPreferenceArray.includes(aRoutine);

  let status: MatchStatus;
  if (aHappy && bHappy) {
    status = 'both_happy';
  } else if (aHappy && !bHappy) {
    status = 'left_happy';
  } else if (!aHappy && bHappy) {
    status = 'right_happy';
  } else {
    status = 'neither_happy';
  }

  return {
    status,
    leftValue: formatLifestyleValue(aRoutine),
    rightValue: formatLifestyleValue(bRoutine),
  };
}

function formatLifestyleValue(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function matchDrinking(userA: UserProfile, userB: UserProfile): MatchResult {
  return matchLifestyleAttribute(
    userA.drinkingFrequency,
    userA.partnerLifestylePreferences?.drinking,
    userB.drinkingFrequency,
    userB.partnerLifestylePreferences?.drinking,
    'drinking'
  );
}

export function matchCannabis(userA: UserProfile, userB: UserProfile): MatchResult {
  return matchLifestyleAttribute(
    userA.cannabisFrequency,
    userA.partnerLifestylePreferences?.cannabis,
    userB.cannabisFrequency,
    userB.partnerLifestylePreferences?.cannabis,
    'cannabis'
  );
}

export function matchTobacco(userA: UserProfile, userB: UserProfile): MatchResult {
  return matchLifestyleAttribute(
    userA.tobaccoFrequency,
    userA.partnerLifestylePreferences?.tobacco,
    userB.tobaccoFrequency,
    userB.partnerLifestylePreferences?.tobacco,
    'tobacco'
  );
}

export function matchOtherSubstances(userA: UserProfile, userB: UserProfile): MatchResult {
  return matchLifestyleAttribute(
    userA.otherDrugsFrequency,
    userA.partnerLifestylePreferences?.otherDrugs,
    userB.otherDrugsFrequency,
    userB.partnerLifestylePreferences?.otherDrugs,
    'otherDrugs'
  );
}

// ============================================================================
// Values Matching (Overlap-based)
// ============================================================================

export function matchValues(userA: UserProfile, userB: UserProfile): {
  sharedValues: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  overlapPercentage: number;
  status: 'high' | 'medium' | 'low';
} {
  const aValues = userA.values || [];
  const bValues = userB.values || [];

  const sharedValues = aValues.filter(v => bValues.includes(v));
  const uniqueToA = aValues.filter(v => !bValues.includes(v));
  const uniqueToB = bValues.filter(v => !aValues.includes(v));

  // Jaccard similarity: shared / union (per algorithm spec)
  const unionSet = new Set([...aValues, ...bValues]);
  const overlapPercentage = unionSet.size > 0 ? (sharedValues.length / unionSet.size) * 100 : 0;

  let status: 'high' | 'medium' | 'low';
  if (overlapPercentage >= 66) {
    status = 'high';
  } else if (overlapPercentage >= 33) {
    status = 'medium';
  } else {
    status = 'low';
  }

  return {
    sharedValues,
    uniqueToA,
    uniqueToB,
    overlapPercentage,
    status,
  };
}

// ============================================================================
// Interests Matching (Overlap-based)
// ============================================================================

export function matchInterests(userA: UserProfile, userB: UserProfile): {
  sharedInterests: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  overlapPercentage: number;
  status: 'high' | 'medium' | 'low';
} {
  const aInterests = userA.interests || [];
  const bInterests = userB.interests || [];

  const sharedInterests = aInterests.filter(i => bInterests.includes(i));
  const uniqueToA = aInterests.filter(i => !bInterests.includes(i));
  const uniqueToB = bInterests.filter(i => !aInterests.includes(i));

  // Jaccard similarity: shared / union (per algorithm spec)
  const unionSet = new Set([...aInterests, ...bInterests]);
  const overlapPercentage = unionSet.size > 0 ? (sharedInterests.length / unionSet.size) * 100 : 0;

  let status: 'high' | 'medium' | 'low';
  if (overlapPercentage >= 66) {
    status = 'high';
  } else if (overlapPercentage >= 33) {
    status = 'medium';
  } else {
    status = 'low';
  }

  return {
    sharedInterests,
    uniqueToA,
    uniqueToB,
    overlapPercentage,
    status,
  };
}

// ============================================================================
// Section Compatibility Calculation
// ============================================================================

export function calculateSectionCompatibility(matchResults: MatchResult[]): SectionCompatibility {
  const total = matchResults.length;
  const compatible = matchResults.filter(r => r.status === 'both_happy').length;
  const percentage = total > 0 ? (compatible / total) * 100 : 0;

  let status: 'high' | 'medium' | 'low';
  if (percentage >= 66) {
    status = 'high';
  } else if (percentage >= 33) {
    status = 'medium';
  } else {
    status = 'low';
  }

  return {
    compatible,
    total,
    percentage,
    status,
  };
}
