/**
 * Tests for engagement notification methods in notificationService
 *
 * Covers: notifyStreakAtRisk, notifyAccuracyBonus, notifyFriendNudge,
 * notifySharedCelebration, notifyStreakDeath, setupEngagementCadence
 */

// Mock expo-notifications
const mockScheduleNotification = jest.fn().mockResolvedValue(undefined);
const mockGetAllScheduled = jest.fn().mockResolvedValue([]);
const mockCancelScheduled = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotification(...args),
  getAllScheduledNotificationsAsync: () => mockGetAllScheduled(),
  cancelScheduledNotificationAsync: (...args: any[]) => mockCancelScheduled(...args),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'token' }),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn().mockResolvedValue(0),
  setBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar' },
  AndroidImportance: { MAX: 5 },
}));

// Mock expo-device
jest.mock('expo-device', () => ({ isDevice: true }));

// Mock AsyncStorage
const mockGetItem = jest.fn().mockResolvedValue(null);
const mockSetItem = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}));

// Mock supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      single: jest.fn().mockResolvedValue({ data: null }),
      upsert: jest.fn().mockResolvedValue({ data: null }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    }),
    removeChannel: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

// Mock notification preferences
jest.mock('../../src/services/notificationPreferencesService', () => ({
  notificationPreferencesService: {
    getPreferences: jest.fn().mockResolvedValue({
      matchesEnabled: true,
      messagesEnabled: true,
      nudgesEnabled: true,
    }),
  },
}));

// Mock toast
jest.mock('../../src/utils/toast', () => ({
  showToast: { info: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

// Mock logger
jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

import { notificationService } from '../../src/services/notificationService';
import { notificationPreferencesService } from '../../src/services/notificationPreferencesService';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null); // No cooldowns by default
});

// ============================================================================
// Engagement Notifications
// ============================================================================

describe('notifyStreakAtRisk', () => {
  it('schedules a notification with friend name and streak days', async () => {
    await notificationService.notifyStreakAtRisk('Alice', 12);
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe('Streak at risk!');
    expect(call.content.body).toContain('12-day');
    expect(call.content.body).toContain('Alice');
  });

  it('respects 24h cooldown', async () => {
    // Simulate recent nudge (1 hour ago)
    mockGetItem.mockResolvedValue((Date.now() - 1000 * 60 * 60).toString());
    await notificationService.notifyStreakAtRisk('Alice', 12);
    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });

  it('fires when cooldown has expired', async () => {
    // Simulate old nudge (25 hours ago) for streak key, null for daily cap key
    mockGetItem.mockImplementation((key: string) => {
      if (key === '@bridge_last_streak_risk_nudge') {
        return Promise.resolve((Date.now() - 1000 * 60 * 60 * 25).toString());
      }
      return Promise.resolve(null);
    });
    await notificationService.notifyStreakAtRisk('Alice', 12);
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
  });

  it('skips when nudgesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: true, messagesEnabled: true, nudgesEnabled: false,
    });
    await notificationService.notifyStreakAtRisk('Alice', 12);
    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });
});

describe('notifyAccuracyBonus', () => {
  it('includes point amount in notification body', async () => {
    await notificationService.notifyAccuracyBonus(3);
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe('Nice call!');
    expect(call.content.body).toContain('+3');
  });

  it('skips when matchesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: false, messagesEnabled: true, nudgesEnabled: true,
    });
    await notificationService.notifyAccuracyBonus(3);
    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });
});

describe('notifyFriendNudge', () => {
  it('includes nudger name', async () => {
    await notificationService.notifyFriendNudge('Bob');
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.body).toContain('Bob');
    expect(call.content.data.type).toBe('friend_nudge');
  });
});

describe('notifySharedCelebration', () => {
  it('lists 2 friends naturally', async () => {
    await notificationService.notifySharedCelebration(['Alice', 'Bob'], 'Eve', 'Frank');
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.body).toContain('Alice and Bob');
    expect(call.content.body).toContain('Eve');
    expect(call.content.body).toContain('Frank');
  });

  it('truncates 3+ friends with count', async () => {
    await notificationService.notifySharedCelebration(['A', 'B', 'C', 'D'], 'Eve', 'Frank');
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.body).toContain('A and 3 others');
  });
});

describe('notifyStreakDeath', () => {
  it('includes previous day count', async () => {
    await notificationService.notifyStreakDeath('Carol', 25);
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe('Streak ended');
    expect(call.content.body).toContain('25-day');
    expect(call.content.body).toContain('Carol');
  });
});

// ============================================================================
// setupEngagementCadence
// ============================================================================

describe('setupEngagementCadence', () => {
  it('cancels legacy and schedules 2 new notifications', async () => {
    mockGetAllScheduled.mockResolvedValue([
      { identifier: 'daily_match_nudge_7pm' },
      { identifier: 'anticipation_655pm' },
    ]);

    await notificationService.setupEngagementCadence();

    // Should cancel the legacy and existing ones
    expect(mockCancelScheduled).toHaveBeenCalledWith('daily_match_nudge_7pm');
    expect(mockCancelScheduled).toHaveBeenCalledWith('anticipation_655pm');

    // Should schedule 2 new notifications (6:55pm + 8am)
    expect(mockScheduleNotification).toHaveBeenCalledTimes(2);

    const ids = mockScheduleNotification.mock.calls.map((c: any[]) => c[0].identifier);
    expect(ids).toContain('anticipation_655pm');
    expect(ids).toContain('morning_recap_8am');
  });

  it('skips 6:55pm notification when matchesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: false, messagesEnabled: true, nudgesEnabled: true,
    });
    mockGetAllScheduled.mockResolvedValue([]);

    await notificationService.setupEngagementCadence();

    // Only 8am recap should be scheduled (nudgesEnabled is true)
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotification.mock.calls[0][0].identifier).toBe('morning_recap_8am');
  });

  it('skips 8am notification when nudgesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: true, messagesEnabled: true, nudgesEnabled: false,
    });
    mockGetAllScheduled.mockResolvedValue([]);

    await notificationService.setupEngagementCadence();

    // Only 6:55pm should be scheduled
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotification.mock.calls[0][0].identifier).toBe('anticipation_655pm');
  });
});
