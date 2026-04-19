/**
 * Authentication Service
 *
 * Provides authentication via Supabase native email OTP.
 * Email OTP works out of the box with Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// Google Sign-In disabled for this build (Apple requires Sign in with Apple alongside third-party login)
// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { ApiResponse } from '../types';
import { invalidateProfileCache } from './profileService';
import { supabase } from '../lib/supabase';
import { clearCachedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { checkRateLimit, recordRateLimitAttempt, RateLimitAction } from '../utils/rateLimiter';

const logger = createLogger('AuthService');

const ALLOWED_EMAIL_DOMAIN = 'rice.edu';

/** Emails used by App Store reviewer bypass accounts */
const REVIEWER_EMAILS = ['reviewer@bridgedate.app', 'reviewer2@bridgedate.app'];

/** Basic email format check — rejects obviously invalid input before it hits the network. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize and validate an email for use in auth calls. Returns null if invalid. */
const normalizeEmail = (email: string): string | null => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) return null;
  return trimmed;
};

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
 * Check if this is the App Store reviewer bypass email.
 * Only checks the email format — actual password validation is server-side.
 */
export const isReviewerBypassEmail = (email: string): boolean => {
  return REVIEWER_EMAILS.includes(email.trim().toLowerCase());
};

/**
 * Validate the reviewer access password via server-side edge function.
 * Returns the Supabase Auth password on success so the client never embeds it.
 */
export const validateReviewerAccess = async (password: string): Promise<{ valid: boolean; authPassword?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-reviewer-access', {
      body: { password },
    });
    if (error) return { valid: false };
    if (data?.valid === true) {
      return { valid: true, authPassword: data.authPassword };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
};

// ── Google Sign-In (DISABLED — Apple requires Sign in with Apple alongside third-party login) ──
// Full implementation preserved on session/security-perf-bugfix branch for future use.

export const configureGoogleSignIn = () => {
  // No-op: Google Sign-In disabled for this build
};

export const signInWithGoogle = async (): Promise<ApiResponse<User>> => {
  return {
    ok: false,
    error: { code: 'GOOGLE_DISABLED', message: 'Google Sign-In is not available in this version.' },
  };
};

