/**
 * INVESTIGATION FINDINGS (Voting Edge Cases):
 * 1. Double voting: Upsert allows re-voting, but karma was double-counted (+1 on every hit).
 *    Weighted tallies worked due to recount logic but will be changed to incremental.
 *    Streaks only updated for one friend even if both were friends.
 * 2. Both friends in proposal: hasCompletedGrid correctly marks both as helped in UI
 *    because they share the proposal ID. Streak logic only updated one friend in backend.
 * 3. Friend in 3-vote gate: Correctly marked helped after completion.
 * 4. Two friends in gate: Correctly marked both helped.
 * 5. Vote in gate, then friend area: Correctly excluded from "Help" list via alreadyVotedIds.
 * 6. Vote change tallies: Handled by recount, now implementing subtract-old/add-new.
 * 7. Pool assignments: has_voted set to true correctly; re-votes are harmless.
 * 8. Other: markFriendAsHelped in frontend is redundant (server handles streaks).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  FRIEND_VOTE_WEIGHT,
  MAX_PROPOSAL_DAYS,
  DECISION_DEADLINE_HOURS,
  THRESHOLD_SCHEDULE,
  CONFIRMATION_MIN_POOL_VOTES,
  CONFIRMATION_MIN_TOTAL_VOTES,
  CONFIRMATION_MIN_YES_VOTES,
  REJECTION_FLOOR_YES_RATE,
  REJECTION_FLOOR_MIN_VOTES,
  IMMEDIATE_CANCEL_POOL_VOTES,
  POOL_ELIGIBILITY_POOL_YES_RATE,
  POOL_ELIGIBILITY_FRIEND_MIN_VOTES,
  POOL_ELIGIBILITY_FRIEND_YES_RATE,
  KARMA_WEIGHTS,
} from '../_shared/constants.ts';

function getProposalDay(proposal: any): number {
  const created = proposal.voting_started_at || proposal.created_at;
  if (!created) return 1;
  const createdDate = new Date(created);
  const now = new Date();
  const delta = now.getTime() - createdDate.getTime();
  const day = Math.floor(delta / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(day, MAX_PROPOSAL_DAYS + 1);
}

function getCurrentThreshold(proposal: any): number | null {
  const day = getProposalDay(proposal);
  if (day > MAX_PROPOSAL_DAYS) return null;
  return THRESHOLD_SCHEDULE[day] ?? 0.55;
}

function calculateWeightedYesPct(weightedYes: number, weightedNo: number): number {
  const total = weightedYes + weightedNo;
  if (total === 0) return 0.0;
  return weightedYes / total;
}

function poolYesRate(poolYes: number, poolNo: number): number {
  const total = poolYes + poolNo;
  return total === 0 ? 0.0 : poolYes / total;
}

function friendYesRate(friendYes: number, friendNo: number): number {
  const total = friendYes + friendNo;
  return total === 0 ? 0.0 : friendYes / total;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the voter via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing authorization header' }, { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const voterId = user.id;
    const body = await req.json();
    const { proposal_id, vote_type, recommend_to_id } = body;

    if (!proposal_id || !vote_type) {
      return Response.json({ error: 'Missing proposal_id or vote_type' }, { status: 400, headers: corsHeaders });
    }

    const validVoteTypes = ['YES', 'NO', 'UNSURE', 'RECOMMEND'];
    if (!validVoteTypes.includes(vote_type)) {
      return Response.json({ error: `Invalid vote_type. Must be one of: ${validVoteTypes.join(', ')}` }, { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    // 0a. Daily vote cap — safety net against abuse (generous limit; real users won't hit this)
    const { count: todayVotes } = await supabase
      .from('proposal_votes')
      .select('*', { count: 'exact', head: true })
      .eq('voter_user_id', voterId)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    if ((todayVotes ?? 0) >= 50) {
      return Response.json({ error: 'Daily vote limit reached. Try again tomorrow.' }, { status: 429, headers: corsHeaders });
    }

    // 0b. Check if a vote already exists for this proposal/voter pair
    const { data: existingVote } = await supabase
      .from('proposal_votes')
      .select('vote_type, is_friend_vote, voter_user_id, vote_weight')
      .eq('proposal_id', proposal_id)
      .eq('voter_user_id', voterId)
      .maybeSingle();

    const isNewVote = !existingVote;

    // 1. Fetch the proposal
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (propErr || !proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
    }

    if (proposal.status !== 'pending') {
      return Response.json({ error: `Proposal is in '${proposal.status}' status, not accepting votes` }, { status: 400, headers: corsHeaders });
    }

    // 2. Voter cannot be user_a or user_b
    if (voterId === proposal.user_a_id || voterId === proposal.user_b_id) {
      return Response.json({ error: 'You cannot vote on your own proposal' }, { status: 403, headers: corsHeaders });
    }

    // 2b. Block check — voter must not have blocked either participant (or vice versa)
    const { data: blockRows } = await supabase
      .from('blocked_users')
      .select('id')
      .or(
        `and(user_id.eq.${voterId},blocked_user_id.eq.${proposal.user_a_id}),` +
        `and(user_id.eq.${voterId},blocked_user_id.eq.${proposal.user_b_id}),` +
        `and(user_id.eq.${proposal.user_a_id},blocked_user_id.eq.${voterId}),` +
        `and(user_id.eq.${proposal.user_b_id},blocked_user_id.eq.${voterId})`,
      )
      .limit(1);

    if (blockRows && blockRows.length > 0) {
      return Response.json({ error: 'You cannot vote on this proposal' }, { status: 403, headers: corsHeaders });
    }

    // 3. Determine if this is a friend vote
    const { data: friendRows } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${voterId},friend_id.eq.${voterId}`);

    const voterFriends = new Set<string>();
    for (const row of (friendRows || [])) {
      if (row.user_id === voterId) voterFriends.add(row.friend_id);
      if (row.friend_id === voterId) voterFriends.add(row.user_id);
    }

    const isFriendOfA = voterFriends.has(proposal.user_a_id);
    const isFriendOfB = voterFriends.has(proposal.user_b_id);
    const isFriendVote = isFriendOfA || isFriendOfB;
    const friendOf = isFriendOfA ? proposal.user_a_id : (isFriendOfB ? proposal.user_b_id : null);

    // 4. Get voter karma tier for vote weighting
    const { data: voterKarma } = await supabase
      .from('karma_scores')
      .select('badge_tier')
      .eq('user_id', voterId)
      .maybeSingle();

    const voterTier = voterKarma?.badge_tier || 'new';
    const weightMultiplier = KARMA_WEIGHTS[voterTier] || 1.0;

    // 5. Upsert the vote (one vote per voter per proposal — unique constraint)
    const effectiveVoteWeight = isFriendVote
      ? weightMultiplier * FRIEND_VOTE_WEIGHT
      : weightMultiplier;

    const { error: voteErr } = await supabase
      .from('proposal_votes')
      .upsert({
        proposal_id,
        voter_user_id: voterId,
        vote_type,
        is_friend_vote: isFriendVote,
        vote_weight: effectiveVoteWeight,
        friend_of: friendOf,
        recommend_to_id: recommend_to_id || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'proposal_id,voter_user_id' });

    if (voteErr) {
      console.error('Vote upsert error:', voteErr);
      return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
    }

    // 6. Update voter karma (only for new votes)
    if (isNewVote) {
      await supabase.rpc('increment_karma_for_vote', { p_user_id: voterId });
    }

    // 7. Incremental tally logic

    let poolYes = proposal.pool_yes_votes || 0;
    let poolNo = proposal.pool_no_votes || 0;
    let friendYes = proposal.friend_yes_votes || 0;
    let friendNo = proposal.friend_no_votes || 0;
    let weightedYes = proposal.weighted_yes || 0;
    let weightedNo = proposal.weighted_no || 0;

    // A. Subtract old vote weight if it was a different vote type
    //    Only YES/NO ever touched tallies — UNSURE/RECOMMEND never added anything, so skip subtraction.
    if (existingVote && existingVote.vote_type !== vote_type && (existingVote.vote_type === 'YES' || existingVote.vote_type === 'NO')) {
      // Use stored vote_weight for accurate subtraction (avoids tier-drift)
      const oldWeight = existingVote.vote_weight || (existingVote.is_friend_vote ? weightMultiplier * FRIEND_VOTE_WEIGHT : weightMultiplier);
      if (existingVote.is_friend_vote) {
        if (existingVote.vote_type === 'YES') { friendYes--; weightedYes -= oldWeight; }
        else if (existingVote.vote_type === 'NO') { friendNo--; weightedNo -= oldWeight; }
      } else {
        if (existingVote.vote_type === 'YES') { poolYes--; weightedYes -= oldWeight; }
        else if (existingVote.vote_type === 'NO') { poolNo--; weightedNo -= oldWeight; }
      }
    }

    // B. Add new vote weight if it's new or the type changed
    if (isNewVote || (existingVote && existingVote.vote_type !== vote_type)) {
      if (isFriendVote) {
        const friendWeight = weightMultiplier * FRIEND_VOTE_WEIGHT;
        if (vote_type === 'YES') { friendYes++; weightedYes += friendWeight; }
        else if (vote_type === 'NO') { friendNo++; weightedNo += friendWeight; }
      } else {
        if (vote_type === 'YES') { poolYes++; weightedYes += weightMultiplier; }
        else if (vote_type === 'NO') { poolNo++; weightedNo += weightMultiplier; }
      }

      // 7. Update vote tallies & weighted totals on the proposal
      const { error: tallyErr } = await supabase
        .from('proposals')
        .update({
          pool_yes_votes: poolYes,
          pool_no_votes: poolNo,
          friend_yes_votes: friendYes,
          friend_no_votes: friendNo,
          weighted_yes: weightedYes,
          weighted_no: weightedNo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal_id);

      if (tallyErr) {
        console.error('Tally update error:', tallyErr);
      }
    }

    // 8. Inline lifecycle evaluation
    const updatedProposal = { ...proposal, pool_yes_votes: poolYes, pool_no_votes: poolNo, friend_yes_votes: friendYes, friend_no_votes: friendNo, weighted_yes: weightedYes, weighted_no: weightedNo };
    const nowIso = new Date().toISOString();
    let newStatus = 'pending';
    const lifecycleUpdate: Record<string, any> = {};

    // Check expiry
    if (getProposalDay(updatedProposal) > MAX_PROPOSAL_DAYS) {
      newStatus = 'expired';
      const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 60 * 60 * 1000).toISOString();
      Object.assign(lifecycleUpdate, {
        status: 'expired',
        expired_at: nowIso,
        passed_to_users_at: nowIso,
        decision_deadline_at: deadline,
        updated_at: nowIso,
      });
    }

    // Check immediate cancel (first 6 pool votes all NO)
    if (newStatus === 'pending') {
      const { data: poolVotesSorted } = await supabase
        .from('proposal_votes')
        .select('vote_type, is_friend_vote, created_at')
        .eq('proposal_id', proposal_id)
        .eq('is_friend_vote', false)
        .order('created_at', { ascending: true })
        .limit(IMMEDIATE_CANCEL_POOL_VOTES);

      if (poolVotesSorted && poolVotesSorted.length >= IMMEDIATE_CANCEL_POOL_VOTES) {
        const allNo = poolVotesSorted.every(v => v.vote_type === 'NO');
        if (allNo) {
          newStatus = 'rejected';
          Object.assign(lifecycleUpdate, {
            status: 'rejected',
            rejected_at: nowIso,
            updated_at: nowIso,
          });
        }
      }
    }

    // Check rejection floors
    if (newStatus === 'pending') {
      const totalPool = poolYes + poolNo;
      const totalAll = totalPool + friendYes + friendNo;

      if (totalPool >= REJECTION_FLOOR_MIN_VOTES && poolYesRate(poolYes, poolNo) < REJECTION_FLOOR_YES_RATE) {
        newStatus = 'rejected';
        Object.assign(lifecycleUpdate, { status: 'rejected', rejected_at: nowIso, updated_at: nowIso });
      } else if (totalAll >= REJECTION_FLOOR_MIN_VOTES) {
        const combinedYesRate = totalAll > 0 ? (poolYes + friendYes) / totalAll : 0;
        if (combinedYesRate < REJECTION_FLOOR_YES_RATE) {
          newStatus = 'rejected';
          Object.assign(lifecycleUpdate, { status: 'rejected', rejected_at: nowIso, updated_at: nowIso });
        }
      }
    }

    // Check confirmation
    if (newStatus === 'pending') {
      const totalPool = poolYes + poolNo;
      const totalAll = totalPool + friendYes + friendNo;
      const totalYes = poolYes + friendYes;

      if (totalPool >= CONFIRMATION_MIN_POOL_VOTES && totalAll >= CONFIRMATION_MIN_TOTAL_VOTES && totalYes >= CONFIRMATION_MIN_YES_VOTES) {
        const threshold = getCurrentThreshold(updatedProposal);
        if (threshold === null || calculateWeightedYesPct(weightedYes, weightedNo) >= threshold) {
          newStatus = 'deciding';
          const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 60 * 60 * 1000).toISOString();
          Object.assign(lifecycleUpdate, {
            status: 'deciding',
            community_decided_at: nowIso,
            passed_to_users_at: nowIso,
            decision_deadline_at: deadline,
            updated_at: nowIso,
          });
        }
      }
    }

    // Check pool eligibility
    if (newStatus === 'pending') {
      const eligible = poolYesRate(poolYes, poolNo) >= POOL_ELIGIBILITY_POOL_YES_RATE ||
        (friendYes + friendNo >= POOL_ELIGIBILITY_FRIEND_MIN_VOTES && friendYesRate(friendYes, friendNo) >= POOL_ELIGIBILITY_FRIEND_YES_RATE);

      if (eligible !== proposal.pool_eligible) {
        Object.assign(lifecycleUpdate, { pool_eligible: eligible, updated_at: nowIso });
      }
    }

    // Apply lifecycle update if any
    if (Object.keys(lifecycleUpdate).length > 0) {
      await supabase
        .from('proposals')
        .update(lifecycleUpdate)
        .eq('id', proposal_id);
    }

    // 9. Mark pool_vote_assignment as voted
    await supabase
      .from('pool_vote_assignments')
      .update({ has_voted: true })
      .eq('proposal_id', proposal_id)
      .eq('voter_id', voterId);

    // 10. If friend vote, update friend streak for each friendship
    // Voter may be friends with both user_a and user_b — update both streaks
    if (isFriendVote) {
      const streakUpdates: Promise<any>[] = [];
      if (isFriendOfA) {
        streakUpdates.push(supabase.rpc('update_friend_streak', { p_user_id: voterId, p_friend_id: proposal.user_a_id }));
      }
      if (isFriendOfB) {
        streakUpdates.push(supabase.rpc('update_friend_streak', { p_user_id: voterId, p_friend_id: proposal.user_b_id }));
      }
      await Promise.all(streakUpdates);
    }

    return Response.json({
      status: 'success',
      vote_type,
      is_friend_vote: isFriendVote,
      proposal_status: newStatus !== 'pending' ? newStatus : proposal.status,
      tallies: { pool_yes: poolYes, pool_no: poolNo, friend_yes: friendYes, friend_no: friendNo },
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('process-vote error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
