/**
 * Timing Constants
 *
 * Centralized timing values used throughout the application.
 * All values are in milliseconds unless otherwise noted.
 *
 * Organization:
 * - API & Network
 * - User Interactions
 * - Animations
 * - Cache & Storage
 */

// ============================================================================
// API & Network Timings
// ============================================================================

/**
 * Mock API delay for development
 * Used to simulate network latency in mock API calls
 */
export const MOCK_API_DELAY = 800; // ms

/**
 * Default API request timeout
 * Maximum time to wait for API response before timing out
 */
export const API_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Cache Durations
// ============================================================================

/**
 * Profile data cache duration
 * How long profile data remains fresh before requiring refetch
 */
export const PROFILE_CACHE_DURATION = 30000; // 30 seconds

/**
 * Rate limit cooldown period
 * Time user must wait after hitting rate limit
 */
export const RATE_LIMIT_COOLDOWN = 60000; // 60 seconds (1 minute)

// ============================================================================
// User Interaction Timings
// ============================================================================

/**
 * Button press feedback duration
 * Visual feedback time for button presses
 */
export const BUTTON_PRESS_FEEDBACK = 150; // ms

/**
 * Toast notification auto-dismiss
 * How long toast messages remain visible
 */
export const TOAST_DURATION = 3000; // 3 seconds

/**
 * Celebration overlay duration
 * How long celebration animations display
 */
export const CELEBRATION_DURATION = 2000; // 2 seconds

// ============================================================================
// Animation Durations
// ============================================================================

/**
 * Default fade animation duration
 * Standard fade in/out timing
 */
export const FADE_DURATION = 400; // ms

/**
 * Quick fade animation
 * Fast transitions for subtle effects
 */
export const FADE_DURATION_FAST = 200; // ms

/**
 * Slow fade animation
 * Gentle transitions for emphasis
 */
export const FADE_DURATION_SLOW = 600; // ms

/**
 * Default slide animation duration
 * Standard slide in/out timing
 */
export const SLIDE_DURATION = 300; // ms

/**
 * Scale animation duration
 * Grow/shrink animations
 */
export const SCALE_DURATION = 200; // ms

/**
 * Pulse animation duration
 * Loading/skeleton pulse effect
 */
export const PULSE_DURATION = 1000; // 1 second

/**
 * Pulse animation slow
 * Longer pulse for emphasis
 */
export const PULSE_DURATION_SLOW = 2000; // 2 seconds

/**
 * Shimmer animation duration
 * Loading shimmer effect
 */
export const SHIMMER_DURATION = 1500; // 1.5 seconds

/**
 * Heart animation duration
 * Match reveal heart animations
 */
export const HEART_ANIMATION_DURATION = 2000; // 2 seconds

/**
 * Confetti animation duration
 * Celebration confetti effect
 */
export const CONFETTI_DURATION = 3000; // 3 seconds

/**
 * Spring animation tension
 * Bounciness of spring animations (higher = stiffer)
 */
export const SPRING_TENSION = 300;

/**
 * Spring animation friction
 * Dampening of spring animations (higher = less bounce)
 */
export const SPRING_FRICTION = 10;

// ============================================================================
// Stagger & Delay Timings
// ============================================================================

/**
 * Stagger delay between list items
 * Delay between animating sequential items
 */
export const STAGGER_DELAY = 50; // ms

/**
 * Heart animation stagger
 * Delay between individual hearts in celebration
 */
export const HEART_STAGGER_DELAY = 80; // ms

/**
 * Confetti stagger delay
 * Delay between confetti pieces
 */
export const CONFETTI_STAGGER_DELAY = 100; // ms

/**
 * Initial animation delay
 * Delay before starting entrance animations
 */
export const INITIAL_ANIMATION_DELAY = 100; // ms

/**
 * Success haptic delay
 * Delay before success haptic feedback
 */
export const SUCCESS_HAPTIC_DELAY = 400; // ms

// ============================================================================
// Navigation Timings
// ============================================================================

/**
 * Navigation transition delay
 * Delay before navigating to allow animations to complete
 */
export const NAVIGATION_DELAY = 500; // ms

/**
 * Screen transition duration
 * Time for screen transitions
 */
export const SCREEN_TRANSITION_DURATION = 300; // ms

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * Search input debounce
 * Delay before triggering search after user stops typing
 */
export const SEARCH_DEBOUNCE = 300; // ms

/**
 * Scroll event throttle
 * Minimum time between scroll event handlers
 */
export const SCROLL_THROTTLE = 16; // ms (~60fps)

/**
 * Input validation debounce
 * Delay before validating user input
 */
export const VALIDATION_DEBOUNCE = 500; // ms

// ============================================================================
// Loading States
// ============================================================================

/**
 * Minimum loading spinner duration
 * Prevents loading flicker for fast operations
 */
export const MIN_LOADING_DURATION = 300; // ms

/**
 * Skeleton loading minimum
 * Minimum time to show skeleton before content
 */
export const SKELETON_MIN_DURATION = 500; // ms

/**
 * Optimistic update revert timeout
 * How long to wait before reverting optimistic updates on error
 */
export const OPTIMISTIC_UPDATE_TIMEOUT = 5000; // 5 seconds

// ============================================================================
// Error & Retry Timings
// ============================================================================

/**
 * Error toast duration
 * How long error messages display
 */
export const ERROR_TOAST_DURATION = 4000; // 4 seconds

/**
 * Retry delay base
 * Base delay for exponential backoff retries
 */
export const RETRY_DELAY_BASE = 1000; // 1 second

/**
 * Maximum retry delay
 * Cap for exponential backoff
 */
export const RETRY_DELAY_MAX = 10000; // 10 seconds

// ============================================================================
// Auto-save & Persistence
// ============================================================================

/**
 * Auto-save debounce
 * Delay before auto-saving form data
 */
export const AUTOSAVE_DEBOUNCE = 2000; // 2 seconds

/**
 * Local storage sync interval
 * How often to sync with local storage
 */
export const STORAGE_SYNC_INTERVAL = 5000; // 5 seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate exponential backoff delay
 * @param attempt - Retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export const getExponentialBackoff = (attempt: number): number => {
  return Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), RETRY_DELAY_MAX);
};

/**
 * Get staggered delay for item in list
 * @param index - Item index in list
 * @param baseDelay - Base delay to start from
 * @returns Delay in milliseconds
 */
export const getStaggeredDelay = (index: number, baseDelay: number = INITIAL_ANIMATION_DELAY): number => {
  return baseDelay + (index * STAGGER_DELAY);
};
