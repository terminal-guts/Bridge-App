/**
 * Bridge Matching Algorithm
 *
 * Mutual percentage-based matching with gradient scoring.
 * All 13 categories sum to 100%.
 *
 * Based on MATCHING_ALGORITHM.md specification.
 */

import { UserProfile, PoliticalLeaning, EducationLevel } from '../types';
import { calculateDistance, heightToInches } from './proposalMatching';

// ============================================================================
// Types
// ============================================================================

export interface MatchScore {
  total: number;                    // 0-100 final score
  breakdown: CategoryScore[];       // Per-category scores
  mutualCompatibility: boolean;     // Both users pass basic filters
}

export interface CategoryScore {
  category: string;
  weight: number;                   // e.g., 0.18 for 18%
  rawScore: number;                 // 0-100 before weighting
  weightedScore: number;            // rawScore * weight
  details?: string;                 // Human-readable explanation
}

// ============================================================================
// Category Weights (sum to 1.0)
// ============================================================================

const WEIGHTS = {
  age: 0.18,
  distance: 0.15,
  lifestyle: 0.12,
  values: 0.08,
  interests: 0.08,
  family: 0.08,
  religion: 0.06,
  politics: 0.06,
  height: 0.05,
  ethnicity: 0.05,
  deepQuestions: 0.05,
  education: 0.03,
  career: 0.01,
} as const;

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Calculate mutual match score between two users.
 * Returns a score from 0-100 representing overall compatibility.
 */
export function calculateMatchScore(
  userA: UserProfile,
  userB: UserProfile,
  distanceMiles?: number
): MatchScore {
  const breakdown: CategoryScore[] = [];

  // Calculate each category
  breakdown.push(scoreAge(userA, userB));
  breakdown.push(scoreDistance(userA, userB, distanceMiles));
  breakdown.push(scoreLifestyle(userA, userB));
  breakdown.push(scoreValues(userA, userB));
  breakdown.push(scoreInterests(userA, userB));
  breakdown.push(scoreFamily(userA, userB));
  breakdown.push(scoreReligion(userA, userB));
  breakdown.push(scorePolitics(userA, userB));
  breakdown.push(scoreHeight(userA, userB));
  breakdown.push(scoreEthnicity(userA, userB));
  breakdown.push(scoreDeepQuestions(userA, userB));
  breakdown.push(scoreEducation(userA, userB));
  breakdown.push(scoreCareer(userA, userB));

  // Sum weighted scores
  const total = breakdown.reduce((sum, cat) => sum + cat.weightedScore, 0);

  // Check mutual basic compatibility (gender preferences, etc.)
  const mutualCompatibility = checkMutualCompatibility(userA, userB);

  return {
    total: Math.round(total * 100) / 100,
    breakdown,
    mutualCompatibility,
  };
}

// ============================================================================
// Mutual Compatibility (Gender Preferences)
// ============================================================================

function checkMutualCompatibility(userA: UserProfile, userB: UserProfile): boolean {
  const aGenders = userA.gender || [];
  const bGenders = userB.gender || [];
  const aInterestedIn = userA.interestedInGenders || [];
  const bInterestedIn = userB.interestedInGenders || [];

  // A is interested in B's gender?
  const aInterestedInB = aInterestedIn.length === 0 ||
    aInterestedIn.some(g => bGenders.includes(g));

  // B is interested in A's gender?
  const bInterestedInA = bInterestedIn.length === 0 ||
    bInterestedIn.some(g => aGenders.includes(g));

  return aInterestedInB && bInterestedInA;
}

// ============================================================================
// Category Scorers
// ============================================================================

/**
 * Age (18% weight)
 * Gradient scoring: closer to ideal = higher score
 */
