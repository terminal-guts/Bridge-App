/**
 * Post-Match Flow Test — Cast One Vote
 *
 * Directly updates proposal tallies in the DB (service role).
 * Runs the same threshold logic as the process-vote edge function.
 *
 * Usage (from Bridge-Version1-Mock/ directory):
 *   npx tsx scripts/pm-test-vote.ts YES
 *   npx tsx scripts/pm-test-vote.ts NO
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

const THRESHOLD_SCHEDULE: Record<number, number | null> = {
  1: 0.65, 2: 0.65, 3: 0.60, 4: 0.55, 5: null,
};
const CONFIRMATION_MIN_POOL_VOTES = 2;
const CONFIRMATION_MIN_TOTAL_VOTES = 2;
const CONFIRMATION_MIN_YES_VOTES = 2;
const DECISION_DEADLINE_HOURS = 48;

function getProposalDay(votingStartedAt: string): number {
  const delta = Date.now() - new Date(votingStartedAt).getTime();
  return Math.min(Math.floor(delta / (24 * 60 * 60 * 1000)) + 1, 6);
}

async function main() {
  const voteType = process.argv[2]?.toUpperCase();

  if (!voteType || !['YES', 'NO'].includes(voteType)) {
    console.error('Usage: npx tsx scripts/pm-test-vote.ts <YES|NO>');
    process.exit(1);
  }

  if (!fs.existsSync(STATE_FILE)) {
    console.error('State file not found. Run pm-test-setup.ts first.');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  const { proposalId, voters } = state;
  const voteIndex = state.votescast ?? 0;

  if (voteIndex >= voters.length) {
    console.error(`All ${voters.length} voters have already voted. Run pm-test-reset.ts to start over.`);
    process.exit(1);
  }

  const voter = voters[voteIndex];

  const { data: proposal, error: fetchErr } = await supabase
    .from('proposals')
    .select('status, pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes, weighted_yes, weighted_no, voting_started_at')
    .eq('id', proposalId)
    .single();

  if (fetchErr || !proposal) {
    console.error('Could not fetch proposal:', fetchErr?.message);
    process.exit(1);
  }

  if (proposal.status !== 'pending') {
    console.log(`Proposal is already "${proposal.status}" — no vote cast.`);
    process.exit(0);
  }

  const nowIso = new Date().toISOString();

  let poolYes = proposal.pool_yes_votes ?? 0;
  let poolNo = proposal.pool_no_votes ?? 0;
  let weightedYes = proposal.weighted_yes ?? 0;
  let weightedNo = proposal.weighted_no ?? 0;

  if (voteType === 'YES') { poolYes++; weightedYes += 1.0; }
  else                    { poolNo++;  weightedNo  += 1.0; }

  // Insert a real proposal_votes row for this voter
  const { error: voteErr } = await supabase.from('proposal_votes').upsert({
    proposal_id: proposalId,
    voter_user_id: voter.id,
    vote_type: voteType,
    is_friend_vote: false,
    friend_of: null,
    created_at: nowIso,
  }, { onConflict: 'proposal_id,voter_user_id' });
  if (voteErr) console.error('  Warning inserting vote:', voteErr.message);

  // Mark pool_vote_assignment as voted
  await supabase
    .from('pool_vote_assignments')
    .update({ has_voted: true })
    .eq('proposal_id', proposalId)
    .eq('voter_id', voter.id);

  const friendYes = proposal.friend_yes_votes ?? 0;
  const friendNo = proposal.friend_no_votes ?? 0;
  const totalPool = poolYes + poolNo;
  const totalAll = totalPool + friendYes + friendNo;
  const totalYes = poolYes + friendYes;
  const totalWeighted = weightedYes + weightedNo;
  const weightedYesPct = totalWeighted === 0 ? 0 : weightedYes / totalWeighted;
  const day = getProposalDay(proposal.voting_started_at);
  const threshold = THRESHOLD_SCHEDULE[day] ?? 0.55;

  const update: Record<string, any> = {
    pool_yes_votes: poolYes,
    pool_no_votes: poolNo,
    weighted_yes: weightedYes,
    weighted_no: weightedNo,
    updated_at: nowIso,
  };

  let newStatus = 'pending';
  if (
    totalPool >= CONFIRMATION_MIN_POOL_VOTES &&
    totalAll  >= CONFIRMATION_MIN_TOTAL_VOTES &&
    totalYes  >= CONFIRMATION_MIN_YES_VOTES &&
    (threshold === null || weightedYesPct >= threshold)
  ) {
    newStatus = 'deciding';
    const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 3600 * 1000).toISOString();
    Object.assign(update, {
      status: 'deciding',
      community_decided_at: nowIso,
      passed_to_users_at: nowIso,
      decision_deadline_at: deadline,
    });
  }

  const { error: updateErr } = await supabase
    .from('proposals')
    .update(update)
    .eq('id', proposalId);

  if (updateErr) {
    console.error('Failed to update proposal:', updateErr.message);
    process.exit(1);
  }

  state.votescast = (state.votescast ?? 0) + 1;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  const thresholdLabel = threshold === null ? 'auto (Day 5)' : `${(threshold * 100).toFixed(0)}%`;
  console.log(`\nVote ${state.votescast} by ${voter.email} (${voteType}):`);
  console.log(`  pool_yes: ${poolYes}  |  pool_no: ${poolNo}`);
  console.log(`  yes_pct: ${(weightedYesPct * 100).toFixed(1)}%  |  threshold (Day ${day}): ${thresholdLabel}`);
  console.log(`  status: ${newStatus}`);

  if (newStatus === 'deciding') {
    console.log('\n*** PROPOSAL PUSHED TO USERS ***');
    console.log('Check the Match tab — you should see the match decision screen.');
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
