/**
 * Friend Service - Friend request operations
 *
 * Extracted from friendService.ts for file-size management.
 * Contains: sendFriendRequest, getIncomingRequests, getOutgoingRequests,
 * acceptFriendRequest, declineFriendRequest, cancelFriendRequest.
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
import { invalidateFriendCountCache, type AddFriendResult } from './friendService.shared';

const logger = createLogger('FriendService');

const createErrorResponse = <T>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

/**
 * Friend request data structure
 */
export interface FriendRequest {
  id: string;
  senderId: string;
  recipientId: string;
  senderProfile: UserProfile;
  requestedAt: string;
}

/**
 * Send a friend request (replaces instant-add).
 * Returns request info including whether it was auto-accepted (mutual request).
 */
export const sendFriendRequest = async (
  friendCode: string
): Promise<ApiResponse<AddFriendResult>> => {
  try {
    const userId = await requireAuth();

    const rateLimitResult = await checkRateLimit(userId, RateLimitAction.FRIEND_CODE_ATTEMPT);
    if (!rateLimitResult.ok) {
      return createErrorResponse('RATE_LIMIT_CHECK_FAILED', rateLimitResult.error?.message || 'Failed to check rate limit');
    }
    if (rateLimitResult.data?.allowed === false) {
      const retryTime = formatRetryTime(rateLimitResult.data.retryAfterSeconds ?? 60);
      return createErrorResponse('RATE_LIMIT_EXCEEDED', `Too many attempts. Try again in ${retryTime}.`);
    }

    await recordRateLimitAttempt(userId, RateLimitAction.FRIEND_CODE_ATTEMPT, {
      friendCode: friendCode.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .rpc('send_friend_request', { friend_code: friendCode.toUpperCase() });

    if (error) {
      return createErrorResponse('SEND_REQUEST_ERROR', error.message);
    }

    const result = data?.[0];
    if (!result) {
      return createErrorResponse('SEND_REQUEST_ERROR', 'No response from server');
    }
    if (!result.success) {
      return createErrorResponse('SEND_REQUEST_FAILED', result.message);
    }

    // Fetch the friend's profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', result.friend_user_id)
      .single();

    invalidateFriendCountCache();

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
    return createErrorResponse('SEND_REQUEST_ERROR', error instanceof Error ? error.message : 'Failed to send friend request');
  }
};

/**
 * Get incoming friend requests (pending requests where I'm the recipient).
 */
export const getIncomingRequests = async (): Promise<ApiResponse<FriendRequest[]>> => {
  try {
    const userId = await requireAuth();

    // Step 1: get pending rows (friends FKs reference auth.users, not user_profiles,
    // so PostgREST can't join to user_profiles directly — do it in two queries)
    const { data: rows, error } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, added_at')
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('added_at', { ascending: false });

    if (error) {
      return createErrorResponse('FETCH_ERROR', error.message);
    }
    if (!rows || rows.length === 0) {
      return { ok: true, data: [] };
    }

    // Step 2: fetch sender profiles
    const senderIds = rows.map(r => r.user_id as string);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', senderIds);

    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of profiles || []) {
      profileMap[(p as Record<string, unknown>).user_id as string] = p as Record<string, unknown>;
    }

    const requests: FriendRequest[] = rows.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      senderId: item.user_id as string,
      recipientId: item.friend_id as string,
      senderProfile: mapProfileRow(profileMap[item.user_id as string] ?? {}),
      requestedAt: item.added_at as string,
    }));

    // Resolve photo URLs
    await resolveProfilePhotos(requests.map(req => req.senderProfile));

    return { ok: true, data: requests };
  } catch (error: unknown) {
    return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Failed to fetch incoming requests');
  }
};

/**
 * Get outgoing friend requests (pending requests I sent).
 */
export const getOutgoingRequests = async (): Promise<ApiResponse<FriendRequest[]>> => {
  try {
    const userId = await requireAuth();

    // friends.friend_id references auth.users (not user_profiles), so PostgREST can't
    // join directly — fetch rows first, then look up recipient profiles separately.
    const { data: rows, error } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, added_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('added_at', { ascending: false });

    if (error) {
      return createErrorResponse('FETCH_ERROR', error.message);
    }
    if (!rows || rows.length === 0) {
      return { ok: true, data: [] };
    }

    const recipientIds = rows.map(r => r.friend_id as string);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', recipientIds);

    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of profiles || []) {
      profileMap[(p as Record<string, unknown>).user_id as string] = p as Record<string, unknown>;
    }

    const requests: FriendRequest[] = rows.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      senderId: item.user_id as string,
      recipientId: item.friend_id as string,
      senderProfile: mapProfileRow(profileMap[item.friend_id as string] ?? {}),
      requestedAt: item.added_at as string,
    }));

    await resolveProfilePhotos(requests.map(req => req.senderProfile));

    return { ok: true, data: requests };
  } catch (error: unknown) {
    return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Failed to fetch outgoing requests');
  }
};

/**
 * Accept a friend request.
 */
export const acceptFriendRequest = async (requestId: string): Promise<ApiResponse<{ friendUserId: string }>> => {
  try {
    const { data, error } = await supabase
      .rpc('accept_friend_request', { request_id: requestId });

    if (error) {
      return createErrorResponse('ACCEPT_ERROR', error.message);
    }

    const result = data?.[0];
    if (!result?.success) {
      return createErrorResponse('ACCEPT_FAILED', result?.message || 'Failed to accept request');
    }

    invalidateFriendCountCache();

    return { ok: true, data: { friendUserId: result.friend_user_id } };
  } catch (error: unknown) {
    return createErrorResponse('ACCEPT_ERROR', error instanceof Error ? error.message : 'Failed to accept friend request');
  }
};

/**
 * Decline a friend request (silent — no notification).
 */
export const declineFriendRequest = async (requestId: string): Promise<ApiResponse<void>> => {
  try {
    const { data, error } = await supabase
      .rpc('decline_friend_request', { request_id: requestId });

    if (error) {
      return createErrorResponse('DECLINE_ERROR', error.message);
    }

    const result = data?.[0];
    if (!result?.success) {
      return createErrorResponse('DECLINE_FAILED', result?.message || 'Failed to decline request');
    }

    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('DECLINE_ERROR', error instanceof Error ? error.message : 'Failed to decline friend request');
  }
};

/**
 * Cancel an outgoing friend request.
 */
export const cancelFriendRequest = async (requestId: string): Promise<ApiResponse<void>> => {
  try {
    const { data, error } = await supabase
      .rpc('cancel_friend_request', { request_id: requestId });

    if (error) {
      return createErrorResponse('CANCEL_ERROR', error.message);
    }

    const result = data?.[0];
    if (!result?.success) {
      return createErrorResponse('CANCEL_FAILED', result?.message || 'Failed to cancel request');
    }

    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('CANCEL_ERROR', error instanceof Error ? error.message : 'Failed to cancel friend request');
  }
};
