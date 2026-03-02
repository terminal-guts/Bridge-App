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

function calculateWeightedYesPct(poolYes: number, poolNo: number, friendYes: number, friendNo: number): number {
  const weightedYes = poolYes + (friendYes * FRIEND_VOTE_WEIGHT);
  const weightedNo = poolNo + (friendNo * FRIEND_VOTE_WEIGHT);
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

    // 4. Upsert the vote (one vote per voter per proposal — unique constraint)
    const { error: voteErr } = await supabase
      .from('proposal_votes')
      .upsert({
        proposal_id,
        voter_user_id: voterId,
        vote_type,
        is_friend_vote: isFriendVote,
        friend_of: friendOf,
        recommend_to_id: recommend_to_id || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'proposal_id,voter_user_id' });

    if (voteErr) {
      console.error('Vote upsert error:', voteErr);
      return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
    }

    // 5. Recount all votes for this proposal (source of truth)
    const { data: allVotes } = await supabase
      .from('proposal_votes')
      .select('vote_type, is_friend_vote')
      .eq('proposal_id', proposal_id);

    let poolYes = 0, poolNo = 0, friendYes = 0, friendNo = 0;
    for (const v of (allVotes || [])) {
      if (v.is_friend_vote) {
        if (v.vote_type === 'YES') friendYes++;
        else if (v.vote_type === 'NO') friendNo++;
      } else {
        if (v.vote_type === 'YES') poolYes++;
        else if (v.vote_type === 'NO') poolNo++;
      }
    }

    // 6. Update vote tallies on the proposal
    const { error: tallyErr } = await supabase
      .from('proposals')
      .update({
        pool_yes_votes: poolYes,
        pool_no_votes: poolNo,
        friend_yes_votes: friendYes,
        friend_no_votes: friendNo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposal_id);

    if (tallyErr) {
      console.error('Tally update error:', tallyErr);
    }

    // 7. Inline lifecycle evaluation
    const updatedProposal = { ...proposal, pool_yes_votes: poolYes, pool_no_votes: poolNo, friend_yes_votes: friendYes, friend_no_votes: friendNo };
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
        if (threshold === null || calculateWeightedYesPct(poolYes, poolNo, friendYes, friendNo) >= threshold) {
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

    // 8. Mark pool_vote_assignment as voted
    await supabase
      .from('pool_vote_assignments')
      .update({ has_voted: true })
      .eq('proposal_id', proposal_id)
      .eq('voter_id', voterId);

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
