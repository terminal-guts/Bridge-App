// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Create Full Test Environment
 *
 * Creates a complete test environment with:
 * - 10 users with rich profiles (no auth needed in dev mode)
 * - Friend connections between users
 * - Daily grids for all users
 * - Proposals to vote on
 * - Various match states (pending, active)
 *
 * HOW TO TEST AS DIFFERENT USERS:
 * 1. Run this script
 * 2. Open src/config/features.ts
 * 3. Set DEV_USER_ID to any user ID from the list below
 * 4. Reload the app to see it from that user's perspective
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\n💡 The service role key is in your Supabase dashboard:');
  console.error('   Settings → API → service_role key (secret)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Fixed UUIDs for test users (so you can reliably switch between them)
// NOTE: Schema uses 'location' only (location_city and location_state were dropped in migration 20251119)
// VALID VALUES:
//   gender: 'male', 'female', 'non-binary', 'genderfluid', 'agender', 'two_spirit', 'genderqueer'
//   political_leaning: 'very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative', 'not_political', 'prefer_not_to_say', 'other'
//   drinking_frequency: 'never', 'socially', 'often'
//   cannabis/tobacco_frequency: 'never', 'rarely', 'socially', 'regularly'
// Profile photo URLs (using randomuser.me for realistic placeholder photos)
const PHOTO_URLS = {
  male: [
    'https://randomuser.me/api/portraits/men/32.jpg',  // Alex
    'https://randomuser.me/api/portraits/men/45.jpg',  // Marcus
    'https://randomuser.me/api/portraits/men/22.jpg',  // David
    'https://randomuser.me/api/portraits/men/67.jpg',  // James
  ],
  female: [
    'https://randomuser.me/api/portraits/women/44.jpg', // Maya
    'https://randomuser.me/api/portraits/women/65.jpg', // Sophia
    'https://randomuser.me/api/portraits/women/33.jpg', // Emma
    'https://randomuser.me/api/portraits/women/17.jpg', // Olivia
    'https://randomuser.me/api/portraits/women/89.jpg', // Ava
  ],
  neutral: [
    'https://randomuser.me/api/portraits/lego/1.jpg',   // Jordan (non-binary)
  ],
};

const TEST_USERS = [
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    first_name: 'Alex',
    last_name: 'Chen',
    age: 28,
    gender: ['male'],
    interested_in_genders: ['female'],
    pronouns_list: ['he/him'],
    location: 'San Francisco, CA',
    current_job: 'Software Engineer',
    company_position: 'Senior Engineer',
    education_level: 'bachelors',
    school: 'Stanford University',
    height_inches: 71,
    ethnicity: 'Asian',
    religion: 'Agnostic',
    political_leaning: 'liberal',
    interests: ['hiking', 'photography', 'cooking', 'travel', 'music'],
    values: ['ambition', 'kindness', 'humor', 'adventure'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'rarely',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.male[0],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000002',
    first_name: 'Maya',
    last_name: 'Patel',
    age: 26,
    gender: ['female'],
    interested_in_genders: ['male'],
    pronouns_list: ['she/her'],
    location: 'New York, NY',
    current_job: 'Product Designer',
    company_position: 'Lead Designer',
    education_level: 'masters',
    school: 'Parsons School of Design',
    height_inches: 64,
    ethnicity: 'South Asian',
    religion: 'Hindu',
    political_leaning: 'very_liberal',
    interests: ['art', 'yoga', 'reading', 'coffee', 'design'],
    values: ['creativity', 'empathy', 'growth', 'authenticity'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'never',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.female[0],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000003',
    first_name: 'Jordan',
    last_name: 'Kim',
    age: 30,
    gender: ['non-binary'],
    interested_in_genders: ['female', 'non-binary'],
    pronouns_list: ['they/them'],
    location: 'Los Angeles, CA',
    current_job: 'Music Producer',
    company_position: 'Independent',
    education_level: 'bachelors',
    school: 'Berklee College of Music',
    height_inches: 68,
    ethnicity: 'Korean',
    religion: 'Buddhist',
    political_leaning: 'very_liberal',
    interests: ['music', 'concerts', 'vinyl', 'meditation', 'film'],
    values: ['creativity', 'authenticity', 'peace', 'passion'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'socially',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.neutral[0],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000004',
    first_name: 'Sophia',
    last_name: 'Martinez',
    age: 27,
    gender: ['female'],
    interested_in_genders: ['male', 'female'],
    pronouns_list: ['she/her'],
    location: 'Austin, TX',
    current_job: 'Marketing Manager',
    company_position: 'Director',
    education_level: 'bachelors',
    school: 'UT Austin',
    height_inches: 66,
    ethnicity: 'Hispanic/Latino',
    religion: 'Catholic',
    political_leaning: 'moderate',
    interests: ['live music', 'tacos', 'running', 'dogs', 'travel'],
    values: ['family', 'adventure', 'loyalty', 'humor'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'rarely',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.female[1],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000005',
    first_name: 'Marcus',
    last_name: 'Johnson',
    age: 32,
    gender: ['male'],
    interested_in_genders: ['female'],
    pronouns_list: ['he/him'],
    location: 'Chicago, IL',
    current_job: 'Architect',
    company_position: 'Principal',
    education_level: 'masters',
    school: 'Illinois Institute of Technology',
    height_inches: 74,
    ethnicity: 'Black/African American',
    religion: 'Christian',
    political_leaning: 'moderate',
    interests: ['architecture', 'basketball', 'jazz', 'cooking', 'history'],
    values: ['integrity', 'ambition', 'community', 'excellence'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'never',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.male[1],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000006',
    first_name: 'Emma',
    last_name: 'Wilson',
    age: 25,
    gender: ['female'],
    interested_in_genders: ['male'],
    pronouns_list: ['she/her'],
    location: 'Seattle, WA',
    current_job: 'Data Scientist',
    company_position: 'Senior Analyst',
    education_level: 'masters',
    school: 'University of Washington',
    height_inches: 65,
    ethnicity: 'White',
    religion: 'Agnostic',
    political_leaning: 'liberal',
    interests: ['hiking', 'board games', 'coffee', 'data viz', 'podcasts'],
    values: ['curiosity', 'honesty', 'humor', 'kindness'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'socially',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.female[2],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000007',
    first_name: 'David',
    last_name: 'Lee',
    age: 29,
    gender: ['male'],
    interested_in_genders: ['female'],
    pronouns_list: ['he/him'],
    location: 'Boston, MA',
    current_job: 'Doctor',
    company_position: 'Resident Physician',
    education_level: 'doctorate',
    school: 'Harvard Medical School',
    height_inches: 70,
    ethnicity: 'Asian',
    religion: 'Agnostic',
    political_leaning: 'liberal',
    interests: ['medicine', 'running', 'cooking', 'travel', 'wine'],
    values: ['compassion', 'dedication', 'balance', 'growth'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'never',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.male[2],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000008',
    first_name: 'Olivia',
    last_name: 'Brown',
    age: 28,
    gender: ['female'],
    interested_in_genders: ['male', 'female'],
    pronouns_list: ['she/her'],
    location: 'Denver, CO',
    current_job: 'Environmental Scientist',
    company_position: 'Research Lead',
    education_level: 'masters',
    school: 'Colorado State University',
    height_inches: 67,
    ethnicity: 'White',
    religion: 'Spiritual',
    political_leaning: 'very_liberal',
    interests: ['hiking', 'climbing', 'sustainability', 'camping', 'skiing'],
    values: ['nature', 'adventure', 'purpose', 'authenticity'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'socially',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.female[3],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000009',
    first_name: 'James',
    last_name: 'Taylor',
    age: 31,
    gender: ['male'],
    interested_in_genders: ['female'],
    pronouns_list: ['he/him'],
    location: 'Miami, FL',
    current_job: 'Finance Manager',
    company_position: 'VP of Finance',
    education_level: 'masters',
    school: 'Wharton School',
    height_inches: 72,
    ethnicity: 'White',
    religion: 'Christian',
    political_leaning: 'conservative',
    interests: ['golf', 'sailing', 'wine', 'travel', 'tennis'],
    values: ['success', 'family', 'loyalty', 'tradition'],
    drinking_frequency: 'often',
    cannabis_frequency: 'never',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.male[3],
  },
  {
    user_id: '00000000-0000-0000-0000-000000000010',
    first_name: 'Ava',
    last_name: 'Garcia',
    age: 26,
    gender: ['female'],
    interested_in_genders: ['male'],
    pronouns_list: ['she/her'],
    location: 'San Diego, CA',
    current_job: 'Physical Therapist',
    company_position: 'Sports PT',
    education_level: 'doctorate',
    school: 'USC',
    height_inches: 63,
    ethnicity: 'Hispanic/Latino',
    religion: 'Catholic',
    political_leaning: 'moderate',
    interests: ['fitness', 'beach', 'surfing', 'nutrition', 'dogs'],
    values: ['health', 'positivity', 'compassion', 'balance'],
    drinking_frequency: 'socially',
    cannabis_frequency: 'rarely',
    tobacco_frequency: 'never',
    photo_url: PHOTO_URLS.female[4],
  },
];

// First, create auth users (required for foreign key constraints)
async function createAuthUsers() {
  console.log('\n🔐 Creating auth users...\n');

  for (const user of TEST_USERS) {
    try {
      // Try to create the user in auth.users
      const { data, error } = await supabase.auth.admin.createUser({
        email: `${user.first_name.toLowerCase()}@test.bridge.app`,
        email_confirm: true,
        user_metadata: { first_name: user.first_name, last_name: user.last_name },
        // Use the fixed UUID
        id: user.user_id,
      });

      if (error) {
        // If user already exists, that's fine
        if (error.message.includes('already') || error.message.includes('exists') || error.message.includes('duplicate')) {
          console.log(`✅ ${user.first_name} (already exists)`);
        } else {
          console.error(`❌ Auth ${user.first_name}:`, error.message);
        }
      } else {
        console.log(`✅ ${user.first_name} (created)`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating auth user ${user.first_name}:`, error.message);
    }
  }
}

async function createProfiles() {
  console.log('\n👤 Creating user profiles...\n');

  for (const user of TEST_USERS) {
    try {
      // Note: is_active, is_in_dating_pool, location_city, location_state were dropped in migration 20251119
      // Remove photo_url as it's stored in user_photos table, not user_profiles
      const { photo_url, ...profileData } = user;
      const { error } = await supabase.from('user_profiles').upsert(
        profileData,
        { onConflict: 'user_id' }
      );

      if (error) {
        console.error(`❌ ${user.first_name}:`, error.message);
      } else {
        console.log(`✅ ${user.first_name} ${user.last_name} (${user.location})`);
      }
    } catch (error: any) {
      console.error(`❌ Error for ${user.first_name}:`, error.message);
    }
  }
}

async function createKarmaScores() {
  console.log('\n⭐ Creating karma scores...\n');

  for (const user of TEST_USERS) {
    try {
      const { error } = await supabase.from('karma_scores').upsert(
        {
          user_id: user.user_id,
          karma_score: Math.floor(Math.random() * 500) + 100,
          badge_tier: ['new', 'solid', 'trusted', 'elite'][Math.floor(Math.random() * 4)],
          total_assists: Math.floor(Math.random() * 20),
          total_proposals_created: Math.floor(Math.random() * 10),
          successful_proposals: Math.floor(Math.random() * 5),
          total_votes_cast: Math.floor(Math.random() * 50),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        console.error(`❌ Karma for ${user.first_name}:`, error.message);
      } else {
        console.log(`✅ Karma: ${user.first_name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating karma:`, error.message);
    }
  }
}

async function createFriendConnections() {
  console.log('\n👥 Creating friend connections...\n');

  // Friend network (indices refer to TEST_USERS array)
  // Alex(0) is friends with: Maya(1), Jordan(2), David(6)
  // Maya(1) is friends with: Alex(0), Sophia(3), Emma(5)
  const friendPairs = [
    [0, 1], // Alex - Maya
    [0, 2], // Alex - Jordan
    [0, 6], // Alex - David
    [1, 3], // Maya - Sophia
    [1, 5], // Maya - Emma
    [2, 7], // Jordan - Olivia
    [3, 4], // Sophia - Marcus
    [3, 9], // Sophia - Ava
    [4, 8], // Marcus - James
    [5, 7], // Emma - Olivia
    [6, 8], // David - James
    [7, 9], // Olivia - Ava
  ];

  for (const [i1, i2] of friendPairs) {
    const user1 = TEST_USERS[i1];
    const user2 = TEST_USERS[i2];

    try {
      // Note: schema uses user_id_1/user_id_2, status='active'/'removed', created_at (not connected_at)
      const { error } = await supabase.from('friend_connections').upsert(
        {
          user_id_1: user1.user_id,
          user_id_2: user2.user_id,
          status: 'active',
        },
        { onConflict: 'user_id_1,user_id_2' }
      );

      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ ${user1.first_name}-${user2.first_name}:`, error.message);
      } else {
        console.log(`✅ Friends: ${user1.first_name} ↔ ${user2.first_name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

async function createDailyGrids() {
  console.log('\n🎲 Creating daily grids...\n');

  const today = new Date().toISOString().split('T')[0];

  // Delete existing grids for today
  await supabase.from('daily_grids').delete().eq('grid_date', today);

  for (const user of TEST_USERS) {
    const candidates = TEST_USERS.filter((u) => u.user_id !== user.user_id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    try {
      const { error } = await supabase.from('daily_grids').insert({
        anchor_user_id: user.user_id,
        grid_date: today,
        candidate_1_id: candidates[0].user_id,
        candidate_2_id: candidates[1].user_id,
        candidate_3_id: candidates[2].user_id,
        has_proposed: false,
      });

      if (error) {
        console.error(`❌ Grid for ${user.first_name}:`, error.message);
      } else {
        console.log(
          `✅ Grid: ${user.first_name} → [${candidates[0].first_name}, ${candidates[1].first_name}, ${candidates[2].first_name}]`
        );
      }
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

async function createProposals() {
  console.log('\n💘 Creating proposals to vote on...\n');

  const today = new Date().toISOString().split('T')[0];
  const votingExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Create proposals between different users
  const proposalPairs = [
    { userA: 1, userB: 4 }, // Maya + Marcus
    { userA: 5, userB: 7 }, // Emma + Olivia
    { userA: 2, userB: 3 }, // Jordan + Sophia
    { userA: 8, userB: 9 }, // James + Ava
    { userA: 0, userB: 1 }, // Alex + Maya (you can vote on this if not Alex or Maya)
  ];

  for (const proposal of proposalPairs) {
    const userA = TEST_USERS[proposal.userA];
    const userB = TEST_USERS[proposal.userB];

    try {
      const { error } = await supabase.from('proposals').insert({
        user_a_id: userA.user_id,
        user_b_id: userB.user_id,
        anchor_user_id: userA.user_id,
        selected_candidate_id: userB.user_id,
        proposal_date: today,
        compatibility_score: 75 + Math.random() * 20,
        status: 'voting',
        yes_votes: Math.floor(Math.random() * 15),
        no_votes: Math.floor(Math.random() * 5),
        voting_threshold: 20,
        voting_expires_at: votingExpires,
        user_a_decision: 'pending',
        user_b_decision: 'pending',
      });

      if (error) {
        console.error(`❌ Proposal ${userA.first_name}+${userB.first_name}:`, error.message);
      } else {
        console.log(`✅ Proposal: ${userA.first_name} + ${userB.first_name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

async function createUserPhotos() {
  console.log('\n📸 Creating user photos...\n');

  for (const user of TEST_USERS) {
    if (!user.photo_url) continue;

    try {
      // Delete existing photos for this user first
      await supabase.from('user_photos').delete().eq('user_id', user.user_id);

      // Insert new photo
      const { error } = await supabase.from('user_photos').insert({
        user_id: user.user_id,
        storage_path: user.photo_url,
        is_main: true,
        display_order: 0,
      });

      if (error) {
        console.error(`❌ Photo for ${user.first_name}:`, error.message);
      } else {
        console.log(`✅ Photo: ${user.first_name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

async function createActiveMatch() {
  console.log('\n💑 Creating active match (David ↔ Ava)...\n');

  const david = TEST_USERS[6];
  const ava = TEST_USERS[9];

  try {
    // Create approved proposal
    // Valid status values: 'voting', 'approved', 'rejected', 'expired', 'accepted', 'declined'
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        user_a_id: david.user_id,
        user_b_id: ava.user_id,
        anchor_user_id: david.user_id,
        selected_candidate_id: ava.user_id,
        proposal_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        compatibility_score: 89.5,
        status: 'accepted', // Both users accepted - this triggers active match
        yes_votes: 25,
        no_votes: 3,
        voting_threshold: 20,
        user_a_decision: 'accepted',
        user_b_decision: 'accepted',
        approved_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (proposalError) {
      console.error('❌ Proposal:', proposalError.message);
      return;
    }

    // Create active match
    const { error: matchError } = await supabase.from('active_matches').insert({
      proposal_id: proposal.id,
      user_a_id: david.user_id,
      user_b_id: ava.user_id,
      matched_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      can_end_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    });

    if (matchError) {
      console.error('❌ Active match:', matchError.message);
    } else {
      console.log(`✅ Active match: David ↔ Ava`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Bridge Test Environment Generator                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // MUST create auth users first (FK constraints)
  await createAuthUsers();
  await createProfiles();
  await createUserPhotos();
  await createKarmaScores();
  await createFriendConnections();
  await createDailyGrids();
  await createProposals();
  await createActiveMatch();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Test Environment Ready!                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  console.log('\n📋 TEST USER IDs (copy to features.ts DEV_USER_ID):\n');
  for (const user of TEST_USERS) {
    const special =
      user.first_name === 'David' || user.first_name === 'Ava'
        ? ' ← HAS ACTIVE MATCH'
        : user.first_name === 'Alex'
          ? ' ← DEFAULT DEV USER'
          : '';
    console.log(`   ${user.first_name.padEnd(8)} → '${user.user_id}'${special}`);
  }

  console.log('\n💡 HOW TO SWITCH USERS:');
  console.log('   1. Open src/config/features.ts');
  console.log("   2. Find DEV_USER_ID: null");
  console.log("   3. Change to: DEV_USER_ID: '00000000-0000-0000-0000-000000000007'");
  console.log('   4. Reload the app → You are now David!');

  console.log('\n📊 WHAT WAS CREATED:');
  console.log('   • 10 users with rich profiles');
  console.log('   • 10 profile photos (randomuser.me)');
  console.log('   • 12 friend connections');
  console.log('   • Daily grids for all users');
  console.log('   • 5 proposals to vote on');
  console.log('   • 1 active match (David ↔ Ava)\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
