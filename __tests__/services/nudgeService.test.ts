/**
 * Tests for nudgeService
 *
 * Covers: sendNudge function with success, error, and exception paths.
 */

const mockInvoke = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { sendNudge } from '../../src/services/nudgeService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendNudge', () => {
  it('returns ok:true with pushDelivered when edge function succeeds', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'sent', push_delivered: true },
      error: null,
    });
    const result = await sendNudge('friend-123');
    expect(result).toEqual({ ok: true, pushDelivered: true });
    expect(mockInvoke).toHaveBeenCalledWith('send-nudge', {
      body: { friendId: 'friend-123' },
    });
  });

  it('returns ok:true with pushDelivered:false when friend has no token', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'sent', push_delivered: false },
      error: null,
    });
    const result = await sendNudge('friend-456');
    expect(result).toEqual({ ok: true, pushDelivered: false });
  });

  it('returns ok:false when edge function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Not friends' },
    });
    const result = await sendNudge('stranger-789');
    expect(result).toEqual({ ok: false });
  });

  it('returns ok:false when edge function throws', async () => {
    mockInvoke.mockRejectedValue(new Error('network failure'));
    const result = await sendNudge('friend-123');
    expect(result).toEqual({ ok: false });
  });

  it('defaults pushDelivered to false when not in response', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'sent' },
      error: null,
    });
    const result = await sendNudge('friend-123');
    expect(result).toEqual({ ok: true, pushDelivered: false });
  });
});