function scoreAge(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aAge = userA.age;
  const bAge = userB.age;

  const aMin = userA.preferences?.ageMin ?? 18;
  const aMax = userA.preferences?.ageMax ?? 99;
  const bMin = userB.preferences?.ageMin ?? 18;
  const bMax = userB.preferences?.ageMax ?? 99;

  // A's score for B's age
  const aScore = gradientAgeScore(bAge, aMin, aMax);
  // B's score for A's age
  const bScore = gradientAgeScore(aAge, bMin, bMax);

  // Mutual: average both directions
  const rawScore = (aScore + bScore) / 2;

  return {
    category: 'age',
    weight: WEIGHTS.age,
    rawScore,
    weightedScore: rawScore * WEIGHTS.age,
    details: `A(${aAge}) in B's [${bMin}-${bMax}]: ${bScore.toFixed(0)}%, ` +
             `B(${bAge}) in A's [${aMin}-${aMax}]: ${aScore.toFixed(0)}%`,
  };
}

function gradientAgeScore(age: number, min: number, max: number): number {
  if (age < min || age > max) return 0;

  const ideal = (min + max) / 2;
  const range = (max - min) / 2;
  const distanceFromIdeal = Math.abs(age - ideal);

  // Score decreases by up to 50% as you move from ideal to edge
  return 100 - (distanceFromIdeal / range) * 50;
}

/**
 * Distance (15% weight)
 * Formula: 100% * (1 - (distance/max)^0.7)
 */
function scoreDistance(
  userA: UserProfile,
  userB: UserProfile,
  actualDistance?: number
): CategoryScore {
  // If no distance provided, try city string matching
  if (actualDistance === undefined) {
    const aCity = (userA.location || '').split(',')[0].trim().toLowerCase();
    const bCity = (userB.location || '').split(',')[0].trim().toLowerCase();
    if (aCity && bCity && aCity === bCity) {
      return {
        category: 'distance',
        weight: WEIGHTS.distance,
        rawScore: 90,
        weightedScore: 90 * WEIGHTS.distance,
        details: `Same city: ${aCity}`,
      };
    }
    return {
      category: 'distance',
      weight: WEIGHTS.distance,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.distance,
      details: 'Distance unknown, defaulting to 50%',
    };
  }

  const aMax = userA.preferences?.maxDistance ?? 200;
  const bMax = userB.preferences?.maxDistance ?? 200;
  const maxAcceptable = Math.min(aMax, bMax);

  if (actualDistance > maxAcceptable) {
    return {
      category: 'distance',
      weight: WEIGHTS.distance,
      rawScore: 0,
      weightedScore: 0,
      details: `${actualDistance}mi exceeds max ${maxAcceptable}mi`,
    };
  }

  // Decay formula with 0.7 exponent for gentler falloff
  const rawScore = 100 * (1 - Math.pow(actualDistance / maxAcceptable, 0.7));

  return {
    category: 'distance',
    weight: WEIGHTS.distance,
    rawScore,
    weightedScore: rawScore * WEIGHTS.distance,
    details: `${actualDistance}mi / ${maxAcceptable}mi max`,
  };
}

/**
 * Lifestyle Substances (12% weight, 3% each)
 */
function scoreLifestyle(userA: UserProfile, userB: UserProfile): CategoryScore {
  const substances = ['drinking', 'cannabis', 'tobacco', 'otherDrugs'] as const;
  const scores: number[] = [];

  for (const substance of substances) {
    const aFreq = getSubstanceFrequency(userA, substance);
    const bFreq = getSubstanceFrequency(userB, substance);
    const aPref = getSubstancePreference(userA, substance);
    const bPref = getSubstancePreference(userB, substance);

    // A's acceptance of B, and B's acceptance of A
    const aAcceptsB = scoreSubstanceMatch(bFreq, aPref);
    const bAcceptsA = scoreSubstanceMatch(aFreq, bPref);

    scores.push((aAcceptsB + bAcceptsA) / 2);
  }

  const rawScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    category: 'lifestyle',
    weight: WEIGHTS.lifestyle,
    rawScore,
    weightedScore: rawScore * WEIGHTS.lifestyle,
    details: `drinking: ${scores[0].toFixed(0)}%, cannabis: ${scores[1].toFixed(0)}%, ` +
             `tobacco: ${scores[2].toFixed(0)}%, other: ${scores[3].toFixed(0)}%`,
  };
}

function getSubstanceFrequency(user: UserProfile, substance: string): string {
  switch (substance) {
    case 'drinking': return user.drinkingFrequency || '';
    case 'cannabis': return user.cannabisFrequency || '';
    case 'tobacco': return user.tobaccoFrequency || '';
    case 'otherDrugs': return user.otherDrugsFrequency || '';
    default: return '';
  }
}

