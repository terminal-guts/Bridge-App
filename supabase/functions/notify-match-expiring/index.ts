/**
 * notify-match-expiring — Cron: every 4 hours
 *
 * Checks proposals in 'deciding' status. If 36+ hours have passed
 * since passed_to_users_at and a user hasn't decided, sends a push.
 *
 * Only sends once per user per proposal (dedup via notification_log metadata).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';

const EXPIRY_THRESHOLD_HOURS = 36;

const COPY_VARIANTS = [
  {
    title: (name: string) => `${name} is waiting`,
    body: (_name: string) => `You have until tomorrow to accept or pass. Don't let this one slip.`,
  },
  {
    title: (_name: string) => `Clock's ticking`,
    body: (name: string) => `Your match with ${name} needs a decision soon.`,
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const thresholdTime = new Date(Date.now() - EXPIRY_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    // Find deciding proposals where passed_to_users_at is 36+ hours ago
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id, user_a_decision, user_b_decision, passed_to_users_at')
      .eq('status', 'deciding')
      .lt('passed_to_users_at', thresholdTime);

    if (error) throw error;
    if (!proposals || proposals.length === 0) {
      return Response.json({ status: 'success', sent: 0 }, { headers: corsHeaders });
    }

    let sentCount = 0;

    for (const proposal of proposals) {
      // Notify user_a if they haven't decided
      if (proposal.user_a_decision === 'pending') {
        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('first_name')
          .eq('user_id', proposal.user_b_id)
          .maybeSingle();

        const partnerName = partnerProfile?.first_name || 'your match';
        const variant = await getNextCopyVariant(supabase, proposal.user_a_id, 'match_expiring', COPY_VARIANTS.length);
        const copy = COPY_VARIANTS[variant];

        const result = await sendPush(supabase, {
          userId: proposal.user_a_id,
          notificationType: 'match_expiring',
          category: 'transactional',
          title: copy.title(partnerName),
          body: copy.body(partnerName),
          data: { screen: 'Matches', proposalId: proposal.id },
          copyVariant: variant,
          metadata: { dedup_key: `match_expiring_${proposal.id}_a` },
        });
        if (result.sent) sentCount++;
      }

      // Notify user_b if they haven't decided
      if (proposal.user_b_decision === 'pending') {
        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('first_name')
          .eq('user_id', proposal.user_a_id)
          .maybeSingle();

        const partnerName = partnerProfile?.first_name || 'your match';
        const variant = await getNextCopyVariant(supabase, proposal.user_b_id, 'match_expiring', COPY_VARIANTS.length);
        const copy = COPY_VARIANTS[variant];

        const result = await sendPush(supabase, {
          userId: proposal.user_b_id,
          notificationType: 'match_expiring',
          category: 'transactional',
          title: copy.title(partnerName),
          body: copy.body(partnerName),
          data: { screen: 'Matches', proposalId: proposal.id },
          copyVariant: variant,
          metadata: { dedup_key: `match_expiring_${proposal.id}_b` },
        });
        if (result.sent) sentCount++;
      }
    }

    return Response.json({
      status: 'success',
      proposals_checked: proposals.length,
      sent: sentCount,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('[notify-match-expiring] Error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
