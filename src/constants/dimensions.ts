/**
 * Dimension Constants
 *
 * Centralized size and spacing values used throughout the application.
 * All values are in pixels unless otherwise noted.
 *
 * Organization:
 * - Spacing
 * - Avatar & Image Sizes
 * - Icon Sizes
 * - Border Radii
 * - Layout Dimensions
 */

import { Dimensions } from 'react-native';

// ============================================================================
// Screen Dimensions
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export { SCREEN_WIDTH, SCREEN_HEIGHT };

/**
 * Safe content width for readable text
 * Maximum width for optimal reading
 */
export const MAX_CONTENT_WIDTH = 640; // px

/**
 * Horizontal padding for screens
 * Standard padding for screen edges
 */
export const SCREEN_PADDING_HORIZONTAL = 16; // px (Tailwind: px-4)

/**
 * Vertical padding for screens
 * Standard padding for top/bottom
 */
export const SCREEN_PADDING_VERTICAL = 24; // px (Tailwind: py-6)

// ============================================================================
// Spacing Scale
// ============================================================================

/**
 * Spacing scale following Tailwind convention
 * Use these for consistent spacing throughout the app
 */
export const SPACING = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  '2xl': 24,
  /** 32px */
  '3xl': 32,
  /** 40px */
  '4xl': 40,
  /** 48px */
  '5xl': 48,
} as const;

// ============================================================================
// Avatar Sizes
// ============================================================================

/**
 * Extra small avatar (profile badges, tiny indicators)
 */
export const AVATAR_SIZE_XS = 20; // px

/**
 * Small avatar (endorser avatars, inline mentions)
 */
export const AVATAR_SIZE_SM = 24; // px

/**
 * Medium avatar (friend cards, list items)
 */
export const AVATAR_SIZE_MD = 48; // px

/**
 * Large avatar (user cards, proposal cards)
 */
export const AVATAR_SIZE_LG = 60; // px

/**
 * Extra large avatar (profile screen, detail views)
 */
export const AVATAR_SIZE_XL = 96; // px

/**
 * Huge avatar (full profile header)
 */
export const AVATAR_SIZE_XXL = 120; // px

// ============================================================================
// Icon Sizes
// ============================================================================

/**
 * Extra small icon (inline badges, indicators)
 */
export const ICON_SIZE_XS = 12; // px

/**
 * Small icon (chips, pills, small buttons)
 */
export const ICON_SIZE_SM = 14; // px

/**
 * Medium icon (buttons, list items) - Most common
 */
export const ICON_SIZE_MD = 16; // px

/**
 * Large icon (section headers, prominent actions)
 */
export const ICON_SIZE_LG = 20; // px

/**
 * Extra large icon (feature highlights, empty states)
 */
export const ICON_SIZE_XL = 24; // px

/**
 * Huge icon (hero sections, celebration animations)
 */
export const ICON_SIZE_XXL = 48; // px

// ============================================================================
// Border Radii
// ============================================================================

/**
 * Small border radius (chips, tags)
 */
export const BORDER_RADIUS_SM = 8; // px (Tailwind: rounded-lg)

/**
 * Medium border radius (buttons, cards)
 */
export const BORDER_RADIUS_MD = 12; // px (Tailwind: rounded-xl)

/**
 * Large border radius (modals, large cards)
 */
export const BORDER_RADIUS_LG = 16; // px (Tailwind: rounded-2xl)

/**
 * Extra large border radius (hero sections)
 */
export const BORDER_RADIUS_XL = 24; // px (Tailwind: rounded-3xl)

/**
 * Full circle border radius
 */
export const BORDER_RADIUS_FULL = 9999; // px (Tailwind: rounded-full)

// ============================================================================
// Button Dimensions
// ============================================================================

/**
 * Small button height
 */
export const BUTTON_HEIGHT_SM = 32; // px

/**
 * Medium button height (default)
 */
export const BUTTON_HEIGHT_MD = 44; // px

/**
 * Large button height
 */
export const BUTTON_HEIGHT_LG = 52; // px

/**
 * Button horizontal padding
 */
export const BUTTON_PADDING_HORIZONTAL = 20; // px

/**
 * Icon button size (square)
 */
export const ICON_BUTTON_SIZE = 40; // px

// ============================================================================
// Card Dimensions
// ============================================================================

/**
 * Card padding (default)
 */
export const CARD_PADDING = 16; // px (Tailwind: p-4)

