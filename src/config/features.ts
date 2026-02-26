/**
 * Feature Flags Configuration
 *
 * Central place to enable/disable features without code changes.
 * Perfect for testing, A/B experiments, and gradual rollouts.
 *
 * TESTING FEATURES: Easy to disable when development is complete
 * UI ENHANCEMENTS: Granular control over visual features
 * EXPERIMENTAL: Cutting-edge features that can be toggled
 */

export interface FeatureFlags {

  // ========================================
  // DEVELOPMENT HELPERS (Remove for Production)
  // ========================================


  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Show mock Alex profile for users who haven't completed onboarding
   * Allows signing in and testing the app without going through onboarding first
   *
   * BEHAVIOR:
   * - Fresh sign-in (no profile in DB) → Show mock Alex profile
   * - After completing onboarding (profile exists) → Show real user data, never mock again
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default true (development)
   */
  DEVELOPMENT_AUTO_FILL_ONBOARDING: boolean;


  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Create comprehensive mock data on login for full app navigation
   * Creates: matches (pending/accepted), surveys, friends, messages
   * Perfect for testing all screens without real backend data
   *
   * BEHAVIOR: Recreates fresh mock data every time you sign in
   * - Cleans up old mock data
   * - Generates new matches, surveys, friends, and messages
   * - Allows testing with fresh data on each login
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default true (development)
   */
  DEVELOPMENT_CREATE_MOCK_DATA: boolean;

  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Force fresh session on app start (signs out user on every app launch)
   * Useful for testing the welcome/auth flow repeatedly
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default false (even in development, can be annoying)
   */
  DEVELOPMENT_FORCE_FRESH_SESSION: boolean;

  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Enable floating developer menu for god-mode access
   * Features:
   * - Quick navigation to any screen
   * - Data management (create/reset matches, surveys, friends)
   * - Profile management (complete/clear profile)
   * - Auth controls (sign out, copy user ID)
   * - Time controls (extend match expiry)
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default true (development)
   */
  ENABLE_DEVELOPER_MENU: boolean;

  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Skip authentication checks for easier development
   * Allows accessing all screens without being signed in
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default true (development)
   */
  DEVELOPMENT_SKIP_AUTH: boolean;

  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * User ID to impersonate when DEVELOPMENT_SKIP_AUTH is true
   * Change this to test the app as different users
   * Set to null to use the default dev user
   *
   * ⚠️ SET TO null FOR PRODUCTION ⚠️
   * @default null
   */
  DEV_USER_ID: string | null;

  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Unlock Friends Area in Community tab without completing daily tasks
   * Bypasses the requirement to submit 1 proposal and vote on 3 proposals
   * Perfect for testing Friends Area features during development
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default true (development)
   */
  DEVELOPMENT_UNLOCK_FRIENDS_AREA: boolean;

  // ========================================
  // BACKEND INTEGRATION
  // ========================================

  /**
   * Enable real Community Matching backend integration
   * When true, uses real Supabase backend calls
   * When false, uses mock data service
   *
   * Switch to true when ready to test with real database
   * @default false (use mock service during development)
   */
  COMMUNITY_BACKEND_ENABLED: boolean;

  /**
   * Enable real messaging backend integration
   * When true, uses real Supabase for messages with realtime subscriptions
   * When false, uses mock in-memory messaging
   *
   * Switch to true when ready to test real chat functionality
   * @default false (use mock service during development)
   */
  MESSAGING_BACKEND_ENABLED: boolean;


  // ========================================
  // EXPERIMENTAL FEATURES
  // ========================================

  /**
   * Advanced animations (parallax, complex transitions)
   * May impact performance on older devices
   * @default false
   */
  ENABLE_ADVANCED_ANIMATIONS: boolean;

  /**
   * Glassmorphism UI effects (frosted glass, blurs)
   * @default false
   */
  ENABLE_GLASSMORPHISM: boolean;

  /**
   * Show deep questions preview on match cards
   * @default false
   */
  ENABLE_DEEP_QUESTIONS_PREVIEW: boolean;

  DAILY_PAIRING_ENABLED: boolean;

  /**
   * 🚨 DEVELOPMENT ONLY 🚨
   * Show floating dev state toggle for quickly switching UI states
   * (match states, community/friends states)
   *
   * ⚠️ SET TO FALSE FOR PRODUCTION ⚠️
   * @default true (development)
   */
  ENABLE_DEV_STATE_TOGGLE: boolean;
}

/**
 * Current feature flag configuration
 */
export const FEATURES: FeatureFlags = {
  // Development Helpers - REAL USER TESTING MODE
  DEVELOPMENT_AUTO_FILL_ONBOARDING: false, // ❌ DISABLED - Use real onboarding
  DEVELOPMENT_CREATE_MOCK_DATA: false, // ❌ DISABLED - Use real data
  DEVELOPMENT_FORCE_FRESH_SESSION: false, // ❌ DISABLED - Annoying for testing
  ENABLE_DEVELOPER_MENU: false, // ❌ DISABLED
  DEVELOPMENT_SKIP_AUTH: false, // ❌ KEEP AUTH FLOW FOR REALISTIC TESTING
  DEV_USER_ID: null, // Use default dev user
  DEVELOPMENT_UNLOCK_FRIENDS_AREA: false, // ❌ DISABLED - Require daily tasks

  // Backend Integration
  COMMUNITY_BACKEND_ENABLED: true, // ✅ ENABLED - Using real backend
  MESSAGING_BACKEND_ENABLED: true, // ✅ REAL MESSAGING - SUPABASE + REALTIME

  // Experimental (disabled by default)
  ENABLE_ADVANCED_ANIMATIONS: false,
  ENABLE_GLASSMORPHISM: false,
  ENABLE_DEEP_QUESTIONS_PREVIEW: true,
  DAILY_PAIRING_ENABLED: true,
  ENABLE_DEV_STATE_TOGGLE: false, // ❌ DISABLED for production
};

