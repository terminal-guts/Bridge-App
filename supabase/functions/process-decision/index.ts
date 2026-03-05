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
    const { proposal_id, decision } = body;

    if (!proposal_id || !decision) {
      return Response.json({ error: 'Missing proposal_id or decision' }, { status: 400, headers: corsHeaders });
    }

    if (decision !== 'accepted' && decision !== 'declined') {
      return Response.json({ error: "Decision must be 'accepted' or 'declined'" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch the proposal
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (propErr || !proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
    }

    // Must be in 'deciding' or 'expired' status
    if (proposal.status !== 'deciding' && proposal.status !== 'expired') {
      return Response.json(
        { error: `Proposal is in '${proposal.status}' status, cannot decide` },
        { status: 400, headers: corsHeaders },
      );
    }

    // 2. Check decision deadline
    if (proposal.decision_deadline_at) {
      const deadline = new Date(proposal.decision_deadline_at);
      if (new Date() > deadline) {
        // Auto-decline — deadline passed
        await supabase
          .from('proposals')
          .update({ status: 'declined', updated_at: nowIso })
          .eq('id', proposal_id);

        return Response.json({
          status: 'expired',
          message: 'Decision deadline has passed',
          proposal_status: 'declined',
        }, { headers: corsHeaders });
      }
    }

    // 3. Determine which user this is
    const isUserA = userId === proposal.user_a_id;
    const isUserB = userId === proposal.user_b_id;

    if (!isUserA && !isUserB) {
      return Response.json({ error: 'You are not part of this proposal' }, { status: 403, headers: corsHeaders });
    }

    // 4. Update the decision
    const updateData: Record<string, any> = { updated_at: nowIso };

    if (isUserA) {
      updateData.user_a_decision = decision;
      updateData.user_a_decided_at = nowIso;
    } else {
      updateData.user_b_decision = decision;
      updateData.user_b_decided_at = nowIso;
    }

    // Get the other user's decision
    const otherDecision = isUserA ? proposal.user_b_decision : proposal.user_a_decision;

    // Determine new proposal status
    let newStatus = proposal.status;

    if (decision === 'declined') {
      newStatus = 'declined';
      updateData.status = 'declined';
      updateData.declined_at = nowIso;
    } else if (otherDecision === 'accepted') {
      // Both accepted → match!
      newStatus = 'passed_to_match';
      updateData.status = 'passed_to_match';
      updateData.confirmed_at = nowIso;
    } else if (otherDecision === 'declined') {
      newStatus = 'declined';
      updateData.status = 'declined';
      updateData.declined_at = nowIso;
    }
    // else: other user is still 'pending' — keep current status

    // 5. Update proposal
    const { error: updateErr } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposal_id);

    if (updateErr) {
      console.error('Proposal update error:', updateErr);
      return Response.json({ error: 'Failed to update proposal' }, { status: 500, headers: corsHeaders });
    }

    // 6. If both accepted, create a match
    if (newStatus === 'passed_to_match') {
      // Ensure user_id_1 < user_id_2 for consistent ordering
      const [u1, u2] = proposal.user_a_id < proposal.user_b_id
        ? [proposal.user_a_id, proposal.user_b_id]
        : [proposal.user_b_id, proposal.user_a_id];

      const { error: matchErr } = await supabase
        .from('matches')
        .insert({
          user_id_1: u1,
          user_id_2: u2,
          status: 'active',
          proposal_id: proposal.id,
          matched_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (matchErr) {
        console.error('Match creation error:', matchErr);
        // Don't fail the whole request — the proposal is already updated
      }

      // Apply karma for successful match
      await supabase.rpc('apply_karma_on_outcome', {
        p_proposal_id: proposal.id,
        p_outcome: 'passed_to_match',
      });

      // Cancel any other active proposals involving either user (safety net)
      await supabase
        .from('proposals')
        .update({ status: 'declined', declined_at: nowIso, updated_at: nowIso })
        .in('status', ['pending', 'deciding'])
        .neq('id', proposal_id)
        .or(`user_a_id.eq.${u1},user_a_id.eq.${u2},user_b_id.eq.${u1},user_b_id.eq.${u2}`);
    }

    return Response.json({
      status: 'success',
      proposal_status: newStatus,
      your_decision: decision,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('process-decision error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
