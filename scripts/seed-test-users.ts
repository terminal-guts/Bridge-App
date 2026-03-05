// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Seed Test Users for Community Matching System
 *
 * Creates realistic test users with profiles for backend testing.
 * Also generates grids, proposals, and other community data.
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 *
 * Prerequisites:
 *   - Supabase migrations applied
 *   - Environment variables set (.env)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TEST USER DATA
// ============================================================================

interface TestUser {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    age: number;
    gender: string[];
    pronouns: string;
    height: string;
    location: string;
    currentJob: string;
    companyPosition: string;
    educationLevel: string;
    school: string;
    interests: string[];
    values: string[];
    bio: string;
  };
}

const TEST_USERS: TestUser[] = [
  {
    email: 'alex.chen@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Alex',
      lastName: 'Chen',
      age: 27,
      gender: ['male'],
      pronouns: 'he/him',
      height: '5\'10"',
      location: 'Brooklyn, NY',
      currentJob: 'Software Engineer',
      companyPosition: 'Senior SWE at Google',
      educationLevel: 'bachelors',
      school: 'Stanford',
      interests: ['Coffee', 'Hiking', 'Photography'],
      values: ['Authenticity', 'Growth', 'Ambition'],
      bio: 'Software engineer who loves the outdoors. Always looking for the next adventure.',
    },
  },
  {
    email: 'maya.patel@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Maya',
      lastName: 'Patel',
      age: 26,
      gender: ['female'],
      pronouns: 'she/her',
      height: '5\'6"',
      location: 'Brooklyn, NY',
      currentJob: 'Product Designer',
      companyPosition: 'Designer at Airbnb',
      educationLevel: 'bachelors',
      school: 'NYU',
      interests: ['Art', 'Yoga', 'Travel'],
      values: ['Creativity', 'Kindness', 'Adventure'],
      bio: 'Designer with a passion for creating meaningful experiences.',
    },
  },
  {
    email: 'jordan.kim@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Jordan',
      lastName: 'Kim',
      age: 28,
      gender: ['non-binary'],
      pronouns: 'they/them',
      height: '5\'8"',
      location: 'Queens, NY',
      currentJob: 'Marketing Manager',
      companyPosition: 'Marketing Manager at Nike',
      educationLevel: 'masters',
      school: 'Columbia',
      interests: ['Running', 'Cooking', 'Music'],
      values: ['Authenticity', 'Justice', 'Growth'],
      bio: 'Marketing pro by day, chef by night. Love trying new recipes.',
    },
  },
  {
    email: 'ethan.rodriguez@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Ethan',
      lastName: 'Rodriguez',
      age: 29,
      gender: ['male'],
      pronouns: 'he/him',
      height: '6\'1"',
      location: 'Manhattan, NY',
      currentJob: 'Consultant',
      companyPosition: 'Consultant at McKinsey',
      educationLevel: 'masters',
      school: 'Harvard',
      interests: ['Reading', 'Tennis', 'Wine'],
      values: ['Excellence', 'Integrity', 'Impact'],
      bio: 'Strategy consultant who loves a good book and a glass of wine.',
    },
  },
  {
    email: 'sophia.williams@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Sophia',
      lastName: 'Williams',
      age: 25,
      gender: ['female'],
      pronouns: 'she/her',
      height: '5\'5"',
      location: 'Brooklyn, NY',
      currentJob: 'Teacher',
      companyPosition: 'English Teacher at PS 123',
      educationLevel: 'bachelors',
      school: 'Yale',
      interests: ['Books', 'Theater', 'Baking'],
      values: ['Education', 'Empathy', 'Creativity'],
      bio: 'Teacher who believes in the power of stories and fresh-baked cookies.',
    },
  },
  {
    email: 'liam.johnson@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Liam',
      lastName: 'Johnson',
      age: 27,
      gender: ['male'],
      pronouns: 'he/him',
      height: '5\'11"',
      location: 'Williamsburg, NY',
      currentJob: 'Data Scientist',
      companyPosition: 'Data Scientist at Netflix',
      educationLevel: 'phd',
      school: 'MIT',
      interests: ['Gaming', 'Climbing', 'Podcasts'],
      values: ['Curiosity', 'Innovation', 'Balance'],
      bio: 'Data scientist by day, rock climber by weekend. Love deep conversations.',
    },
  },
  {
    email: 'olivia.martinez@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Olivia',
      lastName: 'Martinez',
      age: 30,
      gender: ['female'],
      pronouns: 'she/her',
      height: '5\'7"',
      location: 'Manhattan, NY',
      currentJob: 'Product Manager',
      companyPosition: 'PM at Meta',
      educationLevel: 'masters',
      school: 'Stanford',
      interests: ['Fitness', 'Startups', 'Dance'],
      values: ['Impact', 'Health', 'Connection'],
      bio: 'PM who loves building products people love. Salsa dancer on weekends.',
    },
  },
  {
    email: 'noah.anderson@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Noah',
      lastName: 'Anderson',
      age: 26,
      gender: ['male'],
      pronouns: 'he/him',
      height: '6\'0"',
      location: 'Brooklyn, NY',
      currentJob: 'Architect',
      companyPosition: 'Architect at SOM',
      educationLevel: 'masters',
      school: 'Cornell',
      interests: ['Architecture', 'Photography', 'Cycling'],
      values: ['Design', 'Sustainability', 'Beauty'],
      bio: 'Architect passionate about sustainable design and urban spaces.',
    },
  },
  {
    email: 'ava.lee@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Ava',
      lastName: 'Lee',
      age: 28,
      gender: ['female'],
      pronouns: 'she/her',
      height: '5\'4"',
      location: 'Queens, NY',
      currentJob: 'Lawyer',
      companyPosition: 'Associate at Cravath',
      educationLevel: 'law_degree',
      school: 'Columbia Law',
      interests: ['Yoga', 'Museums', 'Volunteering'],
      values: ['Justice', 'Community', 'Growth'],
      bio: 'Corporate lawyer who finds balance through yoga and art.',
    },
  },
  {
    email: 'mason.taylor@bridgetest.com',
    password: 'testpass123',
    profile: {
      firstName: 'Mason',
      lastName: 'Taylor',
      age: 29,
      gender: ['male'],
      pronouns: 'he/him',
      height: '5\'10"',
      location: 'Manhattan, NY',
      currentJob: 'Investment Banker',
      companyPosition: 'Analyst at Goldman Sachs',
      educationLevel: 'masters',
      school: 'Wharton',
      interests: ['Finance', 'Golf', 'Travel'],
      values: ['Excellence', 'Ambition', 'Adventure'],
      bio: 'Banker who works hard and travels harder. Always planning the next trip.',
    },
  },
];

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function createTestUser(testUser: TestUser): Promise<string | null> {
  console.log(`\n📝 Creating user: ${testUser.email}`);

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testUser.email,
    password: testUser.password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log(`   ⚠️  User already exists, skipping...`);
      // Try to get existing user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === testUser.email);
      return existingUser?.id || null;
    }
    console.error(`   ❌ Failed to create auth user: ${authError.message}`);
    return null;
  }

  const userId = authData.user.id;
  console.log(`   ✅ Auth user created: ${userId}`);

  // 2. Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      first_name: testUser.profile.firstName,
      last_name: testUser.profile.lastName,
      age: testUser.profile.age,
      gender: Array.isArray(testUser.profile.gender) ? testUser.profile.gender[0] : testUser.profile.gender, // Fix: send string not array
      pronouns: testUser.profile.pronouns,
      height: testUser.profile.height,
      location_city: testUser.profile.location.split(',')[0].trim(),
      location_state: 'NY',
      current_job: testUser.profile.currentJob,
      company_position: testUser.profile.companyPosition,
      education_level: testUser.profile.educationLevel,
      school: testUser.profile.school,
      interests: testUser.profile.interests,
      values: testUser.profile.values,
      bio: testUser.profile.bio,
      is_active: true,
      is_in_dating_pool: true,
      ethnicity: 'Prefer not to say',
      religion: 'Agnostic',
      political_leaning: 'moderate',
    });

  if (profileError) {
    console.error(`   ❌ Failed to create profile: ${profileError.message}`);
    return userId;
  }

  console.log(`   ✅ Profile created for ${testUser.profile.firstName}`);

  // 3. Initialize karma score
  const { error: karmaError } = await supabase
    .from('karma_scores')
    .insert({
      user_id: userId,
      total_proposals_created: 0,
      successful_proposals: 0,
      total_votes_cast: 0,
      accurate_votes: 0,
      total_assists: 0,
      badge_tier: 'new',
      karma_score: 0,
      proposal_success_rate: 0,
      voting_accuracy_rate: 0,
    });

  if (karmaError && !karmaError.message.includes('duplicate')) {
    console.error(`   ❌ Failed to create karma: ${karmaError.message}`);
  } else {
    console.log(`   ✅ Karma initialized`);
  }

  return userId;
}

