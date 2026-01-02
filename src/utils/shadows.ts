/**
 * Shadow Utilities
 *
 * Two-layer shadow system following design principles:
 * - Light shadow (top) + Dark shadow (bottom) for realism
 * - Three depth levels: small, medium, large
 * - Light from above concept
 */

export const shadows = {
  // SMALL - Subtle elevation (cards at rest)
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  smallTop: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: -0.5 },
    shadowOpacity: 0.8,
    shadowRadius: 0.5,
    elevation: 1,
  },

  // MEDIUM - Standard elevation (interactive elements)
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mediumTop: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.6,
    shadowRadius: 1,
    elevation: 2,
  },

  // LARGE - Prominent elevation (hover, focus, important elements)
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  largeTop: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },

  // INSET - Sunken effect (used for inner containers)
  inset: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0, // Negative elevation effect
  },
};

/**
 * Combine dual shadows for realistic depth
 * Usage: Apply both bottom and top shadow to same element via array spread
 */
export const getDualShadow = (level: 'small' | 'medium' | 'large') => {
  return [shadows[level], shadows[`${level}Top` as keyof typeof shadows]];
};

/**
 * Linear gradient configs for shiny, elevated effect
 */
export const gradients = {
  // Subtle top-to-bottom lightness for cards
  cardShine: {
    colors: ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0)'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0.3 },
  },

  // Stronger shine for buttons/CTAs
  buttonShine: {
    colors: ['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0.5 },
  },

  // Inset shadow effect (darker at top, lighter at bottom)
  insetEffect: {
    colors: ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0)'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0.2 },
  },
};
