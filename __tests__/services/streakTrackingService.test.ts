/**
 * Tests for streakTrackingService
 *
 * Covers: detectStreakChanges pure function (deaths, milestones, edge cases),
 * getPreviousStreaks / saveCurrentStreaks with mocked AsyncStorage.
 */

// Mock AsyncStorage
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}));

// Suppress logs
jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

import {
  detectStreakChanges,
  getPreviousStreaks,
  saveCurrentStreaks,
} from '../../src/services/streakTrackingService';

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// detectStreakChanges (pure function)
// ============================================================================

describe('detectStreakChanges', () => {
  // ── Streak Deaths ──────────────────────────────────────────────────────

  describe('streak deaths', () => {
    it('detects a streak death when previous > 0 and current == 0', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 0 }];
      const previous = { a: 12 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        friendId: 'a',
        friendName: 'Alice',
        previousDays: 12,
        currentDays: 0,
        type: 'death',
      });
    });

    it('detects multiple streak deaths', () => {
      const friends = [
        { friendId: 'a', friendName: 'Alice', streakDays: 0 },
        { friendId: 'b', friendName: 'Bob', streakDays: 0 },
      ];
      const previous = { a: 5, b: 30 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(2);
      expect(changes[0].type).toBe('death');
      expect(changes[1].type).toBe('death');
      expect(changes[1].previousDays).toBe(30);
    });

    it('does not report death when previous was also 0', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 0 }];
      const previous = { a: 0 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(0);
    });
  });

  // ── Milestones ─────────────────────────────────────────────────────────

  describe('milestones', () => {
    it('detects crossing the 7-day milestone', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 7 }];
      const previous = { a: 6 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        type: 'milestone',
        milestone: 7,
        currentDays: 7,
        previousDays: 6,
      });
    });

    it('detects crossing the 14-day milestone', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 15 }];
      const previous = { a: 13 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(1);
      expect(changes[0].milestone).toBe(14);
    });

    it('detects crossing the 30-day milestone', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 30 }];
      const previous = { a: 29 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(1);
      expect(changes[0].milestone).toBe(30);
    });

    it('reports only the highest milestone when crossing multiple thresholds at once', () => {
      // Jump from 6 to 15 — crosses both 7 and 14
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 15 }];
      const previous = { a: 6 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(1);
      expect(changes[0].milestone).toBe(14); // Highest crossed
    });

    it('reports 30 when jumping from below 7 to 30+', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 35 }];
      const previous = { a: 5 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(1);
      expect(changes[0].milestone).toBe(30);
    });

    it('does not report milestone when staying within same tier', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 10 }];
      const previous = { a: 8 }; // Both in 7-13 tier, no milestone crossing
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(0);
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('ignores new friends not in previous snapshot', () => {
      const friends = [{ friendId: 'new', friendName: 'New Friend', streakDays: 5 }];
      const previous = {};
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(0);
    });

    it('returns empty array when no friends', () => {
      const changes = detectStreakChanges([], { a: 10 });
      expect(changes).toHaveLength(0);
    });

    it('handles mixed deaths and milestones', () => {
      const friends = [
        { friendId: 'a', friendName: 'Alice', streakDays: 0 },    // death
        { friendId: 'b', friendName: 'Bob', streakDays: 14 },     // milestone
        { friendId: 'c', friendName: 'Carol', streakDays: 5 },    // no change
      ];
      const previous = { a: 8, b: 13, c: 4 };
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(2);
      expect(changes[0].type).toBe('death');
      expect(changes[0].friendName).toBe('Alice');
      expect(changes[1].type).toBe('milestone');
      expect(changes[1].friendName).toBe('Bob');
    });

    it('does not report milestone when streak decreased but stayed above threshold', () => {
      const friends = [{ friendId: 'a', friendName: 'Alice', streakDays: 8 }];
      const previous = { a: 10 }; // Decreased but still >= 7
      const changes = detectStreakChanges(friends, previous);
      expect(changes).toHaveLength(0);
    });
  });
});

// ============================================================================
// getPreviousStreaks
// ============================================================================

describe('getPreviousStreaks', () => {
  it('returns parsed data from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ a: 5, b: 12 }));
    const result = await getPreviousStreaks();
    expect(result).toEqual({ a: 5, b: 12 });
    expect(mockGetItem).toHaveBeenCalledWith('@bridge_friend_streaks');
  });

  it('returns empty object when nothing stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await getPreviousStreaks();
    expect(result).toEqual({});
  });

  it('returns empty object on parse error', async () => {
    mockGetItem.mockResolvedValue('invalid json{{{');
    const result = await getPreviousStreaks();
    expect(result).toEqual({});
  });

  it('returns empty object when AsyncStorage throws', async () => {
    mockGetItem.mockRejectedValue(new Error('storage error'));
    const result = await getPreviousStreaks();
    expect(result).toEqual({});
  });
});

// ============================================================================
// saveCurrentStreaks
// ============================================================================

describe('saveCurrentStreaks', () => {
  it('saves friend streaks as JSON', async () => {
    const friends = [
      { friendId: 'a', streakDays: 5 },
      { friendId: 'b', streakDays: 20 },
    ];
    await saveCurrentStreaks(friends);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@bridge_friend_streaks',
      JSON.stringify({ a: 5, b: 20 }),
    );
  });

  it('handles empty friends array', async () => {
    await saveCurrentStreaks([]);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@bridge_friend_streaks',
      JSON.stringify({}),
    );
  });

  it('does not throw when AsyncStorage fails', async () => {
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveCurrentStreaks([{ friendId: 'a', streakDays: 5 }])).resolves.toBeUndefined();
  });
});
