/**
 * Rate Limiting Utility
 *
 * Client-side interface for rate limiting functionality
 * Works with database-backed rate limiting for security
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';
import { createLogger } from './secureLogger';

const logger = createLogger('RateLimiter');

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
      logger.error('Rate limit check error:', error);
      return {
        ok: false,
        error: {
          code: 'RATE_LIMIT_CHECK_FAILED',
          message: error.message,
        },
      };
    }

    if (!data || data.length === 0) {
      // No data returned — fail closed to prevent bypassing rate limiting.
      logger.error('Rate limit check returned no data — blocking request');
      return {
        ok: false,
        error: {
          code: 'RATE_LIMIT_CHECK_FAILED',
          message: 'Rate limit check returned no data',
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
  } catch (error: unknown) {
    logger.error('Rate limit check error:', error);
    return {
      ok: false,
      error: {
        code: 'RATE_LIMIT_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check rate limit',
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
  metadata: Record<string, unknown> = {}
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
      logger.error('Record rate limit attempt error:', error);
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
  } catch (error: unknown) {
    logger.error('Record rate limit attempt error:', error);
    return {
      ok: false,
      error: {
        code: 'RECORD_ATTEMPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to record rate limit attempt',
      },
    };
  }
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
} as const;
