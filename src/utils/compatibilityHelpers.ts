/**
 * Compatibility Helpers
 *
 * Utilities for calculating and displaying compatibility between two users
 */

import { UserProfile } from '../types';

export interface CompatibilityResult {
  score: number; // 0-100 percentage
  matches: string[]; // Fields that match
  conflicts: string[]; // Fields that conflict
  sharedValues: string[]; // Common values
  sharedInterests: string[]; // Common interests
}

/**
 * Calculate compatibility between two users
 */
export function calculateCompatibility(userA: UserProfile, userB: UserProfile): CompatibilityResult {
  const matches: string[] = [];
  const conflicts: string[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Religion (15 points)
  if (userA.religion && userB.religion) {
    totalPoints += 15;
    if (userA.religion.toLowerCase() === userB.religion.toLowerCase()) {
      earnedPoints += 15;
      matches.push('religion');
    } else {
      conflicts.push('religion');
    }
  }

  // Politics (15 points)
  if (userA.politicalLeaning && userB.politicalLeaning) {
    totalPoints += 15;
    const politicsA = userA.politicalLeaning.toLowerCase();
    const politicsB = userB.politicalLeaning.toLowerCase();

    if (politicsA === politicsB) {
      earnedPoints += 15;
      matches.push('politics');
    } else {
      // Partial credit for moderate vs conservative/liberal
      if ((politicsA === 'moderate' || politicsB === 'moderate')) {
        earnedPoints += 7;
      } else {
        conflicts.push('politics');
      }
    }
  }

  // Children/Family Plans (20 points)
  if (userA.familyPlans && userB.familyPlans) {
    totalPoints += 20;
    const planA = userA.familyPlans.toLowerCase();
    const planB = userB.familyPlans.toLowerCase();

    if (planA === planB) {
      earnedPoints += 20;
      matches.push('family_plans');
    } else if (
      (planA.includes('open') || planB.includes('open')) ||
      (planA.includes('undecided') || planB.includes('undecided'))
    ) {
      earnedPoints += 10;
    } else {
      conflicts.push('family_plans');
    }
  }

  // Values (25 points)
  const sharedValues = getSharedItems(userA.values || [], userB.values || []);
  if (userA.values && userB.values && userA.values.length > 0 && userB.values.length > 0) {
    totalPoints += 25;
    const matchRatio = sharedValues.length / Math.max(userA.values.length, userB.values.length);
    earnedPoints += Math.round(25 * matchRatio);

    if (sharedValues.length >= 2) {
      matches.push('values');
    }
  }

  // Interests (15 points)
  const sharedInterests = getSharedItems(userA.interests || [], userB.interests || []);
  if (userA.interests && userB.interests && userA.interests.length > 0 && userB.interests.length > 0) {
    totalPoints += 15;
    const matchRatio = sharedInterests.length / Math.max(userA.interests.length, userB.interests.length);
    earnedPoints += Math.round(15 * matchRatio);

    if (sharedInterests.length >= 2) {
      matches.push('interests');
    }
  }

  // Lifestyle compatibility (10 points)
  if (userA.drinkingFrequency && userB.drinkingFrequency) {
    totalPoints += 10;
    const drinkA = userA.drinkingFrequency.toLowerCase();
    const drinkB = userB.drinkingFrequency.toLowerCase();

    // Exact match or compatible levels
    if (drinkA === drinkB) {
      earnedPoints += 10;
      matches.push('lifestyle');
    } else if (
      (drinkA === 'socially' && drinkB === 'regularly') ||
      (drinkA === 'regularly' && drinkB === 'socially') ||
      (drinkA === 'rarely' && drinkB === 'never') ||
      (drinkA === 'never' && drinkB === 'rarely')
    ) {
      earnedPoints += 5;
    }
  }

  // Calculate final score
  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    matches,
    conflicts,
    sharedValues,
    sharedInterests,
  };
}

/**
 * Get items that appear in both arrays (case-insensitive)
 */
function getSharedItems(arrA: string[], arrB: string[]): string[] {
  const setA = new Set(arrA.map(item => item.toLowerCase()));
  return arrB.filter(item => setA.has(item.toLowerCase()));
}

/**
 * Get compatibility color based on score
 */
export function getCompatibilityColor(score: number): string {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

/**
 * Get compatibility label based on score
 */
export function getCompatibilityLabel(score: number): string {
  if (score >= 80) return 'Strong Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Possible Match';
  return 'Low Match';
}
