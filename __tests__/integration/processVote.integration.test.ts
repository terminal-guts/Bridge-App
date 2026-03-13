/**
 * Integration test for process-vote edge function.
 *
 * Hits the REAL Supabase edge function with real auth tokens.
 * Requires .env with SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL.
 *
 * Usage:
 *   npx jest __tests__/integration/processVote.integration.test.ts --no-cache
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error('Missing env vars: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// sb278 (Saul) — proposal target
const PROPOSAL_USER_A = 'b853df7d-19db-4212-8fdf-8696bc72a167'; // sb278@rice.edu
const PROPOSAL_USER_B = '3ae08fed-c47f-4044-a5ca-f67be336ef90'; // mv76@rice.edu (Molly)

// 3 voters — not user_a or user_b, and NOT friends with either (to ensure pool votes)
// Note: el110 (Abby) is friends with sb278, so she's excluded — her votes count as friend votes
const VOTERS = [
  { id: 'dc347d96-4a8c-41ce-a76d-f10e229f564e', email: 'bd76@rice.edu' },
  { id: '0baf265b-6703-41e4-903a-ce44b7d03b87', email: 'rz68@rice.edu' },
  { id: '333d9ced-e653-48dd-ae47-c4ee336e5928', email: 'ra118@rice.edu' },
];

let proposalId: string;

// Helper: generate an access token for a user via admin magic link
async function getAccessToken(userId: string): Promise<string> {
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  if (!userData.user?.email) throw new Error(`No email for user ${userId}`);

  // Generate a magic link via admin API
  const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: userData.user.email,
    }),
  });

  const linkData = await signInResponse.json();
  const hashedToken = linkData.hashed_token || linkData.properties?.hashed_token;

  if (!hashedToken) {
    throw new Error(`Failed to generate link for user ${userId}: ${JSON.stringify(linkData)}`);
  }

  // Verify the hashed token to get a session
  const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: hashedToken,
    }),
  });

  const session = await verifyResponse.json();

  if (!session.access_token) {
    throw new Error(`Failed to verify token for user ${userId}: ${JSON.stringify(session)}`);
  }

  return session.access_token;
}

// Helper: call process-vote edge function
async function callProcessVote(
  accessToken: string,
  proposalId: string,
  voteType: 'YES' | 'NO',
): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-vote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      proposal_id: proposalId,
      vote_type: voteType,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`process-vote failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================================================
// TESTS
// ============================================================================

describe('process-vote integration (real edge function)', () => {
  // Increase timeout — edge functions can be slow on cold start
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Clean up any existing proposals + votes for this pair
    // First find all proposal IDs for this pair so we can delete their votes
    const { data: existingProposals, error: findErr } = await admin.from('proposals')
      .select('id')
      .or(
        `and(user_a_id.eq.${PROPOSAL_USER_A},user_b_id.eq.${PROPOSAL_USER_B}),` +
        `and(user_a_id.eq.${PROPOSAL_USER_B},user_b_id.eq.${PROPOSAL_USER_A})`
      );

    console.log(`Found ${existingProposals?.length ?? 0} existing proposals to clean up`, findErr);

    if (existingProposals && existingProposals.length > 0) {
      const ids = existingProposals.map((p: any) => p.id);
      // Delete votes referencing these proposals first (FK constraint)
      for (const id of ids) {
        const { error: voteErr } = await admin.from('proposal_votes').delete().eq('proposal_id', id);
        if (voteErr) console.error(`Failed to delete votes for ${id}:`, voteErr);
      }
      // Delete matches referencing these proposals (FK: matches.proposal_id → proposals.id)
      for (const id of ids) {
        const { error: matchErr } = await admin.from('matches').delete().eq('proposal_id', id);
        if (matchErr) console.error(`Failed to delete matches for proposal ${id}:`, matchErr);
      }
      // Then delete the proposals themselves
      for (const id of ids) {
        const { error: delErr } = await admin.from('proposals').delete().eq('id', id);
        if (delErr) console.error(`Failed to delete proposal ${id}:`, delErr);
      }
    }

    // Create a fresh pending proposal
    const { data, error } = await admin.from('proposals').insert({
      user_a_id: PROPOSAL_USER_A,
      user_b_id: PROPOSAL_USER_B,
      status: 'pending',
      compatibility_score: 75,
      pool_eligible: true,
      voting_started_at: new Date().toISOString(),
      voting_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    }).select('id').single();

    if (error) throw new Error(`Failed to create proposal: ${error.message}`);
    proposalId = data.id;
    console.log(`Created test proposal: ${proposalId}`);
  });

  // No afterAll cleanup — leave the proposal in the DB so it shows in the app

  it('should accept 3 YES votes and move proposal to deciding', async () => {
    for (let i = 0; i < VOTERS.length; i++) {
      const voter = VOTERS[i];
      console.log(`\nVote ${i + 1}/3: Getting token for ${voter.email}...`);

      const token = await getAccessToken(voter.id);
      console.log(`  Got token, casting YES vote...`);

      const result = await callProcessVote(token, proposalId, 'YES');
      console.log(`  Vote result:`, JSON.stringify(result, null, 2));

      // Verify the vote was accepted
      expect(result.status).toBe('success');
      expect(result.vote_type).toBe('YES');

      // Check proposal status after each vote
      const { data: proposal } = await admin
        .from('proposals')
        .select('status, pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes, weighted_yes, weighted_no')
        .eq('id', proposalId)
        .single();

      console.log(`  Proposal state: ${JSON.stringify(proposal)}`);

      // weighted_yes should increase with each vote (friend votes count more)
      expect(proposal?.weighted_yes).toBeGreaterThan(0);

      if (i < 2) {
        // First 2 votes: should still be pending
        expect(proposal?.status).toBe('pending');
      }
      // Note: some voters may be friends of proposal users, so pool_yes_votes
      // won't always equal i+1. The edge function decides when to transition
      // based on weighted vote thresholds.
    }

    // After all 3 votes, verify the proposal progressed
    const { data: final } = await admin
      .from('proposals')
      .select('status, weighted_yes, weighted_no')
      .eq('id', proposalId)
      .single();

    console.log(`  Final proposal state: ${JSON.stringify(final)}`);

    // With 3 YES votes (mix of friend+pool), proposal should have moved to deciding
    expect(['deciding', 'passed_to_match']).toContain(final?.status);
  });
});
