/**
 * Development Data Service
 *
 * 🚨 DEVELOPMENT ONLY 🚨
 *
 * This service creates mock data to allow full app navigation during development.
 * It creates:
 * - Mock matches (pending and accepted)
 * - Mock daily surveys
 * - Mock friends
 * - Mock messages
 *
 * CONTROLLED BY: FEATURES.DEVELOPMENT_CREATE_MOCK_DATA
 *
 * TO DISABLE FOR PRODUCTION:
 * Set DEVELOPMENT_CREATE_MOCK_DATA: false in src/config/features.ts
 */

import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { getUserProfile } from './profileService';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('DevelopmentDataService');

/**
 * Generate a valid UUID v4
 * This creates UUIDs that Supabase will accept for user_id columns
 *
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - The 4 indicates UUID version 4
 * - The y is one of 8, 9, A, or B (variant bits)
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Mock user data for creating realistic profiles
const MOCK_NAMES = {
  male: [
    { first: 'James', last: 'Anderson' },
    { first: 'Michael', last: 'Chen' },
    { first: 'David', last: 'Williams' },
    { first: 'Robert', last: 'Martinez' },
    { first: 'Daniel', last: 'Thompson' },
  ],
  female: [
    { first: 'Sarah', last: 'Johnson' },
    { first: 'Emily', last: 'Davis' },
    { first: 'Jessica', last: 'Garcia' },
    { first: 'Ashley', last: 'Miller' },
    { first: 'Sophia', last: 'Rodriguez' },
  ],
};

const MOCK_JOBS = [
  'Investment Banker at Goldman Sachs',
  'Consultant at McKinsey',
  'Attorney at Sullivan & Cromwell',
  'Product Manager at Google',
  'Doctor at Mount Sinai',
  'Software Engineer at Meta',
  'Financial Analyst at JP Morgan',
];

const MOCK_SCHOOLS = [
  'Harvard University',
  'Yale University',
  'Columbia University',
  'Stanford University',
  'NYU',
  'Princeton University',
];

const MOCK_INTERESTS = [
  'Running', 'Yoga', 'Reading', 'Cooking', 'Travel', 'Photography',
  'Tennis', 'Hiking', 'Wine Tasting', 'Live Music', 'Art Museums',
];

const MOCK_VALUES = [
  'Family', 'Ambition', 'Honesty', 'Adventure', 'Career', 'Health',
  'Creativity', 'Intelligence', 'Humor', 'Kindness',
];

const MOCK_QUESTIONS = [
  {
    tier: 1,
    questionId: 1,
    question: "What's your ideal Sunday morning?",
    answer: 'Coffee shop with a good book, then a long run in Central Park.',
  },
  {
    tier: 2,
    questionId: 15,
    question: "What's a relationship non-negotiable for you?",
    answer: 'Lack of ambition and dishonesty. I value people who know what they want.',
  },
  {
    tier: 3,
    questionId: 30,
    question: 'Where do you see yourself in 10 years?',
    answer: 'Leading a team, married with kids, living in the West Village.',
  },
];

/**
 * Create a mock user profile
 */
