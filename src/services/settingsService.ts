/**
 * Settings Service - REAL SUPABASE VERSION
 *
 * Handles user settings and preferences (notifications, privacy).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('SettingsService');

/**
 * User settings interface (aligned with backend if possible, or using JSONB)
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
const DEFAULT_SETTINGS = {
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

async function getCurrentUserId(): Promise<string> {
  const savedUserStr = await AsyncStorage.getItem('bridge_auth_user');
  if (savedUserStr) {
    const saved = JSON.parse(savedUserStr);
    if (saved?.id) return saved.id;
  }
  throw new Error('Not authenticated');
}

/**
 * Get user settings for the authenticated user
 */
export const getUserSettings = async (userId?: string): Promise<ApiResponse<UserSettings>> => {
  try {
    const finalUserId = userId || await getCurrentUserId();
    logger.info('[SETTINGS] Getting user settings for:', finalUserId);

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', finalUserId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Initialize default settings if none exist
      return resetUserSettings();
    }

    // Map DB columns to frontend interface
    // Note: If DB has different columns, map them here.
    // If using JSONB for the whole thing, it might look like data.settings
    return {
      ok: true,
      data: {
        id: data.id,
        userId: data.user_id,
        notifications: data.notifications || DEFAULT_SETTINGS.notifications,
        privacy: data.privacy || DEFAULT_SETTINGS.privacy,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: any) {
    logger.error('[SETTINGS] Get settings error:', error);
    return createErrorResponse('FETCH_ERROR', error.message || 'Failed to fetch settings');
  }
};

/**
 * Update user settings for the authenticated user
 */
export const updateUserSettings = async (
  userId: string | Partial<UserSettings>,
  settings?: Partial<UserSettings>
): Promise<ApiResponse<UserSettings>> => {
  try {
    const finalUserId = typeof userId === 'string' ? userId : await getCurrentUserId();
    const updates = typeof userId === 'string' ? settings : userId;

    logger.info('[SETTINGS] Updating user settings for:', finalUserId);

    // Fetch existing to merge
    const { data: existing } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', finalUserId)
      .maybeSingle();

    const currentNotifications = (existing?.notifications || DEFAULT_SETTINGS.notifications);
    const currentPrivacy = (existing?.privacy || DEFAULT_SETTINGS.privacy);

    const payload = {
      user_id: finalUserId,
      notifications: {
        ...currentNotifications,
        ...(updates?.notifications || {}),
      },
      privacy: {
        ...currentPrivacy,
        ...(updates?.privacy || {}),
      },
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(payload, { on_conflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return {
      ok: true,
      data: {
        id: data.id,
        userId: data.user_id,
        notifications: data.notifications,
        privacy: data.privacy,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: any) {
    logger.error('[SETTINGS] Update settings error:', error);
    return createErrorResponse('UPDATE_ERROR', error.message || 'Failed to update settings');
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (
  userId: string,
  notifications: Partial<UserSettings['notifications']>
): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings(userId, { notifications: notifications as UserSettings['notifications'] });
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (
  userId: string,
  privacy: Partial<UserSettings['privacy']>
): Promise<ApiResponse<UserSettings>> => {
  return updateUserSettings(userId, { privacy: privacy as UserSettings['privacy'] });
};

/**
 * Reset settings to defaults
 */
export const resetUserSettings = async (): Promise<ApiResponse<UserSettings>> => {
  try {
    const userId = await getCurrentUserId();
    return updateUserSettings(userId, DEFAULT_SETTINGS);
  } catch (error: any) {
    return createErrorResponse('RESET_ERROR', error.message || 'Failed to reset settings');
  }
};
