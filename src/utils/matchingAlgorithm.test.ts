/**
 * Matching Algorithm Tests
 *
 * Run with: npx tsx src/utils/matchingAlgorithm.test.ts
 */

import { calculateMatchScore, isViableMatch, MatchScore } from './matchingAlgorithm.js';
import { UserProfile } from '../types/index.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const baseProfile: Partial<UserProfile> = {
  id: 'test-id',
  userId: 'user-id',
  firstName: 'Test',
  lastName: 'User',
  photos: [],
  interests: [],
  values: [],
  lifestyle: {},
  nonNegotiables: [],
  preferences: {
    ageMin: 25,
    ageMax: 35,
    gender: 'both',
    lookingFor: 'relationship',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createProfile(overrides: Partial<UserProfile>): UserProfile {
  return { ...baseProfile, ...overrides } as UserProfile;
}

// ============================================================================
// Test Cases
// ============================================================================

function runTests() {
  console.log('='.repeat(60));
  console.log('BRIDGE MATCHING ALGORITHM TESTS');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Perfect match
  testPerfectMatch();

  // Test 2: Age out of range
  testAgeOutOfRange();

  // Test 3: Shared interests boost
  testSharedInterests();

  // Test 4: Political compatibility
  testPoliticalCompatibility();

  // Test 5: Lifestyle matching
  testLifestyleMatching();

  // Test 6: Distance scoring
  testDistanceScoring();

  // Test 7: Family plans compatibility
  testFamilyPlans();

  console.log('='.repeat(60));
  console.log('ALL TESTS COMPLETE');
  console.log('='.repeat(60));
}

function printScore(name: string, score: MatchScore) {
  console.log(`\n--- ${name} ---`);
  console.log(`Total Score: ${score.total.toFixed(1)}%`);
  console.log(`Mutual Compatibility: ${score.mutualCompatibility}`);

  console.log('\nBreakdown:');
  for (const cat of score.breakdown) {
    const bar = '█'.repeat(Math.floor(cat.rawScore / 10)) + '░'.repeat(10 - Math.floor(cat.rawScore / 10));
    console.log(`  ${cat.category.padEnd(12)} ${bar} ${cat.rawScore.toFixed(0).padStart(3)}% (${(cat.weight * 100).toFixed(0)}% weight) → ${cat.weightedScore.toFixed(1)}%`);
  }
}

function testPerfectMatch() {
  console.log('\n📊 TEST 1: Perfect Match');

  const userA = createProfile({
    age: 28,
    gender: ['woman'],
    interestedInGenders: ['man'],
    height: "5'6\"",
    values: ['honesty', 'kindness', 'ambition'],
    interests: ['hiking', 'cooking', 'travel'],
    religion: 'agnostic',
    politicalLeaning: 'liberal',
    educationLevel: 'bachelors',
    familyPlans: 'want_someday',
    drinkingFrequency: 'socially',
    preferences: { ageMin: 26, ageMax: 34, gender: 'male', lookingFor: 'relationship' },
  });

  const userB = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    height: "5'10\"",
    values: ['honesty', 'kindness', 'humor'],
    interests: ['hiking', 'cooking', 'reading'],
    religion: 'agnostic',
    politicalLeaning: 'liberal',
    educationLevel: 'masters',
    familyPlans: 'want_someday',
    drinkingFrequency: 'socially',
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  const score = calculateMatchScore(userA, userB, 10);
  printScore('Perfect Match', score);
}

function testAgeOutOfRange() {
  console.log('\n📊 TEST 2: Age Out of Range');

  const userA = createProfile({
    age: 25,
    gender: ['woman'],
    interestedInGenders: ['man'],
    preferences: { ageMin: 25, ageMax: 30, gender: 'male', lookingFor: 'relationship' },
  });

  const userB = createProfile({
    age: 40, // Too old for A's preference
    gender: ['man'],
    interestedInGenders: ['woman'],
    preferences: { ageMin: 22, ageMax: 28, gender: 'female', lookingFor: 'relationship' },
  });

  const score = calculateMatchScore(userA, userB);
  printScore('Age Mismatch', score);
}

function testSharedInterests() {
  console.log('\n📊 TEST 3: Shared Interests Impact');

  const userA = createProfile({
    age: 28,
    gender: ['woman'],
    interestedInGenders: ['man'],
    interests: ['hiking', 'photography', 'yoga', 'cooking', 'travel'],
    values: ['honesty', 'growth', 'adventure'],
    preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  });

  // High overlap
  const userB1 = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    interests: ['hiking', 'photography', 'cooking', 'music', 'travel'],
    values: ['honesty', 'growth', 'family'],
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  // Low overlap
  const userB2 = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    interests: ['gaming', 'cars', 'sports', 'fishing'],
    values: ['success', 'wealth', 'independence'],
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  const scoreHigh = calculateMatchScore(userA, userB1);
  const scoreLow = calculateMatchScore(userA, userB2);

  printScore('High Interest Overlap', scoreHigh);
  printScore('Low Interest Overlap', scoreLow);
}

function testPoliticalCompatibility() {
  console.log('\n📊 TEST 4: Political Compatibility');

  const liberal = createProfile({
    age: 28,
    gender: ['woman'],
    interestedInGenders: ['man'],
    politicalLeaning: 'very_liberal',
    preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  });

  const moderate = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    politicalLeaning: 'moderate',
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  const conservative = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    politicalLeaning: 'very_conservative',
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  const score1 = calculateMatchScore(liberal, moderate);
  const score2 = calculateMatchScore(liberal, conservative);

  printScore('Liberal + Moderate', score1);
  printScore('Liberal + Very Conservative', score2);
}

function testLifestyleMatching() {
  console.log('\n📊 TEST 5: Lifestyle Matching');

  const userA = createProfile({
    age: 28,
    gender: ['woman'],
    interestedInGenders: ['man'],
    drinkingFrequency: 'socially',
    cannabisFrequency: 'never',
    tobaccoFrequency: 'never',
    partnerLifestylePreferences: {
      drinking: ['socially', 'rarely'],
      cannabis: ['never'],
      tobacco: ['never'],
      otherDrugs: ['never'],
    },
    preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  });

  // Compatible lifestyle
  const userB1 = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    drinkingFrequency: 'socially',
    cannabisFrequency: 'never',
    tobaccoFrequency: 'never',
    partnerLifestylePreferences: {
      drinking: ["don't care"],
      cannabis: ["don't care"],
      tobacco: ["don't care"],
      otherDrugs: ["don't care"],
    },
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  // Incompatible lifestyle
  const userB2 = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    drinkingFrequency: 'daily',
    cannabisFrequency: 'regularly',
    tobaccoFrequency: 'often',
    partnerLifestylePreferences: {
      drinking: ['regularly', 'daily'],
      cannabis: ['regularly'],
      tobacco: ['often'],
      otherDrugs: ["don't care"],
    },
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
  });

  const scoreMatch = calculateMatchScore(userA, userB1);
  const scoreMismatch = calculateMatchScore(userA, userB2);

  printScore('Compatible Lifestyle', scoreMatch);
  printScore('Incompatible Lifestyle', scoreMismatch);
}

