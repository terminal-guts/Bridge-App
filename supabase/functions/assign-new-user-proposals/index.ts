import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

/**
 * assign-new-user-proposals — NO-OP as of gate-overhaul-v2.
 *
 * This function used to pre-insert pool_vote_assignments rows so new users
 * had proposals immediately after onboarding.  Under the new model, every
 * user is an implicit voter on every pending proposal — no per-user-per-
 * proposal bookkeeping is needed.  The gate is computed on-the-fly in
 * get-proposals-for-voting.
 *
 * We keep this endpoint as a no-op so the existing frontend caller
 * (proposalApiService.assignNewUserProposals, invoked during onboarding
 * completion) doesn't throw.  Safe to delete entirely once a frontend
 * release drops the invocation.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return Response.json({ assigned: 0 }, { headers: corsHeaders });
});