function getSubstancePreference(user: UserProfile, substance: string): string[] {
  const prefs = user.partnerLifestylePreferences;
  if (!prefs) return [];

  const pref = prefs[substance as keyof typeof prefs];
  if (!pref) return [];
  return Array.isArray(pref) ? pref : [pref];
}

function scoreSubstanceMatch(frequency: string, preferences: string[]): number {
  if (!frequency) return 50; // Missing frequency = default
  if (preferences.length === 0) return 100; // No preference = don't care
  if (preferences.includes("don't care") || preferences.includes("dont_care")) {
    return 100;
  }
  if (preferences.includes(frequency)) return 100;
  if (frequency === 'sometimes') {
    // Partial match if they only accept one extreme
    const acceptsYes = preferences.includes('yes') || preferences.includes('often') || preferences.includes('regularly');
    const acceptsNo = preferences.includes('no') || preferences.includes('never');
    if ((acceptsYes && !acceptsNo) || (acceptsNo && !acceptsYes)) return 50;
  }
  if (frequency === 'prefer_not_to_say') return 50;
  return 0;
}

/**
 * Values (10% weight)
 * Jaccard similarity
 */
function scoreValues(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aValues = userA.values || [];
  const bValues = userB.values || [];

  if (aValues.length === 0 && bValues.length === 0) {
    return {
      category: 'values',
      weight: WEIGHTS.values,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.values,
      details: 'No values provided',
    };
  }

  if (aValues.length === 0 || bValues.length === 0) {
    return {
      category: 'values',
      weight: WEIGHTS.values,
      rawScore: 25,
      weightedScore: 25 * WEIGHTS.values,
      details: 'Only one user has values',
    };
  }

  const rawScore = overlapCoefficient(aValues, bValues) * 100;

  const shared = aValues.filter(v => bValues.includes(v));

  return {
    category: 'values',
    weight: WEIGHTS.values,
    rawScore,
    weightedScore: rawScore * WEIGHTS.values,
    details: `${shared.length} shared: ${shared.slice(0, 3).join(', ')}${shared.length > 3 ? '...' : ''}`,
  };
}

/**
 * Interests (10% weight)
 * Jaccard similarity
 */
function scoreInterests(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aInterests = userA.interests || [];
  const bInterests = userB.interests || [];

  if (aInterests.length === 0 && bInterests.length === 0) {
    return {
      category: 'interests',
      weight: WEIGHTS.interests,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.interests,
      details: 'No interests provided',
    };
  }

  if (aInterests.length === 0 || bInterests.length === 0) {
    return {
      category: 'interests',
      weight: WEIGHTS.interests,
      rawScore: 25,
      weightedScore: 25 * WEIGHTS.interests,
      details: 'Only one user has interests',
    };
  }

  const rawScore = overlapCoefficient(aInterests, bInterests) * 100;

  const shared = aInterests.filter(i => bInterests.includes(i));

  return {
    category: 'interests',
    weight: WEIGHTS.interests,
    rawScore,
    weightedScore: rawScore * WEIGHTS.interests,
    details: `${shared.length} shared: ${shared.slice(0, 3).join(', ')}${shared.length > 3 ? '...' : ''}`,
  };
}

function overlapCoefficient(a: string[], b: string[]): number {
  const setA = new Set(a.map(x => x.toLowerCase()));
  const setB = new Set(b.map(x => x.toLowerCase()));

  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = [...setA].filter(x => setB.has(x)).length;
  const smaller = Math.min(setA.size, setB.size);

  return intersection / smaller;
}

/**
 * Family (8% weight)
 * hasChildren: 3.2%, familyPlans: 4.8%
 */
