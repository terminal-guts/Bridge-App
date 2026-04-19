/**
 * Bridge Matching Algorithm — Scoring Engine v3 (Deno/TypeScript)
 *
 * 8-category mutual percentage-based scoring. All category weights sum to 100%.
 *
 * v3 Changes (2026-04-18):
 *   - Removed family, deep_questions, education, career categories.
 *     The underlying onboarding steps for these fields were removed, so their
 *     scorers were running on fallback defaults for every user, adding noise
 *     rather than signal. Weights redistributed proportionally to the 8
 *     remaining categories.
 *
 * v2 Changes (2026-03-15):
 *   - Fixed interests/values: overlap coefficient → modified Jaccard (fixes small-set inflation)
 *   - Fixed religion: preference bonus/penalty model replaces perverse incentive blend
 *   - Fixed politics: not_political is orthogonal to spectrum, not on it
 *   - Fixed ethnicity: partial credit via cultural proximity groups
 *   - Fixed substances: ordinal gradient replaces binary cliff-edge
 *   - Principled missing data defaults
 *
 * Category Weights:
 *   Interests:      25%    Values:        14%    Lifestyle:     12%
 *   Age Range:      12%    Ethnicity:     12%    Religion:       9%
 *   Politics:        8%    Height:         8%
 */

import type { CompatibilityResult } from './types.ts';

type Dict = Record<string, unknown>;

// ── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS: Record<string, number> = {
  interests: 0.25,
  values: 0.14,
  lifestyle_substances: 0.12,
  age_range: 0.12,
  ethnicity: 0.12,
  religion: 0.09,
  politics: 0.08,
  height: 0.08,
};

// ── Constants ────────────────────────────────────────────────────────────────

const SIMILAR_RELIGIONS: Map<string, number> = new Map([
  ['christian|catholic', 0.75],
  ['christian|spiritual', 0.65],
  ['catholic|spiritual', 0.60],
  ['buddhist|spiritual', 0.70],
  ['hindu|spiritual', 0.60],
  ['jewish|spiritual', 0.50],
  ['agnostic|spiritual', 0.65],
  ['agnostic|atheist', 0.70],
]);

const RELIGIOUS_SET = new Set([
  'buddhist', 'catholic', 'christian', 'hindu', 'jewish', 'muslim',
  'protestant', 'sikh', 'mormon', 'orthodox', 'evangelical',
]);

// not_political compatibility — orthogonal to the liberal-conservative spectrum
const NOT_POLITICAL_COMPAT: Record<string, number> = {
  'not_political': 1.0,
  'moderate': 0.75,
  'liberal': 0.55,
  'conservative': 0.55,
  'very_liberal': 0.35,
  'very_conservative': 0.35,
};

const POLITICS_SPECTRUM = [
  'very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative',
];

// Spectrum distance scores (gap → score)
const POLITICS_GAP_SCORES: number[] = [1.0, 0.80, 0.50, 0.20, 0.05];

// Ordinal scales for substance scoring
const SUBSTANCE_ORDINAL: Record<string, Record<string, number>> = {
  drinking: { no: 0, never: 0, rarely: 1, sometimes: 2, socially: 2, regularly: 3, yes: 3 },
  cannabis: { no: 0, never: 0, rarely: 1, sometimes: 2, regularly: 3, yes: 3 },
  tobacco: { no: 0, never: 0, sometimes: 1, regularly: 2, yes: 2 },
  other_drugs: { no: 0, never: 0, sometimes: 1, regularly: 2, yes: 2 },
};

// Ethnicity cultural proximity for partial credit
const ETHNICITY_PROXIMITY: Record<string, Record<string, number>> = {
  'east asian': { 'southeast asian': 0.5, 'south asian': 0.25 },
  'southeast asian': { 'east asian': 0.5, 'south asian': 0.35, 'pacific islander': 0.35 },
  'south asian': { 'southeast asian': 0.35, 'middle eastern': 0.25, 'east asian': 0.25 },
  'hispanic': { 'white': 0.25, 'native american': 0.2 },
  'middle eastern': { 'south asian': 0.25, 'white': 0.15 },
  'pacific islander': { 'southeast asian': 0.35 },
  'native american': { 'hispanic': 0.2 },
};

