/**
 * Tests for notificationPreferencesService
 */

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationPreferencesService, NotificationPreferences } from '../../src/services/notificationPreferencesService';

const PREFS_KEY = '@bridge_notification_prefs';

const defaultPreferences: NotificationPreferences = {
  matchesEnabled: true,
  messagesEnabled: true,
  nudgesEnabled: true,
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
      nudgesEnabled: false,
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
      nudgesEnabled: true,
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
      nudgesEnabled: false,
    });

    expect(result).toEqual({
      matchesEnabled: true,
      messagesEnabled: true,
      nudgesEnabled: false,
    });

    const stored = JSON.parse(mockStorage[PREFS_KEY]);
    expect(stored.nudgesEnabled).toBe(false);
    expect(stored.matchesEnabled).toBe(true);
  });

  it('partial update merges with previously stored prefs', async () => {
    mockStorage[PREFS_KEY] = JSON.stringify({
      matchesEnabled: false,
      messagesEnabled: false,
      nudgesEnabled: true,
    });

    const result = await notificationPreferencesService.updatePreferences({
      messagesEnabled: true,
    });

    expect(result).toEqual({
      matchesEnabled: false,
      messagesEnabled: true,
      nudgesEnabled: true,
    });
  });

  it('full update overwrites all preferences', async () => {
    mockStorage[PREFS_KEY] = JSON.stringify({
      matchesEnabled: true,
      messagesEnabled: true,
      nudgesEnabled: true,
    });

    const fullUpdate: NotificationPreferences = {
      matchesEnabled: false,
      messagesEnabled: false,
      nudgesEnabled: false,
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
});
