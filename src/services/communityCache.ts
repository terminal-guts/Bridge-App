/**
 * Community Cache — Persistent Stale-While-Revalidate Cache
 *
 * Provides sub-second cold opens for the Community screen by caching
 * friends data, photo signed URLs, and voting gate state in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityCache');

// Storage keys
const KEY_FRIENDS_DATA = '@bridge:cache:friends_data';
const KEY_PHOTO_URLS = '@bridge:cache:photo_urls';
const KEY_VOTING_GATE = '@bridge:cache:voting_gate';

// TTLs
const FRIENDS_DATA_TTL_MS = 5 * 60 * 1000;    // 5 minutes
const PHOTO_URL_TTL_MS = 20 * 60 * 60 * 1000;  // 20 hours (signed URLs valid 24h)
const VOTING_GATE_TTL_MS = 25 * 60 * 60 * 1000; // 25 hours (one full cycle + buffer)

interface CacheEntry<T> {
  data: T;
  ts: number;
  cycleId?: string; // for voting gate: identifies the 7PM cycle
}

async function getEntry<T>(key: string, ttlMs: number): Promise<{ data: T; stale: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.ts;
    return { data: entry.data, stale: age > ttlMs };
  } catch {
    return null;
  }
}

async function setEntry<T>(key: string, data: T, cycleId?: string): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now(), cycleId };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache write failure is non-critical
  }
}

// ============================================================================
// Friends Data Cache (stale-while-revalidate)
// ============================================================================

// In-memory mirror — avoids AsyncStorage reads on hot path (tab switches)
let inMemoryFriendsData: { data: unknown; ts: number } | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cached DB data has dynamic shape
export async function getCachedFriendsData(): Promise<any | null> {
  // Return in-memory mirror instantly if fresh
  if (inMemoryFriendsData && (Date.now() - inMemoryFriendsData.ts) < FRIENDS_DATA_TTL_MS) {
    return inMemoryFriendsData.data;
  }
  const entry = await getEntry<unknown>(KEY_FRIENDS_DATA, FRIENDS_DATA_TTL_MS);
  if (!entry) return null;
  // Warm the in-memory mirror
  inMemoryFriendsData = { data: entry.data, ts: Date.now() };
  // Return even if stale — caller will revalidate in background
  return entry.data;
}

export async function setCachedFriendsData(data: unknown): Promise<void> {
  inMemoryFriendsData = { data, ts: Date.now() };
  await setEntry(KEY_FRIENDS_DATA, data);
}

export async function invalidateCachedFriendsData(): Promise<void> {
  inMemoryFriendsData = null;
  try {
    await AsyncStorage.removeItem(KEY_FRIENDS_DATA);
  } catch { /* non-critical */ }
}

// ============================================================================
// Photo Signed URL Cache
// ============================================================================

// In-memory mirror of photo URL cache — avoids AsyncStorage reads on hot path
let inMemoryPhotoUrls: Record<string, string> | null = null;

/** Get cached signed URL map (storagePath → signedUrl) */
export async function getCachedPhotoUrls(): Promise<Record<string, string>> {
  // Return in-memory mirror instantly if available
  if (inMemoryPhotoUrls) return inMemoryPhotoUrls;

  const entry = await getEntry<Record<string, string>>(KEY_PHOTO_URLS, PHOTO_URL_TTL_MS);
  if (!entry || entry.stale) return {};
  inMemoryPhotoUrls = entry.data;
  return entry.data;
}

/** Merge new signed URLs into the cache */
export async function mergeCachedPhotoUrls(newUrls: Record<string, string>): Promise<void> {
  const existing = inMemoryPhotoUrls || await getCachedPhotoUrls();
  const merged = { ...existing, ...newUrls };
  inMemoryPhotoUrls = merged;
  await setEntry(KEY_PHOTO_URLS, merged);
}

/** Invalidate the in-memory and AsyncStorage photo URL cache */
export async function invalidateCachedPhotoUrls(): Promise<void> {
  inMemoryPhotoUrls = null;
  try {
    await AsyncStorage.removeItem(KEY_PHOTO_URLS);
  } catch { /* non-critical */ }
}

// ============================================================================
// Voting Gate Cache
// ============================================================================

// In-memory mirror for voting gate
let inMemoryVotingGate: { completed: boolean; cycleId: string } | null = null;

/**
 * Check if the user has already completed voting for the current cycle.
 * Returns true if cached as completed, false if cached as not completed, null if no cache.
 */
export async function getCachedVotingGate(currentCycleId: string): Promise<boolean | null> {
  // Check in-memory first — instant
  if (inMemoryVotingGate && inMemoryVotingGate.cycleId === currentCycleId) {
    // Return the cached value directly so callers can distinguish a cached
    // false ("not completed") from a cache miss (null) and avoid re-fetching.
    return inMemoryVotingGate.completed;
  }
  try {
    const raw = await AsyncStorage.getItem(KEY_VOTING_GATE);
    if (!raw) return null;
    const entry: CacheEntry<boolean> = JSON.parse(raw);
    // Only trust cache if it's for the current cycle
    if (entry.cycleId !== currentCycleId) return null;
    // Warm in-memory mirror
    inMemoryVotingGate = { completed: entry.data, cycleId: currentCycleId };
    return entry.data;
  } catch {
    return null;
  }
}

/** Mark voting as completed for the current cycle */
export async function setCachedVotingGate(completed: boolean, cycleId: string): Promise<void> {
  inMemoryVotingGate = { completed, cycleId };
  await setEntry(KEY_VOTING_GATE, completed, cycleId);
}

// ============================================================================
// Batch Preload — single multiGet round-trip on cold launch
// ============================================================================

/**
 * Read all three community cache keys in one AsyncStorage round-trip.
 * Call this once after auth is confirmed (before CommunityScreen mounts) so
 * subsequent individual reads always hit the in-memory mirrors instead of disk.
 */
export async function preloadCommunityCache(): Promise<void> {
  // Skip if all mirrors are already warm (hot restart / fast refresh)
  if (inMemoryFriendsData && inMemoryPhotoUrls && inMemoryVotingGate) return;

  try {
    const results = await AsyncStorage.multiGet([
      KEY_FRIENDS_DATA,
      KEY_PHOTO_URLS,
      KEY_VOTING_GATE,
    ]);

    const [friendsRaw, photoUrlsRaw, votingGateRaw] = results.map(r => r[1]);

    if (friendsRaw && !inMemoryFriendsData) {
      try {
        const entry: CacheEntry<unknown> = JSON.parse(friendsRaw);
        const age = Date.now() - entry.ts;
        if (age < FRIENDS_DATA_TTL_MS) {
          inMemoryFriendsData = { data: entry.data, ts: Date.now() };
        }
      } catch { /* corrupt entry — ignore */ }
    }

    if (photoUrlsRaw && !inMemoryPhotoUrls) {
      try {
        const entry: CacheEntry<Record<string, string>> = JSON.parse(photoUrlsRaw);
        const age = Date.now() - entry.ts;
        if (age < PHOTO_URL_TTL_MS) {
          inMemoryPhotoUrls = entry.data;
        }
      } catch { /* corrupt entry — ignore */ }
    }

    if (votingGateRaw && !inMemoryVotingGate) {
      try {
        const entry: CacheEntry<boolean> = JSON.parse(votingGateRaw);
        if (entry.data && entry.cycleId) {
          inMemoryVotingGate = { completed: entry.data, cycleId: entry.cycleId };
        }
      } catch { /* corrupt entry — ignore */ }
    }
  } catch {
    // Non-critical — individual reads will fall back to AsyncStorage if needed
  }
}
