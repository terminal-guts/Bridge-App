/**
 * Bridge Matching Algorithm — Scoring Engine (Deno/TypeScript)
 *
 * 10-category mutual percentage-based scoring. All categories sum to 100%.
 * Distance, Career, and Education removed for Rice University beta.
 *
 * Category Weights:
 *   Age Range:    18%    Interests:     15%    Lifestyle:     11%
 *   Height:       11%    Ethnicity:     11%    Politics:       9%
 *   Values:        7%    Family:         6%    Religion:       6%
 *   Deep Questions: 6%
 */

import type { CompatibilityResult } from './types.ts';

type Dict = Record<string, any>;

// ── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS: Record<string, number> = {
  age_range: 0.18,
  interests: 0.15,
  lifestyle_substances: 0.11,
  height: 0.11,
  ethnicity: 0.11,
  politics: 0.09,
  values: 0.07,
  family: 0.06,
  religion: 0.06,
  deep_questions: 0.06,
};

// ── Constants ────────────────────────────────────────────────────────────────

const SIMILAR_RELIGIONS: Set<string>[] = [
  new Set(['christian', 'spiritual']),
  new Set(['buddhist', 'spiritual']),
  new Set(['hindu', 'spiritual']),
];

const OPPOSING_RELIGIONS: Set<string>[] = [
  new Set(['atheist', 'christian']),
  new Set(['atheist', 'muslim']),
  new Set(['atheist', 'jewish']),
  new Set(['atheist', 'hindu']),
  new Set(['agnostic', 'christian']),
];

const RELIGIOUS_SET = new Set([
  'christian', 'catholic', 'protestant', 'muslim', 'jewish',
  'hindu', 'buddhist', 'sikh', 'mormon', 'jehovahs_witness',
]);

const POLITICS_ADJACENCY: Map<string, number> = new Map([
  ['very_liberal|liberal', 0.80],
  ['liberal|moderate', 0.70],
  ['moderate|conservative', 0.70],
  ['conservative|very_conservative', 0.80],
  ['moderate|not_political', 0.80],
]);

const POLITICS_SPECTRUM = [
  'very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative',
];

const EDUCATION_LEVELS: Record<string, number> = {
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
  other: 3,
};

const FAMILY_PLANS_MATRIX: Map<string, number> = new Map([
  ['want_someday|want_someday', 1.0],
  ['want_someday|open', 0.8],
  ['want_someday|not_sure', 0.6],
  ['want_someday|dont_want', 0.0],
  ['want_someday|prefer_not_to_say', 0.5],
  ['dont_want|dont_want', 1.0],
  ['dont_want|open', 0.4],
  ['dont_want|not_sure', 0.4],
  ['open|open', 1.0],
  ['open|not_sure', 0.8],
  ['not_sure|not_sure', 0.9],
]);

const DEEP_STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your',
  'he', 'she', 'it', 'they', 'them', 'the', 'a', 'an', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'need', 'dare', 'to', 'of', 'in', 'for', 'on',
  'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like', 'through',
  'after', 'over', 'between', 'out', 'up', 'down', 'then', 'than',
  'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom',
  'when', 'where', 'how', 'not', 'no', 'nor', 'but', 'and', 'or',
  'if', 'so', 'because', 'very', 'just', 'also', 'really', 'think',
  'know', 'want', 'get', 'go', 'make', 'see', 'come', 'take',
  'thing', 'things', 'something', 'someone', 'one', 'much', 'many',
  'would', 'could', 'should', 'dont', 'doesn', 'didn', 'won', 'isn',
  'its', 'im', 'ive', 'id', 'ill', 'thats', 'theyre', 'were',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function _get(profile: Dict, key: string, defaultVal: any = null): any {
  return profile[key] ?? defaultVal;
}

function _getPref(profile: Dict, prefs: Dict, key: string, defaultVal: any = null): any {
  return prefs[key] ?? defaultVal;
}

// ── Age (18%) ────────────────────────────────────────────────────────────────

