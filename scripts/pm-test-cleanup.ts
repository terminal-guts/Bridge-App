/**
 * Post-Match Flow Test — Cleanup
 *
 * Deletes the test proposal and state file. No users deleted.
 *
 * Usage (from Bridge-Version1-Mock/ directory):
 *   npx tsx scripts/pm-test-cleanup.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STATE_FILE = path.resolve(__dirname, '..', 'pm-test-state.json');

async function main() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error('State file not found. Nothing to clean up.');
    process.exit(1);
  }

  const { proposalId } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));

  console.log(`Cleaning up proposal ${proposalId}...`);

  await supabase.from('proposal_votes').delete().eq('proposal_id', proposalId);
  console.log('  proposal_votes: deleted');

  await supabase.from('pool_vote_assignments').delete().eq('proposal_id', proposalId);
  console.log('  pool_vote_assignments: deleted');

  await supabase.from('active_matches').delete().eq('proposal_id', proposalId);
  console.log('  active_matches: deleted (if any)');

  const { error } = await supabase.from('proposals').delete().eq('id', proposalId);
  if (error) console.error('  proposals:', error.message);
  else console.log('  proposals: deleted');

  fs.unlinkSync(STATE_FILE);
  console.log('  pm-test-state.json: deleted');

  console.log('\nCleanup complete.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
