/**
 * Constants Module
 *
 * Centralized constants for the entire application.
 * Import specific categories or individual constants as needed.
 *
 * @example
 * // Import entire category
 * import { SPACING, AVATAR_SIZE_MD } from '@/constants';
 *
 * // Import specific constants
 * import { FADE_DURATION, BUTTON_PRESS_FEEDBACK } from '@/constants/timings';
 */

// Re-export all timing constants
export * from './timings';

// Re-export all dimension constants
export * from './dimensions';

// ============================================================================
// Quick Reference
// ============================================================================

/**
 * TIMINGS - Use for all time-based values
 * - MOCK_API_DELAY - Development API simulation
 * - PROFILE_CACHE_DURATION - Data freshness
 * - BUTTON_PRESS_FEEDBACK - Visual feedback
 * - FADE_DURATION, SLIDE_DURATION, etc. - Animations
 * - STAGGER_DELAY - Sequential animations
 *
 * DIMENSIONS - Use for all size/spacing values
 * - SPACING.xs through SPACING.5xl - Consistent spacing
 * - AVATAR_SIZE_* - Avatar dimensions
 * - ICON_SIZE_* - Icon dimensions
 * - BORDER_RADIUS_* - Corner rounding
 * - Z_INDEX.* - Layer stacking
 * - ELEVATION.* - Shadow depths
 */