async function generateDailyGrids(userIds: string[]): Promise<void> {
  console.log('\n🎲 Generating daily grids...');

  for (const anchorUserId of userIds) {
    // Get 3 random candidates (not self, not in active match)
    const candidatePool = userIds.filter(id => id !== anchorUserId);

    if (candidatePool.length < 3) {
      console.log(`   ⚠️  Not enough users for grid (need 3, have ${candidatePool.length})`);
      continue;
    }

    // Shuffle and take 3
    const shuffled = candidatePool.sort(() => Math.random() - 0.5);
    const [candidate1, candidate2, candidate3] = shuffled.slice(0, 3);

    const { error } = await supabase
      .from('daily_grids')
      .insert({
        anchor_user_id: anchorUserId,
        grid_date: new Date().toISOString().split('T')[0],
        candidate_1_id: candidate1,
        candidate_2_id: candidate2,
        candidate_3_id: candidate3,
        generation_algorithm_version: 'v1_test',
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (error && !error.message.includes('duplicate')) {
      console.error(`   ❌ Failed to create grid: ${error.message}`);
    } else {
      console.log(`   ✅ Grid created for user ${anchorUserId.slice(0, 8)}...`);
    }
  }
}

async function createFriendConnections(userIds: string[]): Promise<void> {
  console.log('\n👥 Creating friend connections...');

  // Create some friend connections (not all users are friends)
  const friendPairs: [number, number][] = [
    [0, 1], // Alex <-> Maya
    [0, 2], // Alex <-> Jordan
    [1, 4], // Maya <-> Sophia
    [2, 3], // Jordan <-> Ethan
    [3, 6], // Ethan <-> Olivia
    [4, 5], // Sophia <-> Liam
    [5, 7], // Liam <-> Noah
  ];

  for (const [idx1, idx2] of friendPairs) {
    if (idx1 >= userIds.length || idx2 >= userIds.length) continue;

    const user1 = userIds[idx1];
    const user2 = userIds[idx2];

    const { error } = await supabase
      .from('friend_connections')
      .insert({
        user_id_1: user1,
        user_id_2: user2,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

    if (error && !error.message.includes('duplicate')) {
      console.error(`   ❌ Failed to create friendship: ${error.message}`);
    } else {
      console.log(`   ✅ Friendship: ${TEST_USERS[idx1].profile.firstName} <-> ${TEST_USERS[idx2].profile.firstName}`);
    }
  }
}

async function cleanupExistingData(): Promise<void> {
  console.log('\n🧹 Cleaning up existing test data...');

  // Delete in correct order (respect foreign keys)
  const tables = [
    'proposal_votes',
    'endorsements',
    'assists',
    'karma_history',
    'active_matches',
    'proposals',
    'pairing_history',
    'daily_grids',
    'random_matcher_assignments',
    'friend_connections',
    'community_tasks',
    'karma_scores',
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ Cleaned ${table}`);
    }
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedTestData() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Bridge Community - Test Data Seeder                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Step 1: Cleanup existing data
  await cleanupExistingData();

  // Step 2: Create test users
  console.log('\n👤 Creating test users...');
  const userIds: string[] = [];

  for (const testUser of TEST_USERS) {
    const userId = await createTestUser(testUser);
    if (userId) {
      userIds.push(userId);
    }
  }

  console.log(`\n✅ Created ${userIds.length} test users`);

  if (userIds.length < 3) {
    console.error('\n❌ Need at least 3 users to generate grids');
    process.exit(1);
  }

  // Step 3: Generate daily grids
  await generateDailyGrids(userIds);

  // Step 4: Create friend connections
  await createFriendConnections(userIds);

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Seeding Complete!                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n📊 Summary:');
  console.log(`   ✅ ${userIds.length} test users created`);
  console.log(`   ✅ ${userIds.length} daily grids generated`);
  console.log(`   ✅ 7 friend connections created`);

  console.log('\n📝 Test User Credentials:');
  TEST_USERS.forEach(user => {
    console.log(`   📧 ${user.email} / ${user.password}`);
  });

  console.log('\n💡 Next Steps:');
  console.log('   1. Sign in with any test account');
  console.log('   2. Navigate to Community tab');
  console.log('   3. See real grids with real users!');
  console.log('   4. Submit proposals and vote');
  console.log('\n');
}

// Run seeding
seedTestData().catch((error) => {
  console.error('\n❌ Seeding failed:', error);
  process.exit(1);
});
