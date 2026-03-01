import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

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
    const body = await req.json();
    const { match_id, rejection_reason } = body;

    if (!match_id) {
      return Response.json({ error: 'Missing match_id' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    // 1. Fetch the match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchErr || !match) {
      return Response.json({ error: 'Match not found' }, { status: 404, headers: corsHeaders });
    }

    // 2. Verify user is part of this match
    if (match.user_id_1 !== userId && match.user_id_2 !== userId) {
      return Response.json({ error: 'You are not part of this match' }, { status: 403, headers: corsHeaders });
    }

    // 3. Check match status is pending (for direct match proposals)
    if (match.status !== 'pending') {
      return Response.json(
        { error: `Match is in '${match.status}' status, cannot reject` },
        { status: 400, headers: corsHeaders },
      );
    }

    const nowIso = new Date().toISOString();

    // 4. Update match status to rejected
    const { error: updateErr } = await supabase
      .from('matches')
      .update({ status: 'rejected', updated_at: nowIso })
      .eq('id', match_id);

    if (updateErr) {
      console.error('Match rejection update error:', updateErr);
      return Response.json({ error: 'Failed to reject match' }, { status: 500, headers: corsHeaders });
    }

    // 5. Store rejection reason in match_exits table
    if (rejection_reason) {
      await supabase.from('match_exits').insert({
        match_id,
        exiting_user_id: userId,
        exit_reason: rejection_reason,
      });
    }

    return Response.json({
      status: 'success',
      match_id,
      match_status: 'rejected',
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('reject-match error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
