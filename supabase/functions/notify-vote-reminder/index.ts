/**
 * notify-vote-reminder — Cron: 8 PM Central (01:00 UTC)
 *
 * The most important engagement notification. Checks each user for
 * friends who have active proposals they haven't voted on, and sends
 * a single push naming the friend with the longest streak.
 *
 * This is the core daily voting loop driver.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';

const COPY_VARIANTS = [
  {
    title: (name: string) => `${name} needs you`,
    body: (_name: string) => `They have a proposal waiting. Your vote matters.`,
  },
  {
    title: (name: string) => `Don't leave ${name} hanging`,
    body: (_name: string) => `Their proposal is still open and you haven't voted.`,
  },
  {
    title: (_name: string) => `Be a good friend`,
    body: (name: string) => `${name}'s match could depend on your vote tonight.`,
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const forbidden = requireServiceRole(req);
  if (forbidden) return forbidden;

  try {
    const supabase = createAdminClient();

    // Get all active (pending) proposals
    const { data: proposals, error: propErr } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id')
      .eq('status', 'pending');

    if (propErr) throw propErr;
    if (!proposals || proposals.length === 0) {
      return Response.json({ status: 'success', checked: 0, sent: 0 }, { headers: corsHeaders });
    }

    // Get all friendships (we need to know who is friends with whom)
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id, friend_id, streak_days')
      .eq('status', 'accepted');

    if (!friendships) {
      return Response.json({ status: 'success', checked: 0, sent: 0 }, { headers: corsHeaders });
    }

    // Build a lookup: for each user, which friends have proposals?
    // A friend "has a proposal" if they are user_a_id or user_b_id on a pending proposal
    const usersWithProposals = new Set<string>();
    const proposalByUser = new Map<string, string>(); // userId -> proposalId

    for (const p of proposals) {
      usersWithProposals.add(p.user_a_id);
      usersWithProposals.add(p.user_b_id);
      proposalByUser.set(p.user_a_id, p.id);
      proposalByUser.set(p.user_b_id, p.id);
    }

    // For each user, find friends with proposals they haven't voted on
    // Group by voter (the person we'd notify)
    const voterCandidates: Map<string, { friendId: string; proposalId: string; streakDays: number }[]> = new Map();

    for (const f of friendships) {
      // Does this friend have a proposal?
      if (!usersWithProposals.has(f.friend_id)) continue;
      const proposalId = proposalByUser.get(f.friend_id);
      if (!proposalId) continue;

      const existing = voterCandidates.get(f.user_id) || [];
      existing.push({
        friendId: f.friend_id,
        proposalId,
        streakDays: f.streak_days || 0,
      });
      voterCandidates.set(f.user_id, existing);
    }

    // For each potential voter, check if they've already voted
    let sentCount = 0;
    let checkedCount = 0;

    for (const [voterId, candidates] of voterCandidates) {
      checkedCount++;

      // Check which proposals this user has already voted on
      const proposalIds = [...new Set(candidates.map(c => c.proposalId))];
      const { data: votes } = await supabase
        .from('proposal_votes')
        .select('proposal_id')
        .eq('voter_id', voterId)
        .in('proposal_id', proposalIds);

      const votedProposalIds = new Set((votes || []).map((v: { proposal_id: string }) => v.proposal_id));

      // Filter to unvoted candidates
      const unvoted = candidates.filter(c => !votedProposalIds.has(c.proposalId));
      if (unvoted.length === 0) continue; // Already voted on everything

      // Pick the friend with the longest streak (ties: first alphabetically by friendId)
      unvoted.sort((a, b) => b.streakDays - a.streakDays);
      const topCandidate = unvoted[0];

      // Get friend's name
      const { data: friendProfile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('user_id', topCandidate.friendId)
        .maybeSingle();

      const friendName = friendProfile?.first_name || 'A friend';

      const variant = await getNextCopyVariant(supabase, voterId, 'vote_reminder', COPY_VARIANTS.length);
      const copy = COPY_VARIANTS[variant];

      const result = await sendPush(supabase, {
        userId: voterId,
        notificationType: 'vote_reminder',
        category: 'engagement',
        title: copy.title(friendName),
        body: copy.body(friendName),
        data: { screen: 'Community' },
        copyVariant: variant,
        metadata: { friend_id: topCandidate.friendId, proposal_id: topCandidate.proposalId },
      });

      if (result.sent) sentCount++;
    }

    return Response.json({
      status: 'success',
      checked: checkedCount,
      sent: sentCount,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('[notify-vote-reminder] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
