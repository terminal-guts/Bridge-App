// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Create Dev User
 *
 * Creates a dev user with UUID 00000000-0000-0000-0000-000000000001
 * This allows the Community tab to work in dev mode without auth session
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createDevUser() {
  console.log('🔧 Creating dev user...\n');

  const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

  // Try to create user_profiles entry
  console.log('1️⃣  Creating user_profiles entry...');
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: DEV_USER_ID,
      first_name: 'Dev',
      last_name: 'User',
      age: 28,
      gender: ['male']
    });

  if (profileError) {
    if (profileError.code === '23505') {
      console.log('⚠️  Profile already exists');
    } else if (profileError.code === '23503') {
      console.error(`❌ Foreign key constraint error: ${profileError.message}`);
      console.error('\n🔧 Need to create auth.users entry first.');
      console.error('   Run this migration: npx supabase db execute -f supabase/migrations/create_dev_user.sql\n');

      // Create migration file
      const migrationSQL = `-- Create dev user in auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'dev@bridge.test',
  '',
  NOW(),
  NOW(),
  NOW(),
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;`;

      const fs = require('fs');
      fs.writeFileSync('/Users/saulbrauns/Bridge-Version1/supabase/migrations/create_dev_user.sql', migrationSQL);
      console.log('✅ Created migration file: supabase/migrations/create_dev_user.sql');
      process.exit(1);
    } else {
      console.error(`❌ Failed to create profile: ${profileError.message}`);
      process.exit(1);
    }
  } else {
    console.log('✅ Profile created');
  }

  // Step 3: Verify
  console.log('\n3️⃣  Verifying dev user...');
  const { data: profile, error: verifyError } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name, age')
    .eq('user_id', DEV_USER_ID)
    .single();

  if (verifyError) {
    console.error(`❌ Verification failed: ${verifyError.message}`);
    process.exit(1);
  }

  console.log('✅ Dev user verified:');
  console.log(`   User ID: ${profile.user_id}`);
  console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
  console.log(`   Age: ${profile.age}`);

  // Step 4: Create grid for dev user
  console.log('\n4️⃣  Creating daily grid for dev user...');

  // Get 3 random candidates (not self)
  const { data: candidates, error: candidatesError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .neq('user_id', DEV_USER_ID)
    .limit(3);

  if (candidatesError || !candidates || candidates.length < 3) {
    console.log('⚠️  Not enough candidates for grid (need 3 other users)');
    console.log('💡 Run: npx tsx scripts/seed-test-users.ts\n');
  } else {
    const today = new Date().toISOString().split('T')[0];

    const { error: gridError } = await supabase
      .from('daily_grids')
      .insert({
        anchor_user_id: DEV_USER_ID,
        grid_date: today,
        candidate_1_id: candidates[0].user_id,
        candidate_2_id: candidates[1].user_id,
        candidate_3_id: candidates[2].user_id,
      });

    if (gridError) {
      console.log(`⚠️  Grid creation failed: ${gridError.message}`);
    } else {
      console.log('✅ Daily grid created');
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Dev User Setup Complete                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n💡 Next steps:');
  console.log('   1. Restart your app');
  console.log('   2. Sign in with any phone number (will show mock Alex profile)');
  console.log('   3. Navigate to Community tab');
  console.log('   4. You should see the daily grid!\n');
}

createDevUser().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