const STANDARD_ETHNICITIES = new Set([
  'black', 'east asian', 'hispanic', 'middle eastern', 'native american',
  'pacific islander', 'south asian', 'southeast asian', 'white', 'other',
  'asian', 'latino', 'african', 'caribbean', 'mixed', 'multiracial',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function _get(profile: Dict, key: string, defaultVal: unknown = null): unknown {
  return profile[key] ?? defaultVal;
}

function _getPref(profile: Dict, prefs: Dict, key: string, defaultVal: unknown = null): unknown {
  return prefs[key] ?? defaultVal;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Interest Clusters (for partial credit on same-category interests) ────────

const INTEREST_CLUSTERS: Record<string, string[]> = {
  outdoor_active: ['hiking', 'camping', 'running', 'skiing'],
  fitness: ['lifting', 'yoga', 'basketball', 'tennis', 'golf', 'live sports', 'watching sports'],
  cultural: ['museums', 'theater', 'live music', 'comedy shows', 'film', 'reading', 'photography'],
  social: ['dinner parties', 'game nights', 'trivia nights', 'dancing', 'poker', 'video games'],
  food_drink: ['cooking', 'coffee', 'cocktails', 'fine dining', 'brunch'],
  intellectual: ['startups', 'investing', 'real estate', 'podcasts', 'meditation'],
};

// Build reverse lookup: interest → cluster name
const INTEREST_TO_CLUSTER: Record<string, string> = {};
for (const [cluster, interests] of Object.entries(INTEREST_CLUSTERS)) {
  for (const interest of interests) {
    INTEREST_TO_CLUSTER[interest] = cluster;
  }
}

function countClusterOverlap(aInts: Set<string>, bInts: Set<string>, exactShared: number): number {
  // Count how many interests fall in the same cluster but aren't exact matches
  const aClusters = new Map<string, number>();
  const bClusters = new Map<string, number>();

  for (const i of aInts) {
    const cluster = INTEREST_TO_CLUSTER[i];
    if (cluster) aClusters.set(cluster, (aClusters.get(cluster) || 0) + 1);
  }
  for (const i of bInts) {
    if (aInts.has(i)) continue; // Skip exact matches — already counted
    const cluster = INTEREST_TO_CLUSTER[i];
    if (cluster && aClusters.has(cluster)) {
      bClusters.set(cluster, (bClusters.get(cluster) || 0) + 1);
    }
  }

  // Count clusters where both users have interests (but different ones)
  let clusterOverlaps = 0;
  for (const [cluster] of bClusters) {
    clusterOverlaps++;
  }
  return clusterOverlaps;
}

// ── Interests (25%) — Modified Jaccard + Cluster Bonus ───────────────────────

function scoreInterests(profileA: Dict, profileB: Dict): number {
  const aRaw = (_get(profileA, 'interests') || []) as string[];
  const bRaw = (_get(profileB, 'interests') || []) as string[];
  const aInts = new Set<string>(aRaw.map((i: string) => i.toLowerCase()));
  const bInts = new Set<string>(bRaw.map((i: string) => i.toLowerCase()));

  if (aInts.size === 0 && bInts.size === 0) return 0.5;
  if (aInts.size === 0 || bInts.size === 0) return 0.4;

  let shared = 0;
  for (const v of aInts) if (bInts.has(v)) shared++;

  // Cluster partial credit: same-category interests that aren't exact matches
  const clusterOverlaps = countClusterOverlap(aInts, bInts, shared);
  // Each cluster overlap counts as 0.35 of an exact match
  const effectiveShared = shared + clusterOverlaps * 0.35;

  if (effectiveShared === 0) return 0.0;

  // Union for Jaccard (uses exact counts only — clusters are a bonus)
  const unionSize = new Set([...aInts, ...bInts]).size;
  const jaccard = shared / unionSize;

  // Absolute bonus: caps at 3 (users select max 5 interests, so 3 shared = very strong)
  const absoluteBonus = Math.min(effectiveShared / 3, 1.0);

  // Weight absolute count more heavily — having things to DO together matters most
  return jaccard * 0.35 + absoluteBonus * 0.65;
}

// ── Values (14%) — Modified Jaccard ──────────────────────────────────────────

function scoreValues(profileA: Dict, profileB: Dict): number {
  const aVals = new Set<string>((_get(profileA, 'values') || []) as string[]);
  const bVals = new Set<string>((_get(profileB, 'values') || []) as string[]);

  if (aVals.size === 0 && bVals.size === 0) return 0.5;
  if (aVals.size === 0 || bVals.size === 0) return 0.4;

  let shared = 0;
  for (const v of aVals) if (bVals.has(v)) shared++;

  if (shared === 0) return 0.0;

  const unionSize = new Set([...aVals, ...bVals]).size;
  const jaccard = shared / unionSize;

  // Absolute bonus: caps at 3 (users select max 5 values)
  const absoluteBonus = Math.min(shared / 3, 1.0);

  return jaccard * 0.35 + absoluteBonus * 0.65;
}

// ── Lifestyle / Substances (12%) — Ordinal Gradients ─────────────────────────

function scoreSingleSubstance(
  aHabit: string | null,
  bPrefsForSubstance: unknown,
  bHabit: string | null,
  aPrefsForSubstance: unknown,
  substance: string,
): number {
  const ordinalScale = SUBSTANCE_ORDINAL[substance] || SUBSTANCE_ORDINAL.drinking;
  const maxOrd = Math.max(...Object.values(ordinalScale));

  function oneDirection(habit: string | null, rawPrefs: unknown): number {
    if (habit == null || habit === '') return 0.6;
    if (rawPrefs == null || (Array.isArray(rawPrefs) && rawPrefs.length === 0)) return 1.0;

    let prefsList: string[];
    if (typeof rawPrefs === 'string') {
      if (rawPrefs === 'dont_care' || rawPrefs === "don't care") return 1.0;
      prefsList = [rawPrefs];
    } else if (Array.isArray(rawPrefs)) {
      prefsList = rawPrefs as string[];
    } else {
      return 0.6;
    }

    if (prefsList.includes('dont_care') || prefsList.includes("don't care")) return 1.0;
    if (prefsList.includes(habit)) return 1.0;
    if (habit === 'prefer_not_to_say') return 0.5;

    // Ordinal gradient fallback: find minimum distance to any preferred value
    const habitOrd = ordinalScale[habit.toLowerCase()];
    if (habitOrd == null) return 0.5;

    let minDist = maxOrd;
    for (const pref of prefsList) {
      const prefOrd = ordinalScale[pref.toLowerCase()];
      if (prefOrd != null) {
        minDist = Math.min(minDist, Math.abs(habitOrd - prefOrd));
      }
    }

    if (minDist === 0) return 1.0;
    // Decay: 1 step → 0.6, 2 steps → 0.35, 3 steps → 0.15
    return Math.max(0.1, 1.0 - (minDist / maxOrd) * 0.85);
  }

  const aToB = oneDirection(aHabit, bPrefsForSubstance);
  const bToA = oneDirection(bHabit, aPrefsForSubstance);
  return (aToB + bToA) / 2;
}

function getLifestylePref(prefs: Dict, substance: string): unknown {
  const prefKey = `partner_${substance}`;
  const val = prefs[prefKey];
  if (val != null) return val;

  const oldPrefs = prefs['partner_lifestyle_preferences'];
  if (oldPrefs && typeof oldPrefs === 'object') return (oldPrefs as Record<string, unknown>)[substance];
  return null;
}

function scoreLifestyle(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const substances = ['drinking', 'cannabis', 'tobacco', 'other_drugs'];
  const habitKeys = [
    'drinking_frequency', 'cannabis_frequency',
    'tobacco_frequency', 'other_drugs_frequency',
  ];

  let total = 0.0;
  for (let i = 0; i < substances.length; i++) {
    const aHabit = _get(profileA, habitKeys[i]) as string | null;
    const bHabit = _get(profileB, habitKeys[i]) as string | null;
    const aPref = getLifestylePref(prefsA, substances[i]);
    const bPref = getLifestylePref(prefsB, substances[i]);
    total += scoreSingleSubstance(aHabit, bPref, bHabit, aPref, substances[i]);
  }
  return total / substances.length;
}

// ── Age (12%) ────────────────────────────────────────────────────────────────

function scoreAge(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const ageA = _get(profileA, 'age') as number | null;
  const ageB = _get(profileB, 'age') as number | null;

  if (ageA == null || ageB == null) return 0.5;

  const aMin = _getPref(profileA, prefsA, 'age_min', 18) as number;
  const aMax = _getPref(profileA, prefsA, 'age_max', 99) as number;
  const bMin = _getPref(profileB, prefsB, 'age_min', 18) as number;
  const bMax = _getPref(profileB, prefsB, 'age_max', 99) as number;

  function directionScore(personAge: number, prefMin: number, prefMax: number): number {
    if (personAge < prefMin || personAge > prefMax) return 0.0;
    const ideal = (prefMin + prefMax) / 2;
    const halfRange = (prefMax - prefMin) / 2;
    if (halfRange === 0) return personAge === ideal ? 1.0 : 0.0;
    const dist = Math.abs(personAge - ideal);
    return 1.0 - (dist / halfRange) * 0.5;
  }

  const aToB = directionScore(ageB, aMin, aMax);
  const bToA = directionScore(ageA, bMin, bMax);
  return (aToB + bToA) / 2;
}

// ── Religion (9%) — Compatibility base + preference bonus/penalty ────────────

function getReligionSimilarity(a: string, b: string): number | null {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const key1 = `${aLower}|${bLower}`;
  const key2 = `${bLower}|${aLower}`;
  return SIMILAR_RELIGIONS.get(key1) ?? SIMILAR_RELIGIONS.get(key2) ?? null;
}

function isOpposingReligion(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === 'atheist' && RELIGIOUS_SET.has(bLower)) return true;
  if (bLower === 'atheist' && RELIGIOUS_SET.has(aLower)) return true;
  return false;
}

function scoreReligion(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aReligion = _get(profileA, 'religion') as string | null;
  const bReligion = _get(profileB, 'religion') as string | null;

  if (!aReligion || !bReligion) return 0.5;
  if (aReligion.toLowerCase() === 'other' || bReligion.toLowerCase() === 'other') return 0.5;

  const aPrefRel: string[] = (_getPref(profileA, prefsA, 'preferred_religions', []) || []) as string[];
  const bPrefRel: string[] = (_getPref(profileB, prefsB, 'preferred_religions', []) || []) as string[];

  // Base compatibility score (symmetric)
  function compatScore(relA: string, relB: string): number {
    if (relA.toLowerCase() === relB.toLowerCase()) return 1.0;
    const similarity = getReligionSimilarity(relA, relB);
    if (similarity != null) return similarity;
    if (isOpposingReligion(relA, relB)) return 0.25;
    return 0.50;
  }

  // Preference check: does their religion match my preferences?
  function prefMatch(theirReligion: string, myPrefReligions: string[]): boolean | null {
    if (!myPrefReligions.length) return null; // No preference set
    const prefLower = myPrefReligions.map(r => r.toLowerCase());
    if (prefLower.includes('no preference')) return null;

    const components = theirReligion.includes(' / ')
      ? theirReligion.split(' / ').map(c => c.trim().toLowerCase())
      : [theirReligion.toLowerCase()];
    for (const comp of components) {
      if (prefLower.includes(comp)) return true;
    }
    return false;
  }

  const baseCompat = compatScore(aReligion, bReligion);

  // Preference bonus/penalty (additive, not replacing compat)
  const aMatch = prefMatch(bReligion, aPrefRel);
  const bMatch = prefMatch(aReligion, bPrefRel);

  // If pref set and matched → +0.2 bonus; if set and not matched → -0.15 penalty
  const aBonus = aMatch === null ? 0 : (aMatch ? 0.2 : -0.15);
  const bBonus = bMatch === null ? 0 : (bMatch ? 0.2 : -0.15);

  const aScore = clamp(baseCompat + aBonus, 0, 1);
  const bScore = clamp(baseCompat + bBonus, 0, 1);
  return (aScore + bScore) / 2;
}

// ── Politics (8%) — not_political is orthogonal ──────────────────────────────

function scorePolitics(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aPolitics = (_get(profileA, 'political_leaning') as string | null)?.toLowerCase() || null;
  const bPolitics = (_get(profileB, 'political_leaning') as string | null)?.toLowerCase() || null;

  if (!aPolitics || !bPolitics) return 0.5;
  if (aPolitics === 'other' || bPolitics === 'other') return 0.5;
  if (aPolitics === 'prefer_not_to_say' || bPolitics === 'prefer_not_to_say') return 0.5;

  const aPrefPolitics: string[] = (_getPref(profileA, prefsA, 'preferred_politics', []) || []) as string[];
  const bPrefPolitics: string[] = (_getPref(profileB, prefsB, 'preferred_politics', []) || []) as string[];

  function spectrumCompat(leaningA: string, leaningB: string): number {
    if (leaningA === leaningB) return 1.0;

    // Handle not_political as orthogonal axis
    if (leaningA === 'not_political' || leaningB === 'not_political') {
      const other = leaningA === 'not_political' ? leaningB : leaningA;
      return NOT_POLITICAL_COMPAT[other] ?? 0.5;
    }

    const aIdx = POLITICS_SPECTRUM.indexOf(leaningA);
    const bIdx = POLITICS_SPECTRUM.indexOf(leaningB);
    if (aIdx >= 0 && bIdx >= 0) {
      const gap = Math.abs(aIdx - bIdx);
      return POLITICS_GAP_SCORES[gap] ?? 0.05;
    }

    return 0.5;
  }

  function oneDirection(theirLeaning: string, myLeaning: string, myPrefPolitics: string[]): number {
    const normalizedPrefs = myPrefPolitics.map(p => p.toLowerCase().replace(/\s+/g, '_'));
    if (!normalizedPrefs.length || normalizedPrefs.includes('no_preference')) {
      return spectrumCompat(theirLeaning, myLeaning);
    }
    // Preference match
    if (normalizedPrefs.includes(theirLeaning)) return 1.0;
    // Not in preferences — use spectrum distance but penalized
    return spectrumCompat(theirLeaning, myLeaning) * 0.8;
  }

  const aToB = oneDirection(bPolitics, aPolitics, aPrefPolitics);
  const bToA = oneDirection(aPolitics, bPolitics, bPrefPolitics);
  return (aToB + bToA) / 2;
}

// ── Height (8%) ──────────────────────────────────────────────────────────────

function scoreHeight(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aHeight = _get(profileA, 'height_inches') as number | null;
  const bHeight = _get(profileB, 'height_inches') as number | null;

  if (aHeight == null || bHeight == null) return 0.7;

  const aMin = _getPref(profileA, prefsA, 'preferred_height_min_inches') ?? _getPref(profileA, prefsA, 'height_min');
  const aMax = _getPref(profileA, prefsA, 'preferred_height_max_inches') ?? _getPref(profileA, prefsA, 'height_max');
  const bMin = _getPref(profileB, prefsB, 'preferred_height_min_inches') ?? _getPref(profileB, prefsB, 'height_min');
  const bMax = _getPref(profileB, prefsB, 'preferred_height_max_inches') ?? _getPref(profileB, prefsB, 'height_max');

  function directionScore(personHeight: number, prefMin: number | null, prefMax: number | null): number {
    if ((!prefMin || prefMin === 0) && (!prefMax || prefMax === 0 || prefMax >= 120)) return 1.0;

    const effectiveMin = (prefMin && prefMin > 0) ? prefMin : 48;
    const effectiveMax = (prefMax && prefMax < 120) ? prefMax : 96;

    if (personHeight < effectiveMin || personHeight > effectiveMax) return 0.0;

    const ideal = (effectiveMin + effectiveMax) / 2;
    const halfRange = (effectiveMax - effectiveMin) / 2;
    if (halfRange === 0) return personHeight === ideal ? 1.0 : 0.0;
    const dist = Math.abs(personHeight - ideal);
    return 1.0 - (dist / halfRange) * 0.5;
  }

  const aToB = directionScore(bHeight as number, aMin as number | null, aMax as number | null);
  const bToA = directionScore(aHeight as number, bMin as number | null, bMax as number | null);
  return (aToB + bToA) / 2;
}

// ── Ethnicity (12%) — Partial credit via cultural proximity ──────────────────

function scoreEthnicity(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aEthnicity = _get(profileA, 'ethnicity') as string | null;
  const bEthnicity = _get(profileB, 'ethnicity') as string | null;

  if (!aEthnicity || !bEthnicity) return 0.6;
  if (aEthnicity.toLowerCase() === 'other' || bEthnicity.toLowerCase() === 'other') return 0.5;

  const aPrefEth: string[] = (_getPref(profileA, prefsA, 'preferred_ethnicities', []) || []) as string[];
  const bPrefEth: string[] = (_getPref(profileB, prefsB, 'preferred_ethnicities', []) || []) as string[];

  function oneDirection(theirEthnicity: string, myPrefEthnicities: string[]): number {
    if (!myPrefEthnicities.length) return 1.0;
    const prefLowerCheck = myPrefEthnicities.map(e => e.toLowerCase().replace(/\s+/g, '_'));
    if (prefLowerCheck.includes('no_preference')) return 1.0;

    const prefLower = myPrefEthnicities.map(e => e.toLowerCase());
    const theirLower = theirEthnicity.toLowerCase();

    // Exact match
    if (prefLower.includes(theirLower)) return 1.0;

    // Multi-ethnic: check if any component matches
    if (theirEthnicity.includes(' / ')) {
      const components = theirEthnicity.split(' / ').map(c => c.trim().toLowerCase());
      for (const comp of components) {
        if (prefLower.includes(comp)) return 1.0;
      }
    }

    // Cultural proximity partial credit
    let bestProximity = 0;
    for (const pref of prefLower) {
      const proximityMap = ETHNICITY_PROXIMITY[pref];
      if (proximityMap) {
        const proximity = proximityMap[theirLower] || 0;
        bestProximity = Math.max(bestProximity, proximity);
      }
      // Also check reverse direction
      const reverseMap = ETHNICITY_PROXIMITY[theirLower];
      if (reverseMap) {
        const proximity = reverseMap[pref] || 0;
        bestProximity = Math.max(bestProximity, proximity);
      }
    }
    if (bestProximity > 0) return bestProximity;

    if (!STANDARD_ETHNICITIES.has(theirLower)) return 0.5;
    return 0.0;
  }

  const aToB = oneDirection(bEthnicity, aPrefEth);
  const bToA = oneDirection(aEthnicity, bPrefEth);
  return (aToB + bToA) / 2;
}

// ── Distance (disabled for campus beta, kept for future) ─────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Main API ────────────────────────────────────────────────────────────────

export function calculateCompatibility(
  profileA: Dict,
  prefsA: Dict,
  profileB: Dict,
  prefsB: Dict,
  actualDistance: number | null = null,
): CompatibilityResult {
  const raw: Record<string, number> = {
    interests: scoreInterests(profileA, profileB),
    values: scoreValues(profileA, profileB),
    lifestyle_substances: scoreLifestyle(profileA, prefsA, profileB, prefsB),
    age_range: scoreAge(profileA, prefsA, profileB, prefsB),
    religion: scoreReligion(profileA, prefsA, profileB, prefsB),
    politics: scorePolitics(profileA, prefsA, profileB, prefsB),
    height: scoreHeight(profileA, prefsA, profileB, prefsB),
    ethnicity: scoreEthnicity(profileA, prefsA, profileB, prefsB),
  };

  const weighted: Record<string, number> = {};
  let total = 0.0;
  for (const [category, rawScore] of Object.entries(raw)) {
    const w = WEIGHTS[category] || 0;
    const contribution = rawScore * w * 100;
    weighted[category] = Math.round(contribution * 100) / 100;
    total += contribution;
  }

  // Mutual satisfaction bonus: reward pairs where both sides are happy across
  // preference-based categories, penalize pairs with strong one-sided mismatches
  const prefCategories = ['lifestyle_substances', 'age_range', 'religion', 'height', 'ethnicity'];
  let mutualHighCount = 0;
  let severeMismatchCount = 0;
  for (const cat of prefCategories) {
    const score = raw[cat];
    if (score >= 0.8) mutualHighCount++;
    if (score <= 0.15) severeMismatchCount++;
  }
  // +1.5 per mutually-happy category (max +7.5), -2 per severe mismatch (max -10)
  const mutualBonus = mutualHighCount * 1.5 - severeMismatchCount * 2.0;
  total += mutualBonus;

  const categoryScores: Record<string, number> = {};
  for (const [cat, rawScore] of Object.entries(raw)) {
    categoryScores[cat] = Math.round(rawScore * 1000) / 10;
  }

  return {
    total_score: Math.round(Math.max(0, total) * 10) / 10,
    category_scores: categoryScores,
    weighted_scores: weighted,
    raw_scores: Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Math.round(v * 10000) / 10000]),
    ),
  };
}