function scoreFamily(userA: UserProfile, userB: UserProfile): CategoryScore {
  // Has children (3.2% of 8% = 40% of family weight)
  const childrenScore = scoreHasChildren(userA, userB);

  // Family plans (4.8% of 8% = 60% of family weight)
  const plansScore = scoreFamilyPlans(userA, userB);

  const rawScore = childrenScore * 0.4 + plansScore * 0.6;

  return {
    category: 'family',
    weight: WEIGHTS.family,
    rawScore,
    weightedScore: rawScore * WEIGHTS.family,
    details: `children: ${childrenScore.toFixed(0)}%, plans: ${plansScore.toFixed(0)}%`,
  };
}

function scoreHasChildren(userA: UserProfile, userB: UserProfile): number {
  const aHas = userA.hasChildren;
  const bHas = userB.hasChildren;

  if (!aHas || !bHas) return 50;
  if (aHas === 'prefer_not_to_say' || bHas === 'prefer_not_to_say') return 75;

  if (aHas === bHas) return 100;
  return 50; // One has, one doesn't
}

function scoreFamilyPlans(userA: UserProfile, userB: UserProfile): number {
  const aPlan = userA.familyPlans?.toLowerCase() || '';
  const bPlan = userB.familyPlans?.toLowerCase() || '';

  if (!aPlan || !bPlan) return 50;
  if (aPlan.includes('prefer_not') || bPlan.includes('prefer_not')) return 50;

  // Compatibility matrix
  const matrix: Record<string, Record<string, number>> = {
    want_someday: { want_someday: 100, open: 80, not_sure: 60, dont_want: 0 },
    dont_want: { dont_want: 100, open: 40, not_sure: 40, want_someday: 0 },
    open: { open: 100, not_sure: 80, want_someday: 80, dont_want: 40 },
    not_sure: { not_sure: 90, open: 80, want_someday: 60, dont_want: 40 },
  };

  const aKey = normalizeKey(aPlan);
  const bKey = normalizeKey(bPlan);

  const aScore = matrix[aKey]?.[bKey] ?? 50;
  const bScore = matrix[bKey]?.[aKey] ?? 50;

  return (aScore + bScore) / 2;
}

function normalizeKey(plan: string): string {
  if (plan.includes('want') && plan.includes('someday')) return 'want_someday';
  if (plan.includes('dont') || plan.includes("don't")) return 'dont_want';
  if (plan.includes('open')) return 'open';
  if (plan.includes('not_sure') || plan.includes('unsure')) return 'not_sure';
  return plan;
}

/**
 * Religion (6% weight)
 */
function scoreReligion(
  userA: UserProfile,
  userB: UserProfile,
): CategoryScore {
  const aRel = userA.religion?.toLowerCase() || '';
  const bRel = userB.religion?.toLowerCase() || '';

  if (!aRel || !bRel) {
    return {
      category: 'religion',
      weight: WEIGHTS.religion,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.religion,
      details: 'Religion not specified',
    };
  }

  let rawScore: number;
  let details: string;

  if (aRel === bRel) {
    rawScore = 100;
    details = `Both ${aRel}`;
  } else if (isSimilarReligion(aRel, bRel)) {
    rawScore = 75;
    details = `Similar: ${aRel} / ${bRel}`;
  } else if (isOpposingReligion(aRel, bRel)) {
    rawScore = 25;
    details = `Opposing: ${aRel} / ${bRel}`;
  } else {
    rawScore = 50;
    details = `Different: ${aRel} / ${bRel}`;
  }

  return {
    category: 'religion',
    weight: WEIGHTS.religion,
    rawScore,
    weightedScore: rawScore * WEIGHTS.religion,
    details,
  };
}

function isSimilarReligion(a: string, b: string): boolean {
  const similar = [
    ['christian', 'spiritual'],
    ['buddhist', 'spiritual'],
    ['hindu', 'spiritual'],
    ['jewish', 'spiritual'],
  ];
  return similar.some(pair =>
    (pair.includes(a) && pair.includes(b))
  );
}

