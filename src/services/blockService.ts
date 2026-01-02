/**
 * Block Service
 *
 * Handles user blocking and unblocking functionality.
 * Provides methods to manage blocked users list.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

// Create namespaced logger for this service
const logger = createLogger('BlockService');

/**
 * Blocked user information
 */
export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  blockedAt: string;
  blockedUserProfile?: UserProfile;
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
 * Block a user
 * Prevents the blocked user from contacting the current user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const blockUser = async (
  blockedUserId: string,
  reason?: string
): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Validate inputs
    if (!blockedUserId) {
      return createErrorResponse('INVALID_INPUT', 'Blocked user ID is required');
    }

    if (userId === blockedUserId) {
      return createErrorResponse('CANNOT_BLOCK_SELF', 'Cannot block yourself');
    }

    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', userId)
      .eq('blocked_user_id', blockedUserId)
      .single();

    if (existingBlock) {
      return createErrorResponse('ALREADY_BLOCKED', 'User is already blocked');
    }

    // Create block entry
    const { error } = await supabase
      .from('blocked_users')
      .insert({
        user_id: userId,
        blocked_user_id: blockedUserId,
        reason: reason || null,
      });

    if (error) {
      logger.error('Block user error:', error);
      return createErrorResponse('BLOCK_FAILED', error.message);
    }

    logger.info(`User ${userId} blocked user ${blockedUserId}`);

    return {
      ok: true,
    };
  } catch (error: any) {
    logger.error('Block user error:', error);
    return createErrorResponse('BLOCK_ERROR', error.message || 'Failed to block user');
  }
};

/**
 * Unblock a user
 * Removes the block and allows the user to contact again
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const unblockUser = async (
  blockedUserId: string
): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Validate inputs
    if (!blockedUserId) {
      return createErrorResponse('INVALID_INPUT', 'Blocked user ID is required');
    }

    // Delete block entry
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', userId)
      .eq('blocked_user_id', blockedUserId);

    if (error) {
      logger.error('Unblock user error:', error);
      return createErrorResponse('UNBLOCK_FAILED', error.message);
    }

    logger.info(`User ${userId} unblocked user ${blockedUserId}`);

    return {
      ok: true,
    };
  } catch (error: any) {
    logger.error('Unblock user error:', error);
    return createErrorResponse('UNBLOCK_ERROR', error.message || 'Failed to unblock user');
  }
};

/**
 * Get list of blocked users for the authenticated user
 * Returns blocked users with their profile information
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getBlockedUsers = async (): Promise<ApiResponse<BlockedUser[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Get all blocked user IDs
    const { data: blocks, error: blocksError } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('user_id', userId)
      .order('blocked_at', { ascending: false });

    if (blocksError) {
      logger.error('Get blocked users error:', blocksError);
      return createErrorResponse('FETCH_FAILED', blocksError.message);
    }

    if (!blocks || blocks.length === 0) {
      return {
        ok: true,
        data: [],
      };
    }

    // Fetch profile information for blocked users
    const blockedUserIds = blocks.map(b => b.blocked_user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, age, occupation, photos')
      .in('user_id', blockedUserIds);

    if (profilesError) {
      logger.warn('Failed to fetch blocked user profiles:', profilesError);
      // Return blocks without profile info
      return {
        ok: true,
        data: blocks.map(block => ({
          id: block.id,
          userId: block.user_id,
          blockedUserId: block.blocked_user_id,
          reason: block.reason,
          blockedAt: block.blocked_at,
        })),
      };
    }

    // Combine blocks with profile data
    const blockedUsers: BlockedUser[] = blocks.map(block => {
      const profile = profiles?.find(p => p.user_id === block.blocked_user_id);

      return {
        id: block.id,
        userId: block.user_id,
        blockedUserId: block.blocked_user_id,
        reason: block.reason,
        blockedAt: block.blocked_at,
        blockedUserProfile: profile ? {
          id: profile.id,
          userId: profile.user_id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          age: profile.age,
          occupation: profile.occupation || '',
          photos: tryParseJSON(profile.photos) || [],
          // Minimal profile info for blocked users
        } as any : undefined,
      };
    });

    return {
      ok: true,
      data: blockedUsers,
    };
  } catch (error: any) {
    logger.error('Get blocked users error:', error);
    return createErrorResponse('FETCH_ERROR', error.message || 'Failed to fetch blocked users');
  }
};

/**
 * Check if the authenticated user has blocked a target user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const isUserBlocked = async (
  targetUserId: string
): Promise<ApiResponse<boolean>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    if (!targetUserId) {
      return createErrorResponse('INVALID_INPUT', 'Target user ID is required');
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', userId)
      .eq('blocked_user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Check blocked error:', error);
      return createErrorResponse('CHECK_FAILED', error.message);
    }

    return {
      ok: true,
      data: !!data,
    };
  } catch (error: any) {
    logger.error('Check blocked error:', error);
    return createErrorResponse('CHECK_ERROR', error.message || 'Failed to check block status');
  }
};

/**
 * Check if there's a mutual block between two users
 * Returns true if either user has blocked the other
 */
export const isMutuallyBlocked = async (
  user1Id: string,
  user2Id: string
): Promise<ApiResponse<boolean>> => {
  try {
    if (!user1Id || !user2Id) {
      return createErrorResponse('INVALID_INPUT', 'User IDs are required');
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(user_id.eq.${user1Id},blocked_user_id.eq.${user2Id}),and(user_id.eq.${user2Id},blocked_user_id.eq.${user1Id})`);

    if (error) {
      logger.error('Check mutual block error:', error);
      return createErrorResponse('CHECK_FAILED', error.message);
    }

    return {
      ok: true,
      data: !!data && data.length > 0,
    };
  } catch (error: any) {
    logger.error('Check mutual block error:', error);
    return createErrorResponse('CHECK_ERROR', error.message || 'Failed to check mutual block status');
  }
};

/**
 * Get count of blocked users for the authenticated user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getBlockedUsersCount = async (): Promise<ApiResponse<number>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { count, error } = await supabase
      .from('blocked_users')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      logger.error('Count blocked users error:', error);
      return createErrorResponse('COUNT_FAILED', error.message);
    }

    return {
      ok: true,
      data: count || 0,
    };
  } catch (error: any) {
    logger.error('Count blocked users error:', error);
    return createErrorResponse('COUNT_ERROR', error.message || 'Failed to count blocked users');
  }
};

/**
 * Helper: Try to parse JSON, return null if fails
 */
function tryParseJSON(json: any): any {
  if (!json) return null;
  if (typeof json === 'object') return json;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
