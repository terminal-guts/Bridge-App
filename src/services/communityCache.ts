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

export async function getCachedFriendsData(): Promise<any | null> {
  const entry = await getEntry<any>(KEY_FRIENDS_DATA, FRIENDS_DATA_TTL_MS);
  if (!entry) return null;
  // Return even if stale — caller will revalidate in background
  return entry.data;
}

export async function setCachedFriendsData(data: any): Promise<void> {
  await setEntry(KEY_FRIENDS_DATA, data);
}

export async function invalidateCachedFriendsData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_FRIENDS_DATA);
  } catch { /* non-critical */ }
}

// ============================================================================
// Photo Signed URL Cache
// ============================================================================

/** Get cached signed URL map (storagePath → signedUrl) */
export async function getCachedPhotoUrls(): Promise<Record<string, string>> {
  const entry = await getEntry<Record<string, string>>(KEY_PHOTO_URLS, PHOTO_URL_TTL_MS);
  if (!entry || entry.stale) return {};
  return entry.data;
}

/** Merge new signed URLs into the cache */
export async function mergeCachedPhotoUrls(newUrls: Record<string, string>): Promise<void> {
  const existing = await getCachedPhotoUrls();
  const merged = { ...existing, ...newUrls };
  await setEntry(KEY_PHOTO_URLS, merged);
}

// ============================================================================
// Voting Gate Cache
// ============================================================================

/**
 * Check if the user has already completed voting for the current cycle.
 * Returns true if cached as completed, false if cached as not completed, null if no cache.
 */
export async function getCachedVotingGate(currentCycleId: string): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_VOTING_GATE);
    if (!raw) return null;
    const entry: CacheEntry<boolean> = JSON.parse(raw);
    // Only trust cache if it's for the current cycle
    if (entry.cycleId !== currentCycleId) return null;
    // Only trust a "completed" cache — "not completed" should always recheck
    if (!entry.data) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** Mark voting as completed for the current cycle */
export async function setCachedVotingGate(completed: boolean, cycleId: string): Promise<void> {
  await setEntry(KEY_VOTING_GATE, completed, cycleId);
}
