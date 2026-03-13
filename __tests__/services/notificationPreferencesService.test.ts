/**
 * Tests for notificationPreferencesService
 */

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
}));

// Mock supabase (needed for syncToServer)
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      upsert: jest.fn().mockResolvedValue({ data: null }),
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationPreferencesService, NotificationPreferences } from '../../src/services/notificationPreferencesService';

const PREFS_KEY = '@bridge_notification_prefs';

const defaultPreferences: NotificationPreferences = {
  matchesEnabled: true,
  messagesEnabled: true,
  showNameIfWinner: true,
  leaderboardVisible: false,
};

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  jest.clearAllMocks();
});

// ============================================================================
// getPreferences
// ============================================================================

describe('getPreferences', () => {
  it('returns default preferences when storage is empty', async () => {
    const prefs = await notificationPreferencesService.getPreferences();
    expect(prefs).toEqual(defaultPreferences);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(PREFS_KEY);
  });

  it('returns stored preferences', async () => {
    const stored: NotificationPreferences = {
      matchesEnabled: false,
      messagesEnabled: true,
      showNameIfWinner: true,
      leaderboardVisible: false,
    };
    mockStorage[PREFS_KEY] = JSON.stringify(stored);

    const prefs = await notificationPreferencesService.getPreferences();
    expect(prefs).toEqual(stored);
  });

  it('merges stored partial prefs with defaults (forward-compat)', async () => {
    // If storage only has a subset of keys (e.g. added a new pref later),
    // defaults fill in the gaps
    mockStorage[PREFS_KEY] = JSON.stringify({ matchesEnabled: false });

    const prefs = await notificationPreferencesService.getPreferences();
    expect(prefs).toEqual({
      matchesEnabled: false,
      messagesEnabled: true,
      showNameIfWinner: true,
      leaderboardVisible: false,
    });
  });

  it('returns defaults when stored JSON is corrupted', async () => {
    mockStorage[PREFS_KEY] = '{broken json';

    const prefs = await notificationPreferencesService.getPreferences();
    expect(prefs).toEqual(defaultPreferences);
  });
});

// ============================================================================
// updatePreferences
// ============================================================================

describe('updatePreferences', () => {
  it('partial update merges with existing defaults', async () => {
    const result = await notificationPreferencesService.updatePreferences({
      messagesEnabled: false,
    });

    expect(result).toEqual({
      matchesEnabled: true,
      messagesEnabled: false,
      showNameIfWinner: true,
      leaderboardVisible: false,
    });

    const stored = JSON.parse(mockStorage[PREFS_KEY]);
    expect(stored.messagesEnabled).toBe(false);
    expect(stored.matchesEnabled).toBe(true);
  });

  it('partial update merges with previously stored prefs', async () => {
    mockStorage[PREFS_KEY] = JSON.stringify({
      matchesEnabled: false,
      messagesEnabled: false,
      showNameIfWinner: true,
      leaderboardVisible: false,
    });

    const result = await notificationPreferencesService.updatePreferences({
      messagesEnabled: true,
    });

    expect(result).toEqual({
      matchesEnabled: false,
      messagesEnabled: true,
      showNameIfWinner: true,
      leaderboardVisible: false,
    });
  });

  it('full update overwrites all preferences', async () => {
    mockStorage[PREFS_KEY] = JSON.stringify({
      matchesEnabled: true,
      messagesEnabled: true,
      showNameIfWinner: true,
      leaderboardVisible: false,
    });

    const fullUpdate: NotificationPreferences = {
      matchesEnabled: false,
      messagesEnabled: false,
      showNameIfWinner: false,
      leaderboardVisible: true,
    };

    const result = await notificationPreferencesService.updatePreferences(fullUpdate);
    expect(result).toEqual(fullUpdate);

    const stored = JSON.parse(mockStorage[PREFS_KEY]);
    expect(stored).toEqual(fullUpdate);
  });

  it('persists via AsyncStorage.setItem', async () => {
    await notificationPreferencesService.updatePreferences({ matchesEnabled: false });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      PREFS_KEY,
      expect.any(String),
    );
  });

  it('updates showNameIfWinner preference', async () => {
    const result = await notificationPreferencesService.updatePreferences({
      showNameIfWinner: false,
    });

    expect(result.showNameIfWinner).toBe(false);
    const stored = JSON.parse(mockStorage[PREFS_KEY]);
    expect(stored.showNameIfWinner).toBe(false);
  });
});
