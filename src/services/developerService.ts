/**
 * Developer Service
 *
 * 🚨 DEVELOPMENT ONLY 🚨
 *
 * Helper functions for development and testing.
 * Provides quick access to create/manipulate data, bypass restrictions, etc.
 */

import { supabase } from '../lib/supabase';
import { createDevelopmentData, cleanupDevelopmentData } from './developmentDataService';
import { currentUserProfile } from './mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('DeveloperService');

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not authenticated');
  return user.id;
}

/**
 * Quick add a pending match
 */
export const quickAddMatch = async (status: 'pending' | 'accepted' = 'pending'): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error('[DevService] No user logged in');
    return;
  }

  const mockUserId = `quick-match-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const matchData: any = {
    user_id_1: userId,
    user_id_2: mockUserId,
    status,
    community_score: 90,
    algorithm_score: 92,
    proposed_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  if (status === 'accepted') {
    matchData.user_1_decision = 'accepted';
    matchData.user_2_decision = 'accepted';
    matchData.matched_at = new Date().toISOString();
  }

  await supabase.from('matches').insert(matchData);
  logger.info('[DevService] ✅ Quick match added');
};

/**
 * Reset all user data (matches, surveys, friends, messages)
 */
export const resetAllData = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  logger.info('[DevService] 🧹 Resetting all data...');
  await cleanupDevelopmentData(userId);
  logger.info('[DevService] ✅ All data reset');
};

/**
 * Generate fresh mock data
 */
export const generateMockData = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  logger.info('[DevService] 🚀 Generating mock data...');
  await createDevelopmentData(userId, true);
  logger.info('[DevService] ✅ Mock data generated');
};

/**
 * Complete user profile to 100%
 */
export const completeProfile = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  // Check if profile exists
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    logger.error('[DevService] No profile found');
    return;
  }

  // Update profile with all fields
  await supabase
    .from('user_profiles')
    .update({
      photos: [
        { id: 'dev-1', url: 'https://i.pravatar.cc/300?img=1', isMain: true, order: 0 },
        { id: 'dev-2', url: 'https://i.pravatar.cc/300?img=2', isMain: false, order: 1 },
        { id: 'dev-3', url: 'https://i.pravatar.cc/300?img=3', isMain: false, order: 2 },
      ],
      interests: ['Running', 'Reading', 'Cooking', 'Travel', 'Photography'],
      values: ['Family', 'Ambition', 'Honesty', 'Adventure', 'Career'],
    })
    .eq('user_id', userId);

  // Ensure deep questions are answered
  const { data: questions } = await supabase
    .from('deep_question_answers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!questions) {
    await supabase.from('deep_question_answers').insert({
      user_id: userId,
      answers: {
        1: "Coffee shop with a good book, then a long run in Central Park.",
        15: "Lack of ambition and dishonesty. I value people who know what they want.",
        30: "Leading a team, married with kids, living in the West Village.",
      },
      displayed_question_ids: [1, 15, 30],
    });
  }

  logger.info('[DevService] ✅ Profile completed to 100%');
};

/**
 * Clear profile data (reset to incomplete)
 */
export const clearProfile = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  await supabase
    .from('user_profiles')
    .update({
      photos: [],
      interests: [],
      values: [],
    })
    .eq('user_id', userId);

  await supabase
    .from('deep_question_answers')
    .delete()
    .eq('user_id', userId);

  logger.info('[DevService] ✅ Profile cleared');
};

/**
 * Extend all match expiry times (prevent expiration)
 */
export const extendAllMatches = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

  await supabase
    .from('matches')
    .update({ expires_at: futureDate.toISOString() })
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

  logger.info('[DevService] ✅ All matches extended');
};

/**
 * Get current app state info
 */
export const getAppState = async (): Promise<any> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [profile, matches, friends] = await Promise.all([
    supabase.from('user_profiles').select('id, first_name, is_paused, karma_score').eq('user_id', userId).single(),
    supabase.from('matches').select('id').or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
    supabase.from('friends').select('id').eq('user_id', userId),
  ]);

  return {
    userId,
    profile: profile.data,
    matchCount: matches.data?.length || 0,
    friendCount: friends.data?.length || 0,
  };
};

/**
 * Clear all AsyncStorage data
 */
export const clearAsyncStorage = async (): Promise<void> => {
  await AsyncStorage.clear();
  logger.info('[DevService] ✅ AsyncStorage cleared');
};

/**
 * Quick sign out
 */
export const quickSignOut = async (): Promise<void> => {
  await supabase.auth.signOut();
  logger.info('[DevService] ✅ Signed out');
};

export interface MockLoveTabState {
  enabled: boolean;
  type: 'match' | 'empty' | 'survey' | 'survey_not_completed' | 'survey_completed';
  communityScore?: number;
  expiresAt?: string;
  autoOpenProfileModal?: boolean;
}

/**
 * Get mock Love Tab state for development UI testing.
 * Returns null by default (feature disabled). Override in development as needed.
 */
export const getMockLoveTabState = async (): Promise<MockLoveTabState | null> => {
  return null;
};

/**
 * Sign in as the mock Alex profile
 *
 * Uses signInAnonymously() to establish a session:
 * - Mock Supabase: always returns Alex's hardcoded user ID (00000000-0000-0000-0000-000000000001)
 * - Real Supabase: creates an anonymous session, then fills the profile with Alex's data
 *
 * The AppNavigator's onAuthStateChange listener will automatically navigate to MainTabs
 * once the session is established.
 */
export const signInAsAlex = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      logger.error('[DevService] signInAnonymously error:', error.message);
      return { success: false, error: error.message };
    }

    const userId = data?.user?.id;
    if (!userId) {
      return { success: false, error: 'No user ID returned from sign-in' };
    }

    // Fill the profile with Alex's data
    await supabase.from('user_profiles').upsert({
      user_id: userId,
      photos: currentUserProfile.photos,
      interests: currentUserProfile.interests,
      values: currentUserProfile.values,
    }, { onConflict: 'user_id' });

    // Fill Alex's deep question answers
    const answers: Record<number, string> = {};
    for (const q of currentUserProfile.deepQuestions ?? []) {
      answers[q.questionId] = q.answer;
    }
    await supabase.from('deep_question_answers').upsert({
      user_id: userId,
      answers,
      displayed_question_ids: currentUserProfile.displayedQuestions ?? [],
    }, { onConflict: 'user_id' });

    logger.info('[DevService] ✅ Signed in as Alex (user ID:', userId, ')');
    return { success: true };
  } catch (err: any) {
    logger.error('[DevService] Error signing in as Alex:', err);
    return { success: false, error: err.message };
  }
};
