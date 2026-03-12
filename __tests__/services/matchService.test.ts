/**
 * Tests for matchService (src/services/matchService.ts)
 *
 * Covers: exitMatch, updateMatchExitFeedback
 * with success/error/exception paths. getUserMatches is skipped because
 * it has complex dev-mode dynamic imports that are hard to mock in isolation.
 */

// Mock supabase — must be before imports
const mockInvoke = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockEq2 = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    from: jest.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

// Mock auth
jest.mock('../../src/utils/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue('test-user-id'),
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

import { exitMatch, updateMatchExitFeedback } from '../../src/services/matchService';
import { requireAuth } from '../../src/utils/auth';
import { supabase } from '../../src/lib/supabase';

beforeEach(() => {
  jest.clearAllMocks();

  // Reset the chained mock for update queries
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ eq: mockEq2 });
  mockEq2.mockResolvedValue({ error: null });
});

// ============================================================================
// (acceptMatch and rejectMatch removed — dead code cleanup)
// ============================================================================

// ============================================================================
// exitMatch
// ============================================================================

describe('exitMatch', () => {
  it('calls edge function with match_id, exit_reason, and exit_details', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    await exitMatch('match-3', 'lost_interest', 'We stopped talking');

    expect(mockInvoke).toHaveBeenCalledWith('exit-match', {
      body: {
        match_id: 'match-3',
        exit_reason: 'lost_interest',
        exit_details: 'We stopped talking',
      },
    });
  });

  it('passes undefined exit_details when not provided', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    await exitMatch('match-3', 'other');

    expect(mockInvoke).toHaveBeenCalledWith('exit-match', {
      body: {
        match_id: 'match-3',
        exit_reason: 'other',
        exit_details: undefined,
      },
    });
  });

  it('returns { ok: true } on successful response', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const result = await exitMatch('match-3', 'moved_away');

    expect(result).toEqual({ ok: true });
  });

  it('returns error when edge function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Match not found' },
    });

    const result = await exitMatch('match-3', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'EXIT_MATCH_FAILED',
        message: 'Match not found',
      },
    });
  });

  it('returns error when data.ok is false', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: false,
        error: { code: 'NOT_IN_MATCH', message: 'Not in this match' },
      },
      error: null,
    });

    const result = await exitMatch('match-3', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'NOT_IN_MATCH',
        message: 'Not in this match',
      },
    });
  });

  it('returns fallback error when data.ok is false with no details', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: false },
      error: null,
    });

    const result = await exitMatch('match-3', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'EXIT_MATCH_FAILED',
        message: 'Failed to exit match',
      },
    });
  });

  it('returns error on thrown exception', async () => {
    mockInvoke.mockRejectedValue(new Error('Timeout'));

    const result = await exitMatch('match-3', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'EXIT_MATCH_ERROR',
        message: 'Timeout',
      },
    });
  });

  it('returns fallback on exception without message', async () => {
    mockInvoke.mockRejectedValue({});

    const result = await exitMatch('match-3', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'EXIT_MATCH_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});

// ============================================================================
// updateMatchExitFeedback
// ============================================================================

describe('updateMatchExitFeedback', () => {
  it('calls requireAuth and updates match_exits table', async () => {
    mockEq2.mockResolvedValue({ error: null });

    const result = await updateMatchExitFeedback('match-4', 'Great experience overall');

    expect(requireAuth).toHaveBeenCalled();
    expect((supabase.from as jest.Mock)).toHaveBeenCalledWith('match_exits');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exit_details: 'Great experience overall',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('match_id', 'match-4');
    expect(mockEq2).toHaveBeenCalledWith('exiting_user_id', 'test-user-id');
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: true } on successful update', async () => {
    mockEq2.mockResolvedValue({ error: null });

    const result = await updateMatchExitFeedback('match-4', 'feedback text');

    expect(result).toEqual({ ok: true });
  });

  it('returns error when database update fails', async () => {
    mockEq2.mockResolvedValue({
      error: { message: 'Row not found' },
    });

    const result = await updateMatchExitFeedback('match-4', 'feedback');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UPDATE_FEEDBACK_FAILED',
        message: 'Row not found',
      },
    });
  });

  it('returns error when requireAuth throws', async () => {
    (requireAuth as jest.Mock).mockRejectedValueOnce(
      new Error('Authentication required. Please sign in to continue.')
    );

    const result = await updateMatchExitFeedback('match-4', 'feedback');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UPDATE_FEEDBACK_ERROR',
        message: 'Authentication required. Please sign in to continue.',
      },
    });
  });

  it('returns fallback on exception without message', async () => {
    (requireAuth as jest.Mock).mockRejectedValueOnce({});

    const result = await updateMatchExitFeedback('match-4', 'feedback');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UPDATE_FEEDBACK_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});
