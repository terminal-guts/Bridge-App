/**
 * Block Service — Mock + Supabase Implementation
 *
 * Handles user blocking and unblocking functionality.
 * Enforces bidirectional exclusion: if A blocks B, neither A→B
 * nor B→A matches, grids, or proposals will ever be surfaced.
 *
 * ARCHITECTURE:
 * - In-memory mock store is used when Supabase is not connected or
 *   when auth is unavailable (e.g., early dev / offline testing).
 * - When Supabase IS connected, all reads/writes go to the
 *   `blocked_users` table.
 *
 * TODO (Production — Supabase wiring):
 * 1. Run the migration to create the `blocked_users` table:
 *      CREATE TABLE blocked_users (
 *        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *        user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *        blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *        reason      TEXT,
 *        blocked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
 *        UNIQUE(user_id, blocked_user_id)
 *      );
 *      -- RLS: user can only see/insert/delete their own rows
 *      ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
 *      CREATE POLICY "own_blocks" ON blocked_users USING (user_id = auth.uid());
 *
 * 2. Remove the MOCK_MODE flag below and delete the in-memory store.
 *
 * 3. In communityService.ts — integrate isUserPairBlocked() into:
 *    a) getTodaysGrid(): filter blocked users from anchor/candidates.
 *    b) getProposalsToVote(): skip proposals where either party has blocked the other.
 *    c) getPendingMatchProposals(): hide proposals from blocked users.
 *
 * MATCHING ENFORCEMENT (mock-layer):
 * - Use `getBlockedUserIds(userId)` to get all IDs blocked by a user.
 * - Use `isUserPairBlocked(userAId, userBId)` to check bidirectionality.
 * - Filter any grid/proposal/match list against these sets before returning
 *   them to the UI.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, UserProfile } from '../types';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('BlockService');

// ============================================================================
// IN-MEMORY MOCK STORE
// ============================================================================

/**
 * In-memory store for blocked users.
 * Key: blockerId, Value: array of block records.
 *
 * TODO (Production): Remove entirely when Supabase is wired.
 */
interface MockBlockRecord {
  id: string;
  userId: string;           // the person who did the blocking
  blockedUserId: string;    // the person who was blocked
  reason?: string;
  blockedAt: string;
}

const _mockBlockStore: Map<string, MockBlockRecord[]> = new Map();

/**
 * Determine whether to use the mock store or Supabase.
 * Falls back to mock if Supabase auth is unavailable.
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns MOCK_USER_ID for operations when Supabase is not connected.
 */
const MOCK_CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';

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
  reason?: string;
  blockedAt: string;
  blockedUserProfile?: Partial<UserProfile>;
}

// ============================================================================
// HELPER
// ============================================================================

const createErrorResponse = (code: string, message: string): ApiResponse<any> => ({
  ok: false,
  error: { code, message },
});

// ============================================================================
// CORE BLOCK OPERATIONS
// ============================================================================

/**
 * Block a user.
 *
 * Bidirectional enforcement: After this call, getBlockedUserIds() for EITHER
 * party will include the other, and isUserPairBlocked() will return true.
 *
 * TODO (Production): Insert into Supabase `blocked_users` table. The
 * bidirectionality check at query time (using OR in the WHERE clause) is
 * sufficient — no need to insert two rows.
 */
