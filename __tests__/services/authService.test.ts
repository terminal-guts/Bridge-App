/**
 * Tests for authService — pure logic functions
 */

// Mock logger
jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

// Mock messageService (imported by authService for signOut cleanup)
jest.mock('../../src/services/messageService', () => ({
  cleanupSubscriptions: jest.fn(),
}));

// Mock profileService (imported by authService for cache invalidation)
jest.mock('../../src/services/profileService', () => ({
  invalidateProfileCache: jest.fn(),
}));

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      setSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Set up __DEV__ global (mirrors React Native dev mode)
declare const __DEV__: boolean;
(global as any).__DEV__ = true;

import {
  isAllowedEmailDomain,
  isReviewerBypassEmail,
  setIntentionalSignOut,
  isIntentionalSignOut,
  resetIntentionalSignOut,
} from '../../src/services/authService';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the intentional sign-out flag between tests
  resetIntentionalSignOut();
  // Default: __DEV__ = true so reviewer bypass is active
  (global as any).__DEV__ = true;
});

// ============================================================================
// isAllowedEmailDomain
// ============================================================================

describe('isAllowedEmailDomain', () => {
  it('accepts a plain @rice.edu email', () => {
    expect(isAllowedEmailDomain('student@rice.edu')).toBe(true);
  });

  it('accepts a subdomain of rice.edu', () => {
    expect(isAllowedEmailDomain('user@owlnet.rice.edu')).toBe(true);
  });

  it('is case insensitive for the domain', () => {
    expect(isAllowedEmailDomain('Student@Rice.EDU')).toBe(true);
    expect(isAllowedEmailDomain('test@RICE.edu')).toBe(true);
  });

  it('rejects non-rice.edu .edu domains', () => {
    expect(isAllowedEmailDomain('user@harvard.edu')).toBe(false);
  });

  it('rejects non-.edu domains', () => {
    expect(isAllowedEmailDomain('user@gmail.com')).toBe(false);
    expect(isAllowedEmailDomain('user@outlook.com')).toBe(false);
  });

  it('rejects domains that merely contain "rice.edu" as a substring', () => {
    expect(isAllowedEmailDomain('user@notrice.edu')).toBe(false);
    expect(isAllowedEmailDomain('user@fakerice.edu.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isAllowedEmailDomain('')).toBeFalsy();
  });

  it('rejects a string without an @ sign', () => {
    expect(isAllowedEmailDomain('noemail')).toBeFalsy();
  });

  it('accepts the reviewer bypass email (validation is server-side)', () => {
    expect(isAllowedEmailDomain('reviewer@bridgedate.app')).toBe(true);
  });
});

// ============================================================================
// isReviewerBypassEmail
// ============================================================================

describe('isReviewerBypassEmail', () => {
  it('matches the exact reviewer email', () => {
    expect(isReviewerBypassEmail('reviewer@bridgedate.app')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isReviewerBypassEmail('Reviewer@BridgeDate.App')).toBe(true);
  });

  it('does not match random emails', () => {
    expect(isReviewerBypassEmail('random@gmail.com')).toBe(false);
    expect(isReviewerBypassEmail('reviewer@other.app')).toBe(false);
  });

  it('matches reviewer email regardless of __DEV__ (validation is server-side)', () => {
    (global as any).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_ENABLE_REVIEWER_BYPASS;
    expect(isReviewerBypassEmail('reviewer@bridgedate.app')).toBe(true);
  });
});

// ============================================================================
// Intentional sign-out flag
// ============================================================================

describe('intentional sign-out flag', () => {
  it('defaults to false', () => {
    expect(isIntentionalSignOut()).toBe(false);
  });

  it('can be set to true', () => {
    setIntentionalSignOut();
    expect(isIntentionalSignOut()).toBe(true);
  });

  it('can be reset back to false', () => {
    setIntentionalSignOut();
    expect(isIntentionalSignOut()).toBe(true);
    resetIntentionalSignOut();
    expect(isIntentionalSignOut()).toBe(false);
  });

  it('remains false if reset is called when already false', () => {
    resetIntentionalSignOut();
    expect(isIntentionalSignOut()).toBe(false);
  });
});