const createMockUserProfile = async (
  userId: string,
  gender: 'male' | 'female',
  index: number
): Promise<string | null> => {
  const names = MOCK_NAMES[gender];
  const name = names[index % names.length];
  const age = 25 + Math.floor(Math.random() * 6); // 25-30

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        first_name: name.first,
        last_name: name.last,
        age,
        gender: [gender],
        pronouns: gender === 'male' ? 'he/him' : 'she/her',
        height_inches: gender === 'male' ? 70 + Math.floor(Math.random() * 8) : 62 + Math.floor(Math.random() * 8),
        education_level: 'bachelors',
        school: MOCK_SCHOOLS[index % MOCK_SCHOOLS.length],
        location: 'New York, NY',
        hometown: 'New York, NY',
        current_job: MOCK_JOBS[index % MOCK_JOBS.length].split(' at ')[0],
        company_position: MOCK_JOBS[index % MOCK_JOBS.length],
        ethnicity: 'Prefer not to say',
        religion: 'Prefer not to say',
        political_leaning: 'moderate',
        drinking_frequency: 'Sometimes',
        cannabis_frequency: 'No',
        tobacco_frequency: 'No',
        other_drugs_frequency: 'No',
        has_children: 'no',
        family_plans: 'want_someday',
        interests: MOCK_INTERESTS.slice(0, 5 + Math.floor(Math.random() * 3)),
        values: MOCK_VALUES.slice(0, 5 + Math.floor(Math.random() * 3)),
        photos: [
          {
            id: `photo-${index}-1`,
            url: `https://i.pravatar.cc/300?img=${index + (gender === 'male' ? 10 : 40)}`,
            isMain: true,
            order: 0,
          },
        ],
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[DevData] Error creating profile:', error);
      return null;
    }

    // Create deep question answers
    await supabase.from('deep_question_answers').insert({
      user_id: userId,
      answers: MOCK_QUESTIONS.reduce((acc, q) => ({
        ...acc,
        [q.questionId]: q.answer,
      }), {}),
      displayed_question_ids: MOCK_QUESTIONS.map(q => q.questionId),
    });

    // Create user preferences
    await supabase.from('user_preferences').insert({
      user_id: userId,
      preferred_gender: gender === 'male' ? 'female' : 'male',
      age_min: 24,
      age_max: 32,
      looking_for: 'relationship',
    });

    return data.id;
  } catch (error) {
    logger.error('[DevData] Error creating mock user:', error);
    return null;
  }
};

/**
 * Create mock matches for the current user
 */
const createMockMatches = async (currentUserId: string): Promise<void> => {
  logger.info('[DevData] Creating mock matches...');

  // Get current user's profile to determine gender
  const profileResponse = await getUserProfile();

  if (!profileResponse.ok || !profileResponse.data) {
    logger.error('[DevData] Current user profile not found');
    return;
  }

  const currentProfile = profileResponse.data;
  const currentGender = currentProfile.gender?.[0]?.toLowerCase() || 'male';
  const oppositeGender = currentGender === 'male' ? 'female' : 'male';

  // Create 3 mock user accounts and profiles
  const mockUserIds: string[] = [];

  for (let i = 0; i < 3; i++) {
    // Create auth user (using service role would be needed for real creation)
    // For now, we'll just create profiles and matches with placeholder IDs
    const mockUserId = generateUUID();
    const profileId = await createMockUserProfile(mockUserId, oppositeGender, i);
    if (profileId) {
      mockUserIds.push(mockUserId);
    }
  }

  // Create matches
  // 1 pending match, 1 accepted match, 1 expired match
  const matchStatuses = ['pending', 'accepted', 'expired'];

  for (let i = 0; i < Math.min(3, mockUserIds.length); i++) {
    const status = matchStatuses[i];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (status === 'pending' ? 48 : -1));

    const matchData: any = {
      user_id_1: currentUserId,
      user_id_2: mockUserIds[i],
      status,
      community_score: 85 + Math.floor(Math.random() * 15),
      algorithm_score: 88 + Math.floor(Math.random() * 10),
      proposed_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    if (status === 'accepted') {
      matchData.user_1_decision = 'accepted';
      matchData.user_2_decision = 'accepted';
      matchData.matched_at = new Date().toISOString();
    } else if (status === 'pending') {
      matchData.user_1_decision = 'pending';
      matchData.user_2_decision = 'pending';
    }

    const { data: match, error } = await supabase
      .from('matches')
      .insert(matchData)
      .select()
      .single();

    if (error) {
      logger.error('[DevData] Error creating match:', error);
    } else if (status === 'accepted' && match) {
      // Create some mock messages for accepted match
      await createMockMessages(match.id, currentUserId, mockUserIds[i]);
    }
  }

  logger.info('[DevData] Created mock matches');
};

/**
 * Create mock messages for a match
 */