/**
 * Card padding (compact)
 */
export const CARD_PADDING_SM = 12; // px (Tailwind: p-3)

/**
 * Card padding (spacious)
 */
export const CARD_PADDING_LG = 20; // px (Tailwind: p-5)

/**
 * Minimum card height
 */
export const CARD_MIN_HEIGHT = 60; // px

// ============================================================================
// Photo/Image Dimensions
// ============================================================================

/**
 * Photo carousel/viewer height
 * Optimal height for full-screen photo viewing
 */
export const PHOTO_CAROUSEL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, SCREEN_WIDTH * 1.25);

/**
 * Thumbnail size (grid view)
 */
export const THUMBNAIL_SIZE = 80; // px

/**
 * Photo grid item size
 */
export const PHOTO_GRID_ITEM = 120; // px

/**
 * Profile header photo height
 */
export const PROFILE_HEADER_PHOTO_HEIGHT = 200; // px

// ============================================================================
// Input Dimensions
// ============================================================================

/**
 * Text input height (single line)
 */
export const INPUT_HEIGHT = 44; // px

/**
 * Text input horizontal padding
 */
export const INPUT_PADDING_HORIZONTAL = 12; // px

/**
 * Text area minimum height
 */
export const TEXTAREA_MIN_HEIGHT = 100; // px

/**
 * Search bar height
 */
export const SEARCH_BAR_HEIGHT = 48; // px

// ============================================================================
// Modal Dimensions
// ============================================================================

/**
 * Modal max width
 * Maximum width for modals on large screens
 */
export const MODAL_MAX_WIDTH = 480; // px

/**
 * Modal padding
 */
export const MODAL_PADDING = 20; // px

/**
 * Bottom sheet max height
 */
export const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.9;

// ============================================================================
// Tab Bar Dimensions
// ============================================================================

/**
 * Tab bar height
 */
export const TAB_BAR_HEIGHT = 60; // px

/**
 * Tab bar icon size
 */
export const TAB_BAR_ICON_SIZE = 24; // px

/**
 * Tab indicator height
 */
export const TAB_INDICATOR_HEIGHT = 2; // px

// ============================================================================
// List Item Dimensions
// ============================================================================

/**
 * List item minimum height
 */
export const LIST_ITEM_HEIGHT = 56; // px

/**
 * List item compact height
 */
export const LIST_ITEM_HEIGHT_SM = 44; // px

/**
 * List item large height
 */
export const LIST_ITEM_HEIGHT_LG = 72; // px

/**
 * List separator height
 */
export const LIST_SEPARATOR_HEIGHT = 1; // px

// ============================================================================
// Shadow & Elevation
// ============================================================================

/**
 * Shadow elevations
 * Corresponds to Material Design elevation levels
 */
export const ELEVATION = {
  /** No shadow */
  none: 0,
  /** Subtle shadow (cards, buttons) */
  low: 2,
  /** Medium shadow (modals, dropdowns) */
  medium: 4,
  /** Strong shadow (floating action buttons) */
  high: 8,
  /** Maximum shadow (overlays) */
  highest: 12,
} as const;

// ============================================================================
// Z-Index Layers
// ============================================================================

/**
 * Z-index layering system
 * Ensures correct stacking of UI elements
 */
export const Z_INDEX = {
  /** Default layer */
  base: 0,
  /** Dropdown menus */
  dropdown: 10,
  /** Sticky headers */
  sticky: 20,
  /** Fixed headers/footers */
  fixed: 30,
  /** Overlay backgrounds */
  overlay: 40,
  /** Modals and dialogs */
  modal: 50,
  /** Popover menus */
  popover: 60,
  /** Tooltips */
  tooltip: 70,
  /** Toast notifications */
  toast: 80,
  /** Maximum (emergency use only) */
  max: 100,
} as const;

// ============================================================================
// Touch Target Sizes
// ============================================================================

/**
 * Minimum touch target size (accessibility)
 * Per WCAG guidelines
 */
export const MIN_TOUCH_TARGET = 44; // px

/**
 * Recommended touch target size
 */
export const TOUCH_TARGET_SIZE = 48; // px

// ============================================================================
// Grid & Layout
// ============================================================================

/**
 * Grid column count (mobile)
 */
export const GRID_COLUMNS_MOBILE = 2;

/**
 * Grid gap
 */
export const GRID_GAP = 16; // px
