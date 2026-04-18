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

    // ── Phase 1: Parallel pre-checks ────────────────────────────────────────
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
      supabase.from('proposals').select('*').eq('id', proposal_id).maybeSingle(),
    ]);

    // 0. Suspended voter → block (self-protection, not a stale-vote case)
    if (voterProfile?.is_suspended) {
      return Response.json({ error: 'Your account has been suspended' }, { status: 403, headers: corsHeaders });
    }

    // 0a. Daily vote cap (anti-abuse)
    if ((todayVotes ?? 0) >= 50) {
      return Response.json({ error: 'Daily vote limit reached. Try again tomorrow.' }, { status: 429, headers: corsHeaders });
    }

    // ── Stale-proposal graceful path ─────────────────────────────────────────
    // If the proposal was deleted, no longer pending, or its subjects are
    // paused/suspended, we silently accept the vote with +1 karma so the
    // user's UI progresses normally.  We do NOT update tallies or streaks.
    // The unique constraint on (proposal_id, voter_user_id) prevents +1
    // farming via repeat attempts.
    const isStale = !proposal || propErr
      || proposal.status !== 'pending';

    if (isStale) {
      return await handleStaleVote(supabase, {
        proposal_id,
        voter_id: voterId,
        vote_type,
        recommend_to_id: recommend_to_id || null,
        existing_vote: existingVote,
        proposal_status: proposal?.status || 'deleted',
      });
    }

    // Proposal exists and is pending — check if subjects are paused/suspended.
    // (Defense in depth — the auto-expire trigger should have flipped status
    // to 'expired' already, but double-check for race-condition safety.)
    const [subjAPausedRes, subjBPausedRes] = await Promise.all([
      supabase.from('user_profiles').select('is_paused, is_suspended').eq('user_id', proposal.user_a_id).maybeSingle(),
      supabase.from('user_profiles').select('is_paused, is_suspended').eq('user_id', proposal.user_b_id).maybeSingle(),
    ]);
    const subjAStale = !subjAPausedRes.data || subjAPausedRes.data.is_paused || subjAPausedRes.data.is_suspended;
    const subjBStale = !subjBPausedRes.data || subjBPausedRes.data.is_paused || subjBPausedRes.data.is_suspended;
    if (subjAStale || subjBStale) {
      return await handleStaleVote(supabase, {
        proposal_id,
        voter_id: voterId,
        vote_type,
        recommend_to_id: recommend_to_id || null,
        existing_vote: existingVote,
        proposal_status: proposal.status,
      });
    }

    // 2. Voter cannot be user_a or user_b
    if (voterId === proposal.user_a_id || voterId === proposal.user_b_id) {
      return Response.json({ error: 'You cannot vote on your own proposal' }, { status: 403, headers: corsHeaders });
    }

    const isNewVote = !existingVote;

    // ── Phase 2: Parallel context queries ───────────────────────────────────
    const [
      { data: blockRows },
      { data: friendRows },
      { data: voterKarma },
    ] = await Promise.all([
      supabase.from('blocked_users').select('id').or(
        `and(user_id.eq.${voterId},blocked_user_id.eq.${proposal.user_a_id}),` +
        `and(user_id.eq.${voterId},blocked_user_id.eq.${proposal.user_b_id}),` +
        `and(user_id.eq.${proposal.user_a_id},blocked_user_id.eq.${voterId}),` +
        `and(user_id.eq.${proposal.user_b_id},blocked_user_id.eq.${voterId})`,
      ).limit(1),
      supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted').or(`user_id.eq.${voterId},friend_id.eq.${voterId}`),
      supabase.from('karma_scores').select('badge_tier').eq('user_id', voterId).maybeSingle(),
    ]);

    if (blockRows && blockRows.length > 0) {
      // Block relationship between voter and subject → treat as stale.
      // Silent success (no error surfaced), +1 karma, no tally impact.
      return await handleStaleVote(supabase, {
        proposal_id,
        voter_id: voterId,
        vote_type,
        recommend_to_id: recommend_to_id || null,
        existing_vote: existingVote,
        proposal_status: proposal.status,
      });
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

    // NOTE: removed pool_vote_assignments authorization check.  Under the
    // gate-overhaul-v2 model, every user is an implicit voter on every pending
    // proposal; no per-user assignment row is required.

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

    let confirmedNewVote = false;

    if (isNewVote) {
      const { error: insertErr } = await supabase
        .from('proposal_votes')
        .insert(votePayload);

      if (!insertErr) {
        confirmedNewVote = true;
      } else if (insertErr.code === '23505') {
        // Race — another request got here first.  Fall back to UPDATE.
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
      const { error: voteErr } = await supabase
        .from('proposal_votes')
        .upsert(votePayload, { onConflict: 'proposal_id,voter_user_id' });
      if (voteErr) {
        console.error('Vote upsert error:', voteErr);
        return Response.json({ error: 'Failed to record vote' }, { status: 500, headers: corsHeaders });
      }
    }

    // 6. +1 karma for participation (race-safe — only when INSERT succeeded)
    if (confirmedNewVote) {
      await supabase.rpc('increment_karma_for_vote', { p_user_id: voterId });
    }

    // 7. Atomic tally update
    const tallyChanged = confirmedNewVote || (existingVote && existingVote.vote_type !== vote_type);

    if (tallyChanged) {
      let dPoolYes = 0, dPoolNo = 0, dFriendYes = 0, dFriendNo = 0;
      let dWeightedYes = 0.0, dWeightedNo = 0.0;

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

      if (isFriendVote) {
        const friendWeight = weightMultiplier * FRIEND_VOTE_WEIGHT;
        if (vote_type === 'YES') { dFriendYes++; dWeightedYes += friendWeight; }
        else if (vote_type === 'NO') { dFriendNo++; dWeightedNo += friendWeight; }
      } else {
        if (vote_type === 'YES') { dPoolYes++; dWeightedYes += weightMultiplier; }
        else if (vote_type === 'NO') { dPoolNo++; dWeightedNo += weightMultiplier; }
      }

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

    // 8. Friend streak update (silently skipped if friendship is gone)
    if (isFriendVote) {
      const streakUpdates: Promise<unknown>[] = [];
      if (isFriendOfA) {
        streakUpdates.push(
          supabase.rpc('update_friend_streak', { p_user_id: voterId, p_friend_id: proposal.user_a_id })
            .then((r) => { if (r.error) console.error('streak update failed:', r.error.message); return r; }),
        );
      }
      if (isFriendOfB) {
        streakUpdates.push(
          supabase.rpc('update_friend_streak', { p_user_id: voterId, p_friend_id: proposal.user_b_id })
            .then((r) => { if (r.error) console.error('streak update failed:', r.error.message); return r; }),
        );
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

// ────────────────────────────────────────────────────────────────────────────
// Stale-vote handler — silent success with +1 karma once.
//
// Applies when the proposal no longer exists, is no longer pending, or its
// subjects are paused/suspended/blocked.  We attempt to record the vote for
// audit trail; the unique constraint on (proposal_id, voter_user_id) prevents
// duplicate +1 karma on repeat attempts.  No tallies, no streaks.
//
// If the proposal was cascade-deleted, INSERT will fail with an FK violation;
// we handle that silently too — the user still gets +1 once for the first attempt
// in that case (tracked only by increment_karma_for_vote, not proposal_votes).
async function handleStaleVote(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    proposal_id: string;
    voter_id: string;
    vote_type: string;
    recommend_to_id: string | null;
    existing_vote: { vote_type?: string } | null;
    proposal_status: string;
  },
) {
  const hadPriorVote = !!args.existing_vote;

  // Try to record the vote for audit.  If the proposal is gone entirely,
  // this will fail with FK violation — that's OK, we just skip it.
  const { error: insertErr } = await supabase
    .from('proposal_votes')
    .insert({
      proposal_id: args.proposal_id,
      voter_user_id: args.voter_id,
      vote_type: args.vote_type,
      is_friend_vote: false,
      vote_weight: 0,  // zero weight — stale vote doesn't count toward tallies
      friend_of: null,
      recommend_to_id: args.recommend_to_id,
    });

  // Grant +1 karma only on FIRST attempt (no prior vote AND insert either
  // succeeded or FK-failed for a deleted proposal but hadn't tried before).
  // If unique constraint blocks (code 23505), they already voted — no +1.
  const shouldGrantKarma = !hadPriorVote && (!insertErr || insertErr.code !== '23505');
  if (shouldGrantKarma) {
    const { error: karmaErr } = await supabase.rpc('increment_karma_for_vote', { p_user_id: args.voter_id });
    if (karmaErr) {
      console.error('stale-vote karma grant failed:', karmaErr.message);
      // Don't fail the request — this is a silent path.
    }
  }

  return Response.json({
    status: 'success',
    vote_type: args.vote_type,
    is_friend_vote: false,
    proposal_status: args.proposal_status,
    stale: true,  // hint for debugging; frontend may ignore
  }, { headers: corsHeaders });
}
