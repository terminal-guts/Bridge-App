/**
 * Tests for communityCache service
 */

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
}));

jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedFriendsData,
  setCachedFriendsData,
  invalidateCachedFriendsData,
  getCachedPhotoUrls,
  mergeCachedPhotoUrls,
  getCachedVotingGate,
  setCachedVotingGate,
} from '../../src/services/communityCache';

// Storage keys (must match the source)
const KEY_FRIENDS_DATA = '@bridge:cache:friends_data';
const KEY_PHOTO_URLS = '@bridge:cache:photo_urls';
const KEY_VOTING_GATE = '@bridge:cache:voting_gate';

beforeEach(() => {
  // Clear mock storage
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  jest.clearAllMocks();
});

// ============================================================================
// getCachedFriendsData
// ============================================================================

describe('getCachedFriendsData', () => {
  it('returns null when no cache exists', async () => {
    const result = await getCachedFriendsData();
    expect(result).toBeNull();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(KEY_FRIENDS_DATA);
  });

  it('returns data when cache is fresh', async () => {
    const friendsData = [{ id: 'u1', name: 'Alice' }];
    mockStorage[KEY_FRIENDS_DATA] = JSON.stringify({
      data: friendsData,
      ts: Date.now(), // fresh
    });

    const result = await getCachedFriendsData();
    expect(result).toEqual(friendsData);
  });

  it('returns stale data (caller revalidates in background)', async () => {
    const friendsData = [{ id: 'u2', name: 'Bob' }];
    // Timestamp 10 minutes ago — beyond the 5-minute TTL
    mockStorage[KEY_FRIENDS_DATA] = JSON.stringify({
      data: friendsData,
      ts: Date.now() - 10 * 60 * 1000,
    });

    const result = await getCachedFriendsData();
    // communityCache returns data even when stale
    expect(result).toEqual(friendsData);
  });

  it('returns null when stored JSON is corrupted', async () => {
    mockStorage[KEY_FRIENDS_DATA] = '{not valid json!!!';
    const result = await getCachedFriendsData();
    expect(result).toBeNull();
  });
});

// ============================================================================
// setCachedFriendsData
// ============================================================================

