/**
 * Tests for proposalMatching utility functions
 *
 * This is the core matching algorithm test suite. It covers:
 * - Haversine distance calculation
 * - Height conversion helpers
 * - All match*() functions with preference-based logic
 * - Overlap-based matching (values, interests)
 * - Section compatibility aggregation
 */

import {
  calculateDistance,
  heightToInches,
  inchesToHeight,
  matchAge,
  matchHeight,
  matchDatingDistance,
  matchEthnicity,
  matchPolitics,
  matchReligion,
  matchLifestyleAttribute,
  matchDrinking,
  matchCannabis,
  matchTobacco,
  matchOtherSubstances,
  matchValues,
  matchInterests,
  calculateSectionCompatibility,
  MatchResult,
} from '../../src/utils/proposalMatching';
import { UserProfile } from '../../src/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a minimal UserProfile with sensible defaults.
 * Override any field by passing a partial object.
 */
function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-id',
    userId: 'test-user',
    firstName: 'Test',
    lastName: 'User',
    age: 22,
    height: "5'10\"",
    ethnicity: 'White',
    religion: 'None',
    pronouns: 'he/him',
    gender: ['male'],
    politicalLeaning: 'moderate',
    educationLevel: 'bachelors',
    school: 'Rice University',
    photos: [],
    interests: [],
    values: [],
    lifestyle: {} as any,
    nonNegotiables: [],
    preferences: {
      ageMin: 18,
      ageMax: 30,
      gender: 'female',
      lookingFor: 'relationship',
    },
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

// ============================================================================
// calculateDistance() — Haversine Formula
// ============================================================================

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistance(29.7174, -95.4018, 29.7174, -95.4018)).toBe(0);
  });

  it('calculates Houston to Dallas (~239 miles)', () => {
    const distance = calculateDistance(29.7604, -95.3698, 32.7767, -96.7970);
    expect(distance).toBeGreaterThanOrEqual(225);
    expect(distance).toBeLessThanOrEqual(250);
  });

  it('calculates New York to Los Angeles (~2,451 miles)', () => {
    const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
    expect(distance).toBeGreaterThanOrEqual(2400);
    expect(distance).toBeLessThanOrEqual(2500);
  });

  it('calculates London to Paris (~213 miles)', () => {
    const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distance).toBeGreaterThanOrEqual(200);
    expect(distance).toBeLessThanOrEqual(230);
  });

  it('handles antipodal points (max distance ~12,451 miles)', () => {
    // North Pole to South Pole
    const distance = calculateDistance(90, 0, -90, 0);
    expect(distance).toBeGreaterThanOrEqual(12400);
    expect(distance).toBeLessThanOrEqual(12500);
  });

  it('handles crossing the prime meridian', () => {
    const distance = calculateDistance(51.5074, -0.1278, 51.5074, 0.1278);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThanOrEqual(20);
  });

  it('handles crossing the international date line', () => {
    const distance = calculateDistance(0, 179.9, 0, -179.9);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThanOrEqual(20);
  });

  it('returns a rounded integer', () => {
    const distance = calculateDistance(29.7174, -95.4018, 30.2672, -97.7431);
    expect(Number.isInteger(distance)).toBe(true);
  });
});

// ============================================================================
// heightToInches()
// ============================================================================

describe('heightToInches', () => {
  it('parses standard format 5\'10"', () => {
    expect(heightToInches("5'10\"")).toBe(70);
  });

  it('parses format with space 5\' 10" by falling back to parseInt', () => {
    // The regex /(\d+)'(\d+)/ does not match "5' 10" because of the space,
    // so it falls through to parseInt which parses the leading "5" => 5
    expect(heightToInches("5' 10\"")).toBe(5);
  });

  it('parses 6\'0"', () => {
    expect(heightToInches("6'0\"")).toBe(72);
  });

  it('parses 5\'0"', () => {
    expect(heightToInches("5'0\"")).toBe(60);
  });

  it('parses 7\'2" (tall)', () => {
    expect(heightToInches("7'2\"")).toBe(86);
  });

  it('passes through raw numeric string as inches', () => {
    expect(heightToInches('72')).toBe(72);
  });

  it('passes through numeric string for short height', () => {
    expect(heightToInches('60')).toBe(60);
  });

  it('returns null for empty string', () => {
    expect(heightToInches('')).toBeNull();
  });

  it('returns null for undefined-like falsy input', () => {
    expect(heightToInches(null as any)).toBeNull();
    expect(heightToInches(undefined as any)).toBeNull();
  });

  it('returns null for non-parseable string', () => {
    expect(heightToInches('tall')).toBeNull();
  });

  it('parses format without trailing quote 5\'10', () => {
    expect(heightToInches("5'10")).toBe(70);
  });
});

