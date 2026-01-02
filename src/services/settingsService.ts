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
export const getUserSettings = async (): Promise<ApiResponse<UserSettings>> => {
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
  settings: Partial<UserSettings>
): Promise<ApiResponse<UserSettings>> => {
  try {
    console.log('[MOCK SETTINGS] Updating user settings');

    // Ensure settings exist
    if (!mockSettings) {
      mockSettings = {
        id: 'settings-1',
        userId: '00000000-0000-0000-0000-000000000001',
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Update notifications
    if (settings.notifications) {
      mockSettings.notifications = {
        ...mockSettings.notifications,
        ...settings.notifications,
      };
    }

    // Update privacy
    if (settings.privacy) {
      mockSettings.privacy = {
        ...mockSettings.privacy,
        ...settings.privacy,
      };
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
  notifications: Partial<UserSettings['notifications']>
): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings({ notifications });
};

/**
 * Update privacy settings for the authenticated user - MOCK VERSION
 */
export const updatePrivacySettings = async (
  privacy: Partial<UserSettings['privacy']>
): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings({ privacy });
};

/**
 * Reset settings to defaults for the authenticated user - MOCK VERSION
 */
export const resetUserSettings = async (): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings(DEFAULT_SETTINGS);
};
