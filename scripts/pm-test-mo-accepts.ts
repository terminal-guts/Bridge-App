import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const STATE_FILE = path.resolve(__dirname, '..', 'pm-test-state.json');

async function main() {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  const { proposalId, user1, user2 } = state;

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) {
    console.error('Fetch error:', error?.message);
    process.exit(1);
  }

  console.log('Current proposal state:');
  console.log('  status:', proposal.status);
  console.log('  user_a_decision:', proposal.user_a_decision);
  console.log('  user_b_decision:', proposal.user_b_decision);

  const nowIso = new Date().toISOString();
  const bothAccepted = proposal.user_a_decision === 'accepted';

  const updateData: Record<string, any> = {
    user_b_decision: 'accepted',
    user_b_decided_at: nowIso,
    updated_at: nowIso,
  };

  if (bothAccepted) {
    updateData.status = 'passed_to_match';
    updateData.confirmed_at = nowIso;
  }

  const { error: updateErr } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId);

  if (updateErr) {
    console.error('Update error:', updateErr.message);
    process.exit(1);
  }

  if (bothAccepted) {
    const [u1, u2] = user1.id < user2.id ? [user1.id, user2.id] : [user2.id, user1.id];
    const { error: matchErr } = await supabase.from('matches').insert({
      user_id_1: u1,
      user_id_2: u2,
      status: 'active',
      proposal_id: proposalId,
      matched_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });
    if (matchErr) console.error('Match insert warning:', matchErr.message);
    else console.log('\nMatch row created!');
  }

  // Check existing matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, status, matched_at')
    .or(`user_id_1.eq.${user1.id},user_id_2.eq.${user1.id}`);

  console.log('\nMo (user_b) accepted.');
  console.log('Proposal status:', bothAccepted ? 'passed_to_match' : 'deciding');
  console.log('Matches for user_1:', matches?.length ?? 0);
  if (matches) matches.forEach(m => console.log('  ', JSON.stringify(m)));

  if (bothAccepted) {
    console.log('\n*** BOTH ACCEPTED — CHECK THE APP ***');
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
