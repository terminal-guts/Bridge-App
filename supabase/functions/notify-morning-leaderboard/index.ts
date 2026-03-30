/**
 * notify-morning-leaderboard — Cron: 8:30 AM Central (13:30 UTC)
 *
 * Morning notification showing who's #1 on the leaderboard and how
 * far behind the user is. If the user IS #1, tells them who's chasing.
 *
 * Skips users with zero karma (brand new, never voted).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';
import { sendSms } from '../_shared/send-sms.ts';

const COPY_NOT_FIRST = [
  {
    title: (leaderName: string) => `${leaderName} is #1`,
    body: (leaderName: string, leaderKarma: number, gap: number) =>
      `They have ${leaderKarma} karma. You're ${gap} behind. Vote tonight to close the gap.`,
  },
  {
    title: (_leaderName: string) => 'Leaderboard update',
    body: (leaderName: string, leaderKarma: number, gap: number) =>
      `📊 ${leaderName} leads with ${leaderKarma} karma. You're ${gap} points back.`,
  },
];

const COPY_IS_FIRST = [
  {
    title: 'You\'re on top',
    body: (karma: number, secondName: string, gap: number) =>
      `🏆 You're #1 with ${karma} karma. ${secondName} is ${gap} behind you.`,
  },
  {
    title: 'Still #1',
    body: (karma: number, secondName: string, gap: number) =>
      `🏆 ${karma} karma. Keep voting to hold your lead over ${secondName}.`,
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

    // Get full leaderboard (top users by karma)
    const { data: leaderboard, error: lbErr } = await supabase
      .from('karma_scores')
      .select('user_id, karma_points')
      .order('karma_points', { ascending: false })
      .gt('karma_points', 0);

    if (lbErr) throw lbErr;
    if (!leaderboard || leaderboard.length < 2) {
      // Need at least 2 users to make leaderboard interesting
      return Response.json({ status: 'success', sent: 0, reason: 'not_enough_users' }, { headers: corsHeaders });
    }

    // Get names for top 2
    const topUserId = leaderboard[0].user_id;
    const topKarma = leaderboard[0].karma_points;
    const secondUserId = leaderboard[1].user_id;
    const secondKarma = leaderboard[1].karma_points;

    const { data: topProfile } = await supabase
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', topUserId)
      .maybeSingle();

    const { data: secondProfile } = await supabase
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', secondUserId)
      .maybeSingle();

    // Check if #1 wants their name shown in notifications
    const { data: topSettings } = await supabase
      .from('user_settings')
      .select('pref_show_name_if_winner, pref_leaderboard_visible')
      .eq('user_id', topUserId)
      .maybeSingle();

    // Show name if either the winner notification pref OR leaderboard visibility is on
    const topShowName = topSettings?.pref_show_name_if_winner !== false
      || topSettings?.pref_leaderboard_visible === true;
    const leaderName = topShowName ? (topProfile?.first_name || 'The leader') : 'The leader';
    const secondName = secondProfile?.first_name || 'Someone';

    // Get all users with push tokens and karma > 0
    const { data: usersWithTokens } = await supabase
      .from('user_settings')
      .select('user_id, push_token')
      .not('push_token', 'is', null)
      .eq('push_notifications', true);

    if (!usersWithTokens) {
      return Response.json({ status: 'success', sent: 0 }, { headers: corsHeaders });
    }

    // Build karma and rank lookup
    const karmaMap = new Map<string, number>();
    const rankMap = new Map<string, number>();
    leaderboard.forEach((row: { user_id: string; karma_points: number }, idx: number) => {
      karmaMap.set(row.user_id, row.karma_points);
      rankMap.set(row.user_id, idx + 1);
    });

    let sentCount = 0;

    for (const user of usersWithTokens) {
      const userKarma = karmaMap.get(user.user_id);
      if (!userKarma || userKarma <= 0) continue; // Skip users with no karma

      if (user.user_id === topUserId) {
        // User IS #1 — tell them who's chasing
        const gap = topKarma - secondKarma;
        const variant = await getNextCopyVariant(supabase, user.user_id, 'morning_leaderboard', COPY_IS_FIRST.length);
        const copy = COPY_IS_FIRST[variant];

        const [pushResult, smsResult] = await Promise.all([
          sendPush(supabase, {
            userId: user.user_id,
            notificationType: 'morning_leaderboard',
            category: 'ritual',
            title: copy.title,
            body: copy.body(topKarma, secondName, gap),
            data: { screen: 'Leaderboard' },
            copyVariant: variant,
          }),
          sendSms(supabase, {
            userId: user.user_id,
            body: `You're ranked #1 on the Bridge leaderboard this week`,
            path: '/leaderboard',
          }),
        ]);
        if (pushResult.sent || smsResult.sent) sentCount++;
      } else {
        // User is NOT #1 — show them the gap
        const gap = topKarma - userKarma;
        const userRank = rankMap.get(user.user_id) ?? 0;
        const variant = await getNextCopyVariant(supabase, user.user_id, 'morning_leaderboard', COPY_NOT_FIRST.length);
        const copy = COPY_NOT_FIRST[variant];

        const [pushResult, smsResult] = await Promise.all([
          sendPush(supabase, {
            userId: user.user_id,
            notificationType: 'morning_leaderboard',
            category: 'ritual',
            title: copy.title(leaderName),
            body: copy.body(leaderName, topKarma, gap),
            data: { screen: 'Leaderboard' },
            copyVariant: variant,
          }),
          sendSms(supabase, {
            userId: user.user_id,
            body: `You're ranked #${userRank} on the Bridge leaderboard this week`,
            path: '/leaderboard',
          }),
        ]);
        if (pushResult.sent || smsResult.sent) sentCount++;
      }
    }

    return Response.json({
      status: 'success',
      sent: sentCount,
      leader: { name: leaderName, karma: topKarma },
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('[notify-morning-leaderboard] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
