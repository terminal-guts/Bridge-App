/**
 * Tests for emojiMaps utility functions
 */

import {
  VALUES_ICONS,
  INTERESTS_ICONS,
  getIconName,
  valueIconName,
  interestIconName,
  VALUES_EMOJI,
  INTERESTS_EMOJI,
  getEmoji,
  valueEmoji,
  interestEmoji,
} from '../../src/utils/emojiMaps';

// ============================================================================
// Icon Maps
// ============================================================================

describe('VALUES_ICONS', () => {
  it('maps all core values to registry keys', () => {
    expect(VALUES_ICONS['Honesty']).toBe('honesty');
    expect(VALUES_ICONS['Trust']).toBe('trust');
    expect(VALUES_ICONS['Kindness']).toBe('kindness');
    expect(VALUES_ICONS['Romance']).toBe('romance');
  });

  it('has entries for all expected values', () => {
    const expectedValues = [
      'Honesty', 'Integrity', 'Trust', 'Respect', 'Authenticity',
      'Kindness', 'Empathy', 'Communication', 'Commitment',
    ];
    for (const value of expectedValues) {
      expect(VALUES_ICONS[value]).toBeDefined();
    }
  });
});

describe('INTERESTS_ICONS', () => {
  it('maps all core interests to registry keys', () => {
    expect(INTERESTS_ICONS['Tennis']).toBe('tennis');
    expect(INTERESTS_ICONS['Cooking']).toBe('cooking');
    expect(INTERESTS_ICONS['Travel']).toBe('travel');
  });

  it('has entries for all expected interests', () => {
    const expectedInterests = [
      'Tennis', 'Golf', 'Running', 'Yoga', 'Hiking',
      'Cooking', 'Coffee', 'Travel', 'Photography',
    ];
    for (const interest of expectedInterests) {
      expect(INTERESTS_ICONS[interest]).toBeDefined();
    }
  });
});

// ============================================================================
// getIconName
// ============================================================================

describe('getIconName', () => {
  it('returns icon name for exact match', () => {
    expect(getIconName('Tennis', INTERESTS_ICONS)).toBe('tennis');
  });

  it('is case-insensitive', () => {
    expect(getIconName('tennis', INTERESTS_ICONS)).toBe('tennis');
    expect(getIconName('TENNIS', INTERESTS_ICONS)).toBe('tennis');
  });

  it('returns undefined for unknown key', () => {
    expect(getIconName('Badminton', INTERESTS_ICONS)).toBeUndefined();
  });
});

describe('valueIconName', () => {
  it('returns icon name for values', () => {
    expect(valueIconName('Honesty')).toBe('honesty');
  });

  it('returns undefined for unknown value', () => {
    expect(valueIconName('XYZ')).toBeUndefined();
  });
});

describe('interestIconName', () => {
  it('returns icon name for interests', () => {
    expect(interestIconName('Tennis')).toBe('tennis');
  });

  it('returns undefined for unknown interest', () => {
    expect(interestIconName('XYZ')).toBeUndefined();
  });
});

// ============================================================================
// Emoji Maps
// ============================================================================

describe('VALUES_EMOJI', () => {
  it('maps values to emojis', () => {
    expect(VALUES_EMOJI['Honesty']).toBe('💛');
    expect(VALUES_EMOJI['Trust']).toBe('🔒');
  });
});

describe('INTERESTS_EMOJI', () => {
  it('maps interests to emojis', () => {
    expect(INTERESTS_EMOJI['Tennis']).toBe('🎾');
    expect(INTERESTS_EMOJI['Coffee']).toBe('☕');
  });
});

describe('getEmoji', () => {
  it('returns emoji for exact match', () => {
    expect(getEmoji('Tennis', INTERESTS_EMOJI)).toBe('🎾');
  });

  it('is case-insensitive', () => {
    expect(getEmoji('tennis', INTERESTS_EMOJI)).toBe('🎾');
  });

  it('returns bullet for unknown key', () => {
    expect(getEmoji('Unknown', INTERESTS_EMOJI)).toBe('•');
  });
});

describe('valueEmoji', () => {
  it('returns emoji for values', () => {
    expect(valueEmoji('Honesty')).toBe('💛');
  });
});

describe('interestEmoji', () => {
  it('returns emoji for interests', () => {
    expect(interestEmoji('Coffee')).toBe('☕');
  });

  it('returns bullet for unknown', () => {
    expect(interestEmoji('Unknown')).toBe('•');
  });
});
