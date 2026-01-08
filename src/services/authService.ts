/**
 * Authentication Service - MOCK VERSION
 *
 * Provides tap-through authentication for development without backend
 */

import { ApiResponse } from '../types';

interface User {
  id: string;
  email?: string;
  phone?: string;
}

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
let mockCurrentUser: User | null = null;

// Backend API URL - use your local IP if testing on physical device
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://poor-parks-occur.loca.lt';

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
    console.log('[SMS] Attempting to send OTP via Twilio to:', phoneNumber);

    const response = await fetch(`${API_URL}/onboarding/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to send OTP');
    }

    console.log('[SMS] OTP request successful for:', phoneNumber);
    return { ok: true };
  } catch (error: any) {
    console.error('[SMS] Error sending OTP:', error.message);
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
 * Sign out the current user - MOCK VERSION
 */
export const signOut = async (): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK AUTH] User signed out');
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
    console.log('[SMS] Verifying code:', code, 'for phone:', phone);

    const response = await fetch(`${API_URL}/onboarding/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone, code: code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Invalid verification code');
    }

    console.log('[SMS] Phone verification successful!');

    mockCurrentUser = {
      id: MOCK_USER_ID,
      phone,
      email: 'dev@bridge.app',
    };

    return {
      ok: true,
      data: mockCurrentUser,
    };
  } catch (error: any) {
    console.error('[SMS] Verification error:', error.message);
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
