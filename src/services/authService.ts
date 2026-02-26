/**
 * Authentication Service
 *
 * Provides authentication via Supabase native OTP (SMS/Email).
 * Phone OTP requires Twilio configured in Supabase project settings.
 * Email OTP works out of the box with Supabase.
 */

import { ApiResponse } from '../types';
import { cleanupSubscriptions } from './messageService';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('AuthService');

interface User {
  id: string;
  email?: string;
  phone?: string;
}

/**
 * Convert a formatted US phone number to E.164 format for Supabase.
 * "(555) 555-5555" → "+15555555555"
 * "5555555555" → "+15555555555"
 * "+15555555555" → "+15555555555" (already E.164)
 */
function toE164(phone: string): string {
  // If already in E.164 format, return as-is
  if (phone.startsWith('+')) return phone;

  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If 10 digits, assume US and prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If 11 digits starting with 1, assume US with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Otherwise, prepend + and hope for the best
  return `+${digits}`;
}

/**
 * Send OTP code to phone number via Supabase Auth
 */
export const sendOtpToPhone = async (phoneNumber: string): Promise<ApiResponse<void>> => {
  try {
    const e164 = toE164(phoneNumber);
    logger.info('[SMS] Sending OTP via Supabase to:', e164);

    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });

    if (error) {
      logger.error('[SMS] Supabase OTP error:', error.message);
      return {
        ok: false,
        error: {
          code: 'OTP_SEND_ERROR',
          message: error.message,
        },
      };
    }

    logger.info('[SMS] OTP sent successfully to:', e164);
    return { ok: true };
  } catch (error: any) {
    logger.error('[SMS] Error sending OTP:', error.message);
    return {
      ok: false,
      error: {
        code: 'OTP_SEND_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Send OTP code to email via Supabase Auth
 */
export const sendOtpToEmail = async (email: string): Promise<ApiResponse<void>> => {
  try {
    logger.info('[EMAIL] Sending OTP via Supabase to:', email);

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      logger.error('[EMAIL] Supabase OTP error:', error.message);
      return {
        ok: false,
        error: {
          code: 'EMAIL_OTP_ERROR',
          message: error.message,
        },
      };
    }

    logger.info('[EMAIL] OTP sent successfully to:', email);
    return { ok: true };
  } catch (error: any) {
    logger.error('[EMAIL] Error sending OTP:', error.message);
    return {
      ok: false,
      error: {
        code: 'EMAIL_OTP_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<ApiResponse<void>> => {
  try {
    logger.info('[AUTH] Signing out user');

    // Clean up message subscriptions
    cleanupSubscriptions();

    // Sign out from Supabase (clears session from AsyncStorage automatically)
    await supabase.auth.signOut();

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'SIGNOUT_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Get the current authenticated user from the Supabase session
 */
export const getCurrentUser = async (): Promise<ApiResponse<User | null>> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: true, data: null };
    }

    return {
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'GET_USER_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Verify phone number with OTP code via Supabase Auth.
 * On success, a real Supabase session is created and persisted.
 */
export const verifyPhone = async (phone: string, code: string): Promise<ApiResponse<User>> => {
  try {
    const e164 = toE164(phone);
    logger.info('[SMS] Verifying OTP for:', e164);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: 'sms',
    });

    if (error) {
      logger.error('[SMS] Verification failed:', error.message);
      return {
        ok: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message,
        },
      };
    }

    if (!data.user) {
      return {
        ok: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Verification succeeded but no user returned',
        },
      };
    }

    logger.info('[SMS] Phone verification successful! User ID:', data.user.id);

    return {
      ok: true,
      data: {
        id: data.user.id,
        phone: data.user.phone,
        email: data.user.email,
      },
    };
  } catch (error: any) {
    logger.error('[SMS] Verification error:', error.message);
    return {
      ok: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Verify email with OTP code via Supabase Auth.
 * On success, a real Supabase session is created and persisted.
 */
export const verifyEmail = async (email: string, code: string): Promise<ApiResponse<User>> => {
  try {
    logger.info('[EMAIL] Verifying OTP for:', email);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      logger.error('[EMAIL] Verification failed:', error.message);
      return {
        ok: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message,
        },
      };
    }

    if (!data.user) {
      return {
        ok: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Verification succeeded but no user returned',
        },
      };
    }

    logger.info('[EMAIL] Email verification successful! User ID:', data.user.id);

    return {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
      },
    };
  } catch (error: any) {
    logger.error('[EMAIL] Verification error:', error.message);
    return {
      ok: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};
