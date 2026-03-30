/**
 * Friends Area Constants
 *
 * Styling constants and configuration for the Friends Area UI redesign.
 * Includes card dimensions, typography, spacing, colors, and timer states.
 */

import { COLORS as THEME_COLORS } from '../theme/colors';

// Friend card dimensions
export const FRIEND_CARD = {
  HEIGHT: 76,
  PADDING_HORIZONTAL: 16,
  PADDING_VERTICAL: 12,
  AVATAR_SIZE: 56,
  AVATAR_BORDER_RADIUS: 28,
  AVATAR_BORDER_WIDTH: 2,
};

// Typography sizes
export const TYPOGRAPHY = {
  NAME_SIZE: 18,
  NAME_WEIGHT: '700' as const,
  NAME_LINE_HEIGHT: 22,
  STREAK_SIZE: 12,
  STREAK_WEIGHT: '500' as const,
  TIER_SIZE: 10,
  TIER_WEIGHT: '600' as const,
  KARMA_SIZE: 20,
  KARMA_WEIGHT: '700' as const,
  STARS_SIZE: 14,
};

// Spacing values
export const SPACING = {
  NAME_TO_STREAK: 2,
  STREAK_EMOJI_TO_NUMBER: 2,
  STREAK_TO_TIER: 6,
  KARMA_TO_STARS: 2,
};

// Colors
export const COLORS = {
  // Card backgrounds
  PENDING_BG: THEME_COLORS.card,
  COMPLETED_BG: THEME_COLORS.card,

  // Card borders
  PENDING_BORDER: THEME_COLORS.borderLight,
  COMPLETED_BORDER: THEME_COLORS.border,

  // Text colors
  NAME_COLOR: THEME_COLORS.text.primary,
  STREAK_COLOR: THEME_COLORS.text.secondary,

  // Karma tier colors
  KARMA_DIAMOND: THEME_COLORS.primary,      // 20+ assists
  KARMA_GOLD: THEME_COLORS.amber,           // 15-19 assists (amber)
  KARMA_SILVER: THEME_COLORS.podiumSilver,  // 10-14 assists
  KARMA_BRONZE: THEME_COLORS.podiumBronze,  // 5-9 assists
  KARMA_GRAY: THEME_COLORS.text.tertiary,   // 0-4 assists (neutral)

  // Streak glow — removed (streaks are persistent info, no colored glow)
  STREAK_GLOW_BG: 'transparent',
  STREAK_GLOW_BORDER: THEME_COLORS.border,
};

// Timer urgency states — neutral for plenty of time, status colors only for real urgency
export const TIMER_STATES = {
  PLENTY: {
    icon: 'clock',
    color: THEME_COLORS.text.tertiary,
    bgColor: THEME_COLORS.card,
    borderColor: THEME_COLORS.border,
    thresholdHours: 6,
    shouldPulse: false,
  },
  MODERATE: {
    icon: 'clock',
    color: THEME_COLORS.text.tertiary,
    bgColor: THEME_COLORS.card,
    borderColor: THEME_COLORS.border,
    thresholdHours: 2,
    shouldPulse: false,
  },
  URGENT: {
    icon: 'flash',
    color: THEME_COLORS.amber,
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    thresholdHours: 2,
    shouldPulse: false,
  },
  CRITICAL: {
    icon: 'alert-triangle',
    color: THEME_COLORS.error,
    bgColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    thresholdHours: 0.25,
    shouldPulse: true,
  },
};

// Separator styling
export const SEPARATOR = {
  HEIGHT: 48,
  TEXT_SIZE: 12,
  TEXT_COLOR: THEME_COLORS.text.secondary,
  LINE_COLOR: THEME_COLORS.border,
  BG_COLOR: THEME_COLORS.screenBackground,
};

// Celebration banner styling — neutral to match color philosophy
export const CELEBRATION_BANNER = {
  PADDING_VERTICAL: 16,
  PADDING_HORIZONTAL: 20,
  MARGIN_HORIZONTAL: 16,
  MARGIN_TOP: 16,
  MARGIN_BOTTOM: 8,
  BORDER_RADIUS: 12,
  BORDER_WIDTH: 1,
  BORDER_COLOR: THEME_COLORS.border,
  TEXT_SIZE: 16,
  TEXT_WEIGHT: '600' as const,
  TEXT_COLOR: THEME_COLORS.text.primary,
  GRADIENT_START: THEME_COLORS.card,
  GRADIENT_END: THEME_COLORS.card,
};

// Streak celebration thresholds
export const STREAK_TIERS = {
  CROWN: 30,    // 👑
  DIAMOND: 20,  // 💎
  STAR: 15,     // 💫
  SPARKLE: 10,  // ✨
};

// Karma star thresholds
export const KARMA_TIERS = {
  THREE_STARS_SPARKLE: 20, // ⭐⭐⭐✨
  THREE_STARS: 15,          // ⭐⭐⭐
  TWO_STARS: 10,            // ⭐⭐
  ONE_STAR: 5,              // ⭐
  NO_STARS: 0,              // (none)
};
