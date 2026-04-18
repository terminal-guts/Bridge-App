import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  FRIEND_VOTE_WEIGHT,
  KARMA_WEIGHTS,
} from '../_shared/constants.ts';

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

    // 5. Record the vote
    const effectiveVoteWeight = isFriendVote
      ? weightMultiplier * FRIEND_VOTE_WEIGHT
      : weightMultiplier;

    const votePayload = {
      proposal_id,
      voter_user_id: voterId,
      vote_type,
      is_friend_vote: isFriendVote,
      vote_weight: effectiveVoteWeight,
      friend_of: friendOf,
      recommend_to_id: recommend_to_id || null,
    };

    // Race-safe insert-then-update pattern:
    // Try INSERT first. If it succeeds, this is definitively a new vote and
    // we can safely award karma. If it fails with a unique-constraint
    // violation (code 23505), the vote already exists — fall back to UPDATE
    // and skip karma. This eliminates the TOCTOU gap where two concurrent
    // first-votes could both see existingVote=null and both award karma.
    let confirmedNewVote = false;

    if (isNewVote) {
      const { error: insertErr } = await supabase
        .from('proposal_votes')
        .insert(votePayload);

      if (!insertErr) {
        // INSERT succeeded — this request created the row
        confirmedNewVote = true;
      } else if (insertErr.code === '23505') {
        // Unique constraint violation — another concurrent request inserted
        // first. Fall back to UPDATE (re-vote behavior).
        const { error: updateErr } = await supabase
          .from('proposal_votes')
          .update({
            vote_type,
            is_friend_vote: isFriendVote,
            vote_weight: effectiveVoteWeight,
            friend_of: friendOf,
            recommend_to_id: recommend_to_id || null,
          })
          .eq('proposal_id', proposal_id)
          .eq('voter_user_id', voterId);

        if (updateErr) {
          console.error('Vote update error (after conflict):', updateErr);
          return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
        }
      } else {
        console.error('Vote insert error:', insertErr);
        return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
      }
    } else {
      // Known re-vote — upsert is fine, no karma at stake
      const { error: voteErr } = await supabase
        .from('proposal_votes')
        .upsert(votePayload, { onConflict: 'proposal_id,voter_user_id' });

      if (voteErr) {
        console.error('Vote upsert error:', voteErr);
        return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
      }
    }

    // 6. Update voter karma — only when INSERT succeeded (race-safe)
    if (confirmedNewVote) {
      await supabase.rpc('increment_karma_for_vote', { p_user_id: voterId });
    }

    // 7. Atomic tally update via SQL expressions (eliminates read-modify-write race)
    const tallyChanged = confirmedNewVote || (existingVote && existingVote.vote_type !== vote_type);

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

    // Mark pool_vote_assignment as voted.  Status changes happen only in the
    // daily proposal-lifecycle cron — no inline per-vote lifecycle evaluation.
    await supabase
      .from('pool_vote_assignments')
      .update({ has_voted: true })
      .eq('proposal_id', proposal_id)
      .eq('voter_id', voterId);

    // If friend vote, update friend streak for each friendship.
    // Voter may be friends with both user_a and user_b — update both streaks.
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
      proposal_status: proposal.status,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('process-vote error:', err);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
