import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only service_role (cron) may trigger this function
  const forbidden = await requireServiceRole(req);
  if (forbidden) return forbidden;

  try {
    // 1. Day-of-week check: only snapshot on Sundays at 7 PM Central.
    // Sundays = DOW 0. 7 PM Central = 00:00 or 01:00 UTC (Monday).
    // The cron runs at 00:00 UTC daily.
    // Sunday 7PM Central = Monday 00:00 UTC (during DST) or Sunday 6PM Central = Sunday 00:00 UTC.
    // Wait, let's look at the scheduling in 20260301000001_cron_scheduling.sql:
    // 00:00 AM UTC daily target 7PM Central.
    // If it's Monday 00:00 UTC, it's Sunday 7PM (CDT) or 6PM (CST).
    // So we check if it's Monday UTC.

    const now = new Date();
    const isMondayUTC = now.getUTCDay() === 1; // 1 = Monday

    // We only perform the snapshot on the Sunday 7PM boundary (which is Monday 00:00 UTC)
    // or if specifically requested via a 'force' param.
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    if (!isMondayUTC && !force) {
      return Response.json({
        status: 'skipped',
        message: 'Snapshot only runs on Sunday 7 PM Central (Monday 00:00 UTC). Use ?force=true to override.',
        utc_day: now.getUTCDay()
      }, { headers: corsHeaders });
    }

    const supabase = createAdminClient();

    // Invoke the RPC to snapshot karma
    const { data, error } = await supabase.rpc('snapshot_weekly_karma_rpc');

    if (error) {
      console.error('Error snapshotting weekly karma:', error);
      throw error;
    }

    // Chain: send weekly summary push notification after snapshot completes
    try {
      const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-weekly-summary`;
      await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ triggered_by: 'snapshot-weekly-karma' }),
      });
    } catch (notifyErr) {
      // Don't fail the snapshot if notification fails
      console.error('Failed to trigger weekly summary:', notifyErr);
    }

    return Response.json({
      status: 'success',
      data,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('snapshot-weekly-karma error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