// Flag set before intentional sign-outs so AppNavigator doesn't show a "Session Expired" toast
let _intentionalSignOut = false;
export const isIntentionalSignOut = () => _intentionalSignOut;
export const setIntentionalSignOut = () => { _intentionalSignOut = true; };
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    if (!password) {
      return {
        ok: false,
        error: { code: 'AUTH_ERROR', message: 'Please enter a password.' },
      };
    }

    logger.info('[AUTH] Signing in with password for:', normalized);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
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
  } catch (error: unknown) {
    logger.error('[AUTH] Sign in with password error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: {
        code: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

// ============================================================================
// LEGACY OTP FUNCTIONS — REMOVED
// sendOtpToEmail and sendLoginOtpToEmail were the old Supabase-native OTP
// path. Fully replaced by sendEmailSignUpCode / sendLoginCode which use the
// email-signup edge function with Resend for faster delivery.
// ============================================================================

/**
 * @deprecated Use sendEmailSignUpCode instead
 * @param skipAccountCheck - When true, skips the ACCOUNT_EXISTS guard (used for resending during login)
 */
export const sendOtpToEmail = async (email: string, skipAccountCheck = false): Promise<ApiResponse<void>> => {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    if (!isAllowedEmailDomain(normalized)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOMAIN',
          message: 'Only Rice University emails (@rice.edu) can sign up for Bridge.',
        },
      };
    }

    // Reviewer bypass — skip actual OTP send; the verification screen handles login via password
    if (isReviewerBypassEmail(normalized)) {
      logger.info('[EMAIL] Reviewer bypass — skipping OTP send');
      return { ok: true };
    }

    // Rate limit — fail closed: if the check itself errors, block the request.
    // This prevents OTP spam when the rate limit DB is degraded.
    const rateLimitCheck = await checkRateLimit(normalized, RateLimitAction.OTP_SEND);
    if (!rateLimitCheck.ok) {
      logger.warn('[EMAIL] Rate limit check failed — blocking request as a precaution');
      return {
        ok: false,
        error: { code: 'RATE_LIMITED', message: 'Please wait a moment before trying again.' },
      };
    }
    if (rateLimitCheck.data && !rateLimitCheck.data.allowed) {
      return {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait before requesting another code.',
        },
      };
    }
    // Check if account already exists — RPC returns boolean, no OTP sent.
    // Skip this check when resending during signup (account is created on first OTP send).
    // NOTE: The reviewer bypass (line ~195) returns BEFORE this point, so the reviewer
    // account is never blocked. Do NOT move this check above the bypass.
    if (!skipAccountCheck) {
      const { data: emailExists, error: checkErr } = await supabase.rpc('check_email_exists', { p_email: normalized });

      if (checkErr) {
        // Fail open — if the check itself errors, proceed with OTP send (don't block signups)
        logger.warn('[EMAIL] Email exists check failed (proceeding anyway):', checkErr.message);
      } else if (emailExists) {
        logger.info('[EMAIL] Account already exists for:', normalized);
        return {
          ok: false,
          error: {
            code: 'ACCOUNT_EXISTS',
            message: 'An account with this email already exists. Please sign in instead.',
          },
        };
      }
    }

    logger.info('[EMAIL] Sending signup OTP to:', normalized);

    const { error } = await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true } });

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

    // Record rate limit attempt only after successful send — failed sends don't count
    await recordRateLimitAttempt(normalized, RateLimitAction.OTP_SEND);

    logger.info('[EMAIL] OTP sent successfully to:', normalized);
    return { ok: true };
  } catch (error: unknown) {
    logger.error('[EMAIL] Error sending OTP:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: {
        code: 'EMAIL_OTP_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Send OTP for login — does NOT create a new user if email is unrecognized.
 * Returns an error if no auth account exists for this email.
 */
export const sendLoginOtpToEmail = async (email: string): Promise<ApiResponse<void>> => {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    if (!isAllowedEmailDomain(normalized)) {
      return {
        ok: false,
        error: { code: 'INVALID_DOMAIN', message: 'Only Rice University emails (@rice.edu) are allowed.' },
      };
    }

    if (isReviewerBypassEmail(normalized)) {
      logger.info('[EMAIL] Reviewer bypass — skipping OTP send');
      return { ok: true };
    }

    // Rate limit — fail closed: block on error to prevent OTP spam
    const rateLimitCheck = await checkRateLimit(normalized, RateLimitAction.OTP_SEND);
    if (!rateLimitCheck.ok) {
      logger.warn('[EMAIL] Rate limit check failed — blocking login OTP request');
      return {
        ok: false,
        error: { code: 'RATE_LIMITED', message: 'Please wait a moment before trying again.' },
      };
    }
    if (rateLimitCheck.data && !rateLimitCheck.data.allowed) {
      return {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait before requesting another code.',
        },
      };
    }
    logger.info('[EMAIL] Sending login OTP to:', normalized);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false },
    });

    if (error) {
      logger.warn('[EMAIL] Login OTP error:', error.message);
      const isNoAccount = error.message.toLowerCase().includes('signups not allowed');
      return {
        ok: false,
        error: {
          code: isNoAccount ? 'NO_ACCOUNT' : 'EMAIL_OTP_ERROR',
          message: isNoAccount
            ? 'No account found for that email. Tap "Sign Up" to create one.'
            : error.message,
        },
      };
    }

    // Record rate limit attempt only after successful send — failed sends don't count
    await recordRateLimitAttempt(normalized, RateLimitAction.OTP_SEND);

    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: { code: 'EMAIL_OTP_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' },
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

    // Clean up message subscriptions — best-effort, don't block sign-out on failure
    try {
      await import('./messageService').then(m => m.cleanupSubscriptions());
    } catch (cleanupErr) {
      logger.warn('[AUTH] Message cleanup failed during sign-out (non-fatal):', cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr));
    }

    // Clear cached profile data and stored auth state
    invalidateProfileCache();
    clearCachedUserId();
    await AsyncStorage.removeItem('bridge_auth_user');

    // Sign out from Supabase (clears session from AsyncStorage automatically)
    await supabase.auth.signOut();

    return { ok: true };
  } catch (error: unknown) {
    // Reset the flag so unexpected sign-outs still show the toast
    _intentionalSignOut = false;
    logger.error('[AUTH] Sign-out error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: {
        code: 'SIGNOUT_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
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
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: 'GET_USER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return {
        ok: false,
        error: { code: 'VERIFICATION_ERROR', message: 'Please enter a verification code.' },
      };
    }

    logger.info('[EMAIL] Verifying OTP for:', normalized);

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalized,
      token: trimmedCode,
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
  } catch (error: unknown) {
    logger.error('[EMAIL] Verification error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    if (!isAllowedEmailDomain(normalized)) {
      return {
        ok: false,
        error: { code: 'INVALID_DOMAIN', message: 'Only @rice.edu emails are allowed.' },
      };
    }

    // Check if this email already has an account
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', normalized)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: {
          code: 'ACCOUNT_EXISTS',
          message: 'An account with this email already exists. Please sign in instead.',
        },
      };
    }

    logger.info('[EMAIL_VERIFY] Sending verification code to:', normalized);

    const { data, error } = await supabase.functions.invoke('send-email-verification', {
      body: { email: normalized, action: 'send' },
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
  } catch (error: unknown) {
    logger.error('[EMAIL_VERIFY] Error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: { code: 'SEND_VERIFY_ERROR', message: error instanceof Error ? error.message : 'Failed to send verification code' },
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return {
        ok: false,
        error: { code: 'WRONG_CODE', message: 'Please enter a verification code.' },
      };
    }

    logger.info('[EMAIL_VERIFY] Verifying code for:', normalized);

    const { data, error } = await supabase.functions.invoke('send-email-verification', {
      body: { email: normalized, code: trimmedCode, action: 'verify' },
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
  } catch (error: unknown) {
    logger.error('[EMAIL_VERIFY] Error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: { code: 'VERIFY_ERROR', message: error instanceof Error ? error.message : 'Verification failed' },
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    if (!isAllowedEmailDomain(normalized)) {
      return {
        ok: false,
        error: { code: 'INVALID_DOMAIN', message: 'Only @rice.edu emails are allowed.' },
      };
    }

    // Reviewer bypass — skip actual code send; the verification screen handles login via password
    if (isReviewerBypassEmail(normalized)) {
      logger.info('[EMAIL_SIGNUP] Reviewer bypass — skipping code send');
      return { ok: true };
    }

    // Do NOT check_email_exists here. The edge function now returns explicit
    // ACCOUNT_EXISTS / NO_ACCOUNT error codes (product decision 2026-04-17,
    // commit bf92ea9 — replaced the earlier silent anti-enumeration design).
    // Surfacing that error is the UI's job. A client-side pre-check would
    // block users who verified but abandoned onboarding — they have an
    // auth.users row with profile_completed=false, and must be allowed to
    // resume where they left off.

    logger.info('[EMAIL_SIGNUP] Sending verification code to:', normalized);

    const { data, error } = await supabase.functions.invoke('email-signup', {
      body: { email: normalized, action: 'send' },
    });

    if (error) {
      logger.error('[EMAIL_SIGNUP] Edge function error:', error.message);
      return {
        ok: false,
        error: { code: 'SEND_ERROR', message: error.message },
      };
    }

    if (data?.error) {
      // Propagate specific error codes from the edge function
      const errorCode = data?.code || 'SEND_ERROR';
      return {
        ok: false,
        error: { code: errorCode, message: data.error },
      };
    }

    logger.info('[EMAIL_SIGNUP] Verification code sent successfully');
    return { ok: true };
  } catch (error: unknown) {
    logger.error('[EMAIL_SIGNUP] Error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: { code: 'SEND_ERROR', message: error instanceof Error ? error.message : 'Failed to send verification code' },
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return {
        ok: false,
        error: { code: 'VERIFY_ERROR', message: 'Please enter a verification code.' },
      };
    }

    // Reviewer bypass: use password auth instead of OTP code
    if (isReviewerBypassEmail(normalized)) {
      logger.info('[EMAIL_SIGNUP] Reviewer bypass — using password auth');
      const reviewerResult = await validateReviewerAccess(trimmedCode);
      if (!reviewerResult.valid || !reviewerResult.authPassword) {
        return { ok: false, error: { code: 'VERIFY_ERROR', message: 'Invalid reviewer credentials.' } };
      }
      const pwResult = await signInWithPassword(normalized, reviewerResult.authPassword);
      if (!pwResult.ok) return pwResult as any;
      return { ok: true, data: pwResult.data! };
    }

    logger.info('[EMAIL_SIGNUP] Verifying code for:', normalized);

    const { data, error } = await supabase.functions.invoke('email-signup', {
      body: { email: normalized, action: 'verify', code: trimmedCode },
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

    if (!data.user?.id) {
      return {
        ok: false,
        error: { code: 'SESSION_ERROR', message: 'Session created but no user data returned' },
      };
    }

    logger.info('[EMAIL_SIGNUP] Email signup successful! User ID:', data.user.id);

    return {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (error: unknown) {
    logger.error('[EMAIL_SIGNUP] Error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: { code: 'VERIFY_ERROR', message: error instanceof Error ? error.message : 'Verification failed' },
    };
  }
};

/**
 * Send a verification code for login via the email-signup Edge Function.
 * Uses Resend API directly for fast delivery (no Supabase Auth SMTP).
 * Requires the user to already have an account.
 */
export const sendLoginCode = async (email: string): Promise<ApiResponse<void>> => {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    if (!isAllowedEmailDomain(normalized)) {
      return {
        ok: false,
        error: { code: 'INVALID_DOMAIN', message: 'Only @rice.edu emails are allowed.' },
      };
    }

    // Reviewer bypass — skip actual code send; the verification screen handles login via password
    if (isReviewerBypassEmail(normalized)) {
      logger.info('[LOGIN] Reviewer bypass — skipping code send');
      return { ok: true };
    }

    logger.info('[LOGIN] Sending login code to:', normalized);

    const { data, error } = await supabase.functions.invoke('email-signup', {
      body: { email: normalized, action: 'send', flow: 'login' },
    });

    if (error) {
      logger.error('[LOGIN] Edge function error:', error.message);
      return {
        ok: false,
        error: { code: 'SEND_ERROR', message: error.message },
      };
    }

    if (data?.error) {
      const errorCode = data?.code || 'SEND_ERROR';
      return {
        ok: false,
        error: { code: errorCode, message: data.error },
      };
    }

    logger.info('[LOGIN] Login code sent successfully');
    return { ok: true };
  } catch (error: unknown) {
    logger.error('[LOGIN] Error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: { code: 'SEND_ERROR', message: error instanceof Error ? error.message : 'Failed to send login code' },
    };
  }
};

/**
 * Verify the 6-digit login code and create an auth session.
 * Uses the email-signup Edge Function which returns session tokens.
 */
export const verifyLoginCode = async (
  email: string,
  code: string
): Promise<ApiResponse<User>> => {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return {
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      };
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return {
        ok: false,
        error: { code: 'VERIFY_ERROR', message: 'Please enter a verification code.' },
      };
    }

    logger.info('[LOGIN] Verifying login code for:', normalized);

    const { data, error } = await supabase.functions.invoke('email-signup', {
      body: { email: normalized, action: 'verify', code: trimmedCode },
    });

    if (error) {
      logger.error('[LOGIN] Verification error:', error.message);
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
      logger.error('[LOGIN] Failed to set session:', sessionError.message);
      return {
        ok: false,
        error: { code: 'SESSION_ERROR', message: 'Failed to establish session' },
      };
    }

    if (!data.user?.id) {
      return {
        ok: false,
        error: { code: 'SESSION_ERROR', message: 'Session created but no user data returned' },
      };
    }

    logger.info('[LOGIN] Login successful! User ID:', data.user.id);

    return {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (error: unknown) {
    logger.error('[LOGIN] Error:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      error: { code: 'VERIFY_ERROR', message: error instanceof Error ? error.message : 'Verification failed' },
    };
  }
};

