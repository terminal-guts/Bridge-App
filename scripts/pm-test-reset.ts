/**
 * Post-Match Flow Test — Reset
 *
 * Replaces the current proposal with a fresh one (vote count zeroed).
 * No users are created or deleted.
 *
 * Usage (from Bridge-Version1-Mock/ directory):
 *   npx tsx scripts/pm-test-reset.ts
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
    console.error('State file not found. Run pm-test-setup.ts first.');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  const { proposalId, user1, user2 } = state;

  console.log(`Deleting proposal ${proposalId}...`);
  await supabase.from('proposal_votes').delete().eq('proposal_id', proposalId);
  await supabase.from('pool_vote_assignments').delete().eq('proposal_id', proposalId);
  await supabase.from('proposals').delete().eq('id', proposalId);

  const { data: newProposal, error } = await supabase
    .from('proposals')
    .insert({
      user_a_id: user1.id,
      user_b_id: user2.id,
      status: 'pending',
      compatibility_score: 0.88,
      voting_started_at: new Date().toISOString(),
      pool_yes_votes: 0,
      pool_no_votes: 0,
      friend_yes_votes: 0,
      friend_no_votes: 0,
      weighted_yes: 0,
      weighted_no: 0,
    })
    .select('id')
    .single();

  if (error || !newProposal) {
    console.error('Failed to create new proposal:', error?.message);
    process.exit(1);
  }

  state.proposalId = newProposal.id;
  state.votescast = 0;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`Reset complete. New proposal ID: ${newProposal.id}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