function isOpposingReligion(a: string, b: string): boolean {
  const opposing = [
    ['atheist', 'christian'],
    ['atheist', 'muslim'],
    ['atheist', 'jewish'],
    ['atheist', 'hindu'],
    ['agnostic', 'very_religious'],
  ];
  return opposing.some(pair =>
    (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
  );
}

/**
 * Politics (6% weight)
 */
function scorePolitics(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aPol = userA.politicalLeaning || '';
  const bPol = userB.politicalLeaning || '';
  const aPref = userA.preferredPolitics || [];
  const bPref = userB.preferredPolitics || [];

  // No preference = 100%
  if (aPref.length === 0 && bPref.length === 0) {
    return {
      category: 'politics',
      weight: WEIGHTS.politics,
      rawScore: 100,
      weightedScore: 100 * WEIGHTS.politics,
      details: 'No political preference',
    };
  }

  if (aPol === 'prefer_not_to_say' || bPol === 'prefer_not_to_say') {
    return {
      category: 'politics',
      weight: WEIGHTS.politics,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.politics,
      details: 'Prefer not to say',
    };
  }

  // Check if each accepts the other's leaning
  const aAcceptsB = aPref.length === 0 || aPref.includes(bPol);
  const bAcceptsA = bPref.length === 0 || bPref.includes(aPol);

  if (aAcceptsB && bAcceptsA) {
    return {
      category: 'politics',
      weight: WEIGHTS.politics,
      rawScore: 100,
      weightedScore: 100 * WEIGHTS.politics,
      details: 'Mutual acceptance',
    };
  }

  // Adjacent leanings get partial credit
  const adjacentScore = getAdjacentPoliticsScore(aPol, bPol);

  return {
    category: 'politics',
    weight: WEIGHTS.politics,
    rawScore: adjacentScore,
    weightedScore: adjacentScore * WEIGHTS.politics,
    details: `${aPol} / ${bPol}`,
  };
}

function getAdjacentPoliticsScore(a: string, b: string): number {
  const spectrum = ['very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative'];
  const aIdx = spectrum.indexOf(a);
  const bIdx = spectrum.indexOf(b);

  if (aIdx === -1 || bIdx === -1) {
    // One is not_political
    if (a === 'not_political' || b === 'not_political') {
      return b === 'moderate' || a === 'moderate' ? 80 : 60;
    }
    return 50;
  }

  const distance = Math.abs(aIdx - bIdx);
  switch (distance) {
    case 0: return 100;
    case 1: return 80;
    case 2: return 50;
    case 3: return 25;
    case 4: return 0; // very_liberal ↔ very_conservative
    default: return 0;
  }
}

/**
 * Height (5% weight)
 * Gradient scoring similar to age
 */
function scoreHeight(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aHeight = heightToInches(userA.height);
  const bHeight = heightToInches(userB.height);

  if (!aHeight || !bHeight) {
    return {
      category: 'height',
      weight: WEIGHTS.height,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.height,
      details: 'Height not specified',
    };
  }

  const aMin = userA.preferences?.heightMin;
  const aMax = userA.preferences?.heightMax;
  const bMin = userB.preferences?.heightMin;
  const bMax = userB.preferences?.heightMax;

  // No preference = 100%
  const aScore = (!aMin && !aMax) ? 100 : gradientHeightScore(bHeight, aMin || 48, aMax || 96);
  const bScore = (!bMin && !bMax) ? 100 : gradientHeightScore(aHeight, bMin || 48, bMax || 96);

  const rawScore = (aScore + bScore) / 2;

  return {
    category: 'height',
    weight: WEIGHTS.height,
    rawScore,
    weightedScore: rawScore * WEIGHTS.height,
    details: `A: ${formatHeight(aHeight)}, B: ${formatHeight(bHeight)}`,
  };
}

function gradientHeightScore(height: number, min: number, max: number): number {
  if (height < min || height > max) return 0;

  const ideal = (min + max) / 2;
  const range = (max - min) / 2;
  if (range === 0) return height === ideal ? 100 : 0;

  const distanceFromIdeal = Math.abs(height - ideal);
  return 100 - (distanceFromIdeal / range) * 50;
}

function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

/**
 * Ethnicity (5% weight)
 */
function scoreEthnicity(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aEth = userA.ethnicity || '';
  const bEth = userB.ethnicity || '';
  const aPref = userA.preferredEthnicities || [];
  const bPref = userB.preferredEthnicities || [];

  // No preference = 100%
  const aAccepts = aPref.length === 0 || matchesEthnicity(bEth, aPref);
  const bAccepts = bPref.length === 0 || matchesEthnicity(aEth, bPref);

  let rawScore: number;
  if (aAccepts && bAccepts) {
    rawScore = 100;
  } else if (aAccepts || bAccepts) {
    rawScore = 50;
  } else {
    rawScore = 0;
  }

  return {
    category: 'ethnicity',
    weight: WEIGHTS.ethnicity,
    rawScore,
    weightedScore: rawScore * WEIGHTS.ethnicity,
    details: `A: ${aEth}, B: ${bEth}`,
  };
}

function matchesEthnicity(ethnicity: string, preferences: string[]): boolean {
  if (!ethnicity) return false;

  // Handle multi-ethnic (e.g., "Asian / White")
  const components = ethnicity.split(' / ').map(e => e.trim().toLowerCase());

  return preferences.some(pref =>
    components.includes(pref.toLowerCase()) ||
    pref.toLowerCase() === ethnicity.toLowerCase()
  );
}

const DEEP_STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're',
  've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven',
  'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
  'won', 'wouldn', 'also', 'would', 'could', 'might', 'much', 'really', 'think',
  'know', 'like', 'want', 'feel', 'get', 'make', 'go', 'thing', 'things',
]);

