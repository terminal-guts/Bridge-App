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
  /** 24px — screen titles */
  '4xl': 24,
  /** 28px — large headings */
  '5xl': 28,
  /** 32px — hero text */
  '6xl': 32,
  /** 40px — display text */
  '7xl': 40,
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
} as const;

// ============================================================================
// Semantic Text Styles
// ============================================================================

/** Pre-built text styles for common UI patterns */
export const TEXT_STYLES = {
  // Headings
  displayLg: {
    fontFamily: FONTS.extraBold,
    fontSize: FONT_SIZES['7xl'],
    lineHeight: LINE_HEIGHTS['7xl'],
    letterSpacing: -0.5,
  },
  displayMd: {
    fontFamily: FONTS.extraBold,
    fontSize: FONT_SIZES['6xl'],
    lineHeight: LINE_HEIGHTS['6xl'],
    letterSpacing: -0.5,
  },
  displaySm: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['5xl'],
    lineHeight: LINE_HEIGHTS['5xl'],
    letterSpacing: -0.3,
  },
  headingLg: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['4xl'],
    lineHeight: LINE_HEIGHTS['4xl'],
    letterSpacing: -0.3,
  },
  headingMd: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['3xl'],
    lineHeight: LINE_HEIGHTS['3xl'],
  },
  headingSm: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES['2xl'],
    lineHeight: LINE_HEIGHTS['2xl'],
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
  labelMd: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
  },
  labelSm: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
  },

  // Captions
  caption: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
  },
  captionBold: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
  },

  // Buttons
  buttonLg: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    lineHeight: LINE_HEIGHTS.xl,
  },
  buttonMd: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
  },
  buttonSm: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
  },
} as const;