function testDistanceScoring() {
  console.log('\n📊 TEST 6: Distance Scoring');

  const userA = createProfile({
    age: 28,
    gender: ['woman'],
    interestedInGenders: ['man'],
    preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship', maxDistance: 50 },
  });

  const userB = createProfile({
    age: 30,
    gender: ['man'],
    interestedInGenders: ['woman'],
    preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship', maxDistance: 50 },
  });

  const distances = [5, 15, 30, 45, 60];

  for (const dist of distances) {
    const score = calculateMatchScore(userA, userB, dist);
    const distCat = score.breakdown.find(c => c.category === 'distance');
    console.log(`  ${dist} miles: ${distCat?.rawScore.toFixed(0)}% (weighted: ${distCat?.weightedScore.toFixed(1)}%)`);
  }
}

function testFamilyPlans() {
  console.log('\n📊 TEST 7: Family Plans Compatibility');

  const wantsKids = createProfile({
    age: 28,
    gender: ['woman'],
    interestedInGenders: ['man'],
    familyPlans: 'want_someday',
    preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  });

  const scenarios = [
    { plans: 'want_someday', label: 'Also wants kids' },
    { plans: 'open', label: 'Open to kids' },
    { plans: 'not_sure', label: 'Not sure' },
    { plans: 'dont_want', label: "Doesn't want kids" },
  ];

  for (const { plans, label } of scenarios) {
    const partner = createProfile({
      age: 30,
      gender: ['man'],
      interestedInGenders: ['woman'],
      familyPlans: plans,
      preferences: { ageMin: 25, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
    });

    const score = calculateMatchScore(wantsKids, partner);
    const familyCat = score.breakdown.find(c => c.category === 'family');
    console.log(`  ${label}: ${familyCat?.rawScore.toFixed(0)}% (weighted: ${familyCat?.weightedScore.toFixed(1)}%)`);
  }
}

// Run tests if executed directly
runTests();
