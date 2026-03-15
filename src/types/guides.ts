/**
 * Guide System Type Definitions
 *
 * Types for the onboarding guide/coach marks system that explains
 * Bridge's community-driven matching to new users.
 */

import { LayoutRectangle } from 'react-native';

/**
 * Guide IDs - one for each contextual guide in the app
 */
export type GuideId =
  | 'tab_navigation_overview'
  | 'daily_grid_explained'
  | 'proposals_explained'
  | 'friends_area_explained'
  | 'profile_completion'
  | 'beginner_tour';

/**
 * Tooltip position relative to the highlighted element
 */
export type TooltipPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Highlight style for the target element
 */
export type HighlightType = 'spotlight' | 'border' | 'none';

/**
 * Shape of the spotlight cutout
 */
export type SpotlightShape = 'circle' | 'rounded-rect';

/**
 * Individual step in a guide
 */
export interface GuideStep {
  /** Unique step identifier */
  id: string;

  /** Optional ID of element to highlight (omit for modal-style steps) */
  targetElement?: string;

  /** How to highlight the element */
  highlightType?: HighlightType;

  /** Shape of spotlight (if using spotlight highlight) */
  spotlightShape?: SpotlightShape;

  /** Extra padding around spotlight (default: 12) */
  spotlightPadding?: number;

  /**
   * Custom spotlight region - overrides targetElement if provided.
   * Use percentages or fixed values to define a specific screen area.
   * Example: { top: 0, height: '50%' } for top half of screen
   */
  customSpotlightRegion?: {
    top?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
  };

  /** Where to position the tooltip */
  tooltipPosition: TooltipPosition;

  /** Optional title above message */
  title?: string;

  /** Main message text (supports \n for line breaks) */
  message: string;

  /** Optional icon name (EvaIcon) */
  icon?: string;

  /** Optional image to display between message and button (require() asset) */
  image?: number | { uri: string };

  /** Primary button text (e.g., "Next", "Got It") */
  primaryButtonText: string;

  /** Optional secondary button text (e.g., "Skip", "Back") */
  secondaryButtonText?: string;

  /** Optional callback when primary button pressed */
  onPrimary?: () => void;

  /** Optional callback when secondary button pressed */
  onSecondary?: () => void;

  /**
   * If true, touches pass through the spotlight to the underlying UI.
   * Useful for "Click this button to continue" steps.
   */
  interactive?: boolean;
}

/**
 * Complete guide definition with all steps
 */
export interface GuideDefinition {
  /** Unique guide identifier */
  id: GuideId;

  /** Human-readable guide name */
  name: string;

  /** Short description of what this guide explains */
  description: string;

  /** All steps in this guide */
  steps: GuideStep[];

  /** When to auto-trigger this guide */
  triggerCondition: 'first_visit' | 'manual';

  /** Which screen this guide applies to */
  screenName: string;

  /** Order in which guides should appear (1 = first) */
  priority: number;
}

/**
 * User's progress through guides
 */
export interface GuideProgress {
  /** User ID (for future backend sync) */
  userId?: string;

  /** IDs of guides that have been completed */
  completedGuides: GuideId[];

  /** IDs of guides that user explicitly skipped */
  skippedGuides: GuideId[];

  /** Currently active guide (if any) */
  currentGuide?: {
    guideId: GuideId;
    currentStep: number;
  };

  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Target element layout information
 */
export interface GuideTargetLayout extends LayoutRectangle {
  /** Target element ID */
  id: string;
}

/**
 * Calculated spotlight dimensions
 */
export interface SpotlightDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

/**
 * Calculated tooltip position
 */
export interface TooltipDimensions {
  x: number;
  y: number;
  /** Final position after auto-adjustment */
  position: TooltipPosition;
  /** Width of the tooltip */
  width: number;
}
