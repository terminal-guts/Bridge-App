/**
 * Tests for notification service V2
 *
 * Covers: realtime fallback notifications (notifyMatchNotice, notifyNewMessage,
 * notifyProposalDeciding, notifyFriendNudge, notifySharedCelebration),
 * scheduleAppOpenChecks, cancelLegacyScheduledNotifications
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
      showNameIfWinner: true,
    }),
    syncFromServer: jest.fn().mockResolvedValue({
      matchesEnabled: true,
      messagesEnabled: true,
      nudgesEnabled: true,
      showNameIfWinner: true,
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
});

// ============================================================================
// Realtime Fallback Notifications
// ============================================================================

describe('notifyMatchNotice', () => {
  it('schedules a match notification with partner name', async () => {
    await notificationService.notifyMatchNotice('Alice');
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe("It's official");
    expect(call.content.body).toContain('Alice');
  });

  it('skips when matchesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: false, messagesEnabled: true, nudgesEnabled: true, showNameIfWinner: true,
    });
    await notificationService.notifyMatchNotice('Alice');
    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });
});

describe('notifyNewMessage', () => {
  it('shows sender name as title and preview as body', async () => {
    await notificationService.notifyNewMessage('Bob', 'Hey there!');
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe('Bob');
    expect(call.content.body).toBe('Hey there!');
  });

  it('truncates long previews at 100 chars', async () => {
    const longMsg = 'a'.repeat(150);
    await notificationService.notifyNewMessage('Bob', longMsg);
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.body.length).toBeLessThanOrEqual(103); // 100 + '...'
  });

  it('skips when messagesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: true, messagesEnabled: false, nudgesEnabled: true, showNameIfWinner: true,
    });
    await notificationService.notifyNewMessage('Bob', 'Hey');
    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });
});

describe('notifyProposalDeciding', () => {
  it('includes partner name in body', async () => {
    await notificationService.notifyProposalDeciding('Carol', 'proposal-123');
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe('Your community has spoken');
    expect(call.content.body).toContain('Carol');
    expect(call.content.data.proposalId).toBe('proposal-123');
  });
});

describe('notifyFriendNudge', () => {
  it('includes nudger name', async () => {
    await notificationService.notifyFriendNudge('Bob');
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toContain('Bob');
    expect(call.content.data.type).toBe('friend_nudge');
  });

  it('skips when nudgesEnabled is false', async () => {
    (notificationPreferencesService.getPreferences as jest.Mock).mockResolvedValueOnce({
      matchesEnabled: true, messagesEnabled: true, nudgesEnabled: false, showNameIfWinner: true,
    });
    await notificationService.notifyFriendNudge('Bob');
    expect(mockScheduleNotification).not.toHaveBeenCalled();
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

// ============================================================================
// Legacy Cleanup
// ============================================================================

describe('cancelLegacyScheduledNotifications', () => {
  it('cancels legacy client-side scheduled notifications', async () => {
    mockGetAllScheduled.mockResolvedValue([
      { identifier: 'anticipation_655pm' },
      { identifier: 'morning_recap_8am' },
      { identifier: 'daily_match_nudge_7pm' },
      { identifier: 'some_other_notif' },
    ]);

    await notificationService.cancelLegacyScheduledNotifications();

    expect(mockCancelScheduled).toHaveBeenCalledWith('anticipation_655pm');
    expect(mockCancelScheduled).toHaveBeenCalledWith('morning_recap_8am');
    expect(mockCancelScheduled).toHaveBeenCalledWith('daily_match_nudge_7pm');
    expect(mockCancelScheduled).toHaveBeenCalledTimes(3);
  });

  it('does nothing when no legacy notifications exist', async () => {
    mockGetAllScheduled.mockResolvedValue([
      { identifier: 'some_other_notif' },
    ]);

    await notificationService.cancelLegacyScheduledNotifications();
    expect(mockCancelScheduled).not.toHaveBeenCalled();
  });
});
