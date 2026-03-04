/**
 * Friend Service
 *
 * Handles friend code management and friend relationships.
 * Features:
 * - Generate and retrieve user friend codes
 * - Add friends using friend codes
 * - Remove friends
 * - Get friend lists with profiles
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, UserProfile } from '../types';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { getMultiplePhotoSignedUrls } from './photoService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  RateLimitAction,
  formatRetryTime,
} from '../utils/rateLimiter';

const logger = createLogger('FriendService');

/**
 * Friend Code data structure
 */
export interface FriendCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Friend data structure with profile
 */
export interface FriendWithProfile {
  friendshipId: string;
  userId: string;
  friendId: string;
  addedAt: string;
  profile: UserProfile;
}

/**
 * Add friend result
 */
export interface AddFriendResult {
  friendUserId: string;
  friendProfile?: UserProfile;
}

/**
 * Generate a mock friend code in BRIDGE-XXXX-XXXX format
 */
const generateMockFriendCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes I, O, 0, 1 for clarity
  let code = 'BRIDGE-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Get or create a stable mock friend code for a user.
 * Persists the generated code to AsyncStorage so the same user always sees
 * the same code even when the Supabase database is unavailable (mock/dev mode).
 */
const getOrCreateStableMockCode = async (userId: string): Promise<string> => {
  const storageKey = `mock_friend_code_${userId}`;
  try {
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached) return cached;
    const newCode = generateMockFriendCode();
    await AsyncStorage.setItem(storageKey, newCode);
    return newCode;
  } catch {
    // If AsyncStorage is unavailable, fall back to a deterministic code derived
    // from the userId so it is at least consistent within the same session.
    // A simple djb2-style hash of the userId drives character selection from
    // the same charset, so the result is stable for a given userId.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let hash = 5381;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash * 33) ^ userId.charCodeAt(i)) >>> 0; // keep as uint32
    }
    let fallback = 'BRIDGE-';
    for (let i = 0; i < 4; i++) {
      fallback += chars[((hash >>> (i * 4)) ^ (hash * (i + 3))) % chars.length];
    }
    fallback += '-';
    for (let i = 0; i < 4; i++) {
      fallback += chars[((hash >>> ((i + 4) * 4)) ^ (hash * (i + 7))) % chars.length];
    }
    return fallback;
  }
};

/**
 * Error response helper
 */
const createErrorResponse = <T>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: {
    code,
    message,
  },
});

/**
 * Get the current user's friend code
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getUserFriendCode = async (): Promise<ApiResponse<FriendCode>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('friend_codes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If user doesn't have a friend code yet, create one
      if (error.code === 'PGRST116') {
        return await createFriendCode(userId);
      }

      // FRONTEND MOCK: If database query fails, return a stable mock code
      logger.warn('Friend code fetch failed, returning mock code:', error.message);
      const mockCode = await getOrCreateStableMockCode(userId);
      return {
        ok: true,
        data: {
          id: 'mock-id',
          userId: userId,
          code: mockCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        userId: data.user_id,
        code: data.code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: any) {
    // FRONTEND MOCK: If anything fails, return a stable mock code
    logger.warn('Friend code operation failed, returning mock code:', error.message);
    // Attempt to get userId for stable code lookup; fall back to a generated code
    let stableCode: string;
    try {
      const uid = await requireAuth();
      stableCode = await getOrCreateStableMockCode(uid);
      return {
        ok: true,
        data: {
          id: 'mock-id',
          userId: uid,
          code: stableCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    } catch {
      stableCode = generateMockFriendCode();
      return {
        ok: true,
        data: {
          id: 'mock-id',
          userId: 'unknown',
          code: stableCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }
  }
};

/**
 * Create a friend code for a user (called automatically on signup via trigger)
 */
