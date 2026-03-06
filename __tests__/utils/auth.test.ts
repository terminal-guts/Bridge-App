/**
 * Tests for auth utility (src/utils/auth.ts)
 *
 * Covers: userId caching, AsyncStorage fallback, Supabase session fallback,
 * requireAuth, verifyOwnership
 */

// Mock AsyncStorage before importing auth module
const mockAsyncStorage: Record<string, string | null> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

// Mock supabase
const mockGetSession = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

import {
  getAuthenticatedUserId,
  requireAuth,
  requireAuthWithPhone,
  isAuthenticatedUser,
  verifyOwnership,
  setCachedUserId,
  clearCachedUserId,
} from '../../src/utils/auth';

// Reset state between tests
beforeEach(() => {
  clearCachedUserId();
  Object.keys(mockAsyncStorage).forEach((key) => delete mockAsyncStorage[key]);
  mockGetSession.mockReset();
  jest.clearAllMocks();
});

// ============================================================================
// setCachedUserId / clearCachedUserId
// ============================================================================

describe('userId caching', () => {
  it('returns cached userId immediately without async calls', async () => {
    setCachedUserId('cached-user-123');
    const result = await getAuthenticatedUserId();
    expect(result).toBe('cached-user-123');
    // Should not have called AsyncStorage or Supabase
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('clears cached userId', async () => {
    setCachedUserId('cached-user-123');
    clearCachedUserId();

    // No AsyncStorage data, no session => should return null
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await getAuthenticatedUserId();
    expect(result).toBeNull();
  });
});

// ============================================================================
// getAuthenticatedUserId — fallback hierarchy
// ============================================================================

describe('getAuthenticatedUserId', () => {
  it('falls back to AsyncStorage when no cache', async () => {
    mockAsyncStorage['bridge_auth_user'] = JSON.stringify({
      id: 'async-user-456',
      phone: '+1234567890',
    });

    const result = await getAuthenticatedUserId();
    expect(result).toBe('async-user-456');
  });

  it('falls back to Supabase session when no cache or AsyncStorage', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'supabase-user-789',
            phone: '+9876543210',
          },
        },
      },
    });

    const result = await getAuthenticatedUserId();
    expect(result).toBe('supabase-user-789');
  });

  it('returns null when no auth source is available', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const result = await getAuthenticatedUserId();
    expect(result).toBeNull();
  });

  it('caches the userId after AsyncStorage lookup', async () => {
    mockAsyncStorage['bridge_auth_user'] = JSON.stringify({ id: 'cached-after-lookup' });

    await getAuthenticatedUserId();
    // Second call should use cache
    const result = await getAuthenticatedUserId();
    expect(result).toBe('cached-after-lookup');

    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // AsyncStorage.getItem should only be called once (first call), not second
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('handles AsyncStorage errors gracefully', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

    const result = await getAuthenticatedUserId();
    expect(result).toBeNull();
  });
});

// ============================================================================
// requireAuth
// ============================================================================

describe('requireAuth', () => {
  it('returns userId when authenticated', async () => {
    setCachedUserId('auth-user');
    const result = await requireAuth();
    expect(result).toBe('auth-user');
  });

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(requireAuth()).rejects.toThrow('Authentication required');
  });
});

// ============================================================================
// requireAuthWithPhone
// ============================================================================

describe('requireAuthWithPhone', () => {
  it('returns userId and empty phone from cache', async () => {
    setCachedUserId('phone-user');
    const result = await requireAuthWithPhone();
    expect(result.userId).toBe('phone-user');
    expect(result.phone).toBe('');
  });

  it('returns userId and phone from AsyncStorage', async () => {
    mockAsyncStorage['bridge_auth_user'] = JSON.stringify({
      id: 'as-user',
      phone: '+15551234567',
    });

    const result = await requireAuthWithPhone();
    expect(result.userId).toBe('as-user');
    expect(result.phone).toBe('+15551234567');
  });

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(requireAuthWithPhone()).rejects.toThrow('Authentication required');
  });
});

// ============================================================================
// isAuthenticatedUser
// ============================================================================

describe('isAuthenticatedUser', () => {
  it('returns true when userId matches', async () => {
    setCachedUserId('match-user');
    const result = await isAuthenticatedUser('match-user');
    expect(result).toBe(true);
  });

  it('returns false when userId does not match', async () => {
    setCachedUserId('user-a');
    const result = await isAuthenticatedUser('user-b');
    expect(result).toBe(false);
  });

  it('returns false when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const result = await isAuthenticatedUser('any-user');
    expect(result).toBe(false);
  });
});

// ============================================================================
// verifyOwnership
// ============================================================================

describe('verifyOwnership', () => {
  it('succeeds when user owns the resource', async () => {
    setCachedUserId('owner-user');
    await expect(verifyOwnership('owner-user')).resolves.toBeUndefined();
  });

  it('throws when user does not own the resource', async () => {
    setCachedUserId('user-a');
    await expect(verifyOwnership('user-b')).rejects.toThrow('Unauthorized');
  });

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(verifyOwnership('any-user')).rejects.toThrow('Authentication required');
  });
});
