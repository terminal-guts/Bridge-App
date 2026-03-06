/**
 * Tests for rate limiter utility (src/utils/rateLimiter.ts)
 *
 * Covers: RateLimitError class, formatRetryTime, enforceRateLimit,
 * checkRateLimit dev bypass, RateLimitAction constants
 */

// Mock supabase
const mockRpc = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import {
  RateLimitError,
  formatRetryTime,
  checkRateLimit,
  enforceRateLimit,
  recordRateLimitAttempt,
  RateLimitAction,
} from '../../src/utils/rateLimiter';

beforeEach(() => {
  mockRpc.mockReset();
});

// ============================================================================
// RateLimitError
// ============================================================================

describe('RateLimitError', () => {
  it('creates error with correct properties', () => {
    const error = new RateLimitError('Too many attempts', 300, 5, 10);
    expect(error.message).toBe('Too many attempts');
    expect(error.name).toBe('RateLimitError');
    expect(error.retryAfterSeconds).toBe(300);
    expect(error.attemptsMade).toBe(5);
    expect(error.maxAttempts).toBe(10);
  });

  it('is an instance of Error', () => {
    const error = new RateLimitError('test', 0, 0, 0);
    expect(error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// formatRetryTime
// ============================================================================

describe('formatRetryTime', () => {
  it('formats seconds correctly', () => {
    expect(formatRetryTime(1)).toBe('1 second');
    expect(formatRetryTime(30)).toBe('30 seconds');
    expect(formatRetryTime(59)).toBe('59 seconds');
  });

  it('formats minutes correctly', () => {
    expect(formatRetryTime(60)).toBe('1 minute');
    expect(formatRetryTime(90)).toBe('2 minutes'); // ceil(90/60) = 2
    expect(formatRetryTime(120)).toBe('2 minutes');
    expect(formatRetryTime(3599)).toBe('1 hour'); // ceil(3599/60) = 60 min >= 60, so hours branch
  });

  it('formats hours correctly', () => {
    expect(formatRetryTime(3600)).toBe('1 hour');
    expect(formatRetryTime(7200)).toBe('2 hours');
    expect(formatRetryTime(5400)).toBe('2 hours'); // ceil(90min/60) = 2
  });

  it('handles singular vs plural', () => {
    expect(formatRetryTime(1)).toBe('1 second');
    expect(formatRetryTime(2)).toBe('2 seconds');
    expect(formatRetryTime(60)).toBe('1 minute');
    expect(formatRetryTime(121)).toBe('3 minutes');
    expect(formatRetryTime(3600)).toBe('1 hour');
    expect(formatRetryTime(7201)).toBe('3 hours');
  });
});

// ============================================================================
// checkRateLimit — DEV mode bypass
// ============================================================================

describe('checkRateLimit (dev mode)', () => {
  // __DEV__ is true in test environment (set in jest.setup.js)

  it('always allows in dev mode', async () => {
    const result = await checkRateLimit('user-123', 'otp_send');
    expect(result.ok).toBe(true);
    expect(result.data?.allowed).toBe(true);
    expect(result.data?.attemptsMade).toBe(0);
    // Should NOT have called supabase.rpc
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================================
// recordRateLimitAttempt — DEV mode bypass
// ============================================================================

describe('recordRateLimitAttempt (dev mode)', () => {
  it('skips recording in dev mode', async () => {
    const result = await recordRateLimitAttempt('user-123', 'otp_send');
    expect(result.ok).toBe(true);
    expect(result.data).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================================
// enforceRateLimit — DEV mode pass-through
// ============================================================================

describe('enforceRateLimit (dev mode)', () => {
  it('does not throw in dev mode', async () => {
    await expect(enforceRateLimit('user-123', 'login_attempt')).resolves.toBeUndefined();
  });
});

// ============================================================================
// RateLimitAction constants
// ============================================================================

describe('RateLimitAction', () => {
  it('has expected action types', () => {
    expect(RateLimitAction.OTP_SEND).toBe('otp_send');
    expect(RateLimitAction.FRIEND_CODE_ATTEMPT).toBe('friend_code_attempt');
    expect(RateLimitAction.LOGIN_ATTEMPT).toBe('login_attempt');
    expect(RateLimitAction.ACCOUNT_CREATION).toBe('account_creation');
    expect(RateLimitAction.PASSWORD_RESET).toBe('password_reset');
    expect(RateLimitAction.PHOTO_UPLOAD).toBe('photo_upload');
    expect(RateLimitAction.MESSAGE_SEND).toBe('message_send');
    expect(RateLimitAction.PROFILE_UPDATE).toBe('profile_update');
  });
});
