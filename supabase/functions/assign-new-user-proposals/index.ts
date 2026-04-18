import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * assign-new-user-proposals
 *
 * Called once after a new user completes onboarding.
 * Assigns the user to EVERY current pending proposal so they immediately have
 * something to vote on (matching the scope used in generate-proposals).
 * Excludes proposals where the user is a participant or where they have a
 * block relationship with either subject.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Fetch in parallel: pending proposals, block relationships, existing assignments.
    const [
      { data: pendingProposals, error: fetchErr },
      { data: blockedOutgoing },
      { data: blockedIncoming },
      { data: existingAssignments },
    ] = await Promise.all([
      supabase.from('proposals').select('id, user_a_id, user_b_id').eq('status', 'pending'),
      supabase.from('blocked_users').select('blocked_user_id').eq('user_id', userId),
      supabase.from('blocked_users').select('user_id').eq('blocked_user_id', userId),
      supabase.from('pool_vote_assignments').select('proposal_id').eq('voter_id', userId),
    ]);

    if (fetchErr) {
      console.error('Failed to fetch pending proposals:', fetchErr);
      return Response.json({ error: 'Failed to fetch proposals' }, { status: 500, headers: corsHeaders });
    }

    if (!pendingProposals || pendingProposals.length === 0) {
      return Response.json({ assigned: 0 }, { headers: corsHeaders });
    }

    const blockedIds = new Set<string>([
      ...(blockedOutgoing || []).map((r: { blocked_user_id: string }) => r.blocked_user_id),
      ...(blockedIncoming || []).map((r: { user_id: string }) => r.user_id),
    ]);

    const alreadyAssignedIds = new Set(
      (existingAssignments || []).map((r: { proposal_id: string }) => r.proposal_id),
    );

    const eligible = pendingProposals.filter(
      (p: { id: string; user_a_id: string; user_b_id: string }) =>
        p.user_a_id !== userId &&
        p.user_b_id !== userId &&
        !blockedIds.has(p.user_a_id) &&
        !blockedIds.has(p.user_b_id) &&
        !alreadyAssignedIds.has(p.id),
    );

    if (eligible.length === 0) {
      return Response.json({ assigned: 0 }, { headers: corsHeaders });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const rows = eligible.map((p: { id: string }) => ({
      proposal_id: p.id,
      voter_id: userId,
      assignment_date: todayStr,
      has_voted: false,
    }));

    const { error: insertErr } = await supabase
      .from('pool_vote_assignments')
      .insert(rows);

    if (insertErr) {
      // Unique conflicts are harmless — another run assigned the user concurrently.
      if (insertErr.code !== '23505') {
        console.error('Failed to insert pool_vote_assignments:', insertErr);
        return Response.json({ error: 'Failed to assign proposals' }, { status: 500, headers: corsHeaders });
      }
    }

    return Response.json({ assigned: rows.length }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('assign-new-user-proposals error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
