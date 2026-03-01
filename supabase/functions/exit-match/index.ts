import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const MINIMUM_MATCH_DAYS = 7;

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
    const { match_id, exit_reason, exit_details } = body;

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

    // 3. Check match status is active
    if (match.status !== 'active') {
      return Response.json(
        { error: `Match is in '${match.status}' status, cannot exit` },
        { status: 400, headers: corsHeaders },
      );
    }

    // 4. Enforce minimum days check
    const matchedAt = new Date(match.created_at);
    const now = new Date();
    const daysSinceMatch = Math.floor((now.getTime() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceMatch < MINIMUM_MATCH_DAYS) {
      return Response.json(
        { error: `Cannot exit match for ${MINIMUM_MATCH_DAYS - daysSinceMatch} more day(s)` },
        { status: 400, headers: corsHeaders },
      );
    }

    // 5. Count messages exchanged
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match_id);

    const nowIso = now.toISOString();

    // 6. Insert exit record with correct columns
    const { error: exitErr } = await supabase
      .from('match_exits')
      .insert({
        match_id,
        exiting_user_id: userId,
        exit_reason: exit_reason || 'user_initiated',
        exit_details: exit_details || null,
        days_since_match: daysSinceMatch,
        messages_exchanged: messageCount || 0,
      });

    if (exitErr) {
      console.error('Exit record insert error:', exitErr);
      return Response.json({ error: 'Failed to create exit record' }, { status: 500, headers: corsHeaders });
    }

    // 7. Update match status to ended
    const { error: updateErr } = await supabase
      .from('matches')
      .update({ status: 'ended', updated_at: nowIso })
      .eq('id', match_id);

    if (updateErr) {
      console.error('Match status update error:', updateErr);
    }

    // 8. Insert system message notifying the other user
    const otherUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    await supabase.from('messages').insert({
      match_id,
      sender_id: userId,
      receiver_id: otherUserId,
      content: 'This match has ended.',
      type: 'system',
      created_at: nowIso,
    });

    return Response.json({
      status: 'success',
      match_id,
      days_active: daysSinceMatch,
      messages_exchanged: messageCount || 0,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('exit-match error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