function scoreAge(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const ageA = _get(profileA, 'age');
  const ageB = _get(profileB, 'age');

  if (ageA == null || ageB == null) return 0.5;

  const aMin = _getPref(profileA, prefsA, 'age_min', 18);
  const aMax = _getPref(profileA, prefsA, 'age_max', 99);
  const bMin = _getPref(profileB, prefsB, 'age_min', 18);
  const bMax = _getPref(profileB, prefsB, 'age_max', 99);

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

// ── Distance (15%) ──────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeCity(location: string | null): string {
  if (!location) return '';
  return location.trim().toLowerCase().split(',')[0].trim();
}

function scoreDistance(
  profileA: Dict, prefsA: Dict,
  profileB: Dict, prefsB: Dict,
  actualDistance: number | null = null,
): number {
  if (actualDistance == null) {
    const latA = _get(profileA, 'latitude');
    const lonA = _get(profileA, 'longitude');
    const latB = _get(profileB, 'latitude');
    const lonB = _get(profileB, 'longitude');

    if (latA && lonA && latB && lonB) {
      actualDistance = haversine(latA, lonA, latB, lonB);
    } else {
      const cityA = normalizeCity(_get(profileA, 'location'));
      const cityB = normalizeCity(_get(profileB, 'location'));
      if (cityA && cityB && cityA === cityB) return 0.90;
      return 0.5;
    }
  }

  let aMax = _getPref(profileA, prefsA, 'max_distance') ?? _getPref(profileA, prefsA, 'distance_miles');
  let bMax = _getPref(profileB, prefsB, 'max_distance') ?? _getPref(profileB, prefsB, 'distance_miles');

  if (aMax == null || aMax >= 200) aMax = 200;
  if (bMax == null || bMax >= 200) bMax = 200;

  const maxAcceptable = Math.min(aMax, bMax);
  if (actualDistance > maxAcceptable) return 0.0;
  if (maxAcceptable === 0) return 1.0;

  const score = 1.0 - (actualDistance / maxAcceptable) ** 0.7;
  return Math.max(0.0, score);
}

// ── Lifestyle / Substances (12%) ────────────────────────────────────────────

function scoreSingleSubstance(
  aHabit: string | null,
  bPrefsForSubstance: any,
  bHabit: string | null,
  aPrefsForSubstance: any,
): number {
  function oneDirection(habit: string | null, partnerPrefs: any): number {
    if (habit == null || habit === '') return 0.5;
    if (partnerPrefs == null || (Array.isArray(partnerPrefs) && partnerPrefs.length === 0)) return 1.0;
    if (typeof partnerPrefs === 'string') {
      if (partnerPrefs === 'dont_care' || partnerPrefs === "don't care") return 1.0;
      partnerPrefs = [partnerPrefs];
    }
    if (!Array.isArray(partnerPrefs)) return 0.5;
    if (partnerPrefs.includes('dont_care') || partnerPrefs.includes("don't care")) return 1.0;
    if (partnerPrefs.includes(habit)) return 1.0;

    if (habit === 'sometimes') {
      const hasOnlyYes = (partnerPrefs.length === 1 && (partnerPrefs[0] === 'yes' || partnerPrefs[0] === 'regularly'));
      const hasOnlyNo = (partnerPrefs.length === 1 && (partnerPrefs[0] === 'no' || partnerPrefs[0] === 'never'));
      if (hasOnlyYes || hasOnlyNo) return 0.5;
    }

    if (habit === 'prefer_not_to_say') return 0.5;
    return 0.0;
  }

  const aToB = oneDirection(aHabit, bPrefsForSubstance);
  const bToA = oneDirection(bHabit, aPrefsForSubstance);
  return (aToB + bToA) / 2;
}

function getLifestylePref(prefs: Dict, substance: string): any {
  const prefKey = `partner_${substance}`;
  const val = prefs[prefKey];
  if (val != null) return val;

  const oldPrefs = prefs['partner_lifestyle_preferences'];
  if (oldPrefs && typeof oldPrefs === 'object') return oldPrefs[substance];
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
    const aHabit = _get(profileA, habitKeys[i]);
    const bHabit = _get(profileB, habitKeys[i]);
    const aPref = getLifestylePref(prefsA, substances[i]);
    const bPref = getLifestylePref(prefsB, substances[i]);
    total += scoreSingleSubstance(aHabit, bPref, bHabit, aPref);
  }
  return total / substances.length;
}

