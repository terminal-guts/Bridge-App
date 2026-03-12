/**
 * Account Service
 *
 * Handles account-level operations like deletion.
 */

import { ApiResponse } from '../types';
import { supabase } from '../lib/supabase';
import { cleanupSubscriptions } from './messageService';
import { setIntentionalSignOut } from './authService';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('AccountService');

/**
 * Delete the current user's account.
 * Calls the delete-account edge function which:
 *   - Cancels proposals and matches
 *   - Removes friendships, karma, streaks, messages
 *   - Soft-deletes the profile
 *   - Hard-deletes the auth user (signs out everywhere)
 */
export const deleteAccount = async (): Promise<ApiResponse<void>> => {
  try {
    logger.info('[ACCOUNT] Requesting account deletion');

    // Clean up local subscriptions first
    cleanupSubscriptions();

    // Use fetch directly to get the full response body on errors
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': anonKey || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = data?.error || data?.step_errors?.join(', ') || `HTTP ${response.status}`;
      logger.error('[ACCOUNT] Deletion failed:', detail);
      return {
        ok: false,
        error: {
          code: 'DELETE_FAILED',
          message: detail,
        },
      };
    }

    if (data?.error) {
      logger.error('[ACCOUNT] Deletion returned error:', data.error);
      return {
        ok: false,
        error: {
          code: 'DELETE_FAILED',
          message: data.error,
        },
      };
    }

    logger.info('[ACCOUNT] Account deleted successfully');

    // Mark as intentional so AppNavigator doesn't show "Session Expired"
    setIntentionalSignOut();
    await supabase.auth.signOut();

    return { ok: true };
  } catch (err: any) {
    logger.error('[ACCOUNT] Deletion error:', err.message);
    return {
      ok: false,
      error: {
        code: 'DELETE_FAILED',
        message: err.message || 'An unexpected error occurred',
      },
    };
  }
};
