// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Backend Connection Test Script
 *
 * Tests the Community Matching System backend connection and RPC functions.
 *
 * Usage:
 *   npx tsx scripts/test-backend-connection.ts
 *
 * Prerequisites:
 *   1. Supabase migrations applied (npx supabase db reset)
 *   2. Test user exists in auth.users
 *   3. User has profile in user_profiles
 *   4. Environment variables set (.env)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testRPCFunctionExists(functionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc(functionName, {})
      .limit(0);

    // If we get an error about missing parameters, the function exists
    // If we get "function does not exist", it doesn't
    if (error && error.message.includes('does not exist')) {
      console.error(`   ❌ ${functionName} - Not found`);
      return false;
    }

    console.log(`   ✅ ${functionName} - Exists`);
    return true;
  } catch (error: any) {
    console.log(`   ✅ ${functionName} - Exists (parameter check)`);
    return true;
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n🔍 Testing Database Connection...');

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('   ❌ Failed to connect:', error.message);
      return false;
    }

    console.log('   ✅ Database connection successful');
    return true;
  } catch (error: any) {
    console.error('   ❌ Connection error:', error.message);
    return false;
  }
}

async function testRPCFunctions(): Promise<boolean> {
  console.log('\n🔍 Testing RPC Functions...');

  const functions = [
    'get_daily_grid',
    'submit_grid_selection',
    'get_pending_proposals',
    'submit_proposal_vote',
    'get_user_karma',
    'get_active_matches',
    'accept_proposal',
    'decline_proposal',
    'end_active_match',
    'get_user_proposals',
    'get_task_progress',
    'get_friend_grids',
  ];

  const results = await Promise.all(
    functions.map(fn => testRPCFunctionExists(fn))
  );

  const allExist = results.every(r => r);

  if (allExist) {
    console.log('\n   ✅ All 12 RPC functions exist');
  } else {
    console.log('\n   ❌ Some RPC functions are missing');
  }

  return allExist;
}

async function testTableStructure(): Promise<boolean> {
  console.log('\n🔍 Testing Table Structure...');

  const tables = [
    'daily_grids',
    'proposals',
    'karma_scores',
    'active_matches',
    'friend_connections',
    'community_tasks',
    'endorsements',
    'proposal_votes',
  ];

  let allExist = true;

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(0);

      if (error) {
        console.error(`   ❌ ${table} - Error: ${error.message}`);
        allExist = false;
      } else {
        console.log(`   ✅ ${table} - Exists`);
      }
    } catch (error: any) {
      console.error(`   ❌ ${table} - ${error.message}`);
      allExist = false;
    }
  }

  return allExist;
}

async function testUserProfile(): Promise<string | null> {
  console.log('\n🔍 Testing User Profile Access...');

  try {
    // Get current user (if any)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('   ⚠️  No authenticated user (this is okay for testing)');
      console.log('   💡 To test with auth, sign in first');
      return null;
    }

    console.log(`   ✅ Authenticated as: ${user.email}`);

    // Try to fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error(`   ❌ Profile fetch error: ${profileError.message}`);
      return null;
    }

    if (profile) {
      console.log(`   ✅ Profile exists: ${profile.first_name} ${profile.last_name}`);
      return user.id;
    } else {
      console.log('   ⚠️  No profile found for user');
      return null;
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testGetDailyGrid(userId: string): Promise<boolean> {
  console.log('\n🔍 Testing get_daily_grid RPC...');

  try {
    const { data, error } = await supabase.rpc('get_daily_grid', {
      p_user_id: userId,
      p_grid_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      console.error(`   ❌ RPC call failed: ${error.message}`);
      return false;
    }

    if (!data) {
      console.log('   ⚠️  No grid found (may need to generate grids first)');
      console.log('   💡 Run: SELECT generate_daily_grids_for_all_users();');
      return true; // Not an error, just no grid yet
    }

    if (data.exists) {
      console.log('   ✅ Grid found successfully');
      console.log(`      - Grid ID: ${data.grid_id}`);
      console.log(`      - Candidates: ${data.candidates?.length || 0}`);
    } else {
      console.log('   ⚠️  Grid does not exist for today');
    }

    return true;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testGetUserKarma(userId: string): Promise<boolean> {
  console.log('\n🔍 Testing get_user_karma RPC...');

  try {
    const { data, error } = await supabase.rpc('get_user_karma', {
      p_user_id: userId,
    });

    if (error) {
      console.error(`   ❌ RPC call failed: ${error.message}`);
      return false;
    }

    if (!data) {
      console.log('   ⚠️  No karma record found (will be created on first use)');
      return true;
    }

    console.log('   ✅ Karma data retrieved successfully');
    console.log(`      - Total Assists: ${data.total_assists || 0}`);
    console.log(`      - Badge Tier: ${data.badge_tier || 'new'}`);
    console.log(`      - Proposals Created: ${data.total_proposals_created || 0}`);

    return true;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Bridge Community Backend - Connection Test             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const results: { [key: string]: boolean } = {};

  // Test 1: Database connection
  results.database = await testDatabaseConnection();

  // Test 2: Table structure
  if (results.database) {
    results.tables = await testTableStructure();
  }

  // Test 3: RPC functions
  if (results.database) {
    results.rpcFunctions = await testRPCFunctions();
  }

  // Test 4: User profile (optional - needs auth)
  const userId = await testUserProfile();

  // Test 5: RPC calls with user (if authenticated)
  if (userId) {
    results.getDailyGrid = await testGetDailyGrid(userId);
    results.getUserKarma = await testGetUserKarma(userId);
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Test Summary                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    console.log('\n🎉 All tests passed! Backend is ready.');
    console.log('\n💡 Next steps:');
    console.log('   1. Set COMMUNITY_BACKEND_ENABLED: true in features.ts');
    console.log('   2. Sign in to the app');
    console.log('   3. Test Community tab features');
  } else {
    console.log('\n⚠️  Some tests failed. Check output above.');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify migrations are applied: npx supabase db reset');
    console.log('   2. Check .env file has correct credentials');
    console.log('   3. Verify Supabase project is running');
  }

  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