export function passesBasicFilter(
  profileA: Dict,
  prefsA: Dict,
  profileB: Dict,
  prefsB: Dict,
): boolean {
  // Gender check first (eliminates ~50% of pairs for hetero users)
  let aGender: string[] = (_get(profileA, 'gender') || []) as string[];
  let bGender: string[] = (_get(profileB, 'gender') || []) as string[];
  let aInterested: string[] = (_get(profileA, 'interested_in_genders') || _getPref(profileA, prefsA, 'interested_in_genders', []) || []) as string[];
  let bInterested: string[] = (_get(profileB, 'interested_in_genders') || _getPref(profileB, prefsB, 'interested_in_genders', []) || []) as string[];

  if (typeof aGender === 'string') aGender = [aGender];
  if (typeof bGender === 'string') bGender = [bGender];

  if (aInterested.length > 0) {
    const aOk = bGender.some(g => aInterested.includes(g)) || aInterested.includes('everyone');
    if (!aOk) return false;
  }

  if (bInterested.length > 0) {
    const bOk = aGender.some(g => bInterested.includes(g)) || bInterested.includes('everyone');
    if (!bOk) return false;
  }

  // Age range check
  const aAge = _get(profileA, 'age') as number | null;
  const bAge = _get(profileB, 'age') as number | null;
  if (aAge && bAge) {
    const aMin = _getPref(profileA, prefsA, 'age_min', 18) as number;
    const aMax = _getPref(profileA, prefsA, 'age_max', 99) as number;
    const bMin = _getPref(profileB, prefsB, 'age_min', 18) as number;
    const bMax = _getPref(profileB, prefsB, 'age_max', 99) as number;

    if (bAge < aMin || bAge > aMax) return false;
    if (aAge < bMin || aAge > bMax) return false;
  }

  return true;
}
