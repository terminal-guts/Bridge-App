/**
 * Guide Context
 *
 * Global state management for the onboarding guide system.
 * Manages active guide, current step, target element layouts, and guide progression.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { LayoutRectangle } from 'react-native';
import { GuideId, GuideDefinition, GuideTargetLayout } from '../types/guides';
import {
  loadGuideProgress,
  markGuideCompleted,
  markGuideSkipped,
  saveCurrentGuideState,
  isGuideCompleted,
} from '../services/guideService';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('GuideContext');

interface GuideContextState {
  // Active guide state
  activeGuide: GuideDefinition | null;
  currentStep: number;
  isPlaying: boolean;

  // Completed guides (loaded from AsyncStorage)
  completedGuides: Set<GuideId>;

  // Target element layouts
  targetLayouts: Map<string, LayoutRectangle>;

  // Control methods
  startGuide: (guide: GuideDefinition) => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  skipGuide: () => void;
  /** Synchronous stop — immediately clears playing state, then persists skip async.
   *  Use this when you need the guide to stop before a navigation fires (e.g.
   *  navigating from MainTabs → MatchmakerTabs). The async skipGuide() updates
   *  state AFTER an AsyncStorage await, which is too late to prevent mid-animation
   *  Reanimated components from crashing during the navigation unmount. */
  stopGuide: () => void;
  completeGuide: () => Promise<void>;

  // Target registration
  registerTarget: (id: string, layout: LayoutRectangle) => void;
  unregisterTarget: (id: string) => void;

  // Utility methods
  reloadCompletedGuides: () => Promise<void>;
}

const GuideContext = createContext<GuideContextState | undefined>(undefined);

interface GuideProviderProps {
  children: React.ReactNode;
}

export const GuideProvider: React.FC<GuideProviderProps> = ({ children }) => {
  // State
  const [activeGuide, setActiveGuide] = useState<GuideDefinition | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedGuides, setCompletedGuides] = useState<Set<GuideId>>(new Set());
  const [targetLayouts, setTargetLayouts] = useState<Map<string, LayoutRectangle>>(new Map());

  // Ref to prevent multiple simultaneous guide starts
  const isStartingRef = useRef(false);

  /**
   * Load completed guides from AsyncStorage on mount
   */
  const reloadCompletedGuides = useCallback(async () => {
    try {
      const progress = await loadGuideProgress();
      setCompletedGuides(new Set(progress.completedGuides));
    } catch (error) {
      logger.error('[GuideContext] Error loading completed guides:', error);
    }
  }, []);

  useEffect(() => {
    reloadCompletedGuides();
  }, [reloadCompletedGuides]);

  /**
   * Start a guide
   */
  const startGuide = useCallback(
    async (guide: GuideDefinition) => {
      // Prevent starting if already starting or playing
      if (isStartingRef.current || isPlaying) {
        return;
      }

      // Set flag immediately to prevent race conditions
      isStartingRef.current = true;

      try {
        // Check if already completed
        const completed = await isGuideCompleted(guide.id);
        if (completed) {
          logger.info(`[GuideContext] Guide "${guide.id}" already completed, skipping`);
          return;
        }

        setActiveGuide(guide);
        setCurrentStep(0);
        setIsPlaying(true);

        // Save state for resuming
        await saveCurrentGuideState(guide.id, 0);

        // Light haptic feedback
        lightHaptic();

        logger.info(`[GuideContext] Started guide: ${guide.id}`);
      } finally {
        isStartingRef.current = false;
      }
    },
    [isPlaying]
  );

  /**
   * Complete the guide
   */
  const completeGuide = useCallback(async () => {
    if (!activeGuide) return;

    successHaptic();

    // Mark as completed in AsyncStorage
    await markGuideCompleted(activeGuide.id);

    // Reload completed guides set
    await reloadCompletedGuides();

    // Close guide
    setIsPlaying(false);
    setActiveGuide(null);
    setCurrentStep(0);

    logger.info(`[GuideContext] Completed guide: ${activeGuide.id}`);
  }, [activeGuide, reloadCompletedGuides]);

  /**
   * Advance to next step
   */
  const nextStep = useCallback(async () => {
    if (!activeGuide) return;

    lightHaptic();

    const nextStepIndex = currentStep + 1;

    // Check if this was the last step
    if (nextStepIndex >= activeGuide.steps.length) {
      // Guide completed
      await completeGuide();
    } else {
      // Move to next step
      setCurrentStep(nextStepIndex);
      await saveCurrentGuideState(activeGuide.id, nextStepIndex);
    }
  }, [activeGuide, currentStep, completeGuide]);

  /**
   * Go back to previous step
   */
  const previousStep = useCallback(async () => {
    if (!activeGuide || currentStep === 0) return;

    lightHaptic();

    const prevStepIndex = currentStep - 1;
    setCurrentStep(prevStepIndex);
    await saveCurrentGuideState(activeGuide.id, prevStepIndex);
  }, [activeGuide, currentStep]);

  /**
   * Synchronously stop the guide and fire-and-forget the AsyncStorage write.
   * Used when a navigation is about to fire and we need the guide state cleared
   * BEFORE React processes the next render (e.g. MainTabs → MatchmakerTabs role
   * correction). The async skipGuide() sets state only after an await, which
   * arrives too late to prevent Reanimated animated components from crashing
   * as they unmount during the navigation transition.
   */
  const stopGuide = useCallback(() => {
    if (!activeGuide) return;
    // Update state synchronously — GuideOverlay returns null on next render
    setIsPlaying(false);
    setActiveGuide(null);
    setCurrentStep(0);
    // Persist the skip without blocking — fire and forget
    markGuideSkipped(activeGuide.id).catch(() => {});
    logger.info(`[GuideContext] Stopped guide synchronously: ${activeGuide.id}`);
  }, [activeGuide]);

  /**
   * Skip the guide
   */
  const skipGuide = useCallback(async () => {
    if (!activeGuide) return;

    mediumHaptic();

    // Mark as skipped in AsyncStorage
    await markGuideSkipped(activeGuide.id);

    // Close guide
    setIsPlaying(false);
    setActiveGuide(null);
    setCurrentStep(0);

    logger.info(`[GuideContext] Skipped guide: ${activeGuide.id}`);
  }, [activeGuide]);

  /**
   * Register a target element's layout
   */
  const registerTarget = useCallback((id: string, layout: LayoutRectangle) => {
    setTargetLayouts((prev) => {
      const existing = prev.get(id);
      if (
        existing &&
        existing.x === layout.x &&
        existing.y === layout.y &&
        existing.width === layout.width &&
        existing.height === layout.height
      ) {
        return prev; // No change — skip re-render
      }
      const updated = new Map(prev);
      updated.set(id, layout);
      return updated;
    });
  }, []);

  /**
   * Unregister a target element
   */
  const unregisterTarget = useCallback((id: string) => {
    setTargetLayouts((prev) => {
      const updated = new Map(prev);
      updated.delete(id);
      return updated;
    });
  }, []);

  const value: GuideContextState = {
    activeGuide,
    currentStep,
    isPlaying,
    completedGuides,
    targetLayouts,
    startGuide,
    nextStep,
    previousStep,
    skipGuide,
    stopGuide,
    completeGuide,
    registerTarget,
    unregisterTarget,
    reloadCompletedGuides,
  };

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
};

/**
 * Hook to access guide context
 */
export const useGuideContext = (): GuideContextState => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuideContext must be used within a GuideProvider');
  }
  return context;
};
