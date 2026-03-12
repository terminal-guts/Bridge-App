/**
 * Tests for profileCompleteness utility functions
 */

import {
  calculateProfileCompleteness,
  calculateEditProfileCompleteness,
  calculateMatchPreferencesCompleteness,
  calculateProfileStrengthBreakdown,
  calculateOverallProfileStrength,
} from '../../src/utils/profileCompleteness';
import { UserProfile } from '../../src/types';

// Factory for a fully complete profile
function makeCompleteProfile(): UserProfile {
  return {
    id: 'test-id',
    userId: 'test-user',
    firstName: 'Alice',
    lastName: 'Smith',
    age: 22,
    height: "5'6\"",
    ethnicity: 'White',
    currentJob: 'Engineer',
    religion: 'None',
    pronounsList: ['she/her'],
    pronouns: 'she/her',
    gender: ['Female'],
    politicalLeaning: 'Liberal',
    hasChildren: false,
    familyPlans: 'Want children',
    drinkingFrequency: 'Socially',
    cannabisFrequency: 'Never',
    tobaccoFrequency: 'Never',
    otherDrugsFrequency: 'Never',
    values: ['Honesty', 'Trust', 'Kindness'],
    interests: ['Tennis', 'Cooking', 'Travel'],
    photos: [{ url: 'photo1.jpg', isMain: true }],
    interestedInGenders: ['Male'],
    preferredEthnicities: ['No Preference'],
    preferredPolitics: ['No Preference'],
    preferences: {
      ageMin: 20,
      ageMax: 30,
      heightMin: "5'0\"",
      heightMax: "6'5\"",
      lookingFor: 'Relationship',
    },
    partnerLifestylePreferences: {
      drinking: 'Socially',
      cannabis: 'Never',
      tobacco: 'Never',
      otherDrugs: 'Never',
    },
    deepQuestions: [
      { id: 1, question: 'Q1', answer: 'A1', tier: 1 },
      { id: 2, question: 'Q2', answer: 'A2', tier: 2 },
      { id: 3, question: 'Q3', answer: 'A3', tier: 3 },
    ],
    displayedQuestions: [1, 2, 3],
  } as any;
}

// ============================================================================
// calculateProfileCompleteness
// ============================================================================

