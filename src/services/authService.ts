/**
 * Authentication Service
 *
 * Provides authentication via Supabase native email OTP.
 * Email OTP works out of the box with Supabase.
 */

import { ApiResponse } from '../types';
import { cleanupSubscriptions } from './messageService';
import { invalidateProfileCache } from './profileService';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

declare const __DEV__: boolean;

const logger = createLogger('AuthService');

const ALLOWED_EMAIL_DOMAIN = 'rice.edu';

/** Email used by the App Store reviewer bypass account */
const REVIEWER_EMAIL = 'reviewer@bridgedate.app';

/**
 * Check if an email belongs to an allowed domain (@rice.edu).
 * Also allows the App Store reviewer email when bypass is enabled.
 */
export const isAllowedEmailDomain = (email: string): boolean => {
  if (isReviewerBypassEmail(email)) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === ALLOWED_EMAIL_DOMAIN || domain?.endsWith(`.${ALLOWED_EMAIL_DOMAIN}`);
};

/**
 * Check if this is the App Store reviewer bypass email and bypass is enabled.
 */
export const isReviewerBypassEmail = (email: string): boolean => {
  return email.toLowerCase() === REVIEWER_EMAIL &&
    (__DEV__ || process.env.EXPO_PUBLIC_ENABLE_REVIEWER_BYPASS === 'true');
};

// Flag set before intentional sign-outs so AppNavigator doesn't show a "Session Expired" toast
let _intentionalSignOut = false;
export const isIntentionalSignOut = () => _intentionalSignOut;
export const resetIntentionalSignOut = () => { _intentionalSignOut = false; };

interface User {
  id: string;
  email?: string;
  phone?: string;
}

/**
 * Sign in with email and password (for App Store reviewer bypass)
 */
