/**
 * Tests for compatibilityHelpers utility functions
 */

import {
  calculateCompatibility,
  getCompatibilityColor,
  clampDisplayScore,
  getCompatibilityLabel,
} from '../../src/utils/compatibilityHelpers';
import { UserProfile } from '../../src/types';

// Minimal profile factory
function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-id',
    userId: 'test-user',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  } as UserProfile;
}

// ============================================================================
// calculateCompatibility
// ============================================================================

describe('calculateCompatibility', () => {
  it('returns 0 when no comparable fields exist', () => {
    const a = makeProfile();
    const b = makeProfile();
    const result = calculateCompatibility(a, b);
    expect(result.score).toBe(0);
    expect(result.matches).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('scores 100 when all fields match perfectly', () => {
    const shared = {
      religion: 'Christian',
      politicalLeaning: 'Liberal',
      familyPlans: 'Want children',
      values: ['Honesty', 'Trust', 'Kindness'],
      interests: ['Tennis', 'Cooking', 'Travel'],
      drinkingFrequency: 'Socially',
    };
    const a = makeProfile(shared);
    const b = makeProfile(shared);
    const result = calculateCompatibility(a, b);
    expect(result.score).toBe(100);
  });

  it('detects religion match', () => {
    const a = makeProfile({ religion: 'Buddhist' });
    const b = makeProfile({ religion: 'buddhist' }); // case-insensitive
    const result = calculateCompatibility(a, b);
    expect(result.matches).toContain('religion');
  });

  it('detects religion conflict', () => {
    const a = makeProfile({ religion: 'Christian' });
    const b = makeProfile({ religion: 'Atheist' });
    const result = calculateCompatibility(a, b);
    expect(result.conflicts).toContain('religion');
  });

  it('gives partial credit for moderate politics', () => {
    const a = makeProfile({ politicalLeaning: 'Moderate' });
    const b = makeProfile({ politicalLeaning: 'Liberal' });
    const result = calculateCompatibility(a, b);
    // Should not be in conflicts (partial credit)
    expect(result.conflicts).not.toContain('politics');
    // Score should be > 0
    expect(result.score).toBeGreaterThan(0);
  });

  it('detects politics conflict for opposing views', () => {
    const a = makeProfile({ politicalLeaning: 'Liberal' });
    const b = makeProfile({ politicalLeaning: 'Conservative' });
    const result = calculateCompatibility(a, b);
    expect(result.conflicts).toContain('politics');
  });

  it('gives partial credit for open/undecided family plans', () => {
    const a = makeProfile({ familyPlans: 'Open to children' });
    const b = makeProfile({ familyPlans: 'Want children' });
    const result = calculateCompatibility(a, b);
    expect(result.conflicts).not.toContain('family_plans');
  });

  it('finds shared values', () => {
    const a = makeProfile({ values: ['Honesty', 'Trust', 'Kindness'] });
    const b = makeProfile({ values: ['Trust', 'Respect', 'Honesty'] });
    const result = calculateCompatibility(a, b);
    expect(result.sharedValues).toEqual(expect.arrayContaining(['Trust', 'Honesty']));
  });

  it('finds shared interests', () => {
    const a = makeProfile({ interests: ['Tennis', 'Cooking'] });
    const b = makeProfile({ interests: ['Cooking', 'Hiking'] });
    const result = calculateCompatibility(a, b);
    expect(result.sharedInterests).toContain('Cooking');
  });

  it('scores lifestyle compatibility for exact match', () => {
    const a = makeProfile({ drinkingFrequency: 'Socially' });
    const b = makeProfile({ drinkingFrequency: 'Socially' });
    const result = calculateCompatibility(a, b);
    expect(result.matches).toContain('lifestyle');
  });

  it('gives partial lifestyle credit for compatible levels', () => {
    const a = makeProfile({ drinkingFrequency: 'Socially' });
    const b = makeProfile({ drinkingFrequency: 'Regularly' });
    const result = calculateCompatibility(a, b);
    // Not a full match but gets partial credit
    expect(result.score).toBeGreaterThan(0);
  });
});

// ============================================================================
// getCompatibilityColor
// ============================================================================

describe('getCompatibilityColor', () => {
  it('returns green for 80+', () => {
    expect(getCompatibilityColor(80)).toBe('#10B981');
    expect(getCompatibilityColor(100)).toBe('#10B981');
  });

  it('returns amber for 60-79', () => {
    expect(getCompatibilityColor(60)).toBe('#F59E0B');
    expect(getCompatibilityColor(79)).toBe('#F59E0B');
  });

  it('returns red for < 60', () => {
    expect(getCompatibilityColor(59)).toBe('#EF4444');
    expect(getCompatibilityColor(0)).toBe('#EF4444');
  });
});

// ============================================================================
// clampDisplayScore
// ============================================================================

describe('clampDisplayScore', () => {
  it('maps 0 to 70', () => {
    expect(clampDisplayScore(0)).toBe(70);
  });

  it('maps 100 to 99', () => {
    expect(clampDisplayScore(100)).toBe(99);
  });

  it('maps 50 to ~85', () => {
    const result = clampDisplayScore(50);
    expect(result).toBeGreaterThanOrEqual(84);
    expect(result).toBeLessThanOrEqual(85);
  });

  it('never returns below 70', () => {
    expect(clampDisplayScore(-10)).toBeGreaterThanOrEqual(70);
  });

  it('never returns above 99', () => {
    expect(clampDisplayScore(200)).toBeLessThanOrEqual(99);
  });
});

// ============================================================================
// getCompatibilityLabel
// ============================================================================

describe('getCompatibilityLabel', () => {
  it('returns "Strong Match" for 80+', () => {
    expect(getCompatibilityLabel(80)).toBe('Strong Match');
  });

  it('returns "Good Match" for 60-79', () => {
    expect(getCompatibilityLabel(65)).toBe('Good Match');
  });

  it('returns "Possible Match" for 40-59', () => {
    expect(getCompatibilityLabel(45)).toBe('Possible Match');
  });

  it('returns "Low Match" for < 40', () => {
    expect(getCompatibilityLabel(20)).toBe('Low Match');
  });
});