describe('calculateProfileCompleteness', () => {
  it('returns 0% for null profile', () => {
    const result = calculateProfileCompleteness(null);
    expect(result.percentage).toBe(0);
    expect(result.score).toBe(0);
  });

  it('returns 100% for complete profile', () => {
    const result = calculateProfileCompleteness(makeCompleteProfile());
    expect(result.percentage).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('identifies missing fields', () => {
    const profile = makeCompleteProfile();
    delete (profile as any).religion;
    delete (profile as any).ethnicity;
    const result = calculateProfileCompleteness(profile);
    expect(result.percentage).toBeLessThan(100);
    expect(result.missingFields.some(f => f.field === 'religion')).toBe(true);
    expect(result.missingFields.some(f => f.field === 'ethnicity')).toBe(true);
  });

  it('requires at least 1 photo', () => {
    const profile = makeCompleteProfile();
    profile.photos = [];
    const result = calculateProfileCompleteness(profile);
    expect(result.missingFields.some(f => f.field === 'photos')).toBe(true);
  });

  it('requires age >= 18', () => {
    const profile = makeCompleteProfile();
    profile.age = 17;
    const result = calculateProfileCompleteness(profile);
    expect(result.missingFields.some(f => f.field === 'age')).toBe(true);
  });

  it('requires at least 1 value', () => {
    const profile = makeCompleteProfile();
    profile.values = [];
    const result = calculateProfileCompleteness(profile);
    expect(result.missingFields.some(f => f.field === 'values')).toBe(true);
  });

  it('sorts missing fields by weight (highest first)', () => {
    const profile = { id: 'x', userId: 'x', firstName: 'Test' } as any;
    const result = calculateProfileCompleteness(profile);
    for (let i = 1; i < result.missingFields.length; i++) {
      expect(result.missingFields[i].weight).toBeLessThanOrEqual(result.missingFields[i - 1].weight);
    }
  });

  it('generates suggestions', () => {
    const profile = makeCompleteProfile();
    const result = calculateProfileCompleteness(profile);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// calculateEditProfileCompleteness
// ============================================================================

describe('calculateEditProfileCompleteness', () => {
  it('returns 0% for null profile', () => {
    const result = calculateEditProfileCompleteness(null);
    expect(result.percentage).toBe(0);
    expect(result.totalCount).toBe(18);
  });

  it('returns 100% for complete profile', () => {
    const result = calculateEditProfileCompleteness(makeCompleteProfile());
    expect(result.percentage).toBe(100);
    expect(result.completedCount).toBe(18);
  });

  it('requires 3+ interests for credit', () => {
    const profile = makeCompleteProfile();
    profile.interests = ['Tennis']; // only 1
    const result = calculateEditProfileCompleteness(profile);
    expect(result.missingFields).toContain(expect.stringContaining('Interests'));
  });

  it('requires 3+ values for credit', () => {
    const profile = makeCompleteProfile();
    profile.values = ['Honesty']; // only 1
    const result = calculateEditProfileCompleteness(profile);
    expect(result.missingFields).toContain(expect.stringContaining('Values'));
  });

  it('accepts pronounsList as fallback for pronouns', () => {
    const profile = makeCompleteProfile();
    delete (profile as any).pronounsList;
    profile.pronouns = 'he/him';
    const result = calculateEditProfileCompleteness(profile);
    expect(result.missingFields).not.toContain('Pronouns');
  });
});

// ============================================================================
// calculateMatchPreferencesCompleteness
// ============================================================================

describe('calculateMatchPreferencesCompleteness', () => {
  it('returns 0% for null profile', () => {
    const result = calculateMatchPreferencesCompleteness(null);
    expect(result.percentage).toBe(0);
    expect(result.totalCount).toBe(7);
    expect(result.missingFields).toHaveLength(7);
  });

  it('returns 100% for complete preferences', () => {
    const result = calculateMatchPreferencesCompleteness(makeCompleteProfile());
    expect(result.percentage).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('identifies missing "Looking For"', () => {
    const profile = makeCompleteProfile();
    delete (profile as any).preferences.lookingFor;
    const result = calculateMatchPreferencesCompleteness(profile);
    expect(result.missingFields).toContain("I'm Looking For");
  });

  it('requires all 4 lifestyle preference habits', () => {
    const profile = makeCompleteProfile();
    delete (profile as any).partnerLifestylePreferences.cannabis;
    const result = calculateMatchPreferencesCompleteness(profile);
    expect(result.missingFields).toContain('Lifestyle');
  });

  it('supports array-format lifestyle preferences', () => {
    const profile = makeCompleteProfile();
    (profile as any).partnerLifestylePreferences = {
      drinking: ['Socially'],
      cannabis: ['Never'],
      tobacco: ['Never'],
      otherDrugs: ['Never'],
    };
    const result = calculateMatchPreferencesCompleteness(profile);
    expect(result.missingFields).not.toContain('Lifestyle');
  });
});

// ============================================================================
// calculateProfileStrengthBreakdown
// ============================================================================

describe('calculateProfileStrengthBreakdown', () => {
  it('returns all zeros for null profile', () => {
    const result = calculateProfileStrengthBreakdown(null);
    expect(result.overall).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.sections.aboutMe.score).toBe(0);
    expect(result.sections.photos.count).toBe(0);
  });

  it('returns high percentage for complete profile', () => {
    const result = calculateProfileStrengthBreakdown(makeCompleteProfile());
    expect(result.overall).toBeGreaterThanOrEqual(90);
    expect(result.sections.aboutMe.percentage).toBe(100);
    expect(result.sections.photos.percentage).toBe(100);
    expect(result.sections.deepQuestions.percentage).toBe(100);
  });

  it('scores photos as 0 or 100 (1 photo = full credit)', () => {
    const profile = makeCompleteProfile();
    expect(calculateProfileStrengthBreakdown(profile).sections.photos.percentage).toBe(100);

    profile.photos = [];
    expect(calculateProfileStrengthBreakdown(profile).sections.photos.percentage).toBe(0);
  });

  it('scores deep questions based on displayed count', () => {
    const profile = makeCompleteProfile();

    profile.displayedQuestions = [1, 2, 3];
    expect(calculateProfileStrengthBreakdown(profile).sections.deepQuestions.percentage).toBe(100);

    profile.displayedQuestions = [1];
    expect(calculateProfileStrengthBreakdown(profile).sections.deepQuestions.percentage).toBe(33);

    profile.displayedQuestions = [];
    expect(calculateProfileStrengthBreakdown(profile).sections.deepQuestions.percentage).toBe(0);
  });

  it('maxTotalScore is 93', () => {
    expect(calculateProfileStrengthBreakdown(null).maxTotalScore).toBe(93);
  });
});

// ============================================================================
// calculateOverallProfileStrength (deprecated wrapper)
// ============================================================================

describe('calculateOverallProfileStrength', () => {
  it('returns 0 for null', () => {
    expect(calculateOverallProfileStrength(null)).toBe(0);
  });

  it('returns same value as breakdown.overall', () => {
    const profile = makeCompleteProfile();
    const breakdown = calculateProfileStrengthBreakdown(profile);
    expect(calculateOverallProfileStrength(profile)).toBe(breakdown.overall);
  });
});
