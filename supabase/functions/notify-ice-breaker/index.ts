/**
 * notify-ice-breaker — Cron: every 4 hours (piggybacks on match-expiring schedule)
 *
 * Checks matches created 18–24 hours ago with zero messages exchanged.
 * Sends both users a nudge to break the ice.
 *
 * Only sends once per match per user (dedup via notification_log metadata).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';

const MIN_HOURS = 18;
const MAX_HOURS = 48; // wide window so the 4h cron doesn't miss matches

const COPY_VARIANTS = [
  {
    title: (name: string) => `${name} is waiting`,
    body: (_name: string) => `Say something — even just hi.`,
  },
  {
    title: (_name: string) => `Break the ice`,
    body: (name: string) => `You and ${name} matched but neither of you has said a word yet. Someone's gotta go first.`,
  },
  {
    title: (_name: string) => `Don't overthink it`,
    body: (name: string) => `${name} is right there. Send a message — it doesn't have to be perfect.`,
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

    const now = Date.now();
    const minTime = new Date(now - MAX_HOURS * 60 * 60 * 1000).toISOString();
    const maxTime = new Date(now - MIN_HOURS * 60 * 60 * 1000).toISOString();

    // Find matches created 18–48h ago
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id, created_at')
      .gte('created_at', minTime)
      .lte('created_at', maxTime);

    if (error) throw error;
    if (!matches || matches.length === 0) {
      return Response.json({ status: 'success', checked: 0, sent: 0 }, { headers: corsHeaders });
    }

    let sentCount = 0;
    let checkedCount = 0;

    for (const match of matches) {
      checkedCount++;

      // Check if ANY messages exist between these two users
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', match.id);

      // If messages exist, skip — they already broke the ice
      if (messageCount && messageCount > 0) continue;

      // Notify user1
      const { data: user2Profile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('user_id', match.user2_id)
        .maybeSingle();

      const user2Name = user2Profile?.first_name || 'your match';
      const variant1 = await getNextCopyVariant(supabase, match.user1_id, 'ice_breaker', COPY_VARIANTS.length);
      const copy1 = COPY_VARIANTS[variant1];

      const result1 = await sendPush(supabase, {
        userId: match.user1_id,
        notificationType: 'ice_breaker',
        category: 'engagement',
        title: copy1.title(user2Name),
        body: copy1.body(user2Name),
        data: { screen: 'Chat', matchId: match.id },
        copyVariant: variant1,
        metadata: { dedup_key: `ice_breaker_${match.id}_1` },
      });
      if (result1.sent) sentCount++;

      // Notify user2
      const { data: user1Profile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('user_id', match.user1_id)
        .maybeSingle();

      const user1Name = user1Profile?.first_name || 'your match';
      const variant2 = await getNextCopyVariant(supabase, match.user2_id, 'ice_breaker', COPY_VARIANTS.length);
      const copy2 = COPY_VARIANTS[variant2];

      const result2 = await sendPush(supabase, {
        userId: match.user2_id,
        notificationType: 'ice_breaker',
        category: 'engagement',
        title: copy2.title(user1Name),
        body: copy2.body(user1Name),
        data: { screen: 'Chat', matchId: match.id },
        copyVariant: variant2,
        metadata: { dedup_key: `ice_breaker_${match.id}_2` },
      });
      if (result2.sent) sentCount++;
    }

    return Response.json({
      status: 'success',
      checked: checkedCount,
      sent: sentCount,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('[notify-ice-breaker] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