// ── Values (8%) ─────────────────────────────────────────────────────────────

function scoreValues(profileA: Dict, profileB: Dict): number {
  const aVals = new Set<string>(_get(profileA, 'values') || []);
  const bVals = new Set<string>(_get(profileB, 'values') || []);

  if (aVals.size === 0 && bVals.size === 0) return 0.5;
  if (aVals.size === 0 || bVals.size === 0) return 0.25;

  let shared = 0;
  for (const v of aVals) if (bVals.has(v)) shared++;
  const smaller = Math.min(aVals.size, bVals.size);
  return shared / smaller;
}

// ── Interests (8%) ──────────────────────────────────────────────────────────

function scoreInterests(profileA: Dict, profileB: Dict): number {
  const aInts = new Set<string>((_get(profileA, 'interests') || []).map((i: string) => i.toLowerCase()));
  const bInts = new Set<string>((_get(profileB, 'interests') || []).map((i: string) => i.toLowerCase()));

  if (aInts.size === 0 && bInts.size === 0) return 0.5;
  if (aInts.size === 0 || bInts.size === 0) return 0.25;

  let shared = 0;
  for (const v of aInts) if (bInts.has(v)) shared++;
  const smaller = Math.min(aInts.size, bInts.size);
  return shared / smaller;
}

// ── Family (8%) ─────────────────────────────────────────────────────────────

function defaultChildrenScore(aChildren: string | null, bChildren: string | null): number {
  if (aChildren === 'prefer_not_to_say' || bChildren === 'prefer_not_to_say') return 0.75;
  if (aChildren == null || bChildren == null) return 0.5;
  if (aChildren === bChildren) return 1.0;
  return 0.5;
}

function scoreHasChildren(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aChildren = _get(profileA, 'has_children');
  const bChildren = _get(profileB, 'has_children');
  return defaultChildrenScore(aChildren, bChildren);
}

function scoreFamilyPlans(profileA: Dict, profileB: Dict): number {
  const aPlans = _get(profileA, 'family_plans');
  const bPlans = _get(profileB, 'family_plans');

  if (!aPlans || !bPlans) return 0.5;
  if (aPlans === 'prefer_not_to_say' || bPlans === 'prefer_not_to_say') return 0.5;

  const score = FAMILY_PLANS_MATRIX.get(`${aPlans}|${bPlans}`) ??
    FAMILY_PLANS_MATRIX.get(`${bPlans}|${aPlans}`);
  if (score != null) return score;
  return 0.5;
}

function scoreFamily(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const childrenScore = scoreHasChildren(profileA, prefsA, profileB, prefsB);
  const plansScore = scoreFamilyPlans(profileA, profileB);
  return childrenScore * 0.4 + plansScore * 0.6;
}

// ── Religion (6%) ───────────────────────────────────────────────────────────

function areSimilarReligions(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  for (const group of SIMILAR_RELIGIONS) {
    if (group.has(aLower) && group.has(bLower)) return true;
  }
  return false;
}

function areOpposingReligions(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  for (const pair of OPPOSING_RELIGIONS) {
    if (pair.has(aLower) && pair.has(bLower) && pair.size === 2) return true;
  }
  if (aLower === 'atheist' && RELIGIOUS_SET.has(bLower)) return true;
  if (bLower === 'atheist' && RELIGIOUS_SET.has(aLower)) return true;
  return false;
}

function scoreReligion(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aReligion = _get(profileA, 'religion');
  const bReligion = _get(profileB, 'religion');

  if (!aReligion || !bReligion) return 0.5;

  function oneDirection(theirReligion: string, myReligion: string): number {
    if (theirReligion.toLowerCase() === myReligion.toLowerCase()) return 1.0;
    if (areSimilarReligions(theirReligion, myReligion)) return 0.75;
    if (areOpposingReligions(theirReligion, myReligion)) return 0.25;
    return 0.50;
  }

  const aToB = oneDirection(bReligion, aReligion);
  const bToA = oneDirection(aReligion, bReligion);
  return (aToB + bToA) / 2;
}

// ── Politics (6%) ───────────────────────────────────────────────────────────

