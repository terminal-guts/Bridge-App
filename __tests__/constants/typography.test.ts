/**
 * Tests for typography constants (src/constants/typography.ts)
 *
 * Validates the Plus Jakarta Sans typography system:
 * FONTS, FONT_SIZES, LINE_HEIGHTS, TEXT_STYLES
 */

import {
  FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  TEXT_STYLES,
} from '../../src/constants/typography';

// ============================================================================
// FONTS
// ============================================================================

describe('FONTS', () => {
  const EXPECTED_WEIGHTS = ['regular', 'medium', 'semiBold', 'bold', 'extraBold'] as const;

  it('has all 5 font weights', () => {
    for (const weight of EXPECTED_WEIGHTS) {
      expect(FONTS).toHaveProperty(weight);
    }
  });

  it('has exactly 5 entries (no extras)', () => {
    expect(Object.keys(FONTS)).toHaveLength(5);
  });

  it.each(EXPECTED_WEIGHTS)('FONTS.%s is a valid PlusJakartaSans string', (weight) => {
    expect(FONTS[weight]).toMatch(/^PlusJakartaSans_\d{3}\w+$/);
  });

  it('maps to correct numeric weights', () => {
    expect(FONTS.regular).toContain('400');
    expect(FONTS.medium).toContain('500');
    expect(FONTS.semiBold).toContain('600');
    expect(FONTS.bold).toContain('700');
    expect(FONTS.extraBold).toContain('800');
  });

  it('all values are unique', () => {
    const values = Object.values(FONTS);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================================
// FONT_SIZES
// ============================================================================

describe('FONT_SIZES', () => {
  const EXPECTED_TIERS = ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'] as const;

  it('has all 12 size tiers', () => {
    for (const tier of EXPECTED_TIERS) {
      expect(FONT_SIZES).toHaveProperty(tier);
    }
  });

  it('all values are positive numbers', () => {
    for (const value of Object.values(FONT_SIZES)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });

  it('sizes are in ascending order', () => {
    const orderedValues = EXPECTED_TIERS.map((tier) => FONT_SIZES[tier]);
    for (let i = 1; i < orderedValues.length; i++) {
      expect(orderedValues[i]).toBeGreaterThan(orderedValues[i - 1]);
    }
  });

  it('smallest size is 11px and largest is 40px', () => {
    expect(FONT_SIZES.xs).toBe(11);
    expect(FONT_SIZES['7xl']).toBe(40);
  });
});

// ============================================================================
// LINE_HEIGHTS
// ============================================================================

describe('LINE_HEIGHTS', () => {
  const EXPECTED_TIERS = ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'] as const;

  it('all values are positive numbers', () => {
    for (const value of Object.values(LINE_HEIGHTS)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });

  it('each line height is greater than or equal to its corresponding font size', () => {
    for (const tier of EXPECTED_TIERS) {
      expect(LINE_HEIGHTS[tier]).toBeGreaterThanOrEqual(FONT_SIZES[tier]);
    }
  });

  it('line heights are in ascending order', () => {
    const orderedValues = EXPECTED_TIERS.map((tier) => LINE_HEIGHTS[tier]);
    for (let i = 1; i < orderedValues.length; i++) {
      expect(orderedValues[i]).toBeGreaterThanOrEqual(orderedValues[i - 1]);
    }
  });
});

// ============================================================================
// TEXT_STYLES
// ============================================================================

describe('TEXT_STYLES', () => {
  const EXPECTED_PRESETS = [
    'screenTitle', 'sectionTitle',
    'bodyLg', 'bodyMd', 'bodySm',
    'labelLg', 'labelSm',
    'buttonLg',
  ] as const;

  it('has all 8 semantic presets', () => {
    for (const preset of EXPECTED_PRESETS) {
      expect(TEXT_STYLES).toHaveProperty(preset);
    }
  });

  it('has exactly 8 entries', () => {
    expect(Object.keys(TEXT_STYLES)).toHaveLength(8);
  });

  describe('every preset has required properties', () => {
    it.each(EXPECTED_PRESETS)('TEXT_STYLES.%s has fontFamily, fontSize, lineHeight', (preset) => {
      const style = TEXT_STYLES[preset];
      expect(style).toHaveProperty('fontFamily');
      expect(style).toHaveProperty('fontSize');
      expect(style).toHaveProperty('lineHeight');
    });
  });

  describe('every preset references valid FONTS values', () => {
    const validFontFamilies = new Set(Object.values(FONTS));

    it.each(EXPECTED_PRESETS)('TEXT_STYLES.%s.fontFamily is a valid FONTS value', (preset) => {
      expect(validFontFamilies.has(TEXT_STYLES[preset].fontFamily)).toBe(true);
    });
  });

  describe('every preset references valid FONT_SIZES values', () => {
    const validFontSizes = new Set(Object.values(FONT_SIZES));

    it.each(EXPECTED_PRESETS)('TEXT_STYLES.%s.fontSize is a valid FONT_SIZES value', (preset) => {
      expect(validFontSizes.has(TEXT_STYLES[preset].fontSize)).toBe(true);
    });
  });

  describe('every preset references valid LINE_HEIGHTS values', () => {
    const validLineHeights = new Set(Object.values(LINE_HEIGHTS));

    it.each(EXPECTED_PRESETS)('TEXT_STYLES.%s.lineHeight is a valid LINE_HEIGHTS value', (preset) => {
      expect(validLineHeights.has(TEXT_STYLES[preset].lineHeight)).toBe(true);
    });
  });

  describe('font weight assignments follow design conventions', () => {
    it('screen title uses bold', () => {
      expect(TEXT_STYLES.screenTitle.fontFamily).toBe(FONTS.bold);
    });

    it('section title uses semiBold', () => {
      expect(TEXT_STYLES.sectionTitle.fontFamily).toBe(FONTS.semiBold);
    });

    it('body styles use regular', () => {
      expect(TEXT_STYLES.bodyLg.fontFamily).toBe(FONTS.regular);
      expect(TEXT_STYLES.bodyMd.fontFamily).toBe(FONTS.regular);
      expect(TEXT_STYLES.bodySm.fontFamily).toBe(FONTS.regular);
    });

    it('label styles use medium', () => {
      expect(TEXT_STYLES.labelLg.fontFamily).toBe(FONTS.medium);
      expect(TEXT_STYLES.labelSm.fontFamily).toBe(FONTS.medium);
    });

    it('button style uses semiBold', () => {
      expect(TEXT_STYLES.buttonLg.fontFamily).toBe(FONTS.semiBold);
    });
  });

  describe('letterSpacing is only on screen title', () => {
    it('screenTitle has letterSpacing -0.5', () => {
      expect(TEXT_STYLES.screenTitle.letterSpacing).toBe(-0.5);
    });
  });
});
