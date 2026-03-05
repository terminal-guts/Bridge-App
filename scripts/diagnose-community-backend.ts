// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Comprehensive Community Backend Diagnostic Script
 *
 * This script checks the state of your database and identifies issues
 * that would prevent the Community section from working properly.
 *
 * Usage:
 *   npx tsx scripts/diagnose-community-backend.ts
 *
 * Prerequisites:
 *   - .env file with EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// The default dev user ID (used when DEV_USER_ID is null)
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function log(result: DiagnosticResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.check}: ${result.message}`);
  if (result.details) {
    console.log('   Details:', JSON.stringify(result.details, null, 2).split('\n').join('\n   '));
  }
  results.push(result);
}

async function checkTable(tableName: string, description: string) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      log({
        check: `Table: ${tableName}`,
        status: 'fail',
        message: `${description} - Error: ${error.message}`,
      });
      return false;
    }

    log({
      check: `Table: ${tableName}`,
      status: count && count > 0 ? 'pass' : 'warn',
      message: `${description} - ${count || 0} rows`,
    });
    return true;
  } catch (error: any) {
    log({
      check: `Table: ${tableName}`,
      status: 'fail',
      message: `${description} - Error: ${error.message}`,
    });
    return false;
  }
}

async function checkRPCFunction(functionName: string, params: any) {
  try {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      log({
        check: `RPC: ${functionName}`,
        status: 'fail',
        message: `Function error: ${error.message}`,
        details: { code: error.code, hint: error.hint },
      });
      return null;
    }

    log({
      check: `RPC: ${functionName}`,
      status: 'pass',
      message: `Function works`,
      details: data ? (Array.isArray(data) ? `Returned ${data.length} items` : 'Returned data') : 'Returned null/empty',
    });
    return data;
  } catch (error: any) {
    log({
      check: `RPC: ${functionName}`,
      status: 'fail',
      message: `Exception: ${error.message}`,
    });
    return null;
  }
}

async function checkDevUser() {
  console.log('\n📋 Checking Dev User...\n');

  // Check if dev user exists in auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEV_USER_ID);

  if (authError || !authUser?.user) {
    log({
      check: 'Dev User Auth',
      status: 'fail',
      message: `User ${DEV_USER_ID} does not exist in auth.users`,
      details: { suggestion: 'Run: npx tsx scripts/create-full-test-environment.ts' },
    });
    return false;
  }

  log({
    check: 'Dev User Auth',
    status: 'pass',
    message: `User ${DEV_USER_ID} exists in auth.users`,
    details: { email: authUser.user.email },
  });

  // Check if dev user has a profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', DEV_USER_ID)
    .single();

  if (profileError || !profile) {
    log({
      check: 'Dev User Profile',
      status: 'fail',
      message: `User ${DEV_USER_ID} has no profile in user_profiles`,
    });
    return false;
  }

  log({
    check: 'Dev User Profile',
    status: 'pass',
    message: `User profile found: ${profile.first_name} ${profile.last_name}`,
    details: { location: profile.location, age: profile.age },
  });

  return true;
}

async function checkDailyGrid() {
  console.log('\n📋 Checking Daily Grid for Dev User...\n');

  const today = new Date().toISOString().split('T')[0];

  // Check if grid exists directly in table
  const { data: gridDirect, error: gridError } = await supabase
    .from('daily_grids')
    .select('*')
    .eq('anchor_user_id', DEV_USER_ID)
    .eq('grid_date', today)
    .single();

  if (gridError || !gridDirect) {
    log({
      check: 'Daily Grid (Direct)',
      status: 'fail',
      message: `No grid for user ${DEV_USER_ID} on ${today}`,
      details: { suggestion: 'Run: npx tsx scripts/create-full-test-environment.ts' },
    });
  } else {
    log({
      check: 'Daily Grid (Direct)',
      status: 'pass',
      message: `Grid exists for ${today}`,
      details: {
        grid_id: gridDirect.id,
        candidates: [gridDirect.candidate_1_id, gridDirect.candidate_2_id, gridDirect.candidate_3_id],
        has_proposed: gridDirect.has_proposed,
      },
    });
  }

  // Test RPC function
  const rpcResult = await checkRPCFunction('get_daily_grid', {
    p_user_id: DEV_USER_ID,
    p_grid_date: today,
  });

  if (rpcResult) {
    console.log('   RPC Response:', JSON.stringify(rpcResult, null, 2).substring(0, 500));
  }
}

async function checkFriendConnections() {
  console.log('\n📋 Checking Friend Connections for Dev User...\n');

  const { data: friends, error } = await supabase
    .from('friend_connections')
    .select('*')
    .or(`user_id_1.eq.${DEV_USER_ID},user_id_2.eq.${DEV_USER_ID}`);

  if (error) {
    log({
      check: 'Friend Connections',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
    return;
  }

  if (!friends || friends.length === 0) {
    log({
      check: 'Friend Connections',
      status: 'warn',
      message: 'Dev user has no friends',
      details: { suggestion: 'Run: npx tsx scripts/create-full-test-environment.ts' },
    });
    return;
  }

  log({
    check: 'Friend Connections',
    status: 'pass',
    message: `Dev user has ${friends.length} friend connection(s)`,
    details: friends.map((f) => ({
      friend_id: f.user_id_1 === DEV_USER_ID ? f.user_id_2 : f.user_id_1,
      status: f.status,
    })),
  });

  // Test RPC function for friend grids
  const today = new Date().toISOString().split('T')[0];
  await checkRPCFunction('get_friend_grids', {
    p_user_id: DEV_USER_ID,
    p_grid_date: today,
  });
}

async function checkProposals() {
  console.log('\n📋 Checking Proposals...\n');

  // Check proposals in voting status
  const { data: votingProposals, error: votingError } = await supabase
    .from('proposals')
    .select('*')
    .eq('status', 'voting');

  if (votingError) {
    log({
      check: 'Voting Proposals',
      status: 'fail',
      message: `Error: ${votingError.message}`,
    });
  } else {
    log({
      check: 'Voting Proposals',
      status: votingProposals && votingProposals.length > 0 ? 'pass' : 'warn',
      message: `${votingProposals?.length || 0} proposals in voting status`,
    });
  }

  // Test RPC function for pending proposals
  await checkRPCFunction('get_pending_proposals', {
    p_user_id: DEV_USER_ID,
    p_limit: 3,
  });
}

async function checkTaskProgress() {
  console.log('\n📋 Checking Task Progress...\n');

  const today = new Date().toISOString().split('T')[0];

  // Test RPC function
  const result = await checkRPCFunction('get_task_progress', {
    p_user_id: DEV_USER_ID,
    p_task_date: today,
  });

  if (result) {
    console.log('   Task Progress:', JSON.stringify(result, null, 2));
  }
}

async function checkColumnExists(tableName: string, columnName: string) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`,
    });

    // Fallback: try a simple query that would fail if column doesn't exist
    const { error: queryError } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);

    if (queryError && queryError.message.includes('column')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function checkSchemaColumns() {
  console.log('\n📋 Checking Schema Columns...\n');

  // Check if user_profiles has the expected columns
  const columns = [
    { table: 'user_profiles', column: 'location', description: 'Primary location field' },
    { table: 'user_profiles', column: 'location_city', description: 'Legacy location_city (should be synced)' },
    { table: 'daily_grids', column: 'has_proposed', description: 'Grid completion flag' },
    { table: 'daily_grids', column: 'selected_candidate_id', description: 'Selected candidate' },
    { table: 'community_tasks', column: 'has_voted_on_proposals', description: 'New column name' },
    { table: 'community_tasks', column: 'voted_on_proposal', description: 'Old column name' },
  ];

  for (const col of columns) {
    try {
      const { error } = await supabase.from(col.table).select(col.column).limit(1);

      if (error && error.message.includes(col.column)) {
        log({
          check: `Column: ${col.table}.${col.column}`,
          status: 'fail',
          message: `Column does not exist - ${col.description}`,
        });
      } else if (error) {
        log({
          check: `Column: ${col.table}.${col.column}`,
          status: 'warn',
          message: `Query error: ${error.message}`,
        });
      } else {
        log({
          check: `Column: ${col.table}.${col.column}`,
          status: 'pass',
          message: `Column exists - ${col.description}`,
        });
      }
    } catch (e: any) {
      log({
        check: `Column: ${col.table}.${col.column}`,
        status: 'fail',
        message: `Error checking: ${e.message}`,
      });
    }
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Community Backend Diagnostic Tool                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nDev User ID: ${DEV_USER_ID}`);
  console.log(`Date: ${new Date().toISOString().split('T')[0]}\n`);

  // Check tables exist
  console.log('\n📋 Checking Tables...\n');
  await checkTable('user_profiles', 'User profiles');
  await checkTable('user_photos', 'User photos');
  await checkTable('daily_grids', 'Daily grids');
  await checkTable('proposals', 'Match proposals');
  await checkTable('proposal_votes', 'Proposal votes');
  await checkTable('friend_connections', 'Friend connections');
  await checkTable('karma_scores', 'Karma scores');
  await checkTable('community_tasks', 'Community tasks');
  await checkTable('daily_task_streaks', 'Daily task streaks');
  await checkTable('active_matches', 'Active matches');

  // Check schema columns
  await checkSchemaColumns();

  // Check dev user
  await checkDevUser();

  // Check daily grid
  await checkDailyGrid();

  // Check friend connections
  await checkFriendConnections();

  // Check proposals
  await checkProposals();

  // Check task progress
  await checkTaskProgress();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Diagnostic Summary                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);

  if (failed > 0) {
    console.log('\n🔧 RECOMMENDED ACTIONS:\n');
    console.log('1. Apply pending migrations:');
    console.log('   npx supabase db push --linked');
    console.log('   OR apply manually via Supabase Dashboard SQL Editor');
    console.log('\n2. Create test data:');
    console.log('   npx tsx scripts/create-full-test-environment.ts');
    console.log('\n3. Verify your .env has SUPABASE_SERVICE_ROLE_KEY set');
  }

  if (warned > 0 && failed === 0) {
    console.log('\n💡 Some warnings were found. Consider running the test data script:');
    console.log('   npx tsx scripts/create-full-test-environment.ts');
  }

  if (failed === 0 && warned === 0) {
    console.log('\n🎉 All checks passed! Your community backend should be working.');
  }

  console.log('\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