function scorePolitics(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aPolitics = _get(profileA, 'political_leaning');
  const bPolitics = _get(profileB, 'political_leaning');

  if (!aPolitics || !bPolitics) return 0.5;

  const aPrefPolitics: string[] = _getPref(profileA, prefsA, 'preferred_politics', []) || [];
  const bPrefPolitics: string[] = _getPref(profileB, prefsB, 'preferred_politics', []) || [];

  function oneDirection(theirLeaning: string, myLeaning: string, myPrefPolitics: string[]): number {
    if (theirLeaning === 'prefer_not_to_say' || myLeaning === 'prefer_not_to_say') return 0.5;
    const normalizedPrefs = myPrefPolitics.map(p => p.toLowerCase().replace(/\s+/g, '_'));
    if (!normalizedPrefs.length || normalizedPrefs.includes('no_preference')) return 1.0;
    if (normalizedPrefs.includes(theirLeaning)) return 1.0;
    if (theirLeaning === myLeaning) return 1.0;

    // Check adjacency
    const sortedPair = [theirLeaning, myLeaning].sort().join('|');
    const unsortedPair = `${theirLeaning}|${myLeaning}`;
    for (const [key, adjScore] of POLITICS_ADJACENCY) {
      const keyParts = new Set(key.split('|'));
      if (keyParts.has(theirLeaning) && keyParts.has(myLeaning)) return adjScore;
    }

    if (theirLeaning === 'not_political' || myLeaning === 'not_political') return 0.6;

    const pairSet = new Set([theirLeaning, myLeaning]);
    if (pairSet.has('very_liberal') && pairSet.has('very_conservative')) return 0.0;

    const aIdx = POLITICS_SPECTRUM.indexOf(theirLeaning);
    const bIdx = POLITICS_SPECTRUM.indexOf(myLeaning);
    if (aIdx >= 0 && bIdx >= 0) {
      const gap = Math.abs(aIdx - bIdx);
      if (gap >= 3) return 0.1;
      if (gap >= 2) return 0.3;
    }

    return 0.5;
  }

  const aToB = oneDirection(bPolitics, aPolitics, aPrefPolitics);
  const bToA = oneDirection(aPolitics, bPolitics, bPrefPolitics);
  return (aToB + bToA) / 2;
}

// ── Height (5%) ─────────────────────────────────────────────────────────────

function scoreHeight(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aHeight = _get(profileA, 'height_inches');
  const bHeight = _get(profileB, 'height_inches');

  if (aHeight == null || bHeight == null) return 0.5;

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

  const aToB = directionScore(bHeight, aMin, aMax);
  const bToA = directionScore(aHeight, bMin, bMax);
  return (aToB + bToA) / 2;
}

// ── Ethnicity (5%) ──────────────────────────────────────────────────────────

const STANDARD_ETHNICITIES = new Set([
  'white', 'black', 'asian', 'hispanic', 'latino', 'middle_eastern',
  'native_american', 'pacific_islander', 'south_asian', 'southeast_asian',
  'east_asian', 'african', 'caribbean', 'mixed', 'multiracial',
]);

function scoreEthnicity(profileA: Dict, prefsA: Dict, profileB: Dict, prefsB: Dict): number {
  const aEthnicity: string | null = _get(profileA, 'ethnicity');
  const bEthnicity: string | null = _get(profileB, 'ethnicity');

  if (!aEthnicity || !bEthnicity) return 0.5;

  const aPrefEth: string[] = _getPref(profileA, prefsA, 'preferred_ethnicities', []) || [];
  const bPrefEth: string[] = _getPref(profileB, prefsB, 'preferred_ethnicities', []) || [];

  function oneDirection(theirEthnicity: string, myPrefEthnicities: string[]): number {
    if (!myPrefEthnicities.length) return 1.0;
    const prefLowerCheck = myPrefEthnicities.map(e => e.toLowerCase().replace(/\s+/g, '_'));
    if (prefLowerCheck.includes('no_preference')) return 1.0;

    const prefLower = myPrefEthnicities.map(e => e.toLowerCase());
    if (prefLower.includes(theirEthnicity.toLowerCase())) return 1.0;

    // Check multi-ethnic
    if (theirEthnicity.includes(' / ')) {
      const components = theirEthnicity.split(' / ').map(c => c.trim().toLowerCase());
      for (const comp of components) {
        if (prefLower.includes(comp)) return 1.0;
      }
    }

    if (!STANDARD_ETHNICITIES.has(theirEthnicity.toLowerCase())) return 0.5;
    return 0.0;
  }

  const aToB = oneDirection(bEthnicity, aPrefEth);
  const bToA = oneDirection(aEthnicity, bPrefEth);
  return (aToB + bToA) / 2;
}