const createFriendCode = async (userId: string): Promise<ApiResponse<FriendCode>> => {
  // Generate the code outside the try block so the catch fallback can reference it
  const codeData = generateMockFriendCode();
  try {
    // Try to insert the friend code into database
    const { data, error } = await supabase
      .from('friend_codes')
      .insert({
        user_id: userId,
        code: codeData,
      })
      .select()
      .single();

    if (error) {
      // FRONTEND MOCK: If database insert fails, return mock code anyway
      logger.warn('Friend code insert failed, returning mock code:', error.message);
      return {
        ok: true,
        data: {
          id: 'mock-id',
          userId: userId,
          code: codeData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        userId: data.user_id,
        code: data.code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: any) {
    // FRONTEND MOCK: If anything fails, return mock code
    logger.warn('Friend code creation failed, returning mock code:', error.message);
    return {
      ok: true,
      data: {
        id: 'mock-id',
        userId: userId,
        code: codeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
};

/**
 * Add a friend using their friend code
 * SECURITY: Rate limited to prevent brute force attacks on friend codes
 */
export const addFriendByCode = async (
  friendCode: string
): Promise<ApiResponse<AddFriendResult>> => {
  try {
    // SECURITY: Get authenticated user for rate limiting
    const userId = await requireAuth();

    // SECURITY: Check rate limit before attempting friend code
    const rateLimitResult = await checkRateLimit(userId, RateLimitAction.FRIEND_CODE_ATTEMPT);

    if (!rateLimitResult.ok) {
      return createErrorResponse(
        'RATE_LIMIT_CHECK_FAILED',
        rateLimitResult.error?.message || 'Failed to check rate limit'
      );
    }

    if (rateLimitResult.data?.allowed === false) {
      const retryTime = formatRetryTime(rateLimitResult.data.retryAfterSeconds ?? 60);
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        `Too many friend code attempts. Please try again in ${retryTime}.`
      );
    }

    // Record the attempt for rate limiting
    await recordRateLimitAttempt(userId, RateLimitAction.FRIEND_CODE_ATTEMPT, {
      friendCode: friendCode.substring(0, 10) + '...', // Don't log full code
      timestamp: new Date().toISOString(),
    });

    // Call the database function to add friend
    const { data, error } = await supabase
      .rpc('add_friend_by_code', { friend_code: friendCode.toUpperCase() });

    if (error) {
      return createErrorResponse('ADD_FRIEND_ERROR', error.message);
    }

    // The function returns an array with one row
    const result = data?.[0];

    if (!result) {
      return createErrorResponse('ADD_FRIEND_ERROR', 'No response from server');
    }

    if (!result.success) {
      return createErrorResponse('ADD_FRIEND_FAILED', result.message);
    }

    // Fetch the friend's profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', result.friend_user_id)
      .single();

    return {
      ok: true,
      data: {
        friendUserId: result.friend_user_id,
        friendProfile: profileData ? formatDatabaseProfile(profileData) : undefined,
      },
    };
  } catch (error: any) {
    return createErrorResponse('ADD_FRIEND_ERROR', error.message || 'Failed to add friend');
  }
};

/**
 * Get list of friends with their profiles
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getFriends = async (): Promise<ApiResponse<FriendWithProfile[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // 🚨 DEVELOPMENT MODE: Return mock friends for quick testing
    const { FEATURES } = await import('../config/features');
    if (FEATURES.DEVELOPMENT_AUTO_FILL_ONBOARDING) {
      const { mockProfiles } = await import('./mockData');

      // Create mock friends from mock profiles
      const mockFriendsData: FriendWithProfile[] = mockProfiles.slice(0, 3).map((profile, index) => ({
        friendshipId: `mock-friendship-${index + 1}`,
        userId: userId,
        friendId: profile.userId,
        addedAt: new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(), // Stagger dates
        profile: {
          id: profile.id,
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: 'Friend',
          age: profile.age,
          gender: profile.gender || [],
          pronouns: 'they/them',
          educationLevel: 'bachelors',
          school: (profile as any).education || '',
          height: profile.height,
          ethnicity: '',
          religion: '',
          politicalLeaning: '',
          location: profile.location || '',
          photos: profile.photos || [],
          interests: profile.interests || [],
          values: profile.values || [],
          lifestyle: profile.lifestyle || {} as any,
          nonNegotiables: [],
          preferences: profile.preferences || {} as any,
          isPaused: false,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          currentJob: (profile as any).occupation || '',
        },
      }));

      return { ok: true, data: mockFriendsData };
    }

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        added_at,
        friend_profile:user_profiles!friends_friend_id_fkey(*)
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      return createErrorResponse('FETCH_ERROR', error.message);
    }

    const friends: FriendWithProfile[] = data.map((item: any) => ({
      friendshipId: item.id,
      userId: item.user_id,
      friendId: item.friend_id,
      addedAt: item.added_at,
      profile: formatDatabaseProfile(item.friend_profile),
    }));

    // Resolve storage paths to signed URLs for friend profile photos
    const allPaths = new Set<string>();
    for (const f of friends) {
      if (f.profile.photos) {
        for (const photo of f.profile.photos) {
          if (photo.url && !photo.url.startsWith('http') && !photo.url.startsWith('file://')) {
            allPaths.add(photo.url);
          }
        }
      }
    }

    if (allPaths.size > 0) {
      const urlMapRes = await getMultiplePhotoSignedUrls(Array.from(allPaths), 86400);
      if (urlMapRes.ok && urlMapRes.data) {
        for (const f of friends) {
          if (f.profile.photos) {
            f.profile.photos = f.profile.photos
              .filter(p => p.url && !p.url.startsWith('file://'))
              .map(p => ({
                ...p,
                url: urlMapRes.data![p.url] || p.url,
              }));
          }
        }
      }
    }

    return {
      ok: true,
      data: friends,
    };
  } catch (error: any) {
    return createErrorResponse('FETCH_ERROR', error.message || 'Failed to fetch friends');
  }
};

/**
 * Remove a friend
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const removeFriend = async (
  friendId: string
): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Remove both directions of the friendship
    const { error: error1 } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId);

    if (error1) {
      return createErrorResponse('DELETE_ERROR', error1.message);
    }

    const { error: error2 } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId);

    if (error2) {
      return createErrorResponse('DELETE_ERROR', error2.message);
    }

    return {
      ok: true,
    };
  } catch (error: any) {
    return createErrorResponse('DELETE_ERROR', error.message || 'Failed to remove friend');
  }
};

/**
 * Get friend count for a user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const getFriendCount = async (): Promise<ApiResponse<number>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // 🚨 DEVELOPMENT MODE: Return mock friend count to match getFriends() behavior
    const { FEATURES } = await import('../config/features');
    if (FEATURES.DEVELOPMENT_AUTO_FILL_ONBOARDING) {
      // Return 3 to match the mock friends in getFriends()
      return { ok: true, data: 3 };
    }

    const { count, error } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      return createErrorResponse('COUNT_ERROR', error.message);
    }

    return {
      ok: true,
      data: count || 0,
    };
  } catch (error: any) {
    return createErrorResponse('COUNT_ERROR', error.message || 'Failed to count friends');
  }
};

/**
 * Check if the authenticated user is friends with another user
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const areFriends = async (
  friendId: string
): Promise<ApiResponse<boolean>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return createErrorResponse('CHECK_ERROR', error.message);
    }

    return {
      ok: true,
      data: !!data,
    };
  } catch (error: any) {
    return createErrorResponse('CHECK_ERROR', error.message || 'Failed to check friendship');
  }
};

// ============================================================================
// PHASE 2: Friend Statistics Functions
// ============================================================================

export interface FriendStats {
  friendId: string;
  friendCode: string;
  firstName: string;
  matchesIntroduced: number;
  successfulMatches: number;
  matchSuccessRate: number;
  matchmakerBadge: string;
  badgeColor: string;
}

/**
 * Get friend statistics including matchmaker badges
 * Note: Referral tracking to be implemented in Phase 4
 */
export const getFriendStats = async (): Promise<ApiResponse<FriendStats[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    const { data, error } = await supabase.rpc('get_friend_stats', {
      p_user_id: userId,
    });

    if (error) {
      return createErrorResponse('FETCH_STATS_ERROR', error.message);
    }

    if (!data) {
      return {
        ok: true,
        data: [],
      };
    }

    const friendStats: FriendStats[] = data.map((friend: any) => ({
      friendId: friend.friend_id,
      friendCode: friend.friend_code,
      firstName: friend.first_name,
      matchesIntroduced: friend.matches_introduced,
      successfulMatches: friend.successful_matches,
      matchSuccessRate: friend.match_success_rate,
      matchmakerBadge: friend.matchmaker_badge,
      badgeColor: friend.badge_color,
    }));

    return {
      ok: true,
      data: friendStats,
    };
  } catch (error: any) {
    return createErrorResponse('FETCH_STATS_ERROR', error.message || 'Failed to fetch friend stats');
  }
};

/**
 * Safely parse JSONB data that may already be parsed by Supabase
 * Supabase automatically parses JSONB columns, so we need to handle both cases
 */
const safeParseJson = (value: any, defaultValue: any[] = []): any => {
  if (value === null || value === undefined) return defaultValue;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

/**
 * Format database profile to match UserProfile type
 */
const formatDatabaseProfile = (data: any): UserProfile => {
  return {
    id: data.id,
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    age: data.age,
    gender: data.gender || [],
    pronouns: data.pronouns,
    customPronouns: data.custom_pronouns,
    currentJob: data.current_job || '',
    company: data.company_position || '',
    educationLevel: data.education_level,
    school: data.school,
    height: data.height_inches,
    ethnicity: data.ethnicity,
    religion: data.religion,
    politicalLeaning: data.political_leaning,
    location: data.location || '',
    photos: safeParseJson(data.photos, []),
    interests: safeParseJson(data.interests, []),
    values: safeParseJson(data.values, []),
    lifestyle: {
      drinking: data.drinking_frequency,
      smoking: data.tobacco_frequency,
      exercise: 'often',
      children: data.has_children,
      pets: [],
    },
    nonNegotiables: [],
    preferences: {
      ageMin: 24,
      ageMax: 32,
      gender: data.preferred_gender || 'both',
      lookingFor: data.looking_for || 'relationship',
    },
    isPaused: data.is_paused,
    profileCompleted: data.profile_completed || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};