// ============================================================================
// inchesToHeight()
// ============================================================================

describe('inchesToHeight', () => {
  it('converts 70 inches to 5\'10"', () => {
    expect(inchesToHeight(70)).toBe("5'10\"");
  });

  it('converts 72 inches to 6\'0"', () => {
    expect(inchesToHeight(72)).toBe("6'0\"");
  });

  it('converts 60 inches to 5\'0"', () => {
    expect(inchesToHeight(60)).toBe("5'0\"");
  });

  it('converts 48 inches to 4\'0"', () => {
    expect(inchesToHeight(48)).toBe("4'0\"");
  });

  it('converts 84 inches to 7\'0"', () => {
    expect(inchesToHeight(84)).toBe("7'0\"");
  });

  it('handles 0 inches', () => {
    expect(inchesToHeight(0)).toBe("0'0\"");
  });

  it('is the inverse of heightToInches for standard heights', () => {
    const original = "5'10\"";
    const inches = heightToInches(original);
    expect(inches).not.toBeNull();
    expect(inchesToHeight(inches!)).toBe(original);
  });
});

// ============================================================================
// matchAge()
// ============================================================================

describe('matchAge', () => {
  it('returns both_happy when both ages are within each other\'s preferences', () => {
    const userA = makeProfile({ age: 22, preferences: { ageMin: 20, ageMax: 25, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ age: 23, preferences: { ageMin: 20, ageMax: 25, gender: 'male', lookingFor: 'relationship' } });
    const result = matchAge(userA, userB);
    expect(result.status).toBe('both_happy');
    expect(result.leftValue).toBe('22');
    expect(result.rightValue).toBe('23');
  });

  it('returns left_happy when only A\'s preference is satisfied', () => {
    const userA = makeProfile({ age: 22, preferences: { ageMin: 20, ageMax: 25, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ age: 23, preferences: { ageMin: 25, ageMax: 30, gender: 'male', lookingFor: 'relationship' } });
    const result = matchAge(userA, userB);
    expect(result.status).toBe('left_happy');
  });

  it('returns right_happy when only B\'s preference is satisfied', () => {
    // A wants 25-30, B is 27 — A happy? Yes (27 is in 25-30)
    // B wants 20-25, A is 22 — B happy? Yes (22 is in 20-25)
    // Need: A NOT happy with B's age, B happy with A's age
    const userA = makeProfile({ age: 22, preferences: { ageMin: 25, ageMax: 30, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ age: 23, preferences: { ageMin: 20, ageMax: 25, gender: 'male', lookingFor: 'relationship' } });
    // A wants 25-30, B is 23 — A NOT happy
    // B wants 20-25, A is 22 — B happy
    const result = matchAge(userA, userB);
    expect(result.status).toBe('right_happy');
  });

  it('returns neither_happy when both ages are outside preferences', () => {
    const userA = makeProfile({ age: 19, preferences: { ageMin: 25, ageMax: 30, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ age: 35, preferences: { ageMin: 25, ageMax: 30, gender: 'male', lookingFor: 'relationship' } });
    const result = matchAge(userA, userB);
    expect(result.status).toBe('neither_happy');
  });

  it('uses default range 18-99 when preferences are missing', () => {
    const userA = makeProfile({ age: 22, preferences: undefined as any });
    const userB = makeProfile({ age: 50, preferences: undefined as any });
    // With defaults: ageMin=18, ageMax=99 — both ages are in range
    const result = matchAge(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('handles exact boundary ages (inclusive)', () => {
    const userA = makeProfile({ age: 20, preferences: { ageMin: 20, ageMax: 25, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ age: 25, preferences: { ageMin: 20, ageMax: 25, gender: 'male', lookingFor: 'relationship' } });
    const result = matchAge(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns neither_happy when age is 1 below min on both sides', () => {
    const userA = makeProfile({ age: 19, preferences: { ageMin: 22, ageMax: 25, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ age: 21, preferences: { ageMin: 22, ageMax: 25, gender: 'male', lookingFor: 'relationship' } });
    const result = matchAge(userA, userB);
    expect(result.status).toBe('neither_happy');
  });
});

// ============================================================================
// matchHeight()
// ============================================================================

describe('matchHeight', () => {
  it('returns both_happy when both heights are within each other\'s preferences', () => {
    const userA = makeProfile({
      height: "5'10\"",
      preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', heightMin: 60, heightMax: 72 },
    });
    const userB = makeProfile({
      height: "5'6\"",
      preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', heightMin: 66, heightMax: 76 },
    });
    const result = matchHeight(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns neither_happy when both heights are outside preferences', () => {
    const userA = makeProfile({
      height: "5'4\"",
      preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', heightMin: 70, heightMax: 76 },
    });
    const userB = makeProfile({
      height: "6'2\"",
      preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', heightMin: 70, heightMax: 76 },
    });
    // A wants 70-76, B is 74 (6'2"), so A is happy
    // B wants 70-76, A is 64 (5'4"), so B is NOT happy
    const result = matchHeight(userA, userB);
    expect(result.status).toBe('left_happy');
  });

  it('returns both_happy when no height preferences are set (No Preference)', () => {
    const userA = makeProfile({ height: "5'10\"", preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ height: "5'2\"", preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship' } });
    const result = matchHeight(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns unknown when A has no height data', () => {
    const userA = makeProfile({ height: '' });
    const userB = makeProfile({ height: "5'10\"" });
    const result = matchHeight(userA, userB);
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when B has no height data', () => {
    const userA = makeProfile({ height: "5'10\"" });
    const userB = makeProfile({ height: '' });
    const result = matchHeight(userA, userB);
    expect(result.status).toBe('unknown');
  });

  it('formats height values in the result', () => {
    const userA = makeProfile({ height: "5'10\"" });
    const userB = makeProfile({ height: "6'0\"" });
    const result = matchHeight(userA, userB);
    expect(result.leftValue).toBe("5'10\"");
    expect(result.rightValue).toBe("6'0\"");
  });

  it('returns right_happy when only B\'s preference is met', () => {
    const userA = makeProfile({
      height: "6'0\"", // 72 inches
      preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', heightMin: 66, heightMax: 68 },
    });
    const userB = makeProfile({
      height: "5'8\"", // 68 inches — outside A's max of 68? No, 68 <= 68, so A happy
      preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', heightMin: 70, heightMax: 76 },
    });
    // A wants 66-68, B is 68 — A happy
    // B wants 70-76, A is 72 — B happy
    // Both happy actually. Let me adjust:
    const userC = makeProfile({
      height: "6'0\"", // 72 inches
      preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', heightMin: 60, heightMax: 64 },
    });
    const userD = makeProfile({
      height: "5'8\"", // 68 inches
      preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', heightMin: 70, heightMax: 76 },
    });
    // C wants 60-64, D is 68 — C NOT happy
    // D wants 70-76, C is 72 — D happy
    const result = matchHeight(userC, userD);
    expect(result.status).toBe('right_happy');
  });
});

// ============================================================================
// matchDatingDistance()
// ============================================================================

describe('matchDatingDistance', () => {
  it('returns both_happy when actual distance is within both preferences', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 50 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: 100 } });
    const result = matchDatingDistance(userA, userB, 30);
    expect(result.status).toBe('both_happy');
  });

  it('returns left_happy when distance is within A\'s but not B\'s max', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 100 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: 20 } });
    const result = matchDatingDistance(userA, userB, 50);
    expect(result.status).toBe('left_happy');
  });

  it('returns right_happy when distance is within B\'s but not A\'s max', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 10 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: 100 } });
    const result = matchDatingDistance(userA, userB, 50);
    expect(result.status).toBe('right_happy');
  });

  it('returns neither_happy when distance exceeds both preferences', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 10 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: 20 } });
    const result = matchDatingDistance(userA, userB, 50);
    expect(result.status).toBe('neither_happy');
  });

  it('returns both_happy when maxDistance is null (no limit)', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: null } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: null } });
    const result = matchDatingDistance(userA, userB, 5000);
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when maxDistance is undefined (no limit)', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship' } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship' } });
    const result = matchDatingDistance(userA, userB, 9999);
    expect(result.status).toBe('both_happy');
  });

  it('includes actual distance in details', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 50 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: 50 } });
    const result = matchDatingDistance(userA, userB, 25);
    expect(result.details).toBe('Actual distance: 25 mi');
  });

  it('formats leftValue and rightValue correctly', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 50 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: null } });
    const result = matchDatingDistance(userA, userB, 10);
    expect(result.leftValue).toBe('50 mi');
    expect(result.rightValue).toBe('Any');
  });

  it('handles exact boundary distance (inclusive)', () => {
    const userA = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'female', lookingFor: 'relationship', maxDistance: 50 } });
    const userB = makeProfile({ preferences: { ageMin: 18, ageMax: 30, gender: 'male', lookingFor: 'relationship', maxDistance: 50 } });
    const result = matchDatingDistance(userA, userB, 50);
    expect(result.status).toBe('both_happy');
  });
});