const createMockMessages = async (
  matchId: string,
  user1Id: string,
  user2Id: string
): Promise<void> => {
  const messages = [
    { from: user2Id, text: "Hey! So excited we matched! 😊", delay: -3600000 }, // 1 hour ago
    { from: user1Id, text: "Me too! How's your week going?", delay: -3000000 }, // 50 min ago
    { from: user2Id, text: "Pretty busy with work but good! You?", delay: -2400000 }, // 40 min ago
    { from: user1Id, text: "Same here. Want to grab coffee this weekend?", delay: -1800000 }, // 30 min ago
  ];

  for (const msg of messages) {
    const sentAt = new Date(Date.now() + msg.delay);
    await supabase.from('messages').insert({
      match_id: matchId,
      sender_user_id: msg.from,
      receiver_user_id: msg.from === user1Id ? user2Id : user1Id,
      message_text: msg.text,
      created_at: sentAt.toISOString(),
      is_read: true,
      read_at: new Date(sentAt.getTime() + 300000).toISOString(), // Read 5 min later
    });
  }
};

/**
 * Create mock friends
 */
const createMockFriends = async (currentUserId: string): Promise<void> => {
  logger.info('[DevData] Creating mock friends...');

  // Get current user's gender
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('gender')
    .eq('user_id', currentUserId)
    .single();

  if (!currentProfile) return;

  const sameGender = currentProfile.gender[0];

  // Create 2 mock friends
  for (let i = 0; i < 2; i++) {
    const friendUserId = generateUUID();
    await createMockUserProfile(friendUserId, sameGender, 30 + i);

    // Create friend connection
    await supabase.from('friends').insert({
      user_id: currentUserId,
      friend_id: friendUserId,
      added_at: new Date().toISOString(),
    });

    // Create friend code for the friend
    await supabase.from('friend_codes').insert({
      user_id: friendUserId,
      code: `BRIDGE-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    });
  }

  logger.info('[DevData] Created mock friends');
};

/**
 * Main function: Create all mock development data
 * @param recreate If true, cleans up existing data before creating new data (useful for testing)
 */
export const createDevelopmentData = async (currentUserId: string, recreate: boolean = true): Promise<void> => {
  logger.info('[DevData] 🚀 Starting development data creation...');

  try {
    // Check if user already has data
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('id')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
      .limit(1);

    const hasExistingData = existingMatches && existingMatches.length > 0;

    if (hasExistingData && !recreate) {
      logger.info('[DevData] ✅ User already has data, skipping creation');
      return;
    }

    if (hasExistingData && recreate) {
      logger.info('[DevData] 🧹 Cleaning up existing mock data...');
      await cleanupDevelopmentData(currentUserId);
    }

    // Create all mock data
    await Promise.all([
      createMockMatches(currentUserId),
      createMockFriends(currentUserId),
    ]);

    logger.info('[DevData] ✅ Development data created successfully');
  } catch (error) {
    logger.error('[DevData] ❌ Error creating development data:', error);
  }
};

/**
 * Clean up all mock development data
 */
export const cleanupDevelopmentData = async (currentUserId: string): Promise<void> => {
  logger.info('[DevData] 🧹 Cleaning up development data...');

  try {
    // Delete matches where user is involved
    await supabase
      .from('matches')
      .delete()
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    // Delete friends
    await supabase
      .from('friends')
      .delete()
      .eq('user_id', currentUserId);

    // Note: We don't delete mock user profiles as they might be referenced
    // They'll be cleaned up manually or with a separate admin function

    logger.info('[DevData] ✅ Development data cleaned up');
  } catch (error) {
    logger.error('[DevData] ❌ Error cleaning up development data:', error);
  }
};

/**
 * Check if development data exists for user
 */
export const hasDevelopmentData = async (currentUserId: string): Promise<boolean> => {
  try {
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
      .limit(1);

    return (matches && matches.length > 0) || false;
  } catch (error) {
    logger.error('[DevData] Error checking for development data:', error);
    return false;
  }
};
