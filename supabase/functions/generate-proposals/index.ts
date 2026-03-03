import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { calculateCompatibility, passesBasicFilter } from '../_shared/scoring.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { MAX_POOL_VOTES } from '../_shared/constants.ts';

const MIN_COMPATIBILITY_SCORE = 25.0;
const MAX_PROPOSALS_PER_RUN = 50;
const VOTERS_PER_PROPOSAL = 6;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const maxProposals = body.max_proposals || MAX_PROPOSALS_PER_RUN;
    const supabase = createAdminClient();

    // 1. Fetch eligible users (not paused, have preferences = completed onboarding)
    const { data: profiles, error: profilesErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_paused', false);

    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length < 2) {
      return Response.json({
        status: 'insufficient_users',
        eligible_users: profiles?.length || 0,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);

    // 2. Fetch preferences (only users with preferences are eligible)
    const { data: allPrefs, error: prefsErr } = await supabase
      .from('user_preferences')
      .select('*')
      .in('user_id', userIds);

    if (prefsErr) throw prefsErr;

    const prefsMap: Record<string, any> = {};
    for (const p of (allPrefs || [])) {
      prefsMap[p.user_id] = p;
    }

    // Filter to users who have preferences (completed onboarding)
    const eligibleProfiles = profiles.filter((p: any) => prefsMap[p.user_id]);

    if (eligibleProfiles.length < 2) {
      return Response.json({
        status: 'insufficient_users',
        eligible_users: eligibleProfiles.length,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    // 3. Fetch exclusion sets in parallel
    const [existingRes, activeProposalRes, blockedRes, matchesRes] = await Promise.all([
      // Permanently blocked pairs: all proposals except expired (rejected/declined = permanent block)
      supabase.from('proposals').select('user_a_id, user_b_id, status')
        .not('status', 'eq', 'expired'),
      // Users who already have an active proposal or are in the deciding window (one at a time)
      supabase.from('proposals').select('user_a_id, user_b_id')
        .in('status', ['pending', 'deciding', 'expired']),
      supabase.from('blocked_users').select('user_id, blocked_user_id'),
      supabase.from('matches').select('user_id_1, user_id_2').in('status', ['pending', 'accepted', 'active']),
    ]);

    // Pairs that can never be re-proposed (all non-expired proposals)
    const existingPairs = new Set<string>();
    for (const row of (existingRes.data || [])) {
      const key = [row.user_a_id, row.user_b_id].sort().join('|');
      existingPairs.add(key);
    }

    // Users who already have an active proposal — cannot get a new one
    const usersWithActiveProposal = new Set<string>();
    for (const row of (activeProposalRes.data || [])) {
      usersWithActiveProposal.add(row.user_a_id);
      usersWithActiveProposal.add(row.user_b_id);
    }

    const blockedPairs = new Set<string>();
    for (const row of (blockedRes.data || [])) {
      const key = [row.user_id, row.blocked_user_id].sort().join('|');
      blockedPairs.add(key);
    }

    // Users with active matches — excluded from matchmaking entirely
    const matchedUsers = new Set<string>();
    const matchPairs = new Set<string>();
    for (const row of (matchesRes.data || [])) {
      const key = [row.user_id_1, row.user_id_2].sort().join('|');
      matchPairs.add(key);
      matchedUsers.add(row.user_id_1);
      matchedUsers.add(row.user_id_2);
    }

    // 4. Fetch deep question answers for scoring
    const { data: deepAnswers } = await supabase
      .from('deep_question_answers')
      .select('user_id, answers')
      .in('user_id', userIds);

    const deepMap: Record<string, any[]> = {};
    for (const row of (deepAnswers || [])) {
      if (row.answers && typeof row.answers === 'object') {
        // answers is JSONB — could be an array or an object with question_id keys
        if (Array.isArray(row.answers)) {
          deepMap[row.user_id] = row.answers;
        } else {
          // Convert object format to array format
          deepMap[row.user_id] = Object.entries(row.answers).map(([qid, answer]) => ({
            question_id: qid,
            answer_text: typeof answer === 'string' ? answer : (answer as any)?.answer_text || '',
          }));
        }
      }
    }

    // 5. Generate candidate pairs with pre-filtering
    const candidates: Array<{
      profileA: any; prefsA: any; profileB: any; prefsB: any;
    }> = [];

    for (let i = 0; i < eligibleProfiles.length; i++) {
      for (let j = i + 1; j < eligibleProfiles.length; j++) {
        const a = eligibleProfiles[i];
        const b = eligibleProfiles[j];

        // Skip users who already have an active proposal or match
        if (usersWithActiveProposal.has(a.user_id) || usersWithActiveProposal.has(b.user_id)) {
          continue;
        }
        if (matchedUsers.has(a.user_id) || matchedUsers.has(b.user_id)) {
          continue;
        }

        const pairKey = [a.user_id, b.user_id].sort().join('|');

        // Skip excluded pairs (permanently blocked or already proposed)
        if (existingPairs.has(pairKey) || blockedPairs.has(pairKey) || matchPairs.has(pairKey)) {
          continue;
        }

        const pA = prefsMap[a.user_id] || {};
        const pB = prefsMap[b.user_id] || {};

        // Quick gender/age filter
        if (passesBasicFilter(a, pA, b, pB)) {
          candidates.push({ profileA: a, prefsA: pA, profileB: b, prefsB: pB });
        }
      }
    }

    if (candidates.length === 0) {
      return Response.json({
        status: 'no_candidates',
        eligible_users: eligibleProfiles.length,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    // 6. Score and rank pairs
    const scored: Array<{
      user_a_id: string; user_b_id: string;
      compatibility_score: number;
      category_scores: Record<string, number>;
      weighted_scores: Record<string, number>;
    }> = [];

    for (const { profileA, prefsA, profileB, prefsB } of candidates) {
      const deepA = deepMap[profileA.user_id] || [];
      const deepB = deepMap[profileB.user_id] || [];

      const result = calculateCompatibility(profileA, prefsA, profileB, prefsB, null, deepA, deepB);

      if (result.total_score >= MIN_COMPATIBILITY_SCORE) {
        // Enforce user_a_id < user_b_id
        const [uA, uB] = profileA.user_id < profileB.user_id
          ? [profileA.user_id, profileB.user_id]
          : [profileB.user_id, profileA.user_id];

        scored.push({
          user_a_id: uA,
          user_b_id: uB,
          compatibility_score: result.total_score,
          category_scores: result.category_scores,
          weighted_scores: result.weighted_scores,
        });
      }
    }

    scored.sort((a, b) => b.compatibility_score - a.compatibility_score);
    const topPairs = scored.slice(0, maxProposals);

    if (topPairs.length === 0) {
      return Response.json({
        status: 'no_viable_matches',
        eligible_users: eligibleProfiles.length,
        candidates_filtered: candidates.length,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    // 7. Create proposals in DB
    const now = new Date().toISOString();
    const votingExpires = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const createdProposals: any[] = [];

    for (const pair of topPairs) {
      const { data: created, error: insertErr } = await supabase
        .from('proposals')
        .insert({
          user_a_id: pair.user_a_id,
          user_b_id: pair.user_b_id,
          status: 'pending',
          compatibility_score: pair.compatibility_score,
          category_scores: pair.category_scores,
          pool_yes_votes: 0,
          pool_no_votes: 0,
          friend_yes_votes: 0,
          friend_no_votes: 0,
          pool_eligible: true,
          user_a_decision: 'pending',
          user_b_decision: 'pending',
          voting_started_at: now,
          voting_expires_at: votingExpires,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertErr) {
        // Skip duplicates (unique constraint violation)
        if (insertErr.code === '23505') continue;
        console.error(`Error creating proposal: ${insertErr.message}`);
        continue;
      }

      if (created) {
        createdProposals.push(created);
      }
    }

    // 8. Assign pool voters to each proposal (new AND existing pending)
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id, friend_id');

    const friendsMap: Record<string, Set<string>> = {};
    for (const row of (friendships || [])) {
      if (!friendsMap[row.user_id]) friendsMap[row.user_id] = new Set();
      if (!friendsMap[row.friend_id]) friendsMap[row.friend_id] = new Set();
      friendsMap[row.user_id].add(row.friend_id);
      friendsMap[row.friend_id].add(row.user_id);
    }

    // Fetch existing pending proposals to assign more voters
    const { data: existingPending } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id, status')
      .eq('status', 'pending');

    // Combine newly created with existing pending
    const existingIds = new Set(createdProposals.map(p => p.id));
    const allToAssign = [
      ...createdProposals,
      ...(existingPending || []).filter(p => !existingIds.has(p.id))
    ];

    let totalAssigned = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    for (const proposal of allToAssign) {
      // 1. Check how many pool voters already assigned/voted
      const { data: assignments } = await supabase
        .from('pool_vote_assignments')
        .select('voter_id')
        .eq('proposal_id', proposal.id);

      const alreadyAssignedCount = (assignments || []).length;
      const alreadyAssignedIds = new Set((assignments || []).map(a => a.voter_id));

      // Don't exceed MAX_POOL_VOTES
      if (alreadyAssignedCount >= MAX_POOL_VOTES) continue;

      const ua = proposal.user_a_id;
      const ub = proposal.user_b_id;
      const friendsOfA = friendsMap[ua] || new Set();
      const friendsOfB = friendsMap[ub] || new Set();
      const allFriends = new Set([...friendsOfA, ...friendsOfB]);

      // Eligible pool voters:
      // - not user_a, not user_b
      // - not friends of either
      // - hasn't already been assigned this proposal
      const eligible = eligibleProfiles.filter((u: any) =>
        u.user_id !== ua &&
        u.user_id !== ub &&
        !allFriends.has(u.user_id) &&
        !alreadyAssignedIds.has(u.user_id)
      );

      // Shuffle and pick up to VOTERS_PER_PROPOSAL, but don't exceed MAX_POOL_VOTES total
      const remainingSlots = MAX_POOL_VOTES - alreadyAssignedCount;
      const batchSize = Math.min(VOTERS_PER_PROPOSAL, remainingSlots);

      // Fisher-Yates shuffle for unbiased random ordering
      for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
      }
      const toAssign = eligible.slice(0, batchSize);

      if (toAssign.length > 0) {
        const insertBatch = toAssign.map((voter: any) => ({
          proposal_id: proposal.id,
          voter_id: voter.user_id,
          assignment_date: todayStr,
          has_voted: false,
        }));

        const { error: assignErr } = await supabase
          .from('pool_vote_assignments')
          .insert(insertBatch);

        if (!assignErr) totalAssigned += insertBatch.length;
        else console.error(`Error assigning voters for proposal ${proposal.id}: ${assignErr.message}`);
      }
    }

    return Response.json({
      status: 'success',
      eligible_users: eligibleProfiles.length,
      candidates_filtered: candidates.length,
      proposals_created: createdProposals.length,
      proposals_assigned: allToAssign.length,
      pool_voters_assigned: totalAssigned,
      top_score: topPairs[0]?.compatibility_score || 0,
      avg_score: topPairs.length > 0
        ? Math.round(topPairs.reduce((s, p) => s + p.compatibility_score, 0) / topPairs.length * 10) / 10
        : 0,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('generate-proposals error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
