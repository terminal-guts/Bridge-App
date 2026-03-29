/**
 * Block Service — Supabase Implementation
 *
 * Handles user blocking and unblocking functionality.
 * Enforces bidirectional exclusion: if A blocks B, neither A→B
 * nor B→A matches, grids, or proposals will ever be surfaced.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, UserProfile, Photo } from '../types';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('BlockService');

/** UUID v4 format check — prevents PostgREST filter injection via .or() interpolation. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid UUID for ${label}`);
  }
}

/**
 * Determine the current user ID from Supabase auth.
 */
async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ============================================================================
// TYPE
// ============================================================================

/**
 * Blocked user information returned by getBlockedUsers().
 */
export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  blockedAt: string;
  blockedUserProfile?: Partial<UserProfile>;
}

// ============================================================================
// HELPER
// ============================================================================

const createErrorResponse = <T = never>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

function tryParseJSON(json: unknown): unknown {
  if (!json) return null;
  if (typeof json === 'object') return json;
  if (typeof json !== 'string') return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ============================================================================
// CORE BLOCK OPERATIONS
// ============================================================================

/**
 * Block a user.
 */
export const blockUser = async (
  blockedUserId: string,
): Promise<ApiResponse<void>> => {
  try {
    if (!blockedUserId) {
      return createErrorResponse('INVALID_INPUT', 'Blocked user ID is required');
    }

    assertUuid(blockedUserId, 'blockedUserId');

    const currentUserId = await getCurrentUserId();

    if (currentUserId === blockedUserId) {
      return createErrorResponse('CANNOT_BLOCK_SELF', 'Cannot block yourself');
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('blocked_user_id', blockedUserId)
      .maybeSingle();

    if (existing) {
      return createErrorResponse('ALREADY_BLOCKED', 'User is already blocked');
    }

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        user_id: currentUserId,
        blocked_user_id: blockedUserId,
      });

    if (error) throw error;

    // Side-effects: cancel active proposals, end matches, remove friendship
    const nowIso = new Date().toISOString();
    const [u1, u2] = [currentUserId, blockedUserId].sort();

    // Cancel any active proposals between the pair
    await supabase
      .from('proposals')
      .update({ status: 'rejected', rejected_at: nowIso, updated_at: nowIso })
      .in('status', ['pending', 'deciding'])
      .or(
        `and(user_a_id.eq.${currentUserId},user_b_id.eq.${blockedUserId}),` +
        `and(user_a_id.eq.${blockedUserId},user_b_id.eq.${currentUserId})`,
      );

    // End any active matches between the pair
    await supabase
      .from('matches')
      .update({ status: 'ended', updated_at: nowIso })
      .in('status', ['pending', 'accepted', 'active'])
      .or(
        `and(user_id_1.eq.${u1},user_id_2.eq.${u2})`,
      );

    // Remove friendship in both directions (catches both pending requests and accepted)
    await supabase
      .from('friends')
      .delete()
      .or(
        `and(user_id.eq.${currentUserId},friend_id.eq.${blockedUserId}),` +
        `and(user_id.eq.${blockedUserId},friend_id.eq.${currentUserId})`,
      );

    // Clean up friend_badges and expire friend_suggestions in parallel
    await Promise.all([
      supabase
        .from('friend_badges')
        .delete()
        .or(`and(giver_id.eq.${currentUserId},receiver_id.eq.${blockedUserId}),and(giver_id.eq.${blockedUserId},receiver_id.eq.${currentUserId})`),
      supabase
        .from('friend_suggestions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('user_a_id', u1)
        .eq('user_b_id', u2)
        .in('status', ['queued', 'stashed']),
    ]);

    logger.info(`[Supabase] User ${currentUserId} blocked ${blockedUserId} (proposals cancelled, matches ended, friendship removed)`);
    return { ok: true };
  } catch (error: unknown) {
    logger.error('blockUser error:', error);
    return createErrorResponse('BLOCK_ERROR', error instanceof Error ? error.message : 'Failed to block user');
  }
};

/**
 * Unblock a user.
 */
export const unblockUser = async (
  blockedUserId: string,
): Promise<ApiResponse<void>> => {
  try {
    if (!blockedUserId) {
      return createErrorResponse('INVALID_INPUT', 'Blocked user ID is required');
    }

    assertUuid(blockedUserId, 'blockedUserId');

    const currentUserId = await getCurrentUserId();

    // Verify block exists before deleting (prevents silent no-ops on race conditions)
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('blocked_user_id', blockedUserId)
      .maybeSingle();

    if (!existing) {
      return createErrorResponse('NOT_BLOCKED', 'User is not blocked');
    }

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', currentUserId)
      .eq('blocked_user_id', blockedUserId);

    if (error) throw error;

    logger.info(`[Supabase] User ${currentUserId} unblocked ${blockedUserId}`);
    return { ok: true };
  } catch (error: unknown) {
    logger.error('unblockUser error:', error);
    return createErrorResponse('UNBLOCK_ERROR', error instanceof Error ? error.message : 'Failed to unblock user');
  }
};

/**
 * Get the list of users blocked by the current user.
 */
export const getBlockedUsers = async (): Promise<ApiResponse<BlockedUser[]>> => {
  try {
    const currentUserId = await getCurrentUserId();

    const { data: blocks, error: blocksError } = await supabase
      .from('blocked_users')
      .select('id, user_id, blocked_user_id, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (blocksError) throw blocksError;

    if (!blocks || blocks.length === 0) {
      return { ok: true, data: [] };
    }

    const blockedUserIds = blocks.map((b) => b.blocked_user_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, age, photos')
      .in('user_id', blockedUserIds);

    if (profilesError) throw profilesError;

    const result: BlockedUser[] = blocks.map((block) => {
      const p = (profiles || []).find((x) => x.user_id === block.blocked_user_id);
      return {
        id: block.id,
        userId: block.user_id,
        blockedUserId: block.blocked_user_id,
        blockedAt: block.created_at,
        blockedUserProfile: p
          ? ({
              id: p.id,
              userId: p.user_id,
              firstName: p.first_name,
              lastName: p.last_name,
              age: p.age,
              photos: (tryParseJSON(p.photos) as Photo[] | null) ?? [],
            } as Partial<UserProfile>)
          : undefined,
      };
    });

    return { ok: true, data: result };
  } catch (error: unknown) {
    logger.error('getBlockedUsers error:', error);
    return createErrorResponse('FETCH_BLOCKED_ERROR', error instanceof Error ? error.message : 'Failed to fetch blocked users');
  }
};

/**
 * Get the set of user IDs blocked by a given user.
 */
export const getBlockedUserIds = async (
  userId: string,
): Promise<string[]> => {
  try {
    assertUuid(userId, 'userId');

    // Fetch both directions in parallel for bidirectional exclusion
    const [{ data: outgoing, error: error1 }, { data: incoming, error: error2 }] = await Promise.all([
      supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', userId),
      supabase
        .from('blocked_users')
        .select('user_id')
        .eq('blocked_user_id', userId),
    ]);

    if (error1 || error2) throw error1 || error2;

    const outIds = (outgoing ?? []).map((r) => r.blocked_user_id);
    const inIds = (incoming ?? []).map((r) => r.user_id);
    return [...new Set([...outIds, ...inIds])];
  } catch (error) {
    logger.error('getBlockedUserIds error:', error);
    return [];
  }
};