export const blockUser = async (
  blockedUserId: string,
  reason?: string,
): Promise<ApiResponse<void>> => {
  try {
    if (!blockedUserId) {
      return createErrorResponse('INVALID_INPUT', 'Blocked user ID is required');
    }

    const supabaseUserId = await getCurrentUserId();

    // ── SUPABASE PATH ──────────────────────────────────────────────────────
    if (supabaseUserId) {
      if (supabaseUserId === blockedUserId) {
        return createErrorResponse('CANNOT_BLOCK_SELF', 'Cannot block yourself');
      }

      // Check if already blocked
      const { data: existing } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', supabaseUserId)
        .eq('blocked_user_id', blockedUserId)
        .single();

      if (existing) {
        return createErrorResponse('ALREADY_BLOCKED', 'User is already blocked');
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: supabaseUserId,
          blocked_user_id: blockedUserId,
          reason: reason ?? null,
        });

      if (error) {
        // If Supabase fails (e.g., table doesn't exist), fall through to mock
        logger.warn('Supabase block failed, using mock store:', error.message);
      } else {
        logger.info(`[Supabase] User ${supabaseUserId} blocked ${blockedUserId}`);
        return { ok: true };
      }
    }

    // ── MOCK PATH ──────────────────────────────────────────────────────────
    const userId = supabaseUserId ?? MOCK_CURRENT_USER_ID;

    if (userId === blockedUserId) {
      return createErrorResponse('CANNOT_BLOCK_SELF', 'Cannot block yourself');
    }

    const existing = (_mockBlockStore.get(userId) ?? []).find(
      b => b.blockedUserId === blockedUserId,
    );
    if (existing) {
      return createErrorResponse('ALREADY_BLOCKED', 'User is already blocked');
    }

    const record: MockBlockRecord = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      blockedUserId,
      reason,
      blockedAt: new Date().toISOString(),
    };

    const current = _mockBlockStore.get(userId) ?? [];
    _mockBlockStore.set(userId, [...current, record]);

    logger.info(`[Mock] User ${userId} blocked ${blockedUserId}`);
    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('BLOCK_ERROR', error.message || 'Failed to block user');
  }
};

/**
 * Unblock a user.
 *
 * TODO (Production): Delete from Supabase `blocked_users` WHERE
 * user_id = auth.uid() AND blocked_user_id = blockedUserId.
 */
export const unblockUser = async (
  blockedUserId: string,
): Promise<ApiResponse<void>> => {
  try {
    if (!blockedUserId) {
      return createErrorResponse('INVALID_INPUT', 'Blocked user ID is required');
    }

    const supabaseUserId = await getCurrentUserId();

    // ── SUPABASE PATH ──────────────────────────────────────────────────────
    if (supabaseUserId) {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', supabaseUserId)
        .eq('blocked_user_id', blockedUserId);

      if (!error) {
        logger.info(`[Supabase] User ${supabaseUserId} unblocked ${blockedUserId}`);
        return { ok: true };
      }
      logger.warn('Supabase unblock failed, using mock store:', error.message);
    }

    // ── MOCK PATH ──────────────────────────────────────────────────────────
    const userId = supabaseUserId ?? MOCK_CURRENT_USER_ID;
    const current = _mockBlockStore.get(userId) ?? [];
    _mockBlockStore.set(
      userId,
      current.filter(b => b.blockedUserId !== blockedUserId),
    );

    logger.info(`[Mock] User ${userId} unblocked ${blockedUserId}`);
    return { ok: true };
  } catch (error: any) {
    return createErrorResponse('UNBLOCK_ERROR', error.message || 'Failed to unblock user');
  }
};

/**
 * Get the list of users blocked by the current user.
 *
 * TODO (Production): Query Supabase `blocked_users` WHERE user_id = auth.uid(),
 * JOIN with `user_profiles` to populate blockedUserProfile.
 */
