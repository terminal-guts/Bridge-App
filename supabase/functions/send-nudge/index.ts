/**
 * send-nudge edge function
 *
 * Sends a push notification nudge from one friend to another,
 * reminding them to vote. Uses shared sendPush utility for
 * cap enforcement, cooldowns, and logging.
 *
 * POST body: { friendId: string }
 * Auth: requires valid JWT (nudger = authenticated user)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';

const COPY_VARIANTS = [
  {
    title: (name: string) => `${name} nudged you`,
    body: (_name: string) => `They're waiting for your vote. Don't leave them hanging.`,
  },
  {
    title: (_name: string) => 'Incoming nudge',
    body: (name: string) => `👉 ${name} wants you to vote. Take 30 seconds.`,
  },
  {
    title: (name: string) => `Hey, ${name} called you out`,
    body: (_name: string) => `They nudged you to vote. Your move.`,
  },
];

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

    // Get nudger's name
    const { data: nudgerProfile } = await admin
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', nudgerId)
      .maybeSingle();

    const nudgerName = nudgerProfile?.first_name || 'A friend';

    // Use shared sendPush — handles token lookup, preferences, caps, cooldowns, logging
    const variant = await getNextCopyVariant(admin, friendId, 'friend_nudge', COPY_VARIANTS.length);
    const copy = COPY_VARIANTS[variant];

    const result = await sendPush(admin, {
      userId: friendId,
      notificationType: 'friend_nudge',
      category: 'engagement',
      title: copy.title(nudgerName),
      body: copy.body(nudgerName),
      data: { screen: 'Community', type: 'friend_nudge', nudgerId },
      copyVariant: variant,
      metadata: { nudger_id: nudgerId },
    });

    return new Response(
      JSON.stringify({ status: 'sent', push_delivered: result.sent, reason: result.reason }),
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