function extractMeaningfulWords(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  return new Set(words.filter(w => w.length > 2 && !DEEP_STOP_WORDS.has(w)));
}

function scoreDeepQuestions(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aAnswers = userA.deepQuestions || [];
  const bAnswers = userB.deepQuestions || [];

  if (aAnswers.length === 0 && bAnswers.length === 0) {
    return {
      category: 'deepQuestions',
      weight: WEIGHTS.deepQuestions,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.deepQuestions,
      details: 'No deep question answers',
    };
  }

  if (aAnswers.length === 0 || bAnswers.length === 0) {
    return {
      category: 'deepQuestions',
      weight: WEIGHTS.deepQuestions,
      rawScore: 30,
      weightedScore: 30 * WEIGHTS.deepQuestions,
      details: 'Only one user answered deep questions',
    };
  }

  const aIds = new Set(aAnswers.map(a => a.questionId));
  const bIds = new Set(bAnswers.map(a => a.questionId));
  const idIntersection = [...aIds].filter(id => bIds.has(id)).length;
  const smallerIds = Math.min(aIds.size, bIds.size);
  const questionOverlap = smallerIds === 0 ? 0 : Math.min(100, (idIntersection / smallerIds) * 120);

  const aWords = new Set<string>();
  const bWords = new Set<string>();
  aAnswers.forEach(a => extractMeaningfulWords(a.answer).forEach(w => aWords.add(w)));
  bAnswers.forEach(a => extractMeaningfulWords(a.answer).forEach(w => bWords.add(w)));
  const wordIntersection = [...aWords].filter(w => bWords.has(w)).length;
  const smallerWords = Math.min(aWords.size, bWords.size);
  const keywordOverlap = smallerWords === 0 ? 0 : Math.min(100, (wordIntersection / smallerWords) * 100);

  const aAvgLen = aAnswers.reduce((s, a) => s + a.answer.length, 0) / aAnswers.length;
  const bAvgLen = bAnswers.reduce((s, a) => s + a.answer.length, 0) / bAnswers.length;
  const maxLen = Math.max(aAvgLen, bAvgLen);
  const lengthSimilarity = maxLen === 0 ? 100 : (Math.min(aAvgLen, bAvgLen) / maxLen) * 100;

  const rawScore = questionOverlap * 0.35 + keywordOverlap * 0.45 + lengthSimilarity * 0.20;

  return {
    category: 'deepQuestions',
    weight: WEIGHTS.deepQuestions,
    rawScore,
    weightedScore: rawScore * WEIGHTS.deepQuestions,
    details: `overlap: ${questionOverlap.toFixed(0)}%, keywords: ${keywordOverlap.toFixed(0)}%, length: ${lengthSimilarity.toFixed(0)}%`,
  };
}

/**
 * Education (3% weight)
 */