export const getBlockedUsers = async (): Promise<ApiResponse<BlockedUser[]>> => {
  try {
    const supabaseUserId = await getCurrentUserId();

    // ── SUPABASE PATH ──────────────────────────────────────────────────────
    if (supabaseUserId) {
      const { data: blocks, error: blocksError } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('blocked_at', { ascending: false });

      if (!blocksError && blocks) {
        const blockedUserIds = blocks.map((b: any) => b.blocked_user_id);

        let profiles: any[] = [];
        if (blockedUserIds.length > 0) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('id, user_id, first_name, last_name, age, photos')
            .in('user_id', blockedUserIds);
          profiles = profileData ?? [];
        }

        const result: BlockedUser[] = blocks.map((block: any) => {
          const p = profiles.find((x: any) => x.user_id === block.blocked_user_id);
          return {
            id: block.id,
            userId: block.user_id,
            blockedUserId: block.blocked_user_id,
            reason: block.reason,
            blockedAt: block.blocked_at,
            blockedUserProfile: p
              ? ({
                  id: p.id,
                  userId: p.user_id,
                  firstName: p.first_name,
                  lastName: p.last_name,
                  age: p.age,
                  photos: tryParseJSON(p.photos) ?? [],
                } as Partial<UserProfile>)
              : undefined,
          };
        });

        return { ok: true, data: result };
      }
      logger.warn('Supabase getBlockedUsers failed, using mock store:', blocksError?.message);
    }

    // ── MOCK PATH ──────────────────────────────────────────────────────────
    const userId = supabaseUserId ?? MOCK_CURRENT_USER_ID;
    const records = _mockBlockStore.get(userId) ?? [];

    const result: BlockedUser[] = records.map(r => ({
      id: r.id,
      userId: r.userId,
      blockedUserId: r.blockedUserId,
      reason: r.reason,
      blockedAt: r.blockedAt,
      blockedUserProfile: undefined, // No profile data in mock store
    }));

    return { ok: true, data: result };
  } catch (error: any) {
    return createErrorResponse('FETCH_BLOCKED_ERROR', error.message || 'Failed to fetch blocked users');
  }
};

/**
 * Check if the current user has blocked a specific user.
 *
 * TODO (Production): SELECT id FROM blocked_users WHERE
 * user_id = auth.uid() AND blocked_user_id = targetUserId LIMIT 1.
 */
export const isUserBlocked = async (
  targetUserId: string,
): Promise<ApiResponse<boolean>> => {
  try {
    if (!targetUserId) {
      return createErrorResponse('INVALID_INPUT', 'Target user ID is required');
    }

    const supabaseUserId = await getCurrentUserId();

    if (supabaseUserId) {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', supabaseUserId)
        .eq('blocked_user_id', targetUserId)
        .single();

      if (!error || error.code === 'PGRST116') {
        return { ok: true, data: !!data };
      }
      logger.warn('Supabase isUserBlocked failed, using mock store:', error.message);
    }

    // ── MOCK PATH ──────────────────────────────────────────────────────────
    const userId = supabaseUserId ?? MOCK_CURRENT_USER_ID;
    const records = _mockBlockStore.get(userId) ?? [];
    const isBlocked = records.some(r => r.blockedUserId === targetUserId);

    return { ok: true, data: isBlocked };
  } catch (error: any) {
    return createErrorResponse('CHECK_BLOCKED_ERROR', error.message || 'Failed to check block status');
  }
};

/**
 * Check if either user has blocked the other (bidirectional check).
 *
 * This is the key function used in matching logic:
 *   - If isUserPairBlocked(A, B) returns true, A and B must NEVER
 *     appear together in any grid, proposal, or match.
 *
 * TODO (Production): SELECT id FROM blocked_users WHERE
 *   (user_id = A AND blocked_user_id = B)
 *   OR (user_id = B AND blocked_user_id = A)
 *   LIMIT 1.
 */