/**
 * Helper function to check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return FEATURES[feature] as boolean;
};


/**
 * Quick feature flag presets for different environments
 */
export const FEATURE_PRESETS = {
  /**
   * Development: All features enabled for testing
   */
  development: {
    ...FEATURES,
    DEVELOPMENT_AUTO_FILL_ONBOARDING: true,
    DEVELOPMENT_CREATE_MOCK_DATA: true,
    DEVELOPMENT_FORCE_FRESH_SESSION: false,
    ENABLE_DEVELOPER_MENU: true,
    DEVELOPMENT_UNLOCK_FRIENDS_AREA: true,
    COMMUNITY_BACKEND_ENABLED: false, // Use mock service during development
    MESSAGING_BACKEND_ENABLED: true, // Real messaging enabled
    ENABLE_ADVANCED_ANIMATIONS: true,
    ENABLE_GLASSMORPHISM: true,
    DAILY_PAIRING_ENABLED: true,
  },

  /**
   * Staging: Experimental disabled
   */
  staging: {
    ...FEATURES,
    DEVELOPMENT_AUTO_FILL_ONBOARDING: false,
    DEVELOPMENT_CREATE_MOCK_DATA: false,
    DEVELOPMENT_FORCE_FRESH_SESSION: false,
    ENABLE_DEVELOPER_MENU: false,
    DEVELOPMENT_UNLOCK_FRIENDS_AREA: false,
    COMMUNITY_BACKEND_ENABLED: true,
    MESSAGING_BACKEND_ENABLED: true,
    ENABLE_ADVANCED_ANIMATIONS: false,
    ENABLE_GLASSMORPHISM: false,
    DAILY_PAIRING_ENABLED: true,
  },

  /**
   * Production: Only stable features
   */
  production: {
    ...FEATURES,
    DEVELOPMENT_AUTO_FILL_ONBOARDING: false,
    DEVELOPMENT_CREATE_MOCK_DATA: false,
    DEVELOPMENT_FORCE_FRESH_SESSION: false,
    ENABLE_DEVELOPER_MENU: false,
    DEVELOPMENT_UNLOCK_FRIENDS_AREA: false,
    COMMUNITY_BACKEND_ENABLED: true,
    MESSAGING_BACKEND_ENABLED: true,
    ENABLE_ADVANCED_ANIMATIONS: false,
    ENABLE_GLASSMORPHISM: false,
    DAILY_PAIRING_ENABLED: true,
  },
};

interface SurveyQuestion {
  id: string;
  type: 'rating' | 'multiple_choice' | 'text';
  question: string;
  subtitle?: string;
  optional?: boolean;
  // rating fields
  min?: number;
  max?: number;
  labels?: [string, string];
  // multiple_choice fields
  options?: string[];
}

interface TestingSurveyConfig {
  storageKey: string;
  questions: SurveyQuestion[];
  ui: {
    title: string;
    subtitle: string;
    skipButtonText: string;
    submitButtonText: string;
    thankYouTitle: string;
    thankYouMessage: string;
  };
}

export const TESTING_SURVEY_CONFIG: TestingSurveyConfig = {
  storageKey: '@bridge_testing_survey_completed',
  questions: [
    {
      id: 'overall_experience',
      type: 'rating',
      question: 'How would you rate your overall experience with Bridge so far?',
      min: 1,
      max: 10,
      labels: ['Not great', 'Amazing'],
    },
    {
      id: 'community_matching',
      type: 'rating',
      question: 'How valuable is the community matching feature to you?',
      subtitle: 'Where friends vote on potential matches for each other',
      min: 1,
      max: 10,
      labels: ['Not valuable', 'Very valuable'],
    },
    {
      id: 'biggest_improvement',
      type: 'multiple_choice',
      question: 'What would most improve your experience?',
      options: ['Better matches', 'More active community', 'Faster messaging', 'More profile options'],
    },
    {
      id: 'open_feedback',
      type: 'text',
      question: 'Any other feedback you\'d like to share?',
      subtitle: 'Optional — we read every response',
      optional: true,
    },
  ],
  ui: {
    title: 'Quick Feedback',
    subtitle: 'Help us improve Bridge — takes less than 2 minutes',
    skipButtonText: 'Skip',
    submitButtonText: 'Submit',
    thankYouTitle: 'Thank you!',
    thankYouMessage: 'Your feedback helps us build a better Bridge.',
  },
};

/**
 * USAGE EXAMPLES:
 *
 * import { FEATURES, isFeatureEnabled } from '@/config/features';
 *
 * // Check if feature is enabled
 * if (FEATURES.ENABLE_PHOTO_CAROUSEL) {
 *   return <PhotoCarousel photos={photos} />;
 * }
 *
 * // Or use helper function
 * if (isFeatureEnabled('ENABLE_CELEBRATION_ANIMATIONS')) {
 *   showConfetti();
 * }
 *
 * // Conditional rendering
 * {FEATURES.ENABLE_MATCH_INSIGHTS && <MatchInsights />}
 */