// ── Education (3%) ──────────────────────────────────────────────────────────

function scoreEducation(profileA: Dict, profileB: Dict): number {
  const aEdu = _get(profileA, 'education_level');
  const bEdu = _get(profileB, 'education_level');

  if (!aEdu || !bEdu) return 0.5;

  const aLevel = EDUCATION_LEVELS[aEdu.toLowerCase()] ?? 3;
  const bLevel = EDUCATION_LEVELS[bEdu.toLowerCase()] ?? 3;
  const gap = Math.abs(aLevel - bLevel);

  if (gap === 0) return 1.0;
  if (gap === 1) return 0.8;
  if (gap === 2) return 0.6;
  if (gap === 3) return 0.4;
  return 0.2;
}

// ── Career (1%) ─────────────────────────────────────────────────────────────

function normalizeText(text: string | null): string {
  if (!text) return '';
  return text.toLowerCase().trim();
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set(['the', 'a', 'an', 'at', 'in', 'of', 'and', 'or', 'for', 'to', 'is', 'inc', 'llc', 'ltd']);
  const words = new Set(normalizeText(text).split(/\s+/).filter(w => w.length > 0));
  const result = new Set<string>();
  for (const w of words) if (!stopWords.has(w)) result.add(w);
  return result;
}

function scoreCareer(profileA: Dict, profileB: Dict): number {
  const aJob = normalizeText(_get(profileA, 'current_job'));
  const bJob = normalizeText(_get(profileB, 'current_job'));
  const aCompany = normalizeText(_get(profileA, 'company_position'));
  const bCompany = normalizeText(_get(profileB, 'company_position'));
  const aSchool = normalizeText(_get(profileA, 'school'));
  const bSchool = normalizeText(_get(profileB, 'school'));

  if ((!aJob && !aCompany) || (!bJob && !bCompany)) return 0.5;
  if (aCompany && bCompany && aCompany === bCompany) return 1.0;
  if (aSchool && bSchool && aSchool === bSchool) return 1.0;

  const aKeywords = new Set([...extractKeywords(aJob), ...extractKeywords(aCompany)]);
  const bKeywords = new Set([...extractKeywords(bJob), ...extractKeywords(bCompany)]);

  if (aKeywords.size > 0 && bKeywords.size > 0) {
    for (const kw of aKeywords) {
      if (bKeywords.has(kw)) return 0.75;
    }
  }

  if (aJob && bJob) return 0.5;
  return 0.25;
}

// ── Deep Questions (5%) — Keyword fallback only ─────────────────────────────

function extractMeaningfulWords(text: string): Set<string> {
  if (!text) return new Set();
  const cleaned = text.toLowerCase().replace(/[^a-z\s]/g, '');
  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !DEEP_STOP_WORDS.has(w));
  return new Set(words);
}

function scoreQuestionOverlap(deepA: Dict[], deepB: Dict[]): number {
  const aIds = new Set(deepA.map(d => d.question_id).filter(Boolean));
  const bIds = new Set(deepB.map(d => d.question_id).filter(Boolean));

  if (aIds.size === 0 || bIds.size === 0) return 0.5;

  let shared = 0;
  for (const id of aIds) if (bIds.has(id)) shared++;
  const overlapRatio = shared / Math.min(aIds.size, bIds.size);
  return Math.min(1.0, overlapRatio * 1.2);
}

function scoreAnswerLengthSimilarity(deepA: Dict[], deepB: Dict[]): number {
  function avgLength(answers: Dict[]): number {
    const lengths = answers.map(d => (d.answer_text || '').length);
    return lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  }

  const aAvg = avgLength(deepA);
  const bAvg = avgLength(deepB);

  if (aAvg === 0 && bAvg === 0) return 0.5;
  if (aAvg === 0 || bAvg === 0) return 0.3;
  return Math.min(aAvg, bAvg) / Math.max(aAvg, bAvg);
}