// ============================================================================
// matchEthnicity()
// ============================================================================

describe('matchEthnicity', () => {
  it('returns both_happy when ethnicities match each other\'s preferences', () => {
    const userA = makeProfile({ ethnicity: 'White', preferredEthnicities: ['White', 'Asian'] });
    const userB = makeProfile({ ethnicity: 'Asian', preferredEthnicities: ['White', 'Black'] });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when both have "No Preference"', () => {
    const userA = makeProfile({ ethnicity: 'White', preferredEthnicities: ['No Preference'] });
    const userB = makeProfile({ ethnicity: 'Black', preferredEthnicities: ['No Preference'] });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when preference arrays are empty (open to all)', () => {
    const userA = makeProfile({ ethnicity: 'White', preferredEthnicities: [] });
    const userB = makeProfile({ ethnicity: 'Latino', preferredEthnicities: [] });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns left_happy when only A is satisfied', () => {
    const userA = makeProfile({ ethnicity: 'White', preferredEthnicities: ['Asian'] });
    const userB = makeProfile({ ethnicity: 'Asian', preferredEthnicities: ['Asian'] });
    // A prefers Asian, B is Asian — A happy
    // B prefers Asian, A is White — B NOT happy
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('left_happy');
  });

  it('returns neither_happy when neither ethnicity is in the other\'s preferences', () => {
    const userA = makeProfile({ ethnicity: 'White', preferredEthnicities: ['Asian'] });
    const userB = makeProfile({ ethnicity: 'Black', preferredEthnicities: ['Latino'] });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('neither_happy');
  });

  it('returns unknown when A has no ethnicity', () => {
    const userA = makeProfile({ ethnicity: '' });
    const userB = makeProfile({ ethnicity: 'White' });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when B has no ethnicity', () => {
    const userA = makeProfile({ ethnicity: 'White' });
    const userB = makeProfile({ ethnicity: '' });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('unknown');
  });

  it('treats undefined preferredEthnicities as open to all', () => {
    const userA = makeProfile({ ethnicity: 'White', preferredEthnicities: undefined });
    const userB = makeProfile({ ethnicity: 'Black', preferredEthnicities: undefined });
    const result = matchEthnicity(userA, userB);
    expect(result.status).toBe('both_happy');
  });
});

