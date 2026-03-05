// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Check if current logged-in user has a profile
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCurrentUser() {
  console.log('🔍 Checking current user...\n');

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ No user logged in');
      console.log('   Error:', authError?.message);
      console.log('\n💡 Solution: Log in to the app first, then run this again');
      return;
    }

    console.log('✅ User logged in:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}\n`);

    // Check if user has profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('❌ User has NO profile in user_profiles table');
      console.log('   Error:', profileError.message);
      console.log('\n💡 Solutions:');
      console.log('   1. Complete onboarding in the app');
      console.log('   2. OR run: npx tsx scripts/seed-test-users.ts');
      return;
    }

    console.log('✅ User has profile:');
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`   Age: ${profile.age}`);
    console.log(`   Location: ${profile.location || profile.location_city || 'Not set'}`);
    console.log('\n✅ User profile exists! Community features should work.');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkCurrentUser();
