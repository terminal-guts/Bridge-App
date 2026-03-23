/**
 * notify-streak-at-risk — Cron: 6 PM Central (23:00 UTC)
 *
 * Checks each user's streaks and sends a push if any streak will die
 * at 7 PM when proposal-lifecycle runs kill_dead_streaks().
 *
 * A streak dies when:
 *   - The friend has an active (pending) proposal
 *   - The user has NOT voted on that proposal
 *   - proposal-lifecycle calls kill_dead_streaks() at 7 PM
 *
 * A streak does NOT die when:
 *   - The friend has no active proposal (streak freezes, not killed)
 *   - The user already voted (streak is safe)
 *   - The streak is already 0 (nothing to lose)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';

const COPY_VARIANTS = [
  {
    title: (friendName: string, days: number) => 'Your streak is on the line',
    body: (friendName: string, days: number) =>
      `⚠️ Your ${days}-day streak with ${friendName} ends at 7 PM if you don't vote.`,
  },
  {
    title: (friendName: string, days: number) => `${days} days with ${friendName}`,
    body: (friendName: string, days: number) =>
      `⚠️ Vote before 7 PM or your streak resets tonight.`,
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const forbidden = await requireServiceRole(req);
  if (forbidden) return forbidden;

  try {
    const supabase = createAdminClient();

    // Get all friendships with active streaks
    const { data: streaks, error: streakErr } = await supabase
      .from('friends')
      .select('user_id, friend_id, streak_days')
      .eq('status', 'accepted')
      .gt('streak_days', 0);

    if (streakErr) throw streakErr;
    if (!streaks || streaks.length === 0) {
      return Response.json({ status: 'success', checked: 0, sent: 0 }, { headers: corsHeaders });
    }

    // Group by user_id — find each user's at-risk streaks
    const userRisks: Map<string, { friendId: string; friendName: string; streakDays: number }[]> = new Map();

    for (const streak of streaks) {
      // Check if the friend has a pending proposal
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id')
        .or(`user_a_id.eq.${streak.friend_id},user_b_id.eq.${streak.friend_id}`)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (!proposal) continue; // No active proposal → streak freezes, not at risk

      // Check if the user has voted on this proposal
      const { data: vote } = await supabase
        .from('proposal_votes')
        .select('id')
        .eq('proposal_id', proposal.id)
        .eq('voter_id', streak.user_id)
        .limit(1)
        .maybeSingle();

      if (vote) continue; // Already voted → streak is safe

      // Streak is at risk — get friend's name
      const { data: friendProfile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('user_id', streak.friend_id)
        .maybeSingle();

      const risk = {
        friendId: streak.friend_id,
        friendName: friendProfile?.first_name || 'A friend',
        streakDays: streak.streak_days,
      };

      const existing = userRisks.get(streak.user_id) || [];
      existing.push(risk);
      userRisks.set(streak.user_id, existing);
    }

    // For each user, send ONE notification for their highest-risk streak
    let sentCount = 0;
    let checkedCount = userRisks.size;

    for (const [userId, risks] of userRisks) {
      // Pick the friend with the longest streak
      risks.sort((a, b) => b.streakDays - a.streakDays);
      const topRisk = risks[0];

      const variant = await getNextCopyVariant(supabase, userId, 'streak_at_risk', COPY_VARIANTS.length);
      const copy = COPY_VARIANTS[variant];

      const result = await sendPush(supabase, {
        userId,
        notificationType: 'streak_at_risk',
        category: 'reengagement',
        title: copy.title(topRisk.friendName, topRisk.streakDays),
        body: copy.body(topRisk.friendName, topRisk.streakDays),
        data: { screen: 'Community' },
        copyVariant: variant,
        metadata: { friend_id: topRisk.friendId },
      });

      if (result.sent) sentCount++;
    }

    return Response.json({
      status: 'success',
      checked: checkedCount,
      sent: sentCount,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('[notify-streak-at-risk] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
