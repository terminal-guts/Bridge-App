import { Platform, ViewStyle } from 'react-native';

// ── Neutral Elevation Shadows ───────────────────────────────────
// Warm brown palette for natural, inviting depth on iOS.
// Android uses numeric elevation (no color support).

export const SHADOWS = {
  /** No shadow — flat surfaces */
  none: {} as ViewStyle,

  /** Subtle — list items, badges, inputs */
  sm: {
    ...Platform.select({
      ios: {
        shadowColor: '#4A3428',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  } as ViewStyle,

  /** Default — resting cards, segments */
  md: {
    ...Platform.select({
      ios: {
        shadowColor: '#4A3428',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  } as ViewStyle,

  /** Section cards, raised buttons */
  lg: {
    ...Platform.select({
      ios: {
        shadowColor: '#3D2817',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  } as ViewStyle,

  /** Hero cards, popovers */
  xl: {
    ...Platform.select({
      ios: {
        shadowColor: '#3D2817',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  } as ViewStyle,

  /** Modals, bottom sheets */
  xxl: {
    ...Platform.select({
      ios: {
        shadowColor: '#2E1810',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.26,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  } as ViewStyle,

  // ── Accent Glows (colored, semantic emphasis) ──────────────────

  /** CTAs, active states — brand blue */
  accentBlue: {
    ...Platform.select({
      ios: {
        shadowColor: '#437FFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  } as ViewStyle,

  /** Success, active matches — green */
  accentGreen: {
    ...Platform.select({
      ios: {
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  } as ViewStyle,

  /** Alerts, expiring items — rose/red */
  accentRed: {
    ...Platform.select({
      ios: {
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  } as ViewStyle,

  /** 1st place leaderboard — gold */
  accentGold: {
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  } as ViewStyle,

  /** 2nd place leaderboard — silver */
  accentSilver: {
    ...Platform.select({
      ios: {
        shadowColor: '#8A8A8A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.20,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  } as ViewStyle,

  /** 3rd place leaderboard — bronze */
  accentBronze: {
    ...Platform.select({
      ios: {
        shadowColor: '#CD7F32',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.20,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  } as ViewStyle,
} as const;

// ── Shadow Level Types ──────────────────────────────────────────
// For component-level shadow API: <Card shadow="lg">

/** Neutral elevation levels */
export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** All shadow keys including accent glows */
export type ShadowKey = keyof typeof SHADOWS;

/** Resolve any ShadowKey to its ViewStyle */
export function resolveShadow(shadow: ShadowKey): ViewStyle {
  return SHADOWS[shadow];
}

// ── Animated Depth Constants (iOS) ──────────────────────────────
// Used by AnimatedPressable for press-in/press-out shadow transitions.
// Values are [resting, pressed] pairs for interpolation.

export const DEPTH_PARAMS = {
  sm:  { opacity: 0.08, radius: 3, offsetY: 1 },
  md:  { opacity: 0.12, radius: 4, offsetY: 2 },
  lg:  { opacity: 0.18, radius: 8, offsetY: 3 },
  xl:  { opacity: 0.22, radius: 14, offsetY: 6 },
  xxl: { opacity: 0.26, radius: 20, offsetY: 8 },
} as const;

/** Press-in depth reduction factor (40% reduction feels like pressing into surface) */
export const DEPTH_PRESS_FACTOR = 0.4;

// ── Glow Shadow Helper ──────────────────────────────────────────
// For one-off colored glows (streak rings, fire icons, etc.)

const GLOW_INTENSITY = {
  subtle: { opacity: 0.10, radius: 4, offset: 2 },
  medium: { opacity: 0.20, radius: 8, offset: 3 },
  strong: { opacity: 0.35, radius: 12, offset: 4 },
} as const;

type GlowIntensity = keyof typeof GLOW_INTENSITY;

const glowCache = new Map<string, ViewStyle>();

export function glowShadow(color: string, intensity: GlowIntensity = 'medium'): ViewStyle {
  const key = `${color}-${intensity}`;
  const cached = glowCache.get(key);
  if (cached) return cached;

  const { opacity, radius, offset } = GLOW_INTENSITY[intensity];
  const style: ViewStyle = {
    ...Platform.select({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: offset },
        shadowOpacity: opacity,
        shadowRadius: radius,
      },
      android: { elevation: Math.round(radius * 0.5) },
    }),
  };

  glowCache.set(key, style);
  return style;
}

// ── Modal Overlay Colors ────────────────────────────────────────

export const OVERLAYS = {
  light: 'rgba(0, 0, 0, 0.35)',
  medium: 'rgba(0, 0, 0, 0.50)',
  heavy: 'rgba(0, 0, 0, 0.65)',
} as const;
