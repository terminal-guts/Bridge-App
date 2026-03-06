import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const DELETION_GRACE_DAYS = 30;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the user via JWT
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

    const userId = user.id;
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + DELETION_GRACE_DAYS);

    // 1. Soft-delete: mark profile with deletion schedule
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .update({
        deleted_at: nowIso,
        deletion_scheduled_for: deletionDate.toISOString(),
        is_paused: true,
        updated_at: nowIso,
      })
      .eq('user_id', userId);

    if (profileErr) {
      console.error('Profile soft-delete error:', profileErr);
      return Response.json({ error: 'Failed to mark account for deletion' }, { status: 500, headers: corsHeaders });
    }

    // 2. Cancel any active proposals
    const { error: proposalErr } = await supabase
      .from('proposals')
      .update({ status: 'cancelled', updated_at: nowIso })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .in('status', ['pending', 'approved']);

    if (proposalErr) {
      console.error('Cancel proposals error:', proposalErr);
    }

    // 3. End any active matches
    const { error: matchErr } = await supabase
      .from('matches')
      .update({ status: 'ended', updated_at: nowIso })
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .eq('status', 'active');

    if (matchErr) {
      console.error('End matches error:', matchErr);
    }

    return Response.json({
      ok: true,
      data: {
        success: true,
        deletionScheduledFor: deletionDate.toISOString(),
        gracePeriodDays: DELETION_GRACE_DAYS,
      },
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('delete-account error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
