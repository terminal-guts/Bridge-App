/**
 * Tests for matchService (src/services/matchService.ts)
 *
 * Covers: acceptMatch, rejectMatch, exitMatch, updateMatchExitFeedback
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

import { acceptMatch, rejectMatch, exitMatch, updateMatchExitFeedback } from '../../src/services/matchService';
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
// acceptMatch
// ============================================================================

describe('acceptMatch', () => {
  it('calls edge function with correct match_id', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: { id: 'match-1', status: 'active' } },
      error: null,
    });

    await acceptMatch('match-1');

    expect(mockInvoke).toHaveBeenCalledWith('accept_match', {
      body: { match_id: 'match-1' },
    });
  });

  it('returns { ok: true, data } on successful response', async () => {
    const matchData = { id: 'match-1', status: 'active' };
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: matchData },
      error: null,
    });

    const result = await acceptMatch('match-1');

    expect(result).toEqual({ ok: true, data: matchData });
  });

  it('returns error when edge function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Match not found' },
    });

    const result = await acceptMatch('match-1');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'ACCEPT_MATCH_FAILED',
        message: 'Match not found',
      },
    });
  });

  it('returns error when data.ok is false', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: false,
        error: { code: 'MATCH_EXPIRED', message: 'Match has expired' },
      },
      error: null,
    });

    const result = await acceptMatch('match-1');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'MATCH_EXPIRED',
        message: 'Match has expired',
      },
    });
  });

  it('returns fallback error when data.ok is false with no error details', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: false },
      error: null,
    });

    const result = await acceptMatch('match-1');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'ACCEPT_MATCH_FAILED',
        message: 'Failed to accept match',
      },
    });
  });

  it('returns error on thrown exception', async () => {
    mockInvoke.mockRejectedValue(new Error('Network failure'));

    const result = await acceptMatch('match-1');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'ACCEPT_MATCH_ERROR',
        message: 'Network failure',
      },
    });
  });

  it('returns fallback message on exception without message', async () => {
    mockInvoke.mockRejectedValue({});

    const result = await acceptMatch('match-1');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'ACCEPT_MATCH_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});

// ============================================================================
// rejectMatch
// ============================================================================

describe('rejectMatch', () => {
  it('calls edge function with correct match_id and rejection_reason', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    await rejectMatch('match-2', 'not interested');

    expect(mockInvoke).toHaveBeenCalledWith('reject_match', {
      body: {
        match_id: 'match-2',
        rejection_reason: 'not interested',
      },
    });
  });

  it('returns { ok: true } on successful response', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const result = await rejectMatch('match-2', 'not my type');

    expect(result).toEqual({ ok: true });
  });

  it('returns error when edge function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Server error' },
    });

    const result = await rejectMatch('match-2', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'REJECT_MATCH_FAILED',
        message: 'Server error',
      },
    });
  });

  it('returns error when data.ok is false', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: false,
        error: { code: 'ALREADY_REJECTED', message: 'Already rejected' },
      },
      error: null,
    });

    const result = await rejectMatch('match-2', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'ALREADY_REJECTED',
        message: 'Already rejected',
      },
    });
  });

  it('returns fallback error when data.ok is false with no details', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: false },
      error: null,
    });

    const result = await rejectMatch('match-2', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'REJECT_MATCH_FAILED',
        message: 'Failed to reject match',
      },
    });
  });

  it('returns error on thrown exception', async () => {
    mockInvoke.mockRejectedValue(new Error('Connection refused'));

    const result = await rejectMatch('match-2', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'REJECT_MATCH_ERROR',
        message: 'Connection refused',
      },
    });
  });

  it('returns fallback on exception without message', async () => {
    mockInvoke.mockRejectedValue({});

    const result = await rejectMatch('match-2', 'reason');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'REJECT_MATCH_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});

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

    expect(mockInvoke).toHaveBeenCalledWith('exit_match', {
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

    expect(mockInvoke).toHaveBeenCalledWith('exit_match', {
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
