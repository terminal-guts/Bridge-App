/**
 * Tests for statsService (src/services/statsService.ts)
 *
 * Covers: getArchetype pure function (all 5 archetypes + boundary values),
 * fetchStats edge function call with success/error/exception paths
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

import { getArchetype, fetchStats, Archetype } from '../../src/services/statsService';

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// getArchetype
// ============================================================================

describe('getArchetype', () => {
  // ── The Cupid ──────────────────────────────────────────────────────────

  describe('The Cupid (assists >= 5 AND accuracy >= 75)', () => {
    it('returns The Cupid when assists=5 and accuracy=75 (boundary)', () => {
      const result = getArchetype(75, 50, 5);
      expect(result.name).toBe('The Cupid');
      expect(result.emoji).toBe('\u{1F498}');
      expect(result.description).toContain('High accuracy and lots of assists');
      expect(result.gradient).toEqual(['#FF6B6B', '#EE5A24']);
    });

    it('returns The Cupid when assists and accuracy are well above threshold', () => {
      const result = getArchetype(95, 30, 10);
      expect(result.name).toBe('The Cupid');
    });

    it('returns The Cupid even when yesRate would qualify for Optimist', () => {
      // Cupid takes priority over Optimist
      const result = getArchetype(80, 90, 7);
      expect(result.name).toBe('The Cupid');
    });

    it('returns The Cupid even when accuracy would qualify for Strategist', () => {
      // Cupid takes priority over Strategist
      const result = getArchetype(85, 50, 6);
      expect(result.name).toBe('The Cupid');
    });
  });

  // ── The Strategist ─────────────────────────────────────────────────────

  describe('The Strategist (accuracy >= 80, not Cupid)', () => {
    it('returns The Strategist when accuracy=80 (boundary) and assists < 5', () => {
      const result = getArchetype(80, 50, 4);
      expect(result.name).toBe('The Strategist');
      expect(result.emoji).toBe('\u{1F9E0}');
      expect(result.description).toContain('surgical');
      expect(result.gradient).toEqual(['#6C5CE7', '#A55EEA']);
    });

    it('returns The Strategist when accuracy=99 and assists=0', () => {
      const result = getArchetype(99, 10, 0);
      expect(result.name).toBe('The Strategist');
    });

    it('does NOT return Strategist when accuracy=79', () => {
      const result = getArchetype(79, 50, 0);
      expect(result.name).not.toBe('The Strategist');
    });

    it('returns Cupid instead of Strategist when assists >= 5 and accuracy >= 75', () => {
      const result = getArchetype(80, 50, 5);
      expect(result.name).toBe('The Cupid');
    });
  });

  // ── The Optimist ───────────────────────────────────────────────────────

  describe('The Optimist (yesRate >= 70, not Cupid/Strategist)', () => {
    it('returns The Optimist when yesRate=70 (boundary)', () => {
      const result = getArchetype(50, 70, 1);
      expect(result.name).toBe('The Optimist');
      expect(result.emoji).toBe('\u{2600}\u{FE0F}');
      expect(result.description).toContain('believe in love');
      expect(result.gradient).toEqual(['#FDCB6E', '#F0932B']);
    });

    it('returns The Optimist when yesRate=100', () => {
      const result = getArchetype(40, 100, 0);
      expect(result.name).toBe('The Optimist');
    });

    it('does NOT return Optimist when yesRate=69', () => {
      const result = getArchetype(50, 69, 0);
      expect(result.name).not.toBe('The Optimist');
    });
  });

  // ── The Connector ──────────────────────────────────────────────────────

  describe('The Connector (assists >= 3, not Cupid/Strategist/Optimist)', () => {
    it('returns The Connector when assists=3 (boundary)', () => {
      const result = getArchetype(50, 50, 3);
      expect(result.name).toBe('The Connector');
      expect(result.emoji).toBe('\u{1F517}');
      expect(result.description).toContain('bring people together');
      expect(result.gradient).toEqual(['#00B894', '#10B981']);
    });

    it('returns The Connector when assists=4', () => {
      const result = getArchetype(60, 50, 4);
      expect(result.name).toBe('The Connector');
    });

    it('does NOT return Connector when assists=2', () => {
      const result = getArchetype(50, 50, 2);
      expect(result.name).not.toBe('The Connector');
    });

    it('returns Cupid instead when assists=5 and accuracy=75', () => {
      const result = getArchetype(75, 50, 5);
      expect(result.name).toBe('The Cupid');
    });
  });

  // ── The Scout (default) ────────────────────────────────────────────────

  describe('The Scout (default fallback)', () => {
    it('returns The Scout when no other criteria met', () => {
      const result = getArchetype(50, 50, 0);
      expect(result.name).toBe('The Scout');
      expect(result.emoji).toBe('\u{1F50D}');
      expect(result.description).toContain('Careful and observant');
      expect(result.gradient).toEqual(['#437FFF', '#2B65F9']);
    });

    it('returns The Scout for zero values', () => {
      const result = getArchetype(0, 0, 0);
      expect(result.name).toBe('The Scout');
    });

    it('returns The Scout when just below all thresholds', () => {
      // accuracy=79, yesRate=69, assists=2
      const result = getArchetype(79, 69, 2);
      expect(result.name).toBe('The Scout');
    });
  });

  // ── Archetype shape ────────────────────────────────────────────────────

  describe('archetype shape', () => {
    const testCases: [number, number, number][] = [
      [90, 50, 10], // Cupid
      [85, 50, 0],  // Strategist
      [50, 80, 0],  // Optimist
      [50, 50, 4],  // Connector
      [50, 50, 0],  // Scout
    ];

    it.each(testCases)(
      'archetype(%i, %i, %i) has name, emoji, description, gradient',
      (accuracy, yesRate, assists) => {
        const result = getArchetype(accuracy, yesRate, assists);
        expect(typeof result.name).toBe('string');
        expect(result.name.length).toBeGreaterThan(0);
        expect(typeof result.emoji).toBe('string');
        expect(typeof result.description).toBe('string');
        expect(result.description.length).toBeGreaterThan(0);
        expect(Array.isArray(result.gradient)).toBe(true);
        expect(result.gradient).toHaveLength(2);
        expect(result.gradient[0]).toMatch(/^#[A-Fa-f0-9]{6}$/);
        expect(result.gradient[1]).toMatch(/^#[A-Fa-f0-9]{6}$/);
      }
    );
  });

  // ── Priority ordering ──────────────────────────────────────────────────

  describe('priority ordering', () => {
    it('Cupid > Strategist > Optimist > Connector > Scout', () => {
      // All thresholds met: Cupid wins
      expect(getArchetype(90, 90, 10).name).toBe('The Cupid');

      // No Cupid (assists < 5), but Strategist + Optimist + Connector: Strategist wins
      expect(getArchetype(85, 80, 4).name).toBe('The Strategist');

      // No Cupid/Strategist, but Optimist + Connector: Optimist wins
      expect(getArchetype(60, 75, 4).name).toBe('The Optimist');

      // Only Connector: Connector
      expect(getArchetype(60, 60, 3).name).toBe('The Connector');

      // Nothing: Scout
      expect(getArchetype(60, 60, 2).name).toBe('The Scout');
    });
  });
});

// ============================================================================
// fetchStats
// ============================================================================

describe('fetchStats', () => {
  const mockStatsData = {
    userStats: {
      all_time: {
        couples_set_up: 3,
        total_votes_cast: 100,
        accuracy: 75,
        yes_rate: 60,
        current_streak: 5,
        longest_streak: 10,
        karma_points: 50,
        assists: 3,
        friends_helped: 8,
        weekly_rank: 5,
        total_users: 100,
        percentile: 95,
        first_assist_date: '2026-01-15',
      },
      week: {
        couples_set_up: 1,
        total_votes_cast: 20,
        accuracy: 80,
        yes_rate: 65,
        current_streak: 3,
        longest_streak: 5,
        karma_points: 15,
        assists: 1,
        friends_helped: 4,
        weekly_rank: 3,
        total_users: 100,
        percentile: 97,
        votes_trend: 10,
        accuracy_trend: 5,
        karma_trend: 3,
        assists_trend: 1,
      },
    },
    campusStats: {
      all_time: {
        campus_name: 'Rice University',
        total_couples_set_up: 50,
        total_votes_cast: 5000,
        avg_approval_rate: 65,
        active_matchmakers: 200,
        proposals_this_week: 30,
        top_matchmaker_name: 'Alice',
        top_matchmaker_assists: 15,
        most_popular_day: 'Wednesday',
        streak_record: 42,
        match_rate: 45,
      },
      week: {
        campus_name: 'Rice University',
        total_couples_set_up: 5,
        total_votes_cast: 500,
        avg_approval_rate: 70,
        active_matchmakers: 150,
        proposals_this_week: 30,
        top_matchmaker_name: 'Bob',
        top_matchmaker_assists: 5,
        most_popular_day: 'Tuesday',
        streak_record: 10,
        match_rate: 50,
      },
    },
  };

  it('returns { ok: true, data } on successful response', async () => {
    mockInvoke.mockResolvedValue({ data: mockStatsData, error: null });

    const result = await fetchStats();

    expect(mockInvoke).toHaveBeenCalledWith('get-stats');
    expect(result).toEqual({ ok: true, data: mockStatsData });
  });

  it('returns { ok: false, error } when edge function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized' },
    });

    const result = await fetchStats();

    expect(result).toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('returns { ok: false, error } with fallback message when error has no message', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {},
    });

    const result = await fetchStats();

    expect(result).toEqual({ ok: false, error: 'Failed to fetch stats' });
  });

  it('returns { ok: false, error } when data contains error field', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'User not found' },
      error: null,
    });

    const result = await fetchStats();

    expect(result).toEqual({ ok: false, error: 'User not found' });
  });

  it('returns { ok: false, error } on network exception', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));

    const result = await fetchStats();

    expect(result).toEqual({ ok: false, error: 'Network error' });
  });

  it('returns { ok: false, error } with fallback on exception without message', async () => {
    mockInvoke.mockRejectedValue({});

    const result = await fetchStats();

    expect(result).toEqual({ ok: false, error: 'Network error' });
  });
});
