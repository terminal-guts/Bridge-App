/**
 * Authentication Service - MOCK VERSION
 *
 * Provides tap-through authentication for development without backend
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

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
let mockCurrentUser: User | null = null;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bridge-frontend-production.up.railway.app';

/**
 * Error response helper
 */
const createErrorResponse = (code: string, message: string): ApiResponse<any> => {
  return {
    ok: false,
    error: { code, message },
  };
};

/**
 * Send OTP code to phone number - MOCK VERSION
 * Always succeeds immediately for tap-through flow
 */
export const sendOtpToPhone = async (phoneNumber: string): Promise<ApiResponse<void>> => {
  try {
    logger.info('[SMS] Attempting to send OTP via Twilio to:', phoneNumber);

    const response = await fetch(`${API_URL}/onboarding/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to send OTP';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // Not JSON - might be Localtunnel interstitial or server crash
        logger.error('[SMS] Non-JSON error response:', errorText.slice(0, 100));
        errorMessage = `Server Error: ${response.status}. Please check your backend connection.`;
      }
      throw new Error(errorMessage);
    }

    logger.info('[SMS] OTP request successful for:', phoneNumber);
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
 * Send OTP code to email - Task 4
 */
export const sendOtpToEmail = async (email: string): Promise<ApiResponse<void>> => {
  try {
    logger.info('[EMAIL] Attempting to send OTP to:', email);

    const response = await fetch(`${API_URL}/onboarding/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to send email OTP';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        logger.error('[EMAIL] Non-JSON error response:', errorText.slice(0, 100));
        errorMessage = `Server Error: ${response.status}. Please check your backend connection.`;
      }
      throw new Error(errorMessage);
    }

    logger.info('[EMAIL] OTP request successful for:', email);
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
 * Sign out the current user - MOCK VERSION
 */
export const signOut = async (): Promise<ApiResponse<void>> => {
  try {
    logger.info('[AUTH] Signing out user');

    // Clean up message subscriptions
    cleanupSubscriptions();

    // Clear Supabase session so the user is fully logged out
    await supabase.auth.signOut();

    mockCurrentUser = null;
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
 * Get the current authenticated user - MOCK VERSION
 */
export const getCurrentUser = async (): Promise<ApiResponse<User | null>> => {
  try {
    // Return mock user if signed in
    if (mockCurrentUser) {
      return {
        ok: true,
        data: mockCurrentUser,
      };
    }

    // Auto-create mock user for seamless development
    mockCurrentUser = {
      id: MOCK_USER_ID,
      phone: '+1234567890',
      email: 'dev@bridge.app',
    };

    return {
      ok: true,
      data: mockCurrentUser,
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
 * Verify phone number with OTP code - MOCK VERSION
 * Always succeeds for tap-through flow
 */
export const verifyPhone = async (phone: string, code: string): Promise<ApiResponse<User>> => {
  try {
    logger.info('[SMS] Verifying code:', code, 'for phone:', phone);

    const response = await fetch(`${API_URL}/onboarding/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone, code: code }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Invalid verification code';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        logger.error('[SMS] Non-JSON verify response:', errorText.slice(0, 100));
        errorMessage = `Server Error: ${response.status}. Check if your backend is running at ${API_URL}`;
      }
      throw new Error(errorMessage);
    }

    logger.info('[SMS] Phone verification successful!');

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error('[SMS] Parse error on success:', responseText.slice(0, 100));
      throw new Error(`Server at ${API_URL} returned HTML instead of JSON (Status: ${response.status}). Are you hitting the right service?`);
    }

    mockCurrentUser = {
      id: data.user_id || MOCK_USER_ID,
      phone,
      email: 'dev@bridge.app',
    };

    return {
      ok: true,
      data: mockCurrentUser,
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
 * Verify email with OTP code - Task 4
 */
export const verifyEmail = async (email: string, code: string): Promise<ApiResponse<User>> => {
  try {
    logger.info('[EMAIL] Verifying code:', code, 'for email:', email);

    const response = await fetch(`${API_URL}/onboarding/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Invalid verification code';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        logger.error('[EMAIL] Non-JSON verify response:', errorText.slice(0, 100));
        errorMessage = `Server Error: ${response.status}. Check if your backend is running at ${API_URL}`;
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error('[EMAIL] Parse error on success:', responseText.slice(0, 100));
      throw new Error(`Server at ${API_URL} returned HTML instead of JSON (Status: ${response.status}). Are you hitting the right service?`);
    }

    logger.info('[EMAIL] Email verification successful!');

    mockCurrentUser = {
      id: data.user_id || MOCK_USER_ID,
      email,
    };

    return {
      ok: true,
      data: mockCurrentUser,
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
 * Require phone verification - MOCK VERSION
 * Always returns mock user for seamless development
 */
export const requirePhoneVerification = async (): Promise<ApiResponse<User>> => {
  try {
    // Auto-create mock user if not exists
    if (!mockCurrentUser) {
      mockCurrentUser = {
        id: MOCK_USER_ID,
        phone: '+1234567890',
        email: 'dev@bridge.app',
      };
    }

    return {
      ok: true,
      data: mockCurrentUser,
    };
  } catch (error: any) {
    return createErrorResponse('AUTH_ERROR', error.message || 'Authentication failed');
  }
};