describe('setCachedFriendsData', () => {
  it('stores data with a timestamp', async () => {
    const friendsData = { friends: ['a', 'b'] };
    const before = Date.now();
    await setCachedFriendsData(friendsData);
    const after = Date.now();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      KEY_FRIENDS_DATA,
      expect.any(String),
    );

    const stored = JSON.parse(mockStorage[KEY_FRIENDS_DATA]);
    expect(stored.data).toEqual(friendsData);
    expect(stored.ts).toBeGreaterThanOrEqual(before);
    expect(stored.ts).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// invalidateCachedFriendsData
// ============================================================================

describe('invalidateCachedFriendsData', () => {
  it('removes the friends data cache key', async () => {
    mockStorage[KEY_FRIENDS_DATA] = JSON.stringify({ data: 'old', ts: 1 });
    await invalidateCachedFriendsData();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY_FRIENDS_DATA);
    expect(mockStorage[KEY_FRIENDS_DATA]).toBeUndefined();
  });

  it('does not throw when key does not exist', async () => {
    await expect(invalidateCachedFriendsData()).resolves.toBeUndefined();
  });
});

// ============================================================================
// getCachedPhotoUrls / mergeCachedPhotoUrls
// ============================================================================

describe('getCachedPhotoUrls', () => {
  it('returns empty object when no cache exists', async () => {
    const result = await getCachedPhotoUrls();
    expect(result).toEqual({});
  });

  it('returns cached URLs when fresh', async () => {
    const urls = { 'path/a.jpg': 'https://signed-a', 'path/b.jpg': 'https://signed-b' };
    mockStorage[KEY_PHOTO_URLS] = JSON.stringify({
      data: urls,
      ts: Date.now(),
    });

    const result = await getCachedPhotoUrls();
    expect(result).toEqual(urls);
  });

  it('returns empty object when cache is stale (>20 hours)', async () => {
    const urls = { 'path/old.jpg': 'https://expired' };
    mockStorage[KEY_PHOTO_URLS] = JSON.stringify({
      data: urls,
      ts: Date.now() - 21 * 60 * 60 * 1000, // 21 hours ago
    });

    const result = await getCachedPhotoUrls();
    expect(result).toEqual({});
  });

  it('returns empty object when JSON is corrupted', async () => {
    mockStorage[KEY_PHOTO_URLS] = 'corrupted!!!';
    const result = await getCachedPhotoUrls();
    expect(result).toEqual({});
  });
});

describe('mergeCachedPhotoUrls', () => {
  it('stores new URLs when cache is empty', async () => {
    const newUrls = { 'path/c.jpg': 'https://signed-c' };
    await mergeCachedPhotoUrls(newUrls);

    const stored = JSON.parse(mockStorage[KEY_PHOTO_URLS]);
    expect(stored.data).toEqual(newUrls);
  });

  it('merges new URLs with existing cached URLs', async () => {
    const existing = { 'path/a.jpg': 'https://signed-a' };
    mockStorage[KEY_PHOTO_URLS] = JSON.stringify({
      data: existing,
      ts: Date.now(),
    });

    const newUrls = { 'path/b.jpg': 'https://signed-b' };
    await mergeCachedPhotoUrls(newUrls);

    const stored = JSON.parse(mockStorage[KEY_PHOTO_URLS]);
    expect(stored.data).toEqual({
      'path/a.jpg': 'https://signed-a',
      'path/b.jpg': 'https://signed-b',
    });
  });

  it('overwrites existing URL if same key is provided', async () => {
    const existing = { 'path/a.jpg': 'https://old-url' };
    mockStorage[KEY_PHOTO_URLS] = JSON.stringify({
      data: existing,
      ts: Date.now(),
    });

    await mergeCachedPhotoUrls({ 'path/a.jpg': 'https://new-url' });

    const stored = JSON.parse(mockStorage[KEY_PHOTO_URLS]);
    expect(stored.data['path/a.jpg']).toBe('https://new-url');
  });
});

// ============================================================================
// getCachedVotingGate / setCachedVotingGate
// ============================================================================

describe('getCachedVotingGate', () => {
  it('returns null when no cache exists', async () => {
    const result = await getCachedVotingGate('cycle-2026-03-12');
    expect(result).toBeNull();
  });

  it('returns true when cached as completed for the current cycle', async () => {
    const cycleId = 'cycle-2026-03-12';
    mockStorage[KEY_VOTING_GATE] = JSON.stringify({
      data: true,
      ts: Date.now(),
      cycleId,
    });

    const result = await getCachedVotingGate(cycleId);
    expect(result).toBe(true);
  });

  it('returns null when cached cycle ID does not match current cycle', async () => {
    mockStorage[KEY_VOTING_GATE] = JSON.stringify({
      data: true,
      ts: Date.now(),
      cycleId: 'cycle-2026-03-11', // yesterday
    });

    const result = await getCachedVotingGate('cycle-2026-03-12');
    expect(result).toBeNull();
  });

  it('returns null when cached value is false (not completed should recheck)', async () => {
    const cycleId = 'cycle-2026-03-12';
    mockStorage[KEY_VOTING_GATE] = JSON.stringify({
      data: false,
      ts: Date.now(),
      cycleId,
    });

    const result = await getCachedVotingGate(cycleId);
    expect(result).toBeNull();
  });

  it('returns null when JSON is corrupted', async () => {
    mockStorage[KEY_VOTING_GATE] = 'not-json';
    const result = await getCachedVotingGate('cycle-2026-03-12');
    expect(result).toBeNull();
  });
});

describe('setCachedVotingGate', () => {
  it('stores completed=true with cycle ID', async () => {
    const cycleId = 'cycle-2026-03-12';
    await setCachedVotingGate(true, cycleId);

    const stored = JSON.parse(mockStorage[KEY_VOTING_GATE]);
    expect(stored.data).toBe(true);
    expect(stored.cycleId).toBe(cycleId);
    expect(stored.ts).toBeGreaterThan(0);
  });

  it('stores completed=false with cycle ID', async () => {
    const cycleId = 'cycle-2026-03-12';
    await setCachedVotingGate(false, cycleId);

    const stored = JSON.parse(mockStorage[KEY_VOTING_GATE]);
    expect(stored.data).toBe(false);
    expect(stored.cycleId).toBe(cycleId);
  });
});