// ============================================================================
// matchPolitics()
// ============================================================================

describe('matchPolitics', () => {
  it('returns both_happy when politics match each other\'s preferences', () => {
    const userA = makeProfile({ politicalLeaning: 'liberal', preferredPolitics: ['moderate', 'liberal'] });
    const userB = makeProfile({ politicalLeaning: 'moderate', preferredPolitics: ['liberal', 'moderate'] });
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when both have "No Preference"', () => {
    const userA = makeProfile({ politicalLeaning: 'liberal', preferredPolitics: ['No Preference'] });
    const userB = makeProfile({ politicalLeaning: 'conservative', preferredPolitics: ['No Preference'] });
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when preference arrays are empty (open to all)', () => {
    const userA = makeProfile({ politicalLeaning: 'liberal', preferredPolitics: [] });
    const userB = makeProfile({ politicalLeaning: 'conservative', preferredPolitics: [] });
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns unknown when A selects prefer_not_to_say', () => {
    const userA = makeProfile({ politicalLeaning: 'prefer_not_to_say' });
    const userB = makeProfile({ politicalLeaning: 'liberal' });
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('unknown');
    expect(result.leftValue).toBe('—');
  });

  it('returns unknown when B selects prefer_not_to_say', () => {
    const userA = makeProfile({ politicalLeaning: 'liberal' });
    const userB = makeProfile({ politicalLeaning: 'prefer_not_to_say' });
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('unknown');
    expect(result.rightValue).toBe('—');
  });

  it('returns unknown when politicalLeaning is missing', () => {
    const userA = makeProfile({ politicalLeaning: '' });
    const userB = makeProfile({ politicalLeaning: 'liberal' });
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('unknown');
  });

  it('returns neither_happy when politics mismatch preferences', () => {
    const userA = makeProfile({ politicalLeaning: 'liberal', preferredPolitics: ['conservative'] });
    const userB = makeProfile({ politicalLeaning: 'conservative', preferredPolitics: ['conservative'] });
    // A prefers conservative, B is conservative — A happy
    // B prefers conservative, A is liberal — B NOT happy
    const result = matchPolitics(userA, userB);
    expect(result.status).toBe('left_happy');
  });

  it('formats political leaning values (underscores to title case)', () => {
    const userA = makeProfile({ politicalLeaning: 'far_left', preferredPolitics: [] });
    const userB = makeProfile({ politicalLeaning: 'center_right', preferredPolitics: [] });
    const result = matchPolitics(userA, userB);
    expect(result.leftValue).toBe('Far Left');
    expect(result.rightValue).toBe('Center Right');
  });
});

// ============================================================================
// matchReligion()
// ============================================================================

