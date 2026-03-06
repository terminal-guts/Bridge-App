import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * delete-account Edge Function
 *
 * Hard-deletes the authenticated user's data and then removes their auth account.
 * Cleans up all referencing tables before deleting auth.users to avoid FK violations.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate
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
    const admin = createAdminClient();

    // Use a single RPC call to clean up all user data and delete the auth user.
    // This runs server-side SQL which handles FK constraints directly.
    const { error: rpcErr } = await admin.rpc('delete_user_account', {
      target_user_id: userId,
    });

    if (rpcErr) {
      console.error('delete_user_account RPC failed:', rpcErr.message);
      return Response.json(
        { error: `Account deletion failed: ${rpcErr.message}` },
        { status: 500, headers: corsHeaders },
      );
    }

    console.log('Account deleted successfully for user:', userId);
    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('delete-account error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
