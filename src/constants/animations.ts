/**
 * Animation Design Tokens
 *
 * Centralized animation constants for consistent motion throughout the app.
 * Based on iOS HIG motion principles and mobile UX research:
 * - Micro-interactions: 100-200ms (button presses, toggles, selections)
 * - Transitions: 250-350ms (screen changes, content reveals)
 * - Emphasis: 400-600ms (celebrations, onboarding reveals)
 *
 * All springs use Reanimated's damping/stiffness model.
 * All timing uses Reanimated's Easing curves.
 */

import { Easing } from 'react-native-reanimated';

// ── Duration tokens (milliseconds) ──────────────────────────────────────────

export const DURATIONS = {
  /** Instant feedback: button press, toggle, chip select */
  micro: 150,
  /** Standard transition: content swap, modal appear */
  normal: 280,
  /** Deliberate transition: screen enter/exit, card expand */
  slow: 400,
  /** Emphasis: celebration, onboarding hero reveal */
  emphasis: 600,
} as const;

// ── Easing curves ────────────────────────────────────────────────────────────

export const EASINGS = {
  /** Standard ease-out: decelerating motion for entering elements */
  enter: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  /** Ease-in: accelerating motion for exiting elements */
  exit: Easing.bezier(0.4, 0.0, 1.0, 1.0),
  /** Ease-in-out: symmetric for transforms (scale, move) */
  standard: Easing.bezier(0.4, 0.0, 0.2, 1.0),
  /** Emphasized ease-in-out: more pronounced for important transitions */
  emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),
} as const;

// ── Spring configurations ────────────────────────────────────────────────────

export const SPRINGS = {
  /** Snappy: button press, chip toggle — fast with minimal overshoot */
  snappy: {
    damping: 15,
    stiffness: 400,
    mass: 0.8,
  },
  /** Responsive: card press, interactive feedback — balanced */
  responsive: {
    damping: 18,
    stiffness: 300,
    mass: 1,
  },
  /** Gentle: expand/collapse, modal slide — soft and natural */
  gentle: {
    damping: 20,
    stiffness: 180,
    mass: 1,
  },
  /** Bouncy: success celebration, achievement — playful overshoot */
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 0.8,
  },
} as const;

// ── Scale values ─────────────────────────────────────────────────────────────

export const PRESS_SCALES = {
  /** Subtle: cards, large touch areas */
  subtle: 0.985,
  /** Standard: buttons, chips */
  standard: 0.96,
  /** Pronounced: small interactive elements, icon buttons */
  pronounced: 0.92,
} as const;

// ── Screen transition presets ────────────────────────────────────────────────

export const SCREEN_TRANSITIONS = {
  /** Slide from right (iOS default, enhanced) */
  slideFromRight: {
    duration: 320,
  },
  /** Fade transition for tab switches */
  fade: {
    duration: 200,
  },
  /** Slide up for modals */
  slideUp: {
    duration: 350,
  },
} as const;

// ── Stagger delays ───────────────────────────────────────────────────────────

export const STAGGER = {
  /** Fast stagger for list items */
  fast: 50,
  /** Standard stagger for card reveals */
  normal: 80,
  /** Slow stagger for onboarding elements */
  slow: 120,
} as const;
