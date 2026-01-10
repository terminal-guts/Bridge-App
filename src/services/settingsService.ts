/**
 * Settings Service - MOCK VERSION
 *
 * Handles user settings and preferences (notifications, privacy).
 * Provides in-memory settings management for development without backend.
 */

import { ApiResponse } from '../types';

// Mock in-memory storage
let mockSettings: UserSettings | null = null;

/**
 * User settings interface
 */
export interface UserSettings {
  id: string;
  userId: string;
  notifications: {
    newMatches: boolean;
    messages: boolean;
    surveyReminder: boolean;
    friendActivity: boolean;
  };
  privacy: {
    showLastActive: boolean;
    readReceipts: boolean;
    shareProfile: boolean;
  };
  createdAt: string;
  updatedAt: string;
}


/**
 * Default settings for new users
 */
const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  notifications: {
    newMatches: true,
    messages: true,
    surveyReminder: true,
    friendActivity: true,
  },
  privacy: {
    showLastActive: true,
    readReceipts: true,
    shareProfile: false,
  },
};

/**
 * Error response helper
 */
const createErrorResponse = (code: string, message: string): ApiResponse<any> => {
  return {
    ok: false,
    error: { code, message },
  };
};


/**
 * Get user settings for the authenticated user - MOCK VERSION
 * Returns default settings from memory
 */
export const getUserSettings = async (userId?: string): Promise<ApiResponse<UserSettings>> => {
  try {
    console.log('[MOCK SETTINGS] Getting user settings');

    // If no settings exist, create defaults
    if (!mockSettings) {
      mockSettings = {
        id: 'settings-1',
        userId: '00000000-0000-0000-0000-000000000001',
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      ok: true,
      data: mockSettings,
    };
  } catch (error: any) {
    console.error('[MOCK SETTINGS] Get settings error:', error);
    return createErrorResponse('FETCH_ERROR', error.message || 'Failed to fetch settings');
  }
};


/**
 * Update user settings for the authenticated user - MOCK VERSION
 * Updates settings in memory
 */
export const updateUserSettings = async (
  userId: string | Partial<UserSettings>,
  settings?: Partial<UserSettings>
): Promise<ApiResponse<UserSettings>> => {
  try {
    const finalSettings = typeof userId === 'string' ? settings : userId;
    console.log('[MOCK SETTINGS] Updating user settings');

    // Ensure settings exist
    if (!mockSettings) {
      mockSettings = {
        id: 'settings-1',
        userId: typeof userId === 'string' ? userId : '00000000-0000-0000-0000-000000000001',
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (finalSettings) {
      // Update notifications
      if (finalSettings.notifications) {
        mockSettings.notifications = {
          ...mockSettings.notifications,
          ...finalSettings.notifications,
        } as UserSettings['notifications'];
      }

      // Update privacy
      if (finalSettings.privacy) {
        mockSettings.privacy = {
          ...mockSettings.privacy,
          ...finalSettings.privacy,
        } as UserSettings['privacy'];
      }
    }

    // Update timestamp
    mockSettings.updatedAt = new Date().toISOString();

    return {
      ok: true,
      data: mockSettings,
    };
  } catch (error: any) {
    console.error('[MOCK SETTINGS] Update settings error:', error);
    return createErrorResponse('UPDATE_ERROR', error.message || 'Failed to update settings');
  }
};

/**
 * Update notification settings for the authenticated user - MOCK VERSION
 */
export const updateNotificationSettings = async (
  userId: string,
  notifications: Partial<UserSettings['notifications']>
): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings(userId, { notifications: notifications as UserSettings['notifications'] });
};

/**
 * Update privacy settings for the authenticated user - MOCK VERSION
 */
export const updatePrivacySettings = async (
  userId: string,
  privacy: Partial<UserSettings['privacy']>
): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings(userId, { privacy: privacy as UserSettings['privacy'] });
};

/**
 * Reset settings to defaults for the authenticated user - MOCK VERSION
 */
export const resetUserSettings = async (): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings(DEFAULT_SETTINGS);
};
