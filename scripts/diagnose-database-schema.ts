// Migrated from Bridge-Version1/scripts/ — see git history for full origin
/**
 * Database Schema Diagnostic Tool
 *
 * Checks actual database schema to identify column name mismatches
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

async function checkSchema() {
  console.log('🔍 Checking user_profiles schema...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `
  });

  if (error) {
    // Try direct query instead
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      console.error('❌ Error:', profileError.message);
      return;
    }

    if (profileData && profileData.length > 0) {
      console.log('✅ user_profiles columns:');
      Object.keys(profileData[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
    }
    return;
  }

  if (data) {
    console.log('Columns:', data);
  }
}

checkSchema();