export const signInWithPassword = async (email: string, password: string): Promise<ApiResponse<User>> => {
  try {
    logger.info('[AUTH] Signing in with password for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('[AUTH] Sign in with password failed:', error.message);
      return {
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: error.message,
        },
      };
    }

    if (!data.user) {
      return {
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Sign in succeeded but no user returned',
        },
      };
    }

    logger.info('[AUTH] Sign in with password successful! User ID:', data.user.id);

    return {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
      },
    };
  } catch (error: any) {
    logger.error('[AUTH] Sign in with password error:', error.message);
    return {
      ok: false,
      error: {
        code: 'AUTH_ERROR',
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
    if (!isAllowedEmailDomain(email)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOMAIN',
          message: 'Only Rice University emails (@rice.edu) can sign up for Bridge.',
        },
      };
    }

    // Reviewer bypass — skip actual OTP send; the verification screen handles login via password
    if (isReviewerBypassEmail(email)) {
      logger.info('[EMAIL] Reviewer bypass — skipping OTP send');
      return { ok: true };
    }

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
    _intentionalSignOut = true;

    // Clean up message subscriptions and cached profile data
    cleanupSubscriptions();
    invalidateProfileCache();

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

/**
 * Send a verification code to a @rice.edu email.
 * Uses a Supabase Edge Function that generates a 6-digit OTP and emails it.
 * Does NOT create a new auth session (phone session stays intact).
 */
export const sendRiceEmailVerification = async (email: string): Promise<ApiResponse<void>> => {
  try {
    if (!isAllowedEmailDomain(email)) {
      return {
        ok: false,
        error: { code: 'INVALID_DOMAIN', message: 'Only @rice.edu emails are allowed.' },
      };
    }

    logger.info('[EMAIL_VERIFY] Sending verification code to:', email);

    const { data, error } = await supabase.functions.invoke('send-email-verification', {
      body: { email: email.toLowerCase(), action: 'send' },
    });

    if (error) {
      logger.error('[EMAIL_VERIFY] Edge function error:', error.message);
      return {
        ok: false,
        error: { code: 'SEND_VERIFY_ERROR', message: error.message },
      };
    }

    if (data?.error) {
      return {
        ok: false,
        error: { code: 'SEND_VERIFY_ERROR', message: data.error },
      };
    }

    logger.info('[EMAIL_VERIFY] Verification code sent successfully');
    return { ok: true };
  } catch (error: any) {
    logger.error('[EMAIL_VERIFY] Error:', error.message);
    return {
      ok: false,
      error: { code: 'SEND_VERIFY_ERROR', message: error.message || 'Failed to send verification code' },
    };
  }
};

/**
 * Verify the 6-digit code sent to the @rice.edu email.
 * Calls the send-email-verification Edge Function with action 'verify',
 * which verifies the OTP server-side and marks the email as verified in user_profiles.
 */
export const verifyRiceEmailCode = async (email: string, code: string): Promise<ApiResponse<boolean>> => {
  try {
    logger.info('[EMAIL_VERIFY] Verifying code for:', email);

    const { data, error } = await supabase.functions.invoke('send-email-verification', {
      body: { email: email.toLowerCase(), code, action: 'verify' },
    });

    if (error) {
      logger.error('[EMAIL_VERIFY] Verification error:', error.message);
      return {
        ok: false,
        error: { code: 'VERIFY_ERROR', message: error.message },
      };
    }

    if (data?.error) {
      return {
        ok: false,
        error: { code: 'WRONG_CODE', message: data.error },
      };
    }

    if (data?.verified) {
      logger.info('[EMAIL_VERIFY] Email verified successfully');
      return { ok: true, data: true };
    } else {
      return {
        ok: false,
        error: { code: 'WRONG_CODE', message: 'Incorrect code. Please try again.' },
      };
    }
  } catch (error: any) {
    logger.error('[EMAIL_VERIFY] Error:', error.message);
    return {
      ok: false,
      error: { code: 'VERIFY_ERROR', message: error.message || 'Verification failed' },
    };
  }
};

/**
 * Send a verification code to a @rice.edu email for signup.
 * Uses the email-signup Edge Function (no JWT required).
 * Sends a branded 6-digit OTP via Resend.
 */
export const sendEmailSignUpCode = async (email: string): Promise<ApiResponse<void>> => {
  try {
    if (!isAllowedEmailDomain(email)) {
      return {
        ok: false,
        error: { code: 'INVALID_DOMAIN', message: 'Only @rice.edu emails are allowed.' },
      };
    }

    logger.info('[EMAIL_SIGNUP] Sending verification code to:', email);

    const { data, error } = await supabase.functions.invoke('email-signup', {
      body: { email: email.toLowerCase(), action: 'send' },
    });

    if (error) {
      logger.error('[EMAIL_SIGNUP] Edge function error:', error.message);
      return {
        ok: false,
        error: { code: 'SEND_ERROR', message: error.message },
      };
    }

    if (data?.error) {
      return {
        ok: false,
        error: { code: 'SEND_ERROR', message: data.error },
      };
    }

    logger.info('[EMAIL_SIGNUP] Verification code sent successfully');
    return { ok: true };
  } catch (error: any) {
    logger.error('[EMAIL_SIGNUP] Error:', error.message);
    return {
      ok: false,
      error: { code: 'SEND_ERROR', message: error.message || 'Failed to send verification code' },
    };
  }
};

/**
 * Verify the 6-digit code and create an auth session for email signup.
 * Uses the email-signup Edge Function which creates the user and returns session tokens.
 */
export const verifyEmailSignUpCode = async (
  email: string,
  code: string
): Promise<ApiResponse<User>> => {
  try {
    logger.info('[EMAIL_SIGNUP] Verifying code for:', email);

    const { data, error } = await supabase.functions.invoke('email-signup', {
      body: { email: email.toLowerCase(), action: 'verify', code },
    });

    if (error) {
      logger.error('[EMAIL_SIGNUP] Verification error:', error.message);
      return {
        ok: false,
        error: { code: 'VERIFY_ERROR', message: error.message },
      };
    }

    if (data?.error) {
      return {
        ok: false,
        error: { code: 'VERIFY_ERROR', message: data.error },
      };
    }

    if (!data?.access_token || !data?.refresh_token) {
      return {
        ok: false,
        error: { code: 'SESSION_ERROR', message: 'Verification succeeded but no session returned' },
      };
    }

    // Set the session on the client so the user is now authenticated
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (sessionError) {
      logger.error('[EMAIL_SIGNUP] Failed to set session:', sessionError.message);
      return {
        ok: false,
        error: { code: 'SESSION_ERROR', message: 'Failed to establish session' },
      };
    }

    logger.info('[EMAIL_SIGNUP] Email signup successful! User ID:', data.user?.id);

    return {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (error: any) {
    logger.error('[EMAIL_SIGNUP] Error:', error.message);
    return {
      ok: false,
      error: { code: 'VERIFY_ERROR', message: error.message || 'Verification failed' },
    };
  }
};

