/**
 * Account Service
 *
 * Handles critical account operations including deletion.
 * Implements GDPR-compliant data deletion and user account management.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

// Create namespaced logger for this service
const logger = createLogger('AccountService');

/**
 * Account deletion result
 */
interface DeleteAccountResult {
  success: boolean;
  deletedResources: {
    profile: boolean;
    photos: boolean;
    settings: boolean;
    matches: boolean;
    messages: boolean;
    surveys: boolean;
    authUser: boolean;
  };
  errors?: string[];
}

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
 * Delete user account and all associated data
 *
 * SECURITY FIX: Now uses Edge Function to safely handle admin operations server-side
 * This is a destructive operation that:
 * 1. Deletes all user data from database tables
 * 2. Deletes all photos from Storage
 * 3. Deletes the auth.users entry
 *
 * IMPORTANT: This operation cannot be undone
 */
export const deleteUserAccount = async (userId?: string): Promise<ApiResponse<DeleteAccountResult>> => {
  try {
    // Call the Edge Function to handle account deletion
    // The Edge Function will verify authentication and perform all deletion operations
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: {},
    });

    if (error) {
      logger.error('Delete account function error:', error);
      return createErrorResponse('DELETE_FAILED', error.message);
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: {
          code: data?.error?.code || 'DELETE_FAILED',
          message: data?.error?.message || 'Failed to delete account',
        },
      };
    }

    logger.info('Account deletion completed successfully');

    return {
      ok: true,
      data: data.data,
    };
  } catch (error: any) {
    logger.error('Account deletion error:', error);
    return createErrorResponse(
      'DELETE_ACCOUNT_ERROR',
      error.message || 'Failed to delete account'
    );
  }
};

/**
 * Request account deletion (for future email confirmation flow)
 * Creates a pending deletion request that will be processed after confirmation
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const requestAccountDeletion = async (
  reason?: string
): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Initiate soft-delete via edge function
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { reason: reason || undefined },
    });

    if (error) {
      logger.error('Request account deletion function error:', error);
      return createErrorResponse('DELETE_REQUEST_FAILED', error.message);
    }

    if (!data?.ok) {
      return createErrorResponse(
        data?.error?.code || 'DELETE_REQUEST_FAILED',
        data?.error?.message || 'Failed to request account deletion',
      );
    }

    logger.info('Account deletion requested successfully');

    return {
      ok: true,
    };
  } catch (error: any) {
    logger.error('Request account deletion error:', error);
    return createErrorResponse(
      'REQUEST_ERROR',
      error.message || 'Failed to request account deletion'
    );
  }
};

/**
 * Cancel account deletion request (for future use)
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const cancelAccountDeletion = async (): Promise<ApiResponse<void>> => {
  try {
    const { data, error } = await supabase.functions.invoke('cancel-account-deletion', {
      body: {},
    });

    if (error) {
      logger.error('Cancel account deletion function error:', error);
      return createErrorResponse('CANCEL_FAILED', error.message);
    }

    if (!data?.ok) {
      return createErrorResponse(
        data?.error?.code || 'CANCEL_FAILED',
        data?.error?.message || 'Failed to cancel account deletion',
      );
    }

    logger.info('Account deletion cancelled successfully');
    return { ok: true };
  } catch (error: any) {
    logger.error('Cancel account deletion error:', error);
    return createErrorResponse(
      'CANCEL_ERROR',
      error.message || 'Failed to cancel account deletion'
    );
  }
};

/**
 * Export user data (GDPR compliance)
 * Returns all user data in a portable format
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const exportUserData = async (): Promise<ApiResponse<any>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Fetch all user data
    const [
      { data: profile },
      { data: preferences },
      { data: deepQuestions },
      { data: settings },
      { data: matches },
      { data: messages },
      { data: blockedUsers },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
      supabase.from('deep_question_answers').select('*').eq('user_id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      supabase.from('matches').select('*').or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
      supabase.from('messages').select('*').or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`),
      supabase.from('blocked_users').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      userId,
      profile,
      preferences,
      deepQuestions,
      settings,
      matches,
      messages,
      blockedUsers,
    };

    return {
      ok: true,
      data: exportData,
    };
  } catch (error: any) {
    logger.error('Export user data error:', error);
    return createErrorResponse(
      'EXPORT_ERROR',
      error.message || 'Failed to export user data'
    );
  }
};

/**
 * Lock user out of matchmaking
 * This operation prevents a user from participating in matchmaking flows.
 *
 * @param userId - The ID of the user to lock out
 * @param reason - The reason for the lockout
 * 
 * TODO: Implement backend logic for matchmaking lockout
 */
export const lockUserMatchmaking = async (
  userId: string,
  reason: string
): Promise<ApiResponse<void>> => {
  // Logic not implemented as per request
  logger.info(`Matchmaking lockout requested for user ${userId}. Reason: ${reason}`);

  return {
    ok: true,
  };
};
