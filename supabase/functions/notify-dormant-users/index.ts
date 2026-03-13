/**
 * notify-dormant-users — Cron: daily at 12 PM Central (17:00 UTC)
 *
 * Escalating re-engagement notifications for inactive users.
 *
 * Tiers:
 *   2-6 days inactive  → 1 per 3 days, social FOMO copy
 *   7-13 days inactive → 1 per 5 days, missed proposals copy
 *   14-29 days inactive → 1 per 7 days, frozen streaks copy
 *   30-44 days inactive → 1 per 14 days, "we'll stop" copy
 *   45+ days → stop all notifications
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPush } from '../_shared/send-push.ts';

interface DormantTier {
  minDays: number;
  maxDays: number;
  cooldownHours: number;
  title: string;
  bodyFn: (days: number, friendName: string, count: number) => string;
}

const DORMANT_TIERS: DormantTier[] = [
  {
    minDays: 2,
    maxDays: 6,
    cooldownHours: 72,
    title: 'Your friends are voting',
    bodyFn: (_days, _friend, count) =>
      `They voted ${count} times since you left. They could use your help tonight.`,
  },
  {
    minDays: 7,
    maxDays: 13,
    cooldownHours: 120, // 5 days
    title: 'You\'ve been away',
    bodyFn: (_days, friendName, _count) =>
      `${friendName} had a proposal and you weren't there.`,
  },
  {
    minDays: 14,
    maxDays: 29,
    cooldownHours: 168, // 7 days
    title: 'Your streaks are frozen',
    bodyFn: (_days, friendName, _count) =>
      `Come back and ${friendName} will be glad to see you.`,
  },
  {
    minDays: 30,
    maxDays: 44,
    cooldownHours: 336, // 14 days
    title: 'We\'ll stop sending these soon',
    bodyFn: (_days, _friend, _count) =>
      `Bridge is better with you, but we won't keep bugging you.`,
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const now = Date.now();

    // Get all users with push tokens
    const { data: allUsers } = await supabase
      .from('user_settings')
      .select('user_id, push_token')
      .not('push_token', 'is', null)
      .eq('push_enabled', true);

    if (!allUsers || allUsers.length === 0) {
      return Response.json({ status: 'success', sent: 0 }, { headers: corsHeaders });
    }

    let sentCount = 0;
    let checkedCount = 0;

    for (const user of allUsers) {
      // Get last activity — try app_sessions first, then user_profiles
      let lastActiveDate: string | null = null;

      const { data: session } = await supabase
        .from('app_sessions')
        .select('ended_at')
        .eq('user_id', user.user_id)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session?.ended_at) {
        lastActiveDate = session.ended_at;
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('updated_at')
          .eq('user_id', user.user_id)
          .maybeSingle();
        lastActiveDate = profile?.updated_at || null;
      }

      if (!lastActiveDate) continue;

      const daysSinceActive = Math.floor(
        (now - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find which tier this user falls into
      const tier = DORMANT_TIERS.find(t => daysSinceActive >= t.minDays && daysSinceActive <= t.maxDays);
      if (!tier) continue; // Not in any tier (either active or 45+ days gone)

      checkedCount++;

      // Check cooldown — has a dormant notification been sent recently?
      const cooldownSince = new Date(now - tier.cooldownHours * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('notification_type', 'dormant')
        .gte('sent_at', cooldownSince);

      if ((recentCount ?? 0) > 0) continue; // Still in cooldown

      // Get a friend's name for personalization
      const { data: friendship } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.user_id)
        .limit(1)
        .maybeSingle();

      let friendName = 'Your friends';
      if (friendship?.friend_id) {
        const { data: friendProfile } = await supabase
          .from('user_profiles')
          .select('first_name')
          .eq('user_id', friendship.friend_id)
          .maybeSingle();
        friendName = friendProfile?.first_name || 'Your friends';
      }

      // Get vote count since user went inactive (for tier 1 copy)
      const { count: voteCount } = await supabase
        .from('proposal_votes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastActiveDate);

      const result = await sendPush(supabase, {
        userId: user.user_id,
        notificationType: 'dormant',
        category: 'reengagement',
        title: tier.title,
        body: tier.bodyFn(daysSinceActive, friendName, voteCount ?? 0),
        data: { screen: 'Community' },
        metadata: { days_inactive: daysSinceActive, tier: tier.minDays },
      });

      if (result.sent) sentCount++;
    }

    return Response.json({
      status: 'success',
      checked: checkedCount,
      sent: sentCount,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('[notify-dormant-users] Error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
