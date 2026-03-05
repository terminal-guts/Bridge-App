/**
 * Post-Match Flow Test — Setup
 *
 * Creates a proposal between your account (user_1) and one other existing
 * Rice user (user_2). No synthetic users are created — the DB blocks
 * non-rice.edu signups even via the admin API.
 *
 * Voting is simulated directly in the DB (see pm-test-vote.ts).
 *
 * Usage (from Bridge-Version1-Mock/ directory):
 *
 *   npx tsx scripts/pm-test-setup.ts --my-id <your-uuid> [--user2 <email>]
 *
 * Your UUID: 1c11604f-10d9-4a18-87cd-839d609705d3  (sb278@rice.edu)
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

function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] ?? null : null;
}

async function main() {
  const myId = getArg('--my-id');
  const user2Email = getArg('--user2');

  if (!myId) {
    console.error('Usage: npx tsx scripts/pm-test-setup.ts --my-id <your-uuid> [--user2 <email>]');
    console.error('Your UUID: 1c11604f-10d9-4a18-87cd-839d609705d3  (sb278@rice.edu)');
    process.exit(1);
  }

  console.log('=== PM Test Setup ===\n');

  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const allUsers = userList?.users ?? [];

  let user2: { id: string; email?: string } | undefined;
  if (user2Email) {
    user2 = allUsers.find(u => u.email === user2Email);
    if (!user2) {
      console.error(`user2 email not found in auth: ${user2Email}`);
      process.exit(1);
    }
  } else {
    user2 = allUsers.find(u => u.id !== myId);
    if (!user2) {
      console.error('No other users found in auth.users to use as user_2');
      process.exit(1);
    }
  }

  console.log(`user_1 (you, watching in app): ${myId}`);
  console.log(`user_2 (other person):         ${user2.id}  (${user2.email})`);
  console.log('\nNote: user_2 will briefly see a test match proposal in their Match tab.');
  console.log('Run pm-test-cleanup.ts promptly when done.\n');

  // Clear ALL pending/deciding proposals for user_1 — constraint allows only one active at a time
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .or(`user_a_id.eq.${myId},user_b_id.eq.${myId}`)
    .in('status', ['pending', 'deciding']);
  if (existing && existing.length > 0) {
    console.log(`Clearing ${existing.length} existing active proposal(s) for user_1...`);
    for (const p of existing) {
      await supabase.from('proposal_votes').delete().eq('proposal_id', p.id);
      await supabase.from('pool_vote_assignments').delete().eq('proposal_id', p.id);
      await supabase.from('proposals').delete().eq('id', p.id);
    }
  }

  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .insert({
      user_a_id: myId,
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

  if (propError || !proposal) {
    console.error('Failed to create proposal:', propError?.message);
    process.exit(1);
  }

  // Build voter pool from remaining Rice users (exclude user_1 and user_2)
  const voters = allUsers
    .filter(u => u.id !== myId && u.id !== user2.id)
    .map(u => ({ id: u.id, email: u.email }));

  console.log(`Voters available: ${voters.length} (other Rice users)`);

  // Create pool_vote_assignments for all voters
  for (const v of voters) {
    await supabase.from('pool_vote_assignments').upsert(
      { proposal_id: proposal.id, voter_id: v.id, has_voted: false },
      { onConflict: 'proposal_id,voter_id' }
    );
  }
  console.log(`Pool vote assignments created for ${voters.length} voters`);

  const state = {
    proposalId: proposal.id,
    user1: { id: myId, email: 'sb278@rice.edu' },
    user2: { id: user2.id, email: user2.email },
    voters,
    votescast: 0,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`Proposal created: ${proposal.id}`);
  console.log('State written to: pm-test-state.json\n');
  console.log('=== SETUP COMPLETE ===\n');
  console.log('Open the app — you are already signed in as user_1.');
  console.log('\nVoters:');
  voters.forEach((v, i) => console.log(`  ${i + 1}. ${v.email}`));
  console.log('\nCast votes with:');
  console.log('  npx tsx scripts/pm-test-vote.ts YES');
  console.log('  npx tsx scripts/pm-test-vote.ts NO');
  console.log('\n2 YES votes flip status to "deciding" (Day 1: 65% threshold, 2/0 = 100%)');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
