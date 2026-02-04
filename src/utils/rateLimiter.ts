/**
 * Rate Limiting Utility
 *
 * Client-side interface for rate limiting functionality
 * Works with database-backed rate limiting for security
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  attemptsMade: number;
  maxAttempts: number;
  windowSeconds: number;
  retryAfterSeconds: number;
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterSeconds: number,
    public attemptsMade: number,
    public maxAttempts: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Check if an action is rate limited for a specific identifier
 *
 * @param identifier - Unique identifier (usually user ID)
 * @param actionType - Type of action being rate limited
 * @returns Rate limit check result
 */
export const checkRateLimit = async (
  identifier: string,
  actionType: string
): Promise<ApiResponse<RateLimitResult>> => {
  // DEVELOPMENT: Disable rate limiting in development mode
  if (__DEV__) {
    return {
      ok: true,
      data: {
        allowed: true,
        attemptsMade: 0,
        maxAttempts: 999999,
        windowSeconds: 3600,
        retryAfterSeconds: 0,
      },
    };
  }

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: actionType,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return {
        ok: false,
        error: {
          code: 'RATE_LIMIT_CHECK_FAILED',
          message: error.message,
        },
      };
    }

    if (!data || data.length === 0) {
      // No data returned, fail safe by allowing
      return {
        ok: true,
        data: {
          allowed: true,
          attemptsMade: 0,
          maxAttempts: 999999,
          windowSeconds: 3600,
          retryAfterSeconds: 0,
        },
      };
    }

    const result = data[0];

    return {
      ok: true,
      data: {
        allowed: result.allowed,
        attemptsMade: result.attempts_made,
        maxAttempts: result.max_attempts,
        windowSeconds: result.window_seconds,
        retryAfterSeconds: result.retry_after_seconds,
      },
    };
  } catch (error: any) {
    console.error('Rate limit check error:', error);
    return {
      ok: false,
      error: {
        code: 'RATE_LIMIT_CHECK_ERROR',
        message: error.message || 'Failed to check rate limit',
      },
    };
  }
};

/**
 * Record a rate limit attempt
 *
 * @param identifier - Unique identifier (usually user ID)
 * @param actionType - Type of action being rate limited
 * @param metadata - Optional metadata to store with the attempt
 */
export const recordRateLimitAttempt = async (
  identifier: string,
  actionType: string,
  metadata: Record<string, any> = {}
): Promise<ApiResponse<boolean>> => {
  // DEVELOPMENT: Skip recording in development mode
  if (__DEV__) {
    return {
      ok: true,
      data: true,
    };
  }

  try {
    const { data, error } = await supabase.rpc('record_rate_limit_attempt', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_metadata: metadata,
    });

    if (error) {
      console.error('Record rate limit attempt error:', error);
      return {
        ok: false,
        error: {
          code: 'RECORD_ATTEMPT_FAILED',
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: data,
    };
  } catch (error: any) {
    console.error('Record rate limit attempt error:', error);
    return {
      ok: false,
      error: {
        code: 'RECORD_ATTEMPT_ERROR',
        message: error.message || 'Failed to record rate limit attempt',
      },
    };
  }
};

/**
 * Check rate limit and throw error if exceeded
 * Convenience function that throws RateLimitError when limit is exceeded
 *
 * @param identifier - Unique identifier (usually user ID)
 * @param actionType - Type of action being rate limited
 * @throws RateLimitError if rate limit exceeded
 */
export const enforceRateLimit = async (
  identifier: string,
  actionType: string
): Promise<void> => {
  const result = await checkRateLimit(identifier, actionType);

  if (!result.ok) {
    throw new Error(result.error?.message || 'Failed to check rate limit');
  }

  if (!result.data.allowed) {
    const minutes = Math.ceil(result.data.retryAfterSeconds / 60);
    const message = `Too many attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;

    throw new RateLimitError(
      message,
      result.data.retryAfterSeconds,
      result.data.attemptsMade,
      result.data.maxAttempts
    );
  }
};

/**
 * Higher-order function to wrap an async function with rate limiting
 *
 * @param actionType - Type of action being rate limited
 * @param fn - The async function to wrap
 * @returns Wrapped function with rate limiting
 *
 * @example
 * const sendOTPWithRateLimit = withRateLimit('otp_send', async (userId, phone) => {
 *   // Your OTP sending logic
 *   return await sendOTP(phone);
 * });
 */
export const withRateLimit = <T extends (...args: any[]) => Promise<any>>(
  actionType: string,
  fn: T
): T => {
  return (async (...args: any[]) => {
    // Get identifier from first argument (assumed to be userId)
    const identifier = args[0]?.toString() || 'unknown';

    // Check rate limit
    await enforceRateLimit(identifier, actionType);

    // Record the attempt
    await recordRateLimitAttempt(identifier, actionType);

    // Execute the original function
    return await fn(...args);
  }) as T;
};

/**
 * Format retry time for user display
 *
 * @param seconds - Number of seconds until retry
 * @returns Formatted string (e.g., "5 minutes", "1 hour")
 */
export const formatRetryTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
};

/**
 * Rate limit action types (for type safety)
 */
export const RateLimitAction = {
  OTP_SEND: 'otp_send',
  FRIEND_CODE_ATTEMPT: 'friend_code_attempt',
  LOGIN_ATTEMPT: 'login_attempt',
  ACCOUNT_CREATION: 'account_creation',
  PASSWORD_RESET: 'password_reset',
  PHOTO_UPLOAD: 'photo_upload',
  MESSAGE_SEND: 'message_send',
  PROFILE_UPDATE: 'profile_update',
  PROPOSAL_VOTE: 'proposal_vote',
} as const;

export type RateLimitActionType = typeof RateLimitAction[keyof typeof RateLimitAction];