function scoreEducation(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aEdu = userA.educationLevel || '';
  const bEdu = userB.educationLevel || '';

  if (!aEdu || !bEdu) {
    return {
      category: 'education',
      weight: WEIGHTS.education,
      rawScore: 50,
      weightedScore: 50 * WEIGHTS.education,
      details: 'Education not specified',
    };
  }

  const aLevel = getEducationLevel(aEdu);
  const bLevel = getEducationLevel(bEdu);
  const distance = Math.abs(aLevel - bLevel);

  let rawScore: number;
  switch (distance) {
    case 0: rawScore = 100; break;
    case 1: rawScore = 80; break;
    case 2: rawScore = 60; break;
    case 3: rawScore = 40; break;
    default: rawScore = 20;
  }

  return {
    category: 'education',
    weight: WEIGHTS.education,
    rawScore,
    weightedScore: rawScore * WEIGHTS.education,
    details: `A: ${aEdu}, B: ${bEdu} (${distance} levels apart)`,
  };
}

function getEducationLevel(edu: string): number {
  const levels: Record<string, number> = {
    no_high_school: 0,
    high_school: 1,
    some_college: 2,
    trade_school: 2,
    associates: 3,
    bachelors: 4,
    masters: 5,
    phd: 6,
    beyond_masters: 6,
    professional: 6,
    other: 3, // Default to middle
  };
  return levels[edu.toLowerCase()] ?? 3;
}

/**
 * Career (2% weight)
 */
function scoreCareer(userA: UserProfile, userB: UserProfile): CategoryScore {
  const aCompany = userA.company?.toLowerCase() || '';
  const bCompany = userB.company?.toLowerCase() || '';
  const aSchool = userA.school?.toLowerCase() || '';
  const bSchool = userB.school?.toLowerCase() || '';
  const aJob = userA.currentJob?.toLowerCase() || '';
  const bJob = userB.currentJob?.toLowerCase() || '';

  let rawScore: number;
  let details: string;

  // Same company or school = 100%
  if ((aCompany && aCompany === bCompany) || (aSchool && aSchool === bSchool)) {
    rawScore = 100;
    details = aCompany === bCompany ? `Same company: ${aCompany}` : `Same school: ${aSchool}`;
  }
  // Similar job keywords = 75%
  else if (hasKeywordOverlap(aJob, bJob)) {
    rawScore = 75;
    details = 'Similar job keywords';
  }
  // Both have values but no match = 50%
  else if ((aCompany || aJob) && (bCompany || bJob)) {
    rawScore = 50;
    details = 'Different careers';
  }
  // Either missing = 50%
  else {
    rawScore = 50;
    details = 'Career info missing';
  }

  return {
    category: 'career',
    weight: WEIGHTS.career,
    rawScore,
    weightedScore: rawScore * WEIGHTS.career,
    details,
  };
}

function hasKeywordOverlap(jobA: string, jobB: string): boolean {
  if (!jobA || !jobB) return false;

  const keywords = [
    'engineer', 'developer', 'designer', 'manager', 'analyst',
    'consultant', 'director', 'marketing', 'sales', 'finance',
    'product', 'data', 'software', 'research', 'healthcare',
  ];

  const aKeywords = keywords.filter(k => jobA.includes(k));
  const bKeywords = keywords.filter(k => jobB.includes(k));

  return aKeywords.some(k => bKeywords.includes(k));
}

// ============================================================================
// Utility: Quick Match Check (for filtering)
// ============================================================================

/**
 * Fast filter to check if two users could potentially match.
 * Use this before running the full scoring algorithm.
 */
export function isViableMatch(userA: UserProfile, userB: UserProfile): boolean {
  // Gender compatibility
  if (!checkMutualCompatibility(userA, userB)) return false;

  // Age within broad range (with buffer)
  const aAge = userA.age;
  const bAge = userB.age;
  const aMin = (userA.preferences?.ageMin ?? 18) - 2;
  const aMax = (userA.preferences?.ageMax ?? 99) + 2;
  const bMin = (userB.preferences?.ageMin ?? 18) - 2;
  const bMax = (userB.preferences?.ageMax ?? 99) + 2;

  if (bAge < aMin || bAge > aMax) return false;
  if (aAge < bMin || aAge > bMax) return false;

  return true;
}
