/**
 * Typography Constants — Plus Jakarta Sans
 *
 * Centralized font families, sizes, and text styles for the entire app.
 * Change the font family here and it propagates everywhere.
 */

// ============================================================================
// Font Families
// ============================================================================

export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

// ============================================================================
// Font Sizes
// ============================================================================

export const FONT_SIZES = {
  /** 11px — fine print, timestamps */
  xs: 11,
  /** 12px — captions, badges */
  sm: 12,
  /** 13px — secondary labels */
  md: 13,
  /** 14px — body small */
  base: 14,
  /** 15px — body default */
  lg: 15,
  /** 16px — body large, buttons */
  xl: 16,
  /** 18px — subheadings */
  '2xl': 18,
  /** 20px — section titles */
  '3xl': 20,
  /** 24px — screen titles (extraBold) */
  '4xl': 24,
  /** 28px — primary tab screen titles (extraBold) */
  '5xl': 28,
  /** 32px — hero text (extraBold) */
  '6xl': 32,
  /** 40px — display text */
  '7xl': 40,
  /** 44px — archetype emoji */
  '8xl': 44,
  /** 48px — share card emoji */
  '9xl': 48,
  /** 52px — hero stat numbers */
  '10xl': 52,
} as const;

// ============================================================================
// Line Heights
// ============================================================================

export const LINE_HEIGHTS = {
  xs: 14,
  sm: 16,
  md: 17,
  base: 18,
  lg: 20,
  xl: 22,
  '2xl': 24,
  '3xl': 26,
  '4xl': 30,
  '5xl': 34,
  '6xl': 38,
  '7xl': 48,
  '8xl': 52,
  '9xl': 56,
  '10xl': 60,
} as const;

// ============================================================================
// Semantic Text Styles
// ============================================================================

/** Pre-built text styles for common UI patterns */
export const TEXT_STYLES = {
  // Screen — titles and section headers
  screenTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['5xl'],
    lineHeight: LINE_HEIGHTS['5xl'],
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
  },

  // Body
  bodyLg: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
  },
  bodyMd: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
  },
  bodySm: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
  },

  // Labels (medium weight)
  labelLg: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
  },
  labelSm: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
  },

  // Buttons
  buttonLg: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
  },
} as const;
