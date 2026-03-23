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
  KARMA_WEIGHTS,
} from '../_shared/constants.ts';

interface ProposalTiming {
  voting_started_at?: string | null;
  created_at?: string;
}

function getProposalDay(proposal: ProposalTiming): number {
  const created = proposal.voting_started_at || proposal.created_at;
  if (!created) return 1;
  const createdDate = new Date(created);
  const now = new Date();
  const delta = now.getTime() - createdDate.getTime();
  const day = Math.floor(delta / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(day, MAX_PROPOSAL_DAYS + 1);
}

function getCurrentThreshold(proposal: ProposalTiming): number | null {
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

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(proposal_id)) {
      return Response.json({ error: 'Invalid proposal_id format' }, { status: 400, headers: corsHeaders });
    }

    const validVoteTypes = ['YES', 'NO', 'UNSURE', 'RECOMMEND'];
    if (!validVoteTypes.includes(vote_type)) {
      return Response.json({ error: `Invalid vote_type. Must be one of: ${validVoteTypes.join(', ')}` }, { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    // ── Phase 1: Parallel pre-checks (all independent of each other) ────────
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const [
      { data: voterProfile },
      { count: todayVotes },
      { data: existingVote },
      { data: proposal, error: propErr },
    ] = await Promise.all([
      supabase.from('user_profiles').select('is_suspended').eq('user_id', voterId).maybeSingle(),
      supabase.from('proposal_votes').select('*', { count: 'exact', head: true }).eq('voter_user_id', voterId).gte('created_at', todayStart),
      supabase.from('proposal_votes').select('vote_type, is_friend_vote, voter_user_id, vote_weight').eq('proposal_id', proposal_id).eq('voter_user_id', voterId).maybeSingle(),
      supabase.from('proposals').select('*').eq('id', proposal_id).single(),
    ]);

    // 0. Suspended check
    if (voterProfile?.is_suspended) {
      return Response.json({ error: 'Your account has been suspended' }, { status: 403, headers: corsHeaders });
    }

    // 0a. Daily vote cap
    if ((todayVotes ?? 0) >= 50) {
      return Response.json({ error: 'Daily vote limit reached. Try again tomorrow.' }, { status: 429, headers: corsHeaders });
    }

    // 1. Proposal validation
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

    const isNewVote = !existingVote;

    // ── Phase 2: Parallel context queries (depend on proposal user IDs) ────
    const [
      { data: blockRows },
      { data: friendRows },
      { data: voterKarma },
    ] = await Promise.all([
      // 2b. Block check
      supabase.from('blocked_users').select('id').or(
        `and(user_id.eq.${voterId},blocked_user_id.eq.${proposal.user_a_id}),` +
        `and(user_id.eq.${voterId},blocked_user_id.eq.${proposal.user_b_id}),` +
        `and(user_id.eq.${proposal.user_a_id},blocked_user_id.eq.${voterId}),` +
        `and(user_id.eq.${proposal.user_b_id},blocked_user_id.eq.${voterId})`,
      ).limit(1),
      // 3. Friend check
      supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted').or(`user_id.eq.${voterId},friend_id.eq.${voterId}`),
      // 4. Karma tier for vote weighting
      supabase.from('karma_scores').select('badge_tier').eq('user_id', voterId).maybeSingle(),
    ]);

    if (blockRows && blockRows.length > 0) {
      return Response.json({ error: 'You cannot vote on this proposal' }, { status: 403, headers: corsHeaders });
    }

    const voterFriends = new Set<string>();
    for (const row of (friendRows || [])) {
      if (row.user_id === voterId) voterFriends.add(row.friend_id);
      if (row.friend_id === voterId) voterFriends.add(row.user_id);
    }

    const isFriendOfA = voterFriends.has(proposal.user_a_id);
    const isFriendOfB = voterFriends.has(proposal.user_b_id);
    const isFriendVote = isFriendOfA || isFriendOfB;
    const friendOf = isFriendOfA ? proposal.user_a_id : (isFriendOfB ? proposal.user_b_id : null);

    // 4a. Pool assignment authorization: non-friend voters must have a pool_vote_assignment row.
    if (!isFriendVote) {
      const { data: assignment } = await supabase
        .from('pool_vote_assignments')
        .select('voter_id')
        .eq('proposal_id', proposal_id)
        .eq('voter_id', voterId)
        .maybeSingle();
      if (!assignment) {
        return Response.json({ error: 'Not assigned to this proposal' }, { status: 403, headers: corsHeaders });
      }
    }

    const voterTier = voterKarma?.badge_tier || 'new';
    const weightMultiplier = KARMA_WEIGHTS[voterTier] || 1.0;

    // 5. Upsert the vote (one vote per voter per proposal — unique constraint)
    const effectiveVoteWeight = isFriendVote
      ? weightMultiplier * FRIEND_VOTE_WEIGHT
      : weightMultiplier;

    // created_at is intentionally omitted so that on conflict (re-vote) the
    // original vote timestamp is preserved. The DB default sets it for new rows.
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
      }, { onConflict: 'proposal_id,voter_user_id' });

    if (voteErr) {
      console.error('Vote upsert error:', voteErr);
      return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
    }

    // 6. Update voter karma (only for new votes)
    if (isNewVote) {
      await supabase.rpc('increment_karma_for_vote', { p_user_id: voterId });
    }

    // 7. Atomic tally update via SQL expressions (eliminates read-modify-write race)
    const tallyChanged = isNewVote || (existingVote && existingVote.vote_type !== vote_type);

    if (tallyChanged) {
      // Build per-column signed deltas so a single UPDATE is atomic.
      let dPoolYes = 0, dPoolNo = 0, dFriendYes = 0, dFriendNo = 0;
      let dWeightedYes = 0.0, dWeightedNo = 0.0;

      // A. Subtract old vote contribution when the voter is changing their vote type.
      if (existingVote && existingVote.vote_type !== vote_type && (existingVote.vote_type === 'YES' || existingVote.vote_type === 'NO')) {
        const oldWeight = existingVote.vote_weight || (existingVote.is_friend_vote ? weightMultiplier * FRIEND_VOTE_WEIGHT : weightMultiplier);
        if (existingVote.is_friend_vote) {
          if (existingVote.vote_type === 'YES') { dFriendYes--; dWeightedYes -= oldWeight; }
          else { dFriendNo--; dWeightedNo -= oldWeight; }
        } else {
          if (existingVote.vote_type === 'YES') { dPoolYes--; dWeightedYes -= oldWeight; }
          else { dPoolNo--; dWeightedNo -= oldWeight; }
        }
      }

      // B. Add new vote contribution.
      if (isFriendVote) {
        const friendWeight = weightMultiplier * FRIEND_VOTE_WEIGHT;
        if (vote_type === 'YES') { dFriendYes++; dWeightedYes += friendWeight; }
        else if (vote_type === 'NO') { dFriendNo++; dWeightedNo += friendWeight; }
      } else {
        if (vote_type === 'YES') { dPoolYes++; dWeightedYes += weightMultiplier; }
        else if (vote_type === 'NO') { dPoolNo++; dWeightedNo += weightMultiplier; }
      }

      // Atomic increment via raw SQL so concurrent votes never clobber each other.
      const { error: tallyErr } = await supabase.rpc('increment_proposal_tallies', {
        p_proposal_id: proposal_id,
        p_pool_yes: dPoolYes,
        p_pool_no: dPoolNo,
        p_friend_yes: dFriendYes,
        p_friend_no: dFriendNo,
        p_weighted_yes: dWeightedYes,
        p_weighted_no: dWeightedNo,
      });

      if (tallyErr) {
        console.error('Tally update error:', tallyErr);
      }
    }

    // Re-fetch the proposal row so lifecycle evaluation uses post-increment values.
    const { data: refreshedProposal, error: refreshErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    const updatedProposal = (refreshErr || !refreshedProposal) ? proposal : refreshedProposal;

    const poolYes = updatedProposal.pool_yes_votes || 0;
    const poolNo = updatedProposal.pool_no_votes || 0;
    const friendYes = updatedProposal.friend_yes_votes || 0;
    const friendNo = updatedProposal.friend_no_votes || 0;
    const weightedYes = updatedProposal.weighted_yes || 0;
    const weightedNo = updatedProposal.weighted_no || 0;

    // 8. Inline lifecycle evaluation
    const nowIso = new Date().toISOString();
    let newStatus = 'pending';
    const lifecycleUpdate: Record<string, unknown> = {};
    const isExpired = getProposalDay(updatedProposal) > MAX_PROPOSAL_DAYS;

    // Check immediate cancel (first 6 pool votes all NO) — runs before expiry
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

    // Day 5+ quality floor: auto-promote only if quality is acceptable
    if (newStatus === 'pending' && isExpired) {
      const totalAll = poolYes + poolNo + friendYes + friendNo;
      const totalYes = poolYes + friendYes;
      const combinedYesRate = totalAll > 0 ? totalYes / totalAll : 0;

      if (totalAll < 3) {
        newStatus = 'expired';
        Object.assign(lifecycleUpdate, {
          status: 'expired',
          expired_at: nowIso,
          updated_at: nowIso,
        });
      } else if (combinedYesRate < 0.40) {
        newStatus = 'rejected';
        Object.assign(lifecycleUpdate, {
          status: 'rejected',
          rejected_at: nowIso,
          updated_at: nowIso,
        });
      } else {
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
      const streakUpdates: Promise<unknown>[] = [];
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

  } catch (err: unknown) {
    console.error('process-vote error:', err);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
