/**
 * Feature Flags Configuration
 *
 * Controls gradual rollout of dashboard backend integration.
 * All flags default to false (mock data) for safety.
 *
 * To enable a feature, set its flag to true.
 * Features can be toggled at runtime in development mode.
 */

/**
 * Feature flags for gradual backend integration
 * Set to false to use mock data, true to use real backend
 */
export const FEATURE_FLAGS = {
  // Dashboard data sources
  USE_REAL_DASHBOARD_STATS: false,
  USE_REAL_SURVEY_STATUS: false,
  USE_REAL_FRIENDS_DATA: false,
  USE_REAL_PRICING_DATA: false,

  // Advanced features
  ENABLE_REALTIME_UPDATES: false,
  ENABLE_DASHBOARD_REFRESH: true,

  // Development helpers
  LOG_DATA_FETCHING: __DEV__,
  SHOW_LOADING_STATES: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Enable a feature at runtime (for testing)
 * Only works in development mode
 */
export const enableFeature = (flag: FeatureFlag): void => {
  if (__DEV__) {
    (FEATURE_FLAGS as any)[flag] = true;
    console.log(`[FeatureFlags] Enabled: ${flag}`);
  } else {
    console.warn(`[FeatureFlags] Cannot enable features in production`);
  }
};

/**
 * Disable a feature at runtime (for testing)
 * Only works in development mode
 */
export const disableFeature = (flag: FeatureFlag): void => {
  if (__DEV__) {
    (FEATURE_FLAGS as any)[flag] = false;
    console.log(`[FeatureFlags] Disabled: ${flag}`);
  } else {
    console.warn(`[FeatureFlags] Cannot disable features in production`);
  }
};

/**
 * Get all feature flags and their current state
 * Useful for debugging
 */
export const getAllFeatureFlags = (): Record<FeatureFlag, boolean> => {
  return { ...FEATURE_FLAGS };
};

/**
 * Log current feature flag state to console
 * Only works in development mode
 */
export const logFeatureFlags = (): void => {
  if (__DEV__) {
    console.log('[FeatureFlags] Current State:');
    Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
};
