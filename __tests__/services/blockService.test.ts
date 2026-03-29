/**
 * Tests for blockService
 */

// Mock auth
jest.mock('../../src/utils/auth', () => ({
  getAuthenticatedUserId: jest.fn().mockResolvedValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
}));

// Mock logger
jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

// Chainable mock builder
function mockChain(finalValue: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'or', 'order', 'limit', 'maybeSingle', 'single'];
  methods.forEach(m => { chain[m] = jest.fn().mockReturnValue(chain); });
  // Terminal methods resolve with the final value
  chain.maybeSingle.mockResolvedValue(finalValue);
  chain.single.mockResolvedValue(finalValue);
  // For delete/update/insert, the last call in the chain should resolve
  chain.then = undefined; // not a promise itself
  return chain;
}

const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();

const mockFrom = jest.fn().mockImplementation((table: string) => {
  const chain = mockChain();
  chain.insert = mockInsert.mockReturnValue(chain);
  chain.delete = mockDelete.mockReturnValue(chain);
  chain.update = mockUpdate.mockReturnValue(chain);
  return chain;
});

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { blockUser, unblockUser, isUserPairBlocked, getBlockedUserIds } from '../../src/services/blockService';
import { getAuthenticatedUserId } from '../../src/utils/auth';

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthenticatedUserId as jest.Mock).mockResolvedValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
});

// ============================================================================
// blockUser
// ============================================================================

describe('blockUser', () => {
  it('returns error for empty blockedUserId', async () => {
    const result = await blockUser('');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  it('returns error when trying to block self', async () => {
    const result = await blockUser('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('CANNOT_BLOCK_SELF');
  });

  it('returns error when user is already blocked', async () => {
    // First call: blocked_users select returns existing
    mockFrom.mockImplementationOnce(() => {
      const chain = mockChain({ data: { id: 'existing-block' }, error: null });
      return chain;
    });
    const result = await blockUser('11111111-2222-3333-4444-555555555555');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('ALREADY_BLOCKED');
  });

  it('returns error when not authenticated', async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);
    const result = await blockUser('11111111-1111-1111-1111-111111111111');
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid UUID', async () => {
    const result = await blockUser('not-a-uuid');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('BLOCK_ERROR');
  });
});

// ============================================================================
// unblockUser
// ============================================================================

describe('unblockUser', () => {
  it('returns error for empty blockedUserId', async () => {
    const result = await unblockUser('');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  it('returns error when not authenticated', async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);
    const result = await unblockUser('11111111-1111-1111-1111-111111111111');
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid UUID', async () => {
    const result = await unblockUser('not-a-uuid');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UNBLOCK_ERROR');
  });
});

// ============================================================================
// isUserPairBlocked
// ============================================================================

describe('isUserPairBlocked', () => {
  it('returns error for missing user IDs', async () => {
    const result = await isUserPairBlocked('', 'user-b');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  it('returns error for missing second user ID', async () => {
    const result = await isUserPairBlocked('user-a', '');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  it('returns error for invalid UUID in userAId', async () => {
    const result = await isUserPairBlocked('not-a-uuid', '11111111-1111-1111-1111-111111111111');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('CHECK_PAIR_BLOCKED_ERROR');
  });
});

// ============================================================================
// getBlockedUserIds
// ============================================================================

describe('getBlockedUserIds', () => {
  it('returns empty array for invalid UUID', async () => {
    const result = await getBlockedUserIds('not-a-uuid');
    expect(result).toEqual([]);
  });
});
