import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * assign-new-user-proposals
 *
 * Called once after a new user completes onboarding.
 * Assigns up to 3 random pending proposals to the user's pool_vote_assignments
 * so they have something to vote on immediately (instead of waiting for the 7PM cron).
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the caller via JWT
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

    // 1. Fetch all pending proposals
    const { data: pendingProposals, error: fetchErr } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id')
      .eq('status', 'pending');

    if (fetchErr) {
      console.error('Failed to fetch pending proposals:', fetchErr);
      return Response.json({ error: 'Failed to fetch proposals' }, { status: 500, headers: corsHeaders });
    }

    // 2. Filter out proposals where the new user is a participant (defensive)
    const eligible = (pendingProposals || []).filter(
      (p: any) => p.user_a_id !== userId && p.user_b_id !== userId
    );

    if (eligible.length === 0) {
      return Response.json({ assigned: 0 }, { headers: corsHeaders });
    }

    // 3. Fisher-Yates shuffle and pick up to 3
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    const selected = eligible.slice(0, 3);

    // 4. Insert pool_vote_assignments
    const rows = selected.map((p: any) => ({
      proposal_id: p.id,
      voter_id: userId,
      has_voted: false,
    }));

    const { error: insertErr } = await supabase
      .from('pool_vote_assignments')
      .insert(rows);

    if (insertErr) {
      console.error('Failed to insert pool_vote_assignments:', insertErr);
      return Response.json({ error: 'Failed to assign proposals' }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ assigned: selected.length }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('assign-new-user-proposals error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
