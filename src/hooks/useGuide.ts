/**
 * useGuide Hook
 *
 * Hook for screens to trigger and manage guides.
 * Simplifies guide integration into components.
 */

import { useEffect, useCallback } from 'react';
import { useGuideContext } from '../contexts/GuideContext';
import { GuideDefinition } from '../types/guides';
import { isGuideCompleted, resetGuide } from '../services/guideService';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('useGuide');

interface UseGuideReturn {
  /**
   * Start a guide if it hasn't been completed yet
   */
  startGuideIfNeeded: (guide: GuideDefinition) => Promise<void>;

  /**
   * Force start a guide (for replay functionality)
   */
  replayGuide: (guide: GuideDefinition) => Promise<void>;

  /**
   * Check if guide is currently playing
   */
  isPlaying: boolean;

  /**
   * Check if specific guide has been completed
   */
  isCompleted: (guideId: string) => boolean;
}

/**
 * Hook to manage guides in a component
 */
export const useGuide = (): UseGuideReturn => {
  const { startGuide, isPlaying, completedGuides } = useGuideContext();

  /**
   * Start guide only if not completed
   */
  const startGuideIfNeeded = useCallback(
    async (guide: GuideDefinition) => {
      try {
        // Check if guide is already completed
        const completed = await isGuideCompleted(guide.id);

        if (!completed && guide.triggerCondition === 'first_visit') {
          // Start immediately (screen-level delays already applied)
          startGuide(guide);
        }
      } catch (error) {
        logger.error('[useGuide] Error checking guide completion:', error);
      }
    },
    [startGuide]
  );

  /**
   * Force replay a guide (reset completion and start)
   */
  const replayGuide = useCallback(
    async (guide: GuideDefinition) => {
      try {
        // Reset guide completion
        await resetGuide(guide.id);

        // Start guide after small delay
        setTimeout(() => {
          startGuide(guide);
        }, 300);
      } catch (error) {
        logger.error('[useGuide] Error replaying guide:', error);
      }
    },
    [startGuide]
  );

  /**
   * Check if specific guide is completed
   */
  const isCompleted = useCallback(
    (guideId: string) => {
      return completedGuides.has(guideId as any);
    },
    [completedGuides]
  );

  return {
    startGuideIfNeeded,
    replayGuide,
    isPlaying,
    isCompleted,
  };
};
