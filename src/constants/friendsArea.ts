/**
 * Friends Area Constants
 *
 * Styling constants and configuration for the Friends Area UI redesign.
 * Includes card dimensions, typography, spacing, colors, and timer states.
 */

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
  PENDING_BG: '#FFFFFF',
  COMPLETED_BG: '#F8FAFC',

  // Card borders
  PENDING_BORDER: '#F1F5F9',
  COMPLETED_BORDER: '#E2E8F0',

  // Text colors
  NAME_COLOR: '#1E293B',
  STREAK_COLOR: '#475569',

  // Karma tier colors
  KARMA_DIAMOND: '#8B5CF6', // 20+ assists (violet)
  KARMA_GOLD: '#D97706',    // 15-19 assists (amber)
  KARMA_SILVER: '#C0C0C0',  // 10-14 assists
  KARMA_BRONZE: '#CD7F32',  // 5-9 assists
  KARMA_GRAY: '#94A3B8',    // 0-4 assists (neutral)

  // Streak glow (for 10+ streaks)
  STREAK_GLOW_BG: '#FEF3C7',
  STREAK_GLOW_BORDER: '#FCD34D',
};

// Timer urgency states
export const TIMER_STATES = {
  PLENTY: {
    icon: '⏰',
    color: '#64748B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    thresholdHours: 6,
    shouldPulse: false,
  },
  MODERATE: {
    icon: '🔥',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    thresholdHours: 2,
    shouldPulse: false,
  },
  URGENT: {
    icon: '⚡',
    color: '#F43F5E',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
    thresholdHours: 2,
    shouldPulse: true,
  },
  CRITICAL: {
    icon: '🚨',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    thresholdHours: 0.25,
    shouldPulse: true,
  },
};

// Separator styling
export const SEPARATOR = {
  HEIGHT: 48,
  TEXT_SIZE: 12,
  TEXT_COLOR: '#64748B',
  LINE_COLOR: '#E2E8F0',
  BG_COLOR: '#FAFBFC',
};

// Celebration banner styling
export const CELEBRATION_BANNER = {
  PADDING_VERTICAL: 16,
  PADDING_HORIZONTAL: 20,
  MARGIN_HORIZONTAL: 16,
  MARGIN_TOP: 16,
  MARGIN_BOTTOM: 8,
  BORDER_RADIUS: 12,
  BORDER_WIDTH: 2,
  BORDER_COLOR: '#FECDD3',
  TEXT_SIZE: 16,
  TEXT_WEIGHT: '600' as const,
  TEXT_COLOR: '#9F1239',
  GRADIENT_START: '#FFF1F2',
  GRADIENT_END: '#FFFBEB',
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
