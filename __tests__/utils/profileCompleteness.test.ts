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
    gender: ['female'],
    politicalLeaning: 'Liberal',
    hasChildren: false,
    familyPlans: 'Want children',
    drinkingFrequency: 'Socially',
    cannabisFrequency: 'Never',
    tobaccoFrequency: 'Never',
    otherDrugsFrequency: 'Never',
    values: ['Honesty', 'Trust', 'Kindness'],
    interests: ['Tennis', 'Cooking', 'Travel'],
    photos: [{ url: 'photo1.jpg', isMain: true }, { url: 'photo2.jpg', isMain: false }, { url: 'photo3.jpg', isMain: false }],
    interestedInGenders: ['Male'],
    preferredEthnicities: [],
    preferredReligions: ['No Preference'],
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
    expect(result.totalCount).toBe(10);
  });

  it('returns 100% for complete profile', () => {
    const result = calculateEditProfileCompleteness(makeCompleteProfile());
    expect(result.percentage).toBe(100);
    expect(result.completedCount).toBe(10);
  });

  it('requires 3+ interests for credit', () => {
    const profile = makeCompleteProfile();
    profile.interests = ['Tennis']; // only 1
    const result = calculateEditProfileCompleteness(profile);
    expect(result.missingFields.some(f => f.includes('Interests'))).toBe(true);
  });

  it('requires 3+ values for credit', () => {
    const profile = makeCompleteProfile();
    profile.values = ['Honesty']; // only 1
    const result = calculateEditProfileCompleteness(profile);
    expect(result.missingFields.some(f => f.includes('Values'))).toBe(true);
  });

  it('requires religion for credit', () => {
    const profile = makeCompleteProfile();
    delete (profile as any).religion;
    const result = calculateEditProfileCompleteness(profile);
    expect(result.missingFields.some(f => f.includes('Religion'))).toBe(true);
  });
});

// ============================================================================
// calculateMatchPreferencesCompleteness
// ============================================================================

describe('calculateMatchPreferencesCompleteness', () => {
  it('returns 0% for null profile', () => {
    const result = calculateMatchPreferencesCompleteness(null);
    expect(result.percentage).toBe(0);
    expect(result.totalCount).toBe(4);
    expect(result.missingFields).toHaveLength(4);
  });

  it('returns 100% for complete preferences', () => {
    const result = calculateMatchPreferencesCompleteness(makeCompleteProfile());
    expect(result.percentage).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('does not include lookingFor in completeness check', () => {
    const profile = makeCompleteProfile();
    delete (profile as any).preferences.lookingFor;
    const result = calculateMatchPreferencesCompleteness(profile);
    expect(result.missingFields).not.toContain("I'm Looking For");
    expect(result.percentage).toBe(100);
  });

  it('accepts empty preferredEthnicities as No Preference', () => {
    const profile = makeCompleteProfile();
    profile.preferredEthnicities = [];
    const result = calculateMatchPreferencesCompleteness(profile);
    expect(result.missingFields).not.toContain('Ethnicity');
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

  it('scores photos proportionally (3 photos = 100%)', () => {
    const profile = makeCompleteProfile();
    expect(calculateProfileStrengthBreakdown(profile).sections.photos.percentage).toBe(100);

    profile.photos = [{ url: 'a.jpg', isMain: true }] as any;
    expect(calculateProfileStrengthBreakdown(profile).sections.photos.percentage).toBe(33);

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

  it('maxTotalScore is 100 for both null and calculated', () => {
    expect(calculateProfileStrengthBreakdown(null).maxTotalScore).toBe(100);
    const profile = makeCompleteProfile();
    expect(calculateProfileStrengthBreakdown(profile).maxTotalScore).toBe(100);
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