export const isUserPairBlocked = async (
  userAId: string,
  userBId: string,
): Promise<ApiResponse<boolean>> => {
  try {
    if (!userAId || !userBId) {
      return createErrorResponse('INVALID_INPUT', 'Both user IDs are required');
    }

    const supabaseUserId = await getCurrentUserId();

    if (supabaseUserId) {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .or(
          `and(user_id.eq.${userAId},blocked_user_id.eq.${userBId}),` +
          `and(user_id.eq.${userBId},blocked_user_id.eq.${userAId})`,
        );

      if (!error) {
        return { ok: true, data: !!data && data.length > 0 };
      }
      logger.warn('Supabase isUserPairBlocked failed, using mock store:', error.message);
    }

    // ── MOCK PATH ──────────────────────────────────────────────────────────
    const aBlockedB = (_mockBlockStore.get(userAId) ?? []).some(
      r => r.blockedUserId === userBId,
    );
    const bBlockedA = (_mockBlockStore.get(userBId) ?? []).some(
      r => r.blockedUserId === userAId,
    );

    return { ok: true, data: aBlockedB || bBlockedA };
  } catch (error: any) {
    return createErrorResponse('CHECK_PAIR_BLOCKED_ERROR', error.message || 'Failed to check pair block status');
  }
};

/**
 * Get the set of user IDs blocked by a given user.
 * Used by matching logic to filter candidate/anchor lists.
 *
 * Returns both directions — IDs that userId has blocked AND IDs that have blocked userId.
 * This ensures total exclusion regardless of which direction the block was placed.
 *
 * TODO (Production): Replace with a Supabase RPC function or two queries:
 *   1. SELECT blocked_user_id FROM blocked_users WHERE user_id = userId
 *   2. SELECT user_id FROM blocked_users WHERE blocked_user_id = userId
 *   Union the two result sets.
 */
export const getBlockedUserIds = async (
  userId: string,
): Promise<string[]> => {
  try {
    const supabaseUserId = await getCurrentUserId();

    if (supabaseUserId) {
      const { data: outgoing } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', userId);

      const { data: incoming } = await supabase
        .from('blocked_users')
        .select('user_id')
        .eq('blocked_user_id', userId);

      if (outgoing !== null && incoming !== null) {
        const outIds = (outgoing ?? []).map((r: any) => r.blocked_user_id);
        const inIds = (incoming ?? []).map((r: any) => r.user_id);
        return [...new Set([...outIds, ...inIds])];
      }
      logger.warn('Supabase getBlockedUserIds failed, falling back to mock store');
    }

    // ── MOCK PATH ──────────────────────────────────────────────────────────
    // Blocks placed BY userId
    const outgoing = (_mockBlockStore.get(userId) ?? []).map(r => r.blockedUserId);

    // Blocks placed AGAINST userId (check every other user's block list)
    const incoming: string[] = [];
    _mockBlockStore.forEach((records, blockerId) => {
      if (blockerId !== userId) {
        if (records.some(r => r.blockedUserId === userId)) {
          incoming.push(blockerId);
        }
      }
    });

    return [...new Set([...outgoing, ...incoming])];
  } catch {
    return [];
  }
};

/**
 * Get the count of users blocked by the current user.
 *
 * TODO (Production): SELECT COUNT(*) FROM blocked_users WHERE user_id = auth.uid().
 */
export const getBlockedUsersCount = async (): Promise<ApiResponse<number>> => {
  try {
    const supabaseUserId = await getCurrentUserId();

    if (supabaseUserId) {
      const { count, error } = await supabase
        .from('blocked_users')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', supabaseUserId);

      if (!error) {
        return { ok: true, data: count ?? 0 };
      }
      logger.warn('Supabase getBlockedUsersCount failed, using mock store:', error.message);
    }

    const userId = supabaseUserId ?? MOCK_CURRENT_USER_ID;
    const records = _mockBlockStore.get(userId) ?? [];
    return { ok: true, data: records.length };
  } catch (error: any) {
    return createErrorResponse('COUNT_BLOCKED_ERROR', error.message || 'Failed to count blocked users');
  }
};

// ============================================================================
// LEGACY ALIAS (backward compat)
// ============================================================================

/**
 * @deprecated Use isUserPairBlocked() instead.
 */
export const isMutuallyBlocked = isUserPairBlocked;

// ============================================================================
// HELPERS
// ============================================================================

function tryParseJSON(json: any): any {
  if (!json) return null;
  if (typeof json === 'object') return json;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
