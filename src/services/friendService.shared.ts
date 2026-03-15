/**
 * Friend Service - Shared types and utilities
 *
 * Shared between friendService.ts and friendService.requests.ts
 * to avoid circular dependencies.
 */

import { UserProfile } from '../types';

/**
 * Add friend result
 */
export interface AddFriendResult {
  friendUserId: string;
  friendProfile?: UserProfile;
  wasAutoAccepted?: boolean;
  requestId?: string;
}

// ============================================================================
// Friend Count Cache
// ============================================================================

let friendCountCache: { value: number; at: number } | null = null;
export const FRIEND_COUNT_TTL = 60_000; // 60 seconds

/** Invalidate the friend count cache — called by sub-modules after mutations. */
export function invalidateFriendCountCache(): void {
  friendCountCache = null;
}

/** Get cached friend count (or null if stale/missing). */
export function getCachedFriendCount(): number | null {
  if (friendCountCache && Date.now() - friendCountCache.at < FRIEND_COUNT_TTL) {
    return friendCountCache.value;
  }
  return null;
}

/** Set the friend count cache. */
export function setCachedFriendCount(value: number): void {
  friendCountCache = { value, at: Date.now() };
}
