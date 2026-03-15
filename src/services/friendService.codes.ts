/**
 * Friend Service - Friend code operations
 *
 * Extracted from friendService.ts for file-size management.
 * Contains: getUserFriendCode, createFriendCode, getFriendCodeByUserId,
 * getFriendCodesByUserIds, sendFriendRequestByCode, and mock code generation.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createLogger('FriendService');

/**
 * Friend Code data structure
 */
export interface FriendCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

const createErrorResponse = <T>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

/**
 * Generate a mock friend code in BRIDGE-XXXX-XXXX format
 */
const generateMockFriendCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes I, O, 0, 1 for clarity
  let code = 'BRIDGE-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Get or create a stable mock friend code for a user.
 * Persists the generated code to AsyncStorage so the same user always sees
 * the same code even when the Supabase database is unavailable (mock/dev mode).
 */
const getOrCreateStableMockCode = async (userId: string): Promise<string> => {
  const storageKey = `mock_friend_code_${userId}`;
  try {
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached) return cached;
    const newCode = generateMockFriendCode();
    await AsyncStorage.setItem(storageKey, newCode);
    return newCode;
  } catch {
    // If AsyncStorage is unavailable, fall back to a deterministic code derived
    // from the userId so it is at least consistent within the same session.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let hash = 5381;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash * 33) ^ userId.charCodeAt(i)) >>> 0;
    }
    let fallback = 'BRIDGE-';
    for (let i = 0; i < 4; i++) {
      fallback += chars[((hash >>> (i * 4)) ^ (hash * (i + 3))) % chars.length];
    }
    fallback += '-';
    for (let i = 0; i < 4; i++) {
      fallback += chars[((hash >>> ((i + 4) * 4)) ^ (hash * (i + 7))) % chars.length];
    }
    return fallback;
  }
};

/**
 * Get the current user's friend code
 * SECURITY FIX: Gets userId from authenticated session, not from client
 * Cached permanently — friend codes never change once created.
 */
let friendCodeCache: ApiResponse<FriendCode> | null = null;

export const getUserFriendCode = async (): Promise<ApiResponse<FriendCode>> => {
  if (friendCodeCache) return friendCodeCache;
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('friend_codes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If user doesn't have a friend code yet, create one
      if (error.code === 'PGRST116') {
        return await createFriendCode(userId);
      }

      // FRONTEND MOCK: If database query fails, return a stable mock code
      logger.warn('Friend code fetch failed, returning mock code:', error.message);
      const mockCode = await getOrCreateStableMockCode(userId);
      const mockResult: ApiResponse<FriendCode> = {
        ok: true,
        data: {
          id: 'mock-id',
          userId: userId,
          code: mockCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      friendCodeCache = mockResult;
      return mockResult;
    }

    const result: ApiResponse<FriendCode> = {
      ok: true,
      data: {
        id: data.id,
        userId: data.user_id,
        code: data.code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
    friendCodeCache = result;
    return result;
  } catch (error: unknown) {
    // FRONTEND MOCK: If anything fails, return a stable mock code
    logger.warn('Friend code operation failed, returning mock code:', error instanceof Error ? error.message : String(error));
    let stableCode: string;
    try {
      const uid = await requireAuth();
      stableCode = await getOrCreateStableMockCode(uid);
      const catchResult: ApiResponse<FriendCode> = {
        ok: true,
        data: {
          id: 'mock-id',
          userId: uid,
          code: stableCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      friendCodeCache = catchResult;
      return catchResult;
    } catch {
      stableCode = generateMockFriendCode();
      return {
        ok: true,
        data: {
          id: 'mock-id',
          userId: 'unknown',
          code: stableCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }
  }
};

/**
 * Create a friend code for a user (called automatically on signup via trigger)
 */
const createFriendCode = async (userId: string): Promise<ApiResponse<FriendCode>> => {
  const codeData = generateMockFriendCode();
  try {
    const { data, error } = await supabase
      .from('friend_codes')
      .insert({
        user_id: userId,
        code: codeData,
      })
      .select()
      .single();

    if (error) {
      logger.warn('Friend code insert failed, returning mock code:', error.message);
      return {
        ok: true,
        data: {
          id: 'mock-id',
          userId: userId,
          code: codeData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        userId: data.user_id,
        code: data.code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: unknown) {
    logger.warn('Friend code creation failed, returning mock code:', error instanceof Error ? error.message : String(error));
    return {
      ok: true,
      data: {
        id: 'mock-id',
        userId: userId,
        code: codeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
};

// ============================================================================
// Friend Code Lookups (used by ContactInviteScreen)
// ============================================================================

/**
 * Look up a single user's friend code by their user_id.
 * Returns the code string or null if not found.
 */
export const getFriendCodeByUserId = async (userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('friend_codes')
    .select('code')
    .eq('user_id', userId)
    .single();
  return data?.code ?? null;
};

/**
 * Look up friend codes for multiple user IDs in a single query.
 * Returns a Map of userId -> code.
 */
export const getFriendCodesByUserIds = async (userIds: string[]): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  if (userIds.length === 0) return result;

  const { data } = await supabase
    .from('friend_codes')
    .select('user_id, code')
    .in('user_id', userIds);

  for (const row of data || []) {
    result.set(row.user_id, row.code);
  }
  return result;
};

/**
 * Send a friend request via the send_friend_request RPC.
 * Lightweight version for use by ContactInviteScreen auto-add.
 * Returns { success, wasAutoAccepted, message }.
 */
export const sendFriendRequestByCode = async (
  code: string
): Promise<{ success: boolean; wasAutoAccepted?: boolean; message?: string }> => {
  const { data, error } = await supabase
    .rpc('send_friend_request', { friend_code: code.toUpperCase() });
  const row = data?.[0];
  if (error) {
    return { success: false, message: error.message };
  }
  return {
    success: !!row?.success || !!row?.message?.includes('already friends'),
    wasAutoAccepted: row?.was_auto_accepted,
    message: row?.message,
  };
};
