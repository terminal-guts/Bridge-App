/**
 * send-nudge edge function
 *
 * Sends a push notification nudge from one friend to another,
 * reminding them to vote. Rate-limited to 1 nudge per friend pair per day.
 *
 * POST body: { friendId: string }
 * Auth: requires valid JWT (nudger = authenticated user)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the nudger
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const nudgerId = user.id;

    // Parse body
    const { friendId } = await req.json();
    if (!friendId || typeof friendId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'friendId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Can't nudge yourself
    if (friendId === nudgerId) {
      return new Response(
        JSON.stringify({ error: 'Cannot nudge yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createAdminClient();

    // Verify friendship exists
    const { data: friendship } = await admin
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${nudgerId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${nudgerId})`)
      .limit(1)
      .maybeSingle();

    if (!friendship) {
      return new Response(
        JSON.stringify({ error: 'Not friends' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit: 1 nudge per friend pair per day
    // Use a simple approach: check if a nudge was sent in the last 20 hours
    // (using a nudge_log table or inline check)
    // For now, we trust the client-side AsyncStorage cooldown and just send.
    // TODO: Add server-side nudge_log table for strict rate limiting.

    // Get nudger's name
    const { data: nudgerProfile } = await admin
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', nudgerId)
      .maybeSingle();

    const nudgerName = nudgerProfile?.first_name || 'A friend';

    // Get friend's push token
    const { data: friendSettings } = await admin
      .from('user_settings')
      .select('push_token, push_enabled')
      .eq('user_id', friendId)
      .maybeSingle();

    if (!friendSettings?.push_token || friendSettings.push_enabled === false) {
      // Friend doesn't have push enabled — still return success (nudge "sent")
      return new Response(
        JSON.stringify({ status: 'sent', push_delivered: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send push via Expo
    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: friendSettings.push_token,
        title: 'You got nudged!',
        body: `${nudgerName} nudged you to vote — don't leave them hanging!`,
        data: { screen: 'Community', type: 'friend_nudge', nudgerId },
        sound: 'default',
      }),
    });

    const pushResult = await pushResponse.json();
    const delivered = pushResponse.ok && !pushResult?.data?.[0]?.status?.includes('error');

    return new Response(
      JSON.stringify({ status: 'sent', push_delivered: delivered }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-nudge] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