function scoreKeywordOverlap(deepA: Dict[], deepB: Dict[]): number {
  const aWords = new Set<string>();
  for (const d of deepA) {
    for (const w of extractMeaningfulWords(d.answer_text || '')) aWords.add(w);
  }

  const bWords = new Set<string>();
  for (const d of deepB) {
    for (const w of extractMeaningfulWords(d.answer_text || '')) bWords.add(w);
  }

  if (aWords.size === 0 || bWords.size === 0) return 0.5;

  let shared = 0;
  for (const w of aWords) if (bWords.has(w)) shared++;
  const smaller = Math.min(aWords.size, bWords.size);
  if (smaller === 0) return 0.5;
  return Math.min(1.0, shared / smaller);
}

function scoreDeepQuestions(deepA: Dict[], deepB: Dict[]): number {
  if (deepA.length === 0 && deepB.length === 0) return 0.5;
  if (deepA.length === 0 || deepB.length === 0) return 0.3;

  const questionScore = scoreQuestionOverlap(deepA, deepB);
  const lengthScore = scoreAnswerLengthSimilarity(deepA, deepB);
  const keywordScore = scoreKeywordOverlap(deepA, deepB);

  // Question overlap weighted heavily — choosing the same questions signals alignment
  return questionScore * 0.55 + keywordScore * 0.30 + lengthScore * 0.15;
}

// ── Main API ────────────────────────────────────────────────────────────────

export function calculateCompatibility(
  profileA: Dict,
  prefsA: Dict,
  profileB: Dict,
  prefsB: Dict,
  actualDistance: number | null = null,
  deepQuestionsA: Dict[] = [],
  deepQuestionsB: Dict[] = [],
): CompatibilityResult {
  const raw: Record<string, number> = {
    age_range: scoreAge(profileA, prefsA, profileB, prefsB),
    lifestyle_substances: scoreLifestyle(profileA, prefsA, profileB, prefsB),
    interests: scoreInterests(profileA, profileB),
    values: scoreValues(profileA, profileB),
    family: scoreFamily(profileA, prefsA, profileB, prefsB),
    height: scoreHeight(profileA, prefsA, profileB, prefsB),
    ethnicity: scoreEthnicity(profileA, prefsA, profileB, prefsB),
    religion: scoreReligion(profileA, prefsA, profileB, prefsB),
    politics: scorePolitics(profileA, prefsA, profileB, prefsB),
    deep_questions: scoreDeepQuestions(deepQuestionsA, deepQuestionsB),
  };

  const weighted: Record<string, number> = {};
  let total = 0.0;
  for (const [category, rawScore] of Object.entries(raw)) {
    const w = WEIGHTS[category];
    const contribution = rawScore * w * 100;
    weighted[category] = Math.round(contribution * 100) / 100;
    total += contribution;
  }

  const categoryScores: Record<string, number> = {};
  for (const [cat, rawScore] of Object.entries(raw)) {
    categoryScores[cat] = Math.round(rawScore * 1000) / 10;
  }

  return {
    total_score: Math.round(total * 10) / 10,
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
  let aGender: string[] = _get(profileA, 'gender') || [];
  let bGender: string[] = _get(profileB, 'gender') || [];
  let aInterested: string[] = _get(profileA, 'interested_in_genders') || _getPref(profileA, prefsA, 'interested_in_genders', []) || [];
  let bInterested: string[] = _get(profileB, 'interested_in_genders') || _getPref(profileB, prefsB, 'interested_in_genders', []) || [];

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

  const aAge = _get(profileA, 'age');
  const bAge = _get(profileB, 'age');
  if (aAge && bAge) {
    const aMin = _getPref(profileA, prefsA, 'age_min', 18);
    const aMax = _getPref(profileA, prefsA, 'age_max', 99);
    const bMin = _getPref(profileB, prefsB, 'age_min', 18);
    const bMax = _getPref(profileB, prefsB, 'age_max', 99);

    if (bAge < aMin || bAge > aMax) return false;
    if (aAge < bMin || aAge > bMax) return false;
  }

  return true;
}
