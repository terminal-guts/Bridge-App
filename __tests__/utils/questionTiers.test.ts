/**
 * Tests for questionTiers utility functions
 */

import {
  getQuestionTier,
  TIER_CONFIG,
  calculateTierStats,
  countDisplayedByTier,
  validateTierDistribution,
  QUESTIONS_PER_TIER,
  TOTAL_QUESTIONS,
} from '../../src/utils/questionTiers';

// ============================================================================
// getQuestionTier
// ============================================================================

describe('getQuestionTier', () => {
  it('returns tier 1 for lighthearted question IDs', () => {
    expect(getQuestionTier(1)).toBe(1);
    expect(getQuestionTier(2)).toBe(1);
    expect(getQuestionTier(5)).toBe(1);
    expect(getQuestionTier(6)).toBe(1);
    expect(getQuestionTier(22)).toBe(1);
  });

  it('returns tier 2 for relationship question IDs', () => {
    expect(getQuestionTier(9)).toBe(2);
    expect(getQuestionTier(10)).toBe(2);
    expect(getQuestionTier(12)).toBe(2);
    expect(getQuestionTier(13)).toBe(2);
    expect(getQuestionTier(23)).toBe(2);
  });

  it('returns tier 3 for reflective question IDs', () => {
    expect(getQuestionTier(14)).toBe(3);
    expect(getQuestionTier(15)).toBe(3);
    expect(getQuestionTier(16)).toBe(3);
    expect(getQuestionTier(21)).toBe(3);
    expect(getQuestionTier(24)).toBe(3);
  });

  it('defaults unknown IDs to tier 3', () => {
    expect(getQuestionTier(999)).toBe(3);
    expect(getQuestionTier(0)).toBe(3);
  });
});

// ============================================================================
// TIER_CONFIG
// ============================================================================

describe('TIER_CONFIG', () => {
  it('has configuration for all 3 tiers', () => {
    expect(TIER_CONFIG[1]).toBeDefined();
    expect(TIER_CONFIG[2]).toBeDefined();
    expect(TIER_CONFIG[3]).toBeDefined();
  });

  it('each tier has required fields', () => {
    for (const tier of [1, 2, 3] as const) {
      expect(TIER_CONFIG[tier]).toHaveProperty('emoji');
      expect(TIER_CONFIG[tier]).toHaveProperty('name');
      expect(TIER_CONFIG[tier]).toHaveProperty('bg');
      expect(TIER_CONFIG[tier]).toHaveProperty('border');
      expect(TIER_CONFIG[tier]).toHaveProperty('color');
    }
  });

  it('tier names match expected values', () => {
    expect(TIER_CONFIG[1].name).toBe('Lighthearted');
    expect(TIER_CONFIG[2].name).toBe('Relationship');
    expect(TIER_CONFIG[3].name).toBe('Reflective');
  });
});

// ============================================================================
// calculateTierStats
// ============================================================================

describe('calculateTierStats', () => {
  it('counts questions per tier', () => {
    const questions = [
      { tier: 1 }, { tier: 1 },
      { tier: 2 },
      { tier: 3 }, { tier: 3 }, { tier: 3 },
    ];
    const stats = calculateTierStats(questions);
    expect(stats[1]).toBe(2);
    expect(stats[2]).toBe(1);
    expect(stats[3]).toBe(3);
  });

  it('returns zeros for empty array', () => {
    const stats = calculateTierStats([]);
    expect(stats[1]).toBe(0);
    expect(stats[2]).toBe(0);
    expect(stats[3]).toBe(0);
  });
});

// ============================================================================
// countDisplayedByTier
// ============================================================================

describe('countDisplayedByTier', () => {
  it('counts displayed questions by tier using getQuestionTier', () => {
    const counts = countDisplayedByTier([1, 9, 14]); // tier 1, tier 2, tier 3
    expect(counts[1]).toBe(1);
    expect(counts[2]).toBe(1);
    expect(counts[3]).toBe(1);
  });

  it('returns zeros for empty array', () => {
    const counts = countDisplayedByTier([]);
    expect(counts[1]).toBe(0);
    expect(counts[2]).toBe(0);
    expect(counts[3]).toBe(0);
  });

  it('handles multiple from same tier', () => {
    const counts = countDisplayedByTier([1, 2, 5]); // all tier 1
    expect(counts[1]).toBe(3);
    expect(counts[2]).toBe(0);
    expect(counts[3]).toBe(0);
  });
});

// ============================================================================
// validateTierDistribution
// ============================================================================

describe('validateTierDistribution', () => {
  it('accepts valid distribution (one per tier)', () => {
    const result = validateTierDistribution([1, 9, 14]);
    expect(result.valid).toBe(true);
  });

  it('accepts fewer than 3 questions', () => {
    expect(validateTierDistribution([1]).valid).toBe(true);
    expect(validateTierDistribution([1, 9]).valid).toBe(true);
  });

  it('accepts empty list', () => {
    expect(validateTierDistribution([]).valid).toBe(true);
  });

  it('rejects more than 3 displayed questions', () => {
    const result = validateTierDistribution([1, 2, 9, 14]);
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('rejects duplicate tiers', () => {
    const result = validateTierDistribution([1, 2]); // both tier 1
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.tier).toBe(1);
    }
  });
});

// ============================================================================
// Constants
// ============================================================================

describe('constants', () => {
  it('QUESTIONS_PER_TIER is 5', () => {
    expect(QUESTIONS_PER_TIER).toBe(5);
  });

  it('TOTAL_QUESTIONS is 15', () => {
    expect(TOTAL_QUESTIONS).toBe(15);
  });
});
