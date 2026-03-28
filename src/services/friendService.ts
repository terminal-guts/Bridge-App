/**
 * Friend Service
 *
 * Handles friend code management and friend relationships.
 * Features:
 * - Generate and retrieve user friend codes
 * - Add friends using friend codes
 * - Remove friends
 * - Get friend lists with profiles
 *
 * Friend code operations are in friendService.codes.ts.
 * Friend request operations are in friendService.requests.ts.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { mapProfileRow, resolveProfilePhotos } from './communityBackendService';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  RateLimitAction,
  formatRetryTime,
} from '../utils/rateLimiter';

// Re-export from sub-modules so existing imports keep working
export { getUserFriendCode, getFriendCodeByUserId, getFriendCodesByUserIds, sendFriendRequestByCode } from './friendService.codes';
export type { FriendCode } from './friendService.codes';
export { sendFriendRequest, getIncomingRequests, getOutgoingRequests, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from './friendService.requests';
export type { FriendRequest } from './friendService.requests';
export { invalidateFriendCountCache, type AddFriendResult } from './friendService.shared';

const logger = createLogger('FriendService');

/**
 * Friend data structure with profile
 */
export interface FriendWithProfile {
  friendshipId: string;
  userId: string;
  friendId: string;
  addedAt: string;
  profile: UserProfile;
}

import { invalidateFriendCountCache as _invalidate, setCachedFriendCount, getCachedFriendCount, FRIEND_COUNT_TTL, type AddFriendResult } from './friendService.shared';

/**
 * Error response helper
 */
const createErrorResponse = <T>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: {
    code,
    message,
  },
});

// ============================================================================
// Core Friend Operations
// ============================================================================

/**
 * Add a friend using their friend code
 * SECURITY: Rate limited to prevent brute force attacks on friend codes
 */
export const addFriendByCode = async (
  friendCode: string
): Promise<ApiResponse<AddFriendResult>> => {
  try {
    // SECURITY: Get authenticated user for rate limiting
    const userId = await requireAuth();

    // SECURITY: Check rate limit before attempting friend code
    const rateLimitResult = await checkRateLimit(userId, RateLimitAction.FRIEND_CODE_ATTEMPT);

    if (!rateLimitResult.ok) {
      return createErrorResponse(
        'RATE_LIMIT_CHECK_FAILED',
        rateLimitResult.error?.message || 'Failed to check rate limit'
      );
    }

    if (rateLimitResult.data?.allowed === false) {
      const retryTime = formatRetryTime(rateLimitResult.data.retryAfterSeconds ?? 60);
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        `Too many friend code attempts. Please try again in ${retryTime}.`
      );
    }

    // Record the attempt for rate limiting
    await recordRateLimitAttempt(userId, RateLimitAction.FRIEND_CODE_ATTEMPT, {
      friendCode: friendCode.substring(0, 10) + '...', // Don't log full code
      timestamp: new Date().toISOString(),
    });

    // Use send_friend_request RPC (replaces instant-add with request flow)
    const { data, error } = await supabase
      .rpc('send_friend_request', { friend_code: friendCode.toUpperCase() });

    if (error) {
      return createErrorResponse('ADD_FRIEND_ERROR', error.message);
    }

    const result = data?.[0];

    if (!result) {
      return createErrorResponse('ADD_FRIEND_ERROR', 'No response from server');
    }

    if (!result.success) {
      return createErrorResponse('ADD_FRIEND_FAILED', result.message);
    }

    // Fetch the friend's profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', result.friend_user_id)
      .single();

    _invalidate();

    return {
      ok: true,
      data: {
        friendUserId: result.friend_user_id,
        friendProfile: profileData ? mapProfileRow(profileData) : undefined,
        wasAutoAccepted: result.was_auto_accepted,
        requestId: result.request_id,
      },
    };
  } catch (error: unknown) {
    return createErrorResponse('ADD_FRIEND_ERROR', error instanceof Error ? error.message : 'Failed to add friend');
  }
};

/**
 * Bulk-add multiple friends by their friend codes in parallel.
 * Skips rate limiting and profile fetching for speed.
 * Returns the set of codes that were successfully added.
 */
