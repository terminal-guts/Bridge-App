import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('leaderboardService');

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  weeklyKarma: number;
  rank: number;
  rankChange: number;
  photoUrl: string | null;
  isFriend: boolean;
  isAnonymous?: boolean;
}

export interface LeaderboardCurrentUser extends LeaderboardEntry {
  spotsBehindFirst: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardCurrentUser | null;
  weekStart: string;
  totalParticipants: number;
}

type FetchResult = { ok: true; data: LeaderboardResponse } | { ok: false; error: string };

// ── Client-side cache ────────────────────────────────────────────────────────
// 10-minute TTL: leaderboard only updates once/week so this is very conservative.
const CACHE_KEY = 'bridge_leaderboard_v2';
const CACHE_TTL_MS = 10 * 60 * 1000;

// In-memory mirror to avoid AsyncStorage round-trip on repeated navigations
let memCache: { data: LeaderboardResponse; ts: number } | null = null;

async function getCachedLeaderboard(): Promise<{ data: LeaderboardResponse; stale: boolean } | null> {
  // Check memory first
  if (memCache) {
    return { data: memCache.data, stale: Date.now() - memCache.ts > CACHE_TTL_MS };
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: { data: LeaderboardResponse; ts: number } = JSON.parse(raw);
    memCache = parsed;
    return { data: parsed.data, stale: Date.now() - parsed.ts > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

function setCachedLeaderboard(data: LeaderboardResponse): void {
  const entry = { data, ts: Date.now() };
  memCache = entry;
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
}

/** Clear cache (call on sign-out or pull-to-refresh). */
export function invalidateLeaderboardCache(): void {
  memCache = null;
  AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}

// ── Network fetch ────────────────────────────────────────────────────────────

async function fetchFromNetwork(limit: number): Promise<FetchResult> {
  try {
    const { data, error } = await supabase.functions.invoke('get-leaderboard', {
      body: { limit },
    });

    if (error) {
      logger.error('Edge function error:', error);
      return { ok: false, error: error.message || 'Failed to fetch leaderboard' };
    }

    if (data?.error) {
      logger.error('Leaderboard API error:', data.error);
      return { ok: false, error: data.error };
    }

    return { ok: true, data: data as LeaderboardResponse };
  } catch (err: unknown) {
    logger.error('fetchLeaderboard exception:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Fetch leaderboard with stale-while-revalidate semantics.
 *
 * - Fresh cache  → return immediately, no network call
 * - Stale cache  → return immediately + fire background refresh
 * - No cache     → fetch from network (shows skeleton on first ever load)
 *
 * @param onBackgroundUpdate  Called when a background refresh completes with new data.
 *                            Use this to silently update the UI after first render.
 */
export async function fetchLeaderboard(
  limit = 50,
  onBackgroundUpdate?: (data: LeaderboardResponse) => void,
): Promise<FetchResult> {
  const cached = await getCachedLeaderboard();

  if (cached) {
    if (!cached.stale) {
      // Fresh — return immediately
      return { ok: true, data: cached.data };
    }

    // Stale — return immediately and refresh in background
    fetchFromNetwork(limit).then(result => {
      if (result.ok) {
        setCachedLeaderboard(result.data);
        onBackgroundUpdate?.(result.data);
      }
    }).catch(() => {});

    return { ok: true, data: cached.data };
  }

  // No cache — must fetch (first ever load)
  const result = await fetchFromNetwork(limit);
  if (result.ok) setCachedLeaderboard(result.data);
  return result;
}
