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

    // Must be in 'deciding' status
    if (proposal.status !== 'deciding') {
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
          status: 'deadline_passed',
          message: 'Decision deadline has passed',
          proposal_status: 'declined',
        }, { headers: corsHeaders });
      }
    }

    // 3. Check if either user has blocked the other
    const { data: blockCheck } = await supabase
      .from('blocked_users')
      .select('id')
      .or(
        `and(user_id.eq.${proposal.user_a_id},blocked_user_id.eq.${proposal.user_b_id}),` +
        `and(user_id.eq.${proposal.user_b_id},blocked_user_id.eq.${proposal.user_a_id})`,
      )
      .limit(1);

    if (blockCheck && blockCheck.length > 0) {
      // Silently cancel the proposal — don't reveal who blocked whom
      await supabase
        .from('proposals')
        .update({ status: 'rejected', rejected_at: nowIso, updated_at: nowIso })
        .eq('id', proposal_id);

      return Response.json({
        status: 'cancelled',
        proposal_status: 'rejected',
        message: 'This proposal is no longer available',
      }, { headers: corsHeaders });
    }

    // 4. Determine which user this is
    const isUserA = userId === proposal.user_a_id;
    const isUserB = userId === proposal.user_b_id;

    if (!isUserA && !isUserB) {
      return Response.json({ error: 'You are not part of this proposal' }, { status: 403, headers: corsHeaders });
    }

    // 4a. Guard: if the user already decided, return their existing decision
    // This prevents overwriting a previous decision (e.g. retry after app backgrounded)
    const existingDecision = isUserA ? proposal.user_a_decision : proposal.user_b_decision;
    if (existingDecision && existingDecision !== 'pending') {
      return Response.json({
        status: 'already_decided',
        proposal_status: proposal.status,
        your_decision: existingDecision,
      }, { headers: corsHeaders });
    }

    // 5. Write this user's decision first (before checking the other user's)
    const updateData: Record<string, unknown> = { updated_at: nowIso };

    if (isUserA) {
      updateData.user_a_decision = decision;
      updateData.user_a_decided_at = nowIso;
    } else {
      updateData.user_b_decision = decision;
      updateData.user_b_decided_at = nowIso;
    }

    // If declining, set status immediately (no race concern)
    if (decision === 'declined') {
      updateData.status = 'declined';
      updateData.declined_at = nowIso;
    }

    // 6. Write the decision (optimistic lock: only update if still in 'deciding')
    const { data: updateRows, error: updateErr } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposal_id)
      .eq('status', 'deciding')
      .select('id');

    if (updateErr) {
      console.error('Proposal update error:', updateErr);
      return Response.json({ error: 'Failed to update proposal' }, { status: 500, headers: corsHeaders });
    }

    // If 0 rows updated, the proposal status changed between our read and write
    // (e.g. deadline expired, other user declined, etc.) — re-read and return current state
    if (!updateRows || updateRows.length === 0) {
      const { data: current } = await supabase
        .from('proposals')
        .select('status, user_a_decision, user_b_decision')
        .eq('id', proposal_id)
        .single();
      return Response.json({
        status: 'conflict',
        proposal_status: current?.status || 'unknown',
        your_decision: isUserA ? (current?.user_a_decision || 'pending') : (current?.user_b_decision || 'pending'),
        message: 'Proposal status changed before your decision could be recorded',
      }, { headers: corsHeaders });
    }

    // 7. Re-fetch proposal AFTER write to check the other user's decision
    // This prevents the both-accept race condition: even if both users write
    // simultaneously, the re-fetch will see the other user's written decision.
    let newStatus = decision === 'declined' ? 'declined' : proposal.status;

    if (decision === 'accepted') {
      const { data: fresh, error: refetchErr } = await supabase
        .from('proposals')
        .select('user_a_decision, user_b_decision, status')
        .eq('id', proposal_id)
        .single();

      if (refetchErr || !fresh) {
        console.error('Re-fetch error:', refetchErr);
        return Response.json({ error: 'Failed to verify decision' }, { status: 500, headers: corsHeaders });
      }

      const otherDecision = isUserA ? fresh.user_b_decision : fresh.user_a_decision;

      if (otherDecision === 'accepted') {
        // Both accepted → match! Use update with status check to prevent duplicate match creation.
        // The `.eq('status', 'deciding')` acts as an optimistic lock — only ONE concurrent
        // request can win this transition. The loser gets 0 rows updated (not an error).
        const { data: lockRows, error: matchStatusErr } = await supabase
          .from('proposals')
          .update({ status: 'passed_to_match', confirmed_at: nowIso, updated_at: nowIso })
          .eq('id', proposal_id)
          .eq('status', 'deciding')
          .select('id');

        const wonLock = !matchStatusErr && lockRows && lockRows.length > 0;

        if (wonLock) {
          newStatus = 'passed_to_match';
        } else {
          // Other request already promoted it — re-read final status but do NOT create the match
          const { data: final } = await supabase
            .from('proposals')
            .select('status')
            .eq('id', proposal_id)
            .single();
          newStatus = final?.status || 'passed_to_match';

          // Return success — the other request will handle match creation
          return Response.json({
            status: 'success',
            proposal_status: newStatus,
            your_decision: decision,
          }, { headers: corsHeaders });
        }
      } else if (otherDecision === 'declined') {
        newStatus = 'declined';
        await supabase
          .from('proposals')
          .update({ status: 'declined', declined_at: nowIso, updated_at: nowIso })
          .eq('id', proposal_id);
      }
      // else: other user still pending — wait for them
    }

    // 8. If both accepted, create a match (only the winner of the optimistic lock reaches here)
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
        // Rollback: revert proposal so we don't have a phantom "matched" status with no match row
        await supabase
          .from('proposals')
          .update({ status: proposal.status, confirmed_at: null, updated_at: nowIso })
          .eq('id', proposal_id);
        return Response.json({ error: 'Failed to create match' }, { status: 500, headers: corsHeaders });
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

  } catch (err: unknown) {
    console.error('process-decision error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