export const bulkAddFriendsByCodes = async (
  codes: string[]
): Promise<Set<string>> => {
  const added = new Set<string>();
  if (codes.length === 0) return added;

  const results = await Promise.allSettled(
    codes.map(async (code) => {
      const { data, error } = await supabase
        .rpc('send_friend_request', { friend_code: code.toUpperCase() });
      const row = data?.[0];
      if (!error && row?.success) return code;
      if (row?.message?.includes('already friends')) return code;
      return null;
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) added.add(r.value);
  }
  return added;
};

/**
 * Get list of friends with their profiles
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getFriends = async (): Promise<ApiResponse<FriendWithProfile[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        added_at,
        friend_profile:user_profiles!friends_friend_id_fkey(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('added_at', { ascending: false });

    if (error) {
      return createErrorResponse('FETCH_ERROR', error.message);
    }

    const friends: FriendWithProfile[] = data.map((item: Record<string, unknown>) => ({
      friendshipId: item.id as string,
      userId: item.user_id as string,
      friendId: item.friend_id as string,
      addedAt: item.added_at as string,
      profile: mapProfileRow(item.friend_profile as Record<string, unknown>),
    }));

    // Resolve storage paths to signed URLs for friend profile photos
    await resolveProfilePhotos(friends.map(f => f.profile));

    return {
      ok: true,
      data: friends,
    };
  } catch (error: unknown) {
    return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Failed to fetch friends');
  }
};

/**
 * Remove a friend
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const removeFriend = async (
  friendId: string
): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Remove both directions of the friendship atomically
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) return createErrorResponse('DELETE_ERROR', error.message);

    // Clean up friend_badges in both directions (giver<->receiver)
    await supabase
      .from('friend_badges')
      .delete()
      .or(`and(giver_id.eq.${userId},receiver_id.eq.${friendId}),and(giver_id.eq.${friendId},receiver_id.eq.${userId})`);

    // Expire any active friend_suggestions involving the removed friend from this user
    await supabase
      .from('friend_suggestions')
      .update({ status: 'expired' })
      .eq('suggested_by', userId)
      .or(`user_a_id.eq.${friendId},user_b_id.eq.${friendId}`)
      .in('status', ['queued', 'stashed']);

    _invalidate(); // invalidate on removal

    return {
      ok: true,
    };
  } catch (error: unknown) {
    return createErrorResponse('DELETE_ERROR', error instanceof Error ? error.message : 'Failed to remove friend');
  }
};

/**
 * Get friend count for a user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 * Cached in-memory for 60s to avoid redundant DB hits on tab switches.
 */
export const getFriendCount = async (): Promise<ApiResponse<number>> => {
  try {
    // Return cached value if fresh
    const cached = getCachedFriendCount();
    if (cached !== null) {
      return { ok: true, data: cached };
    }

    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { FEATURES } = await import('../config/features');
    if (FEATURES.DEVELOPMENT_AUTO_FILL_ONBOARDING) {
      return { ok: true, data: 3 };
    }

    const { count, error } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      return createErrorResponse('COUNT_ERROR', error.message);
    }

    const result = count || 0;
    setCachedFriendCount(result);

    return {
      ok: true,
      data: result,
    };
  } catch (error: unknown) {
    return createErrorResponse('COUNT_ERROR', error instanceof Error ? error.message : 'Failed to count friends');
  }
};

/**
 * Check if the authenticated user is friends with another user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const areFriends = async (
  friendId: string
): Promise<ApiResponse<boolean>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .eq('status', 'accepted')
      .single();

    if (error && error.code !== 'PGRST116') {
      return createErrorResponse('CHECK_ERROR', error.message);
    }

    return {
      ok: true,
      data: !!data,
    };
  } catch (error: unknown) {
    return createErrorResponse('CHECK_ERROR', error instanceof Error ? error.message : 'Failed to check friendship');
  }
};

// ============================================================================
// PHASE 2: Friend Statistics Functions
// ============================================================================

export interface FriendStats {
  friendId: string;
  friendCode: string;
  firstName: string;
  matchesIntroduced: number;
  successfulMatches: number;
  matchSuccessRate: number;
  matchmakerBadge: string;
  badgeColor: string;
}

/**
 * Get friend statistics including matchmaker badges
 * Note: Referral tracking to be implemented in Phase 4
 */
export const getFriendStats = async (): Promise<ApiResponse<FriendStats[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase.rpc('get_friend_stats', {
      p_user_id: userId,
    });

    if (error) {
      return createErrorResponse('FETCH_STATS_ERROR', error.message);
    }

    if (!data) {
      return {
        ok: true,
        data: [],
      };
    }

    const friendStats: FriendStats[] = data.map((friend: Record<string, unknown>) => ({
      friendId: friend.friend_id as string,
      friendCode: friend.friend_code as string,
      firstName: friend.first_name as string,
      matchesIntroduced: friend.matches_introduced as number,
      successfulMatches: friend.successful_matches as number,
      matchSuccessRate: friend.match_success_rate as number,
      matchmakerBadge: friend.matchmaker_badge as string,
      badgeColor: friend.badge_color as string,
    }));

    return {
      ok: true,
      data: friendStats,
    };
  } catch (error: unknown) {
    return createErrorResponse('FETCH_STATS_ERROR', error instanceof Error ? error.message : 'Failed to fetch friend stats');
  }
};

// Profile row mapping consolidated into communityBackendService.mapProfileRow
