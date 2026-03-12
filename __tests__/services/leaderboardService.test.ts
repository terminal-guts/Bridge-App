/**
 * Tests for leaderboardService (src/services/leaderboardService.ts)
 *
 * Covers: fetchLeaderboard edge function call with default/custom limits,
 * success/error/exception paths
 */

// Mock supabase
const mockInvoke = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
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

import { fetchLeaderboard } from '../../src/services/leaderboardService';

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// fetchLeaderboard
// ============================================================================

describe('fetchLeaderboard', () => {
  const mockLeaderboardData = {
    leaderboard: [
      {
        userId: 'user-1',
        firstName: 'Alice',
        weeklyKarma: 50,
        rank: 1,
        rankChange: 2,
        photoUrl: 'https://example.com/alice.jpg',
        isFriend: true,
      },
      {
        userId: 'user-2',
        firstName: 'Bob',
        weeklyKarma: 45,
        rank: 2,
        rankChange: -1,
        photoUrl: null,
        isFriend: false,
      },
    ],
    currentUser: {
      userId: 'user-3',
      firstName: 'Charlie',
      weeklyKarma: 30,
      rank: 5,
      rankChange: 0,
      photoUrl: 'https://example.com/charlie.jpg',
      isFriend: false,
      spotsBehindFirst: 4,
    },
    weekStart: '2026-03-09T00:00:00Z',
    totalParticipants: 100,
  };

  // ── Successful calls ───────────────────────────────────────────────────

  it('returns { ok: true, data } on successful response', async () => {
    mockInvoke.mockResolvedValue({ data: mockLeaderboardData, error: null });

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, data: mockLeaderboardData });
  });

  it('passes default limit of 50', async () => {
    mockInvoke.mockResolvedValue({ data: mockLeaderboardData, error: null });

    await fetchLeaderboard();

    expect(mockInvoke).toHaveBeenCalledWith('get-leaderboard', {
      body: { limit: 50 },
    });
  });

  it('passes custom limit when provided', async () => {
    mockInvoke.mockResolvedValue({ data: mockLeaderboardData, error: null });

    await fetchLeaderboard(10);

    expect(mockInvoke).toHaveBeenCalledWith('get-leaderboard', {
      body: { limit: 10 },
    });
  });

  it('passes limit=100', async () => {
    mockInvoke.mockResolvedValue({ data: mockLeaderboardData, error: null });

    await fetchLeaderboard(100);

    expect(mockInvoke).toHaveBeenCalledWith('get-leaderboard', {
      body: { limit: 100 },
    });
  });

  // ── Error paths ────────────────────────────────────────────────────────

  it('returns { ok: false, error } when edge function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error' },
    });

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: false, error: 'Internal server error' });
  });

  it('returns fallback error message when error has no message', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {},
    });

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: false, error: 'Failed to fetch leaderboard' });
  });

  it('returns { ok: false, error } when data contains error field', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Campus not found' },
      error: null,
    });

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: false, error: 'Campus not found' });
  });

  it('returns { ok: false, error } on thrown exception', async () => {
    mockInvoke.mockRejectedValue(new Error('Network timeout'));

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: false, error: 'Network timeout' });
  });

  it('returns fallback error on exception without message', async () => {
    mockInvoke.mockRejectedValue({});

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: false, error: 'Network error' });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('handles response with null currentUser', async () => {
    const dataWithNullUser = {
      ...mockLeaderboardData,
      currentUser: null,
    };
    mockInvoke.mockResolvedValue({ data: dataWithNullUser, error: null });

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, data: dataWithNullUser });
  });

  it('handles response with empty leaderboard array', async () => {
    const emptyData = {
      ...mockLeaderboardData,
      leaderboard: [],
      totalParticipants: 0,
    };
    mockInvoke.mockResolvedValue({ data: emptyData, error: null });

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, data: emptyData });
  });
});
