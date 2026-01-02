/**
 * Guide Service
 *
 * Manages guide progress persistence using AsyncStorage.
 * Frontend-only implementation - no backend calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuideId, GuideProgress } from '../types/guides';

const GUIDE_PROGRESS_KEY = '@bridge_guide_progress';

/**
 * Load guide progress from AsyncStorage
 */
export const loadGuideProgress = async (): Promise<GuideProgress> => {
  try {
    const stored = await AsyncStorage.getItem(GUIDE_PROGRESS_KEY);

    if (stored) {
      const progress: GuideProgress = JSON.parse(stored);
      return progress;
    }

    // Return empty progress if nothing stored
    return {
      completedGuides: [],
      skippedGuides: [],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[guideService] Error loading guide progress:', error);
    // Return empty progress on error
    return {
      completedGuides: [],
      skippedGuides: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Save guide progress to AsyncStorage
 */
export const saveGuideProgress = async (progress: GuideProgress): Promise<void> => {
  try {
    const updated = {
      ...progress,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[guideService] Error saving guide progress:', error);
  }
};

/**
 * Mark a specific guide as completed
 */
export const markGuideCompleted = async (guideId: GuideId): Promise<void> => {
  try {
    const progress = await loadGuideProgress();

    // Add to completed if not already there
    if (!progress.completedGuides.includes(guideId)) {
      progress.completedGuides.push(guideId);
    }

    // Remove from skipped if it was skipped before
    progress.skippedGuides = progress.skippedGuides.filter((id) => id !== guideId);

    // Clear current guide if this was it
    if (progress.currentGuide?.guideId === guideId) {
      delete progress.currentGuide;
    }

    await saveGuideProgress(progress);
  } catch (error) {
    console.error('[guideService] Error marking guide completed:', error);
  }
};

/**
 * Mark a specific guide as skipped
 */
export const markGuideSkipped = async (guideId: GuideId): Promise<void> => {
  try {
    const progress = await loadGuideProgress();

    // Add to skipped if not already there and not completed
    if (!progress.skippedGuides.includes(guideId) && !progress.completedGuides.includes(guideId)) {
      progress.skippedGuides.push(guideId);
    }

    // Clear current guide if this was it
    if (progress.currentGuide?.guideId === guideId) {
      delete progress.currentGuide;
    }

    await saveGuideProgress(progress);
  } catch (error) {
    console.error('[guideService] Error marking guide skipped:', error);
  }
};

/**
 * Check if a guide has been completed or skipped
 * (Skipped guides should not restart)
 */
export const isGuideCompleted = async (guideId: GuideId): Promise<boolean> => {
  try {
    const progress = await loadGuideProgress();
    return progress.completedGuides.includes(guideId) || progress.skippedGuides.includes(guideId);
  } catch (error) {
    console.error('[guideService] Error checking guide completion:', error);
    return false;
  }
};

/**
 * Check if a guide has been skipped
 */
export const isGuideSkipped = async (guideId: GuideId): Promise<boolean> => {
  try {
    const progress = await loadGuideProgress();
    return progress.skippedGuides.includes(guideId);
  } catch (error) {
    console.error('[guideService] Error checking guide skip status:', error);
    return false;
  }
};

/**
 * Save current guide state (for resuming after interruption)
 */
export const saveCurrentGuideState = async (
  guideId: GuideId,
  currentStep: number
): Promise<void> => {
  try {
    const progress = await loadGuideProgress();

    progress.currentGuide = {
      guideId,
      currentStep,
    };

    await saveGuideProgress(progress);
  } catch (error) {
    console.error('[guideService] Error saving current guide state:', error);
  }
};

/**
 * Get current guide state (for resuming)
 */
export const getCurrentGuideState = async (): Promise<{
  guideId: GuideId;
  currentStep: number;
} | null> => {
  try {
    const progress = await loadGuideProgress();
    return progress.currentGuide || null;
  } catch (error) {
    console.error('[guideService] Error getting current guide state:', error);
    return null;
  }
};

/**
 * Reset all guides (for settings - clear all progress)
 */
export const resetAllGuides = async (): Promise<void> => {
  try {
    const emptyProgress: GuideProgress = {
      completedGuides: [],
      skippedGuides: [],
      lastUpdated: new Date().toISOString(),
    };

    await saveGuideProgress(emptyProgress);
  } catch (error) {
    console.error('[guideService] Error resetting guides:', error);
  }
};

/**
 * Reset a specific guide (for replay functionality)
 */
export const resetGuide = async (guideId: GuideId): Promise<void> => {
  try {
    const progress = await loadGuideProgress();

    // Remove from both completed and skipped
    progress.completedGuides = progress.completedGuides.filter((id) => id !== guideId);
    progress.skippedGuides = progress.skippedGuides.filter((id) => id !== guideId);

    // Clear current guide if this was it
    if (progress.currentGuide?.guideId === guideId) {
      delete progress.currentGuide;
    }

    await saveGuideProgress(progress);
  } catch (error) {
    console.error('[guideService] Error resetting guide:', error);
  }
};