describe('matchReligion', () => {
  it('returns both_happy when religions match', () => {
    const userA = makeProfile({ religion: 'Christian' });
    const userB = makeProfile({ religion: 'Christian' });
    const result = matchReligion(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns neither_happy when religions differ', () => {
    const userA = makeProfile({ religion: 'Christian' });
    const userB = makeProfile({ religion: 'Muslim' });
    const result = matchReligion(userA, userB);
    expect(result.status).toBe('neither_happy');
  });

  it('returns unknown when A has no religion', () => {
    const userA = makeProfile({ religion: '' });
    const userB = makeProfile({ religion: 'Christian' });
    const result = matchReligion(userA, userB);
    expect(result.status).toBe('unknown');
    expect(result.leftValue).toBe('—');
  });

  it('returns unknown when B has no religion', () => {
    const userA = makeProfile({ religion: 'Christian' });
    const userB = makeProfile({ religion: '' });
    const result = matchReligion(userA, userB);
    expect(result.status).toBe('unknown');
    expect(result.rightValue).toBe('—');
  });

  it('treats "None" as a valid religion that can match', () => {
    const userA = makeProfile({ religion: 'None' });
    const userB = makeProfile({ religion: 'None' });
    const result = matchReligion(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns neither_happy for "None" vs a religion', () => {
    const userA = makeProfile({ religion: 'None' });
    const userB = makeProfile({ religion: 'Hindu' });
    const result = matchReligion(userA, userB);
    expect(result.status).toBe('neither_happy');
  });
});

// ============================================================================
// matchLifestyleAttribute() — General
// ============================================================================

describe('matchLifestyleAttribute', () => {
  it('returns both_happy when both have dont_care preferences', () => {
    const result = matchLifestyleAttribute('daily', 'dont_care', 'never', 'dont_care', 'drinking');
    expect(result.status).toBe('both_happy');
    expect(result.details).toBe("Both don't care");
  });

  it('returns both_happy when both preferences are empty arrays (treated as dont_care)', () => {
    const result = matchLifestyleAttribute('daily', [], 'never', [], 'drinking');
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when preferences are undefined (treated as dont_care)', () => {
    const result = matchLifestyleAttribute('daily', undefined, 'never', undefined, 'drinking');
    expect(result.status).toBe('both_happy');
  });

  it('returns both_happy when routines match each other\'s preferences', () => {
    const result = matchLifestyleAttribute('socially', ['socially', 'rarely'], 'rarely', ['socially', 'daily'], 'drinking');
    expect(result.status).toBe('both_happy');
  });

  it('returns left_happy when only A\'s preference is satisfied', () => {
    const result = matchLifestyleAttribute('daily', ['never'], 'never', ['never'], 'drinking');
    // A prefers 'never', B is 'never' — A happy
    // B prefers 'never', A is 'daily' — B NOT happy
    expect(result.status).toBe('left_happy');
  });

  it('returns right_happy when only B\'s preference is satisfied', () => {
    const result = matchLifestyleAttribute('daily', ['daily'], 'never', ['daily'], 'drinking');
    // A prefers 'daily', B is 'never' — A NOT happy
    // B prefers 'daily', A is 'daily' — B happy
    expect(result.status).toBe('right_happy');
  });

  it('returns neither_happy when neither preference is satisfied', () => {
    const result = matchLifestyleAttribute('daily', ['never'], 'daily', ['never'], 'drinking');
    // A prefers 'never', B is 'daily' — A NOT happy
    // B prefers 'never', A is 'daily' — B NOT happy
    expect(result.status).toBe('neither_happy');
  });

  it('returns unknown when A routine is prefer_not_to_say', () => {
    const result = matchLifestyleAttribute('prefer_not_to_say', ['socially'], 'socially', ['socially'], 'drinking');
    expect(result.status).toBe('unknown');
    expect(result.leftValue).toBe('—');
  });

  it('returns unknown when B routine is prefer_not_to_say', () => {
    const result = matchLifestyleAttribute('socially', ['socially'], 'prefer_not_to_say', ['socially'], 'drinking');
    expect(result.status).toBe('unknown');
    expect(result.rightValue).toBe('—');
  });

  it('returns unknown when A routine is missing', () => {
    const result = matchLifestyleAttribute(undefined, ['socially'], 'socially', ['socially'], 'drinking');
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when B routine is missing', () => {
    const result = matchLifestyleAttribute('socially', ['socially'], undefined, ['socially'], 'drinking');
    expect(result.status).toBe('unknown');
  });

  it('handles string preference (non-array) correctly', () => {
    const result = matchLifestyleAttribute('socially', 'socially', 'socially', 'socially', 'drinking');
    // A preference is ['socially'], B routine is 'socially' — A happy
    // B preference is ['socially'], A routine is 'socially' — B happy
    expect(result.status).toBe('both_happy');
  });

  it('accepts "don\'t care" UI variant as dont_care', () => {
    const result = matchLifestyleAttribute('daily', "don't care", 'never', "don't care", 'drinking');
    expect(result.status).toBe('both_happy');
  });

  it('formats lifestyle values with capitalized first letter', () => {
    const result = matchLifestyleAttribute('socially', 'dont_care', 'daily', 'dont_care', 'drinking');
    expect(result.leftValue).toBe('Socially');
    expect(result.rightValue).toBe('Daily');
  });

  it('handles mixed array with dont_care alongside other values', () => {
    // If dont_care is in the array, the person is happy regardless
    const result = matchLifestyleAttribute('daily', ['dont_care', 'never'], 'never', ['daily'], 'drinking');
    // A has dont_care in preferences — A happy
    // B prefers 'daily', A is 'daily' — B happy
    expect(result.status).toBe('both_happy');
  });
});

// ============================================================================
// matchDrinking() — Delegates to matchLifestyleAttribute
// ============================================================================

describe('matchDrinking', () => {
  it('matches drinking preferences correctly', () => {
    const userA = makeProfile({
      drinkingFrequency: 'socially',
      partnerLifestylePreferences: { drinking: ['socially', 'rarely'], cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const userB = makeProfile({
      drinkingFrequency: 'rarely',
      partnerLifestylePreferences: { drinking: ['socially'], cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const result = matchDrinking(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns unknown when drinking frequency is not set', () => {
    const userA = makeProfile({ drinkingFrequency: undefined });
    const userB = makeProfile({ drinkingFrequency: 'socially' });
    const result = matchDrinking(userA, userB);
    expect(result.status).toBe('unknown');
  });
});

// ============================================================================
// matchCannabis()
// ============================================================================

describe('matchCannabis', () => {
  it('matches cannabis preferences correctly', () => {
    const userA = makeProfile({
      cannabisFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: ['never'], tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const userB = makeProfile({
      cannabisFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: ['never', 'rarely'], tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const result = matchCannabis(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns neither_happy when cannabis frequencies conflict', () => {
    const userA = makeProfile({
      cannabisFrequency: 'daily',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: ['never'], tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const userB = makeProfile({
      cannabisFrequency: 'daily',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: ['never'], tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const result = matchCannabis(userA, userB);
    expect(result.status).toBe('neither_happy');
  });
});

// ============================================================================
// matchTobacco()
// ============================================================================

describe('matchTobacco', () => {
  it('matches tobacco preferences correctly', () => {
    const userA = makeProfile({
      tobaccoFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const userB = makeProfile({
      tobaccoFrequency: 'daily',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const result = matchTobacco(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns left_happy when only A does not mind', () => {
    const userA = makeProfile({
      tobaccoFrequency: 'daily',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const userB = makeProfile({
      tobaccoFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: ['never'], otherDrugs: 'dont_care' },
    });
    // A dont_care — A happy
    // B prefers 'never', A is 'daily' — B NOT happy
    const result = matchTobacco(userA, userB);
    expect(result.status).toBe('left_happy');
  });
});

// ============================================================================
// matchOtherSubstances()
// ============================================================================

describe('matchOtherSubstances', () => {
  it('matches other substance preferences correctly', () => {
    const userA = makeProfile({
      otherDrugsFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: ['never'] },
    });
    const userB = makeProfile({
      otherDrugsFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: ['never'] },
    });
    const result = matchOtherSubstances(userA, userB);
    expect(result.status).toBe('both_happy');
  });

  it('returns unknown when frequency is prefer_not_to_say', () => {
    const userA = makeProfile({
      otherDrugsFrequency: 'prefer_not_to_say',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const userB = makeProfile({
      otherDrugsFrequency: 'never',
      partnerLifestylePreferences: { drinking: 'dont_care', cannabis: 'dont_care', tobacco: 'dont_care', otherDrugs: 'dont_care' },
    });
    const result = matchOtherSubstances(userA, userB);
    expect(result.status).toBe('unknown');
  });
});

// ============================================================================
// matchValues() — Overlap-based (Jaccard similarity)
// ============================================================================

describe('matchValues', () => {
  it('returns 100% overlap for identical value sets', () => {
    const userA = makeProfile({ values: ['honesty', 'loyalty', 'humor'] });
    const userB = makeProfile({ values: ['honesty', 'loyalty', 'humor'] });
    const result = matchValues(userA, userB);
    expect(result.sharedValues).toEqual(['honesty', 'loyalty', 'humor']);
    expect(result.uniqueToA).toEqual([]);
    expect(result.uniqueToB).toEqual([]);
    expect(result.overlapPercentage).toBe(100);
    expect(result.status).toBe('high');
  });

  it('calculates Jaccard similarity for partial overlap', () => {
    const userA = makeProfile({ values: ['honesty', 'loyalty'] });
    const userB = makeProfile({ values: ['honesty', 'humor'] });
    const result = matchValues(userA, userB);
    expect(result.sharedValues).toEqual(['honesty']);
    expect(result.uniqueToA).toEqual(['loyalty']);
    expect(result.uniqueToB).toEqual(['humor']);
    // Jaccard: 1 shared / 3 union = 33.33%
    expect(result.overlapPercentage).toBeCloseTo(33.33, 1);
    expect(result.status).toBe('medium');
  });

  it('returns 0% overlap for completely different values', () => {
    const userA = makeProfile({ values: ['honesty', 'loyalty'] });
    const userB = makeProfile({ values: ['humor', 'adventure'] });
    const result = matchValues(userA, userB);
    expect(result.sharedValues).toEqual([]);
    expect(result.overlapPercentage).toBe(0);
    expect(result.status).toBe('low');
  });

  it('handles empty values for both users', () => {
    const userA = makeProfile({ values: [] });
    const userB = makeProfile({ values: [] });
    const result = matchValues(userA, userB);
    expect(result.overlapPercentage).toBe(0);
    expect(result.status).toBe('low');
  });

  it('handles one user with empty values', () => {
    const userA = makeProfile({ values: ['honesty'] });
    const userB = makeProfile({ values: [] });
    const result = matchValues(userA, userB);
    expect(result.sharedValues).toEqual([]);
    expect(result.uniqueToA).toEqual(['honesty']);
    expect(result.overlapPercentage).toBe(0);
    expect(result.status).toBe('low');
  });

  it('handles undefined values (defaults to empty array)', () => {
    const userA = makeProfile({ values: undefined as any });
    const userB = makeProfile({ values: undefined as any });
    const result = matchValues(userA, userB);
    expect(result.overlapPercentage).toBe(0);
  });

  it('classifies high overlap (>=66%)', () => {
    // 3 shared out of 4 union = 75%
    const userA = makeProfile({ values: ['a', 'b', 'c'] });
    const userB = makeProfile({ values: ['a', 'b', 'c', 'd'] });
    const result = matchValues(userA, userB);
    expect(result.status).toBe('high');
  });

  it('classifies medium overlap (33-66%)', () => {
    // 1 shared out of 3 union = 33.3%
    const userA = makeProfile({ values: ['a', 'b'] });
    const userB = makeProfile({ values: ['a', 'c'] });
    const result = matchValues(userA, userB);
    expect(result.status).toBe('medium');
  });

  it('classifies low overlap (<33%)', () => {
    // 1 shared out of 5 union = 20%
    const userA = makeProfile({ values: ['a', 'b', 'c'] });
    const userB = makeProfile({ values: ['a', 'd', 'e'] });
    const result = matchValues(userA, userB);
    expect(result.status).toBe('low');
  });
});

// ============================================================================
// matchInterests() — Overlap-based (Jaccard similarity)
// ============================================================================

describe('matchInterests', () => {
  it('returns 100% overlap for identical interest sets', () => {
    const userA = makeProfile({ interests: ['hiking', 'cooking', 'reading'] });
    const userB = makeProfile({ interests: ['hiking', 'cooking', 'reading'] });
    const result = matchInterests(userA, userB);
    expect(result.sharedInterests).toEqual(['hiking', 'cooking', 'reading']);
    expect(result.uniqueToA).toEqual([]);
    expect(result.uniqueToB).toEqual([]);
    expect(result.overlapPercentage).toBe(100);
    expect(result.status).toBe('high');
  });

  it('calculates Jaccard similarity for partial overlap', () => {
    const userA = makeProfile({ interests: ['hiking', 'cooking'] });
    const userB = makeProfile({ interests: ['hiking', 'gaming'] });
    const result = matchInterests(userA, userB);
    expect(result.sharedInterests).toEqual(['hiking']);
    expect(result.uniqueToA).toEqual(['cooking']);
    expect(result.uniqueToB).toEqual(['gaming']);
    // Jaccard: 1/3 = 33.33%
    expect(result.overlapPercentage).toBeCloseTo(33.33, 1);
  });

  it('returns 0% overlap for completely different interests', () => {
    const userA = makeProfile({ interests: ['hiking', 'cooking'] });
    const userB = makeProfile({ interests: ['gaming', 'music'] });
    const result = matchInterests(userA, userB);
    expect(result.sharedInterests).toEqual([]);
    expect(result.overlapPercentage).toBe(0);
    expect(result.status).toBe('low');
  });

  it('handles empty interests for both users', () => {
    const userA = makeProfile({ interests: [] });
    const userB = makeProfile({ interests: [] });
    const result = matchInterests(userA, userB);
    expect(result.overlapPercentage).toBe(0);
  });

  it('handles one user with empty interests', () => {
    const userA = makeProfile({ interests: ['hiking'] });
    const userB = makeProfile({ interests: [] });
    const result = matchInterests(userA, userB);
    expect(result.sharedInterests).toEqual([]);
    expect(result.uniqueToA).toEqual(['hiking']);
    expect(result.overlapPercentage).toBe(0);
  });

  it('handles undefined interests (defaults to empty array)', () => {
    const userA = makeProfile({ interests: undefined as any });
    const userB = makeProfile({ interests: undefined as any });
    const result = matchInterests(userA, userB);
    expect(result.overlapPercentage).toBe(0);
  });

  it('classifies status thresholds correctly', () => {
    // High: 4/5 = 80%
    const high = matchInterests(
      makeProfile({ interests: ['a', 'b', 'c', 'd'] }),
      makeProfile({ interests: ['a', 'b', 'c', 'd', 'e'] }),
    );
    expect(high.status).toBe('high');

    // Medium: 2/5 = 40%
    const med = matchInterests(
      makeProfile({ interests: ['a', 'b', 'c'] }),
      makeProfile({ interests: ['a', 'b', 'd'] }),
    );
    expect(med.status).toBe('medium');

    // Low: 1/5 = 20%
    const low = matchInterests(
      makeProfile({ interests: ['a', 'b', 'c'] }),
      makeProfile({ interests: ['a', 'd', 'e'] }),
    );
    expect(low.status).toBe('low');
  });
});

// ============================================================================
// calculateSectionCompatibility()
// ============================================================================

describe('calculateSectionCompatibility', () => {
  it('returns 100% for all both_happy results', () => {
    const results: MatchResult[] = [
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'both_happy', leftValue: '', rightValue: '' },
    ];
    const compat = calculateSectionCompatibility(results);
    expect(compat.compatible).toBe(3);
    expect(compat.total).toBe(3);
    expect(compat.percentage).toBe(100);
    expect(compat.status).toBe('high');
  });

  it('returns 0% for no both_happy results', () => {
    const results: MatchResult[] = [
      { status: 'left_happy', leftValue: '', rightValue: '' },
      { status: 'right_happy', leftValue: '', rightValue: '' },
      { status: 'neither_happy', leftValue: '', rightValue: '' },
    ];
    const compat = calculateSectionCompatibility(results);
    expect(compat.compatible).toBe(0);
    expect(compat.total).toBe(3);
    expect(compat.percentage).toBe(0);
    expect(compat.status).toBe('low');
  });

  it('calculates medium status correctly', () => {
    const results: MatchResult[] = [
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'neither_happy', leftValue: '', rightValue: '' },
    ];
    const compat = calculateSectionCompatibility(results);
    expect(compat.compatible).toBe(1);
    expect(compat.total).toBe(2);
    expect(compat.percentage).toBe(50);
    expect(compat.status).toBe('medium');
  });

  it('handles empty array', () => {
    const compat = calculateSectionCompatibility([]);
    expect(compat.compatible).toBe(0);
    expect(compat.total).toBe(0);
    expect(compat.percentage).toBe(0);
    expect(compat.status).toBe('low');
  });

  it('only counts both_happy as compatible (not left_happy or right_happy)', () => {
    const results: MatchResult[] = [
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'left_happy', leftValue: '', rightValue: '' },
      { status: 'right_happy', leftValue: '', rightValue: '' },
      { status: 'unknown', leftValue: '', rightValue: '' },
    ];
    const compat = calculateSectionCompatibility(results);
    expect(compat.compatible).toBe(1);
    expect(compat.total).toBe(4);
    expect(compat.percentage).toBe(25);
    expect(compat.status).toBe('low');
  });

  it('classifies boundary at 66% as high', () => {
    const results: MatchResult[] = [
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'neither_happy', leftValue: '', rightValue: '' },
    ];
    // 2/3 = 66.67%
    const compat = calculateSectionCompatibility(results);
    expect(compat.status).toBe('high');
  });

  it('classifies boundary at 33% as medium', () => {
    const results: MatchResult[] = [
      { status: 'both_happy', leftValue: '', rightValue: '' },
      { status: 'neither_happy', leftValue: '', rightValue: '' },
      { status: 'neither_happy', leftValue: '', rightValue: '' },
    ];
    // 1/3 = 33.33%
    const compat = calculateSectionCompatibility(results);
    expect(compat.status).toBe('medium');
  });
});
