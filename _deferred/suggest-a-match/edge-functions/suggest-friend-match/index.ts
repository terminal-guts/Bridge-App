/**
 * Suggest Friend Match — queues a friend-to-friend match suggestion.
 * Does NOT create a proposal immediately. The suggestion is processed
 * at the next 7PM cycle by generate-proposals.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUGGESTION_TTL_DAYS = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the suggester via JWT
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

    const suggesterId = user.id;
    const { user_a_id, user_b_id } = await req.json();

    if (!user_a_id || !user_b_id) {
      return Response.json({ error: 'Missing user_a_id or user_b_id' }, { status: 400, headers: corsHeaders });
    }

    if (user_a_id === user_b_id) {
      return Response.json({ error: 'Cannot match a person with themselves' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    // 2. Validate both are friends of the suggester
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${suggesterId},friend_id.eq.${suggesterId}`);

    const friendIds = new Set(
      (friendships || []).map(f => f.user_id === suggesterId ? f.friend_id : f.user_id)
    );

    if (!friendIds.has(user_a_id) || !friendIds.has(user_b_id)) {
      return Response.json({ error: 'Both users must be your friends' }, { status: 400, headers: corsHeaders });
    }

    // Enforce ordering: user_a_id < user_b_id
    const [orderedA, orderedB] = user_a_id < user_b_id
      ? [user_a_id, user_b_id]
      : [user_b_id, user_a_id];

    // 3. Check neither has a deciding or more advanced proposal
    const { data: advancedProposals } = await supabase
      .from('proposals')
      .select('user_a_id, user_b_id, status')
      .in('status', ['deciding', 'candidate_match', 'confirmed', 'accepted']);

    const usersInAdvancedState = new Set<string>();
    (advancedProposals || []).forEach(p => {
      usersInAdvancedState.add(p.user_a_id);
      usersInAdvancedState.add(p.user_b_id);
    });

    if (usersInAdvancedState.has(orderedA)) {
      return Response.json({ error: 'First friend has a proposal in progress that can\'t be interrupted' }, { status: 409, headers: corsHeaders });
    }
    if (usersInAdvancedState.has(orderedB)) {
      return Response.json({ error: 'Second friend has a proposal in progress that can\'t be interrupted' }, { status: 409, headers: corsHeaders });
    }

    // 4. Check neither already has a queued/stashed friend suggestion
    const { data: existingSuggestions } = await supabase
      .from('friend_suggestions')
      .select('id, user_a_id, user_b_id')
      .in('status', ['queued', 'stashed'])
      .or(`user_a_id.eq.${orderedA},user_b_id.eq.${orderedA},user_a_id.eq.${orderedB},user_b_id.eq.${orderedB}`);

    if (existingSuggestions && existingSuggestions.length > 0) {
      return Response.json({ error: 'One of them already has a pending friend suggestion' }, { status: 409, headers: corsHeaders });
    }

    // 5. Check pair not blocked
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(user_id.eq.${orderedA},blocked_user_id.eq.${orderedB}),and(user_id.eq.${orderedB},blocked_user_id.eq.${orderedA})`)
      .limit(1);

    if (blocks && blocks.length > 0) {
      return Response.json({ error: 'These users cannot be matched' }, { status: 400, headers: corsHeaders });
    }

    // 6. Check no previous rejected/declined proposal between pair
    const { data: pastProposals } = await supabase
      .from('proposals')
      .select('id')
      .or(`and(user_a_id.eq.${orderedA},user_b_id.eq.${orderedB}),and(user_a_id.eq.${orderedB},user_b_id.eq.${orderedA})`)
      .in('status', ['rejected', 'declined'])
      .limit(1);

    if (pastProposals && pastProposals.length > 0) {
      return Response.json({ error: 'This pair has been previously rejected or declined' }, { status: 400, headers: corsHeaders });
    }

    // 7. Check neither is suspended and both have completed profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, is_suspended, profile_completed')
      .in('user_id', [orderedA, orderedB]);

    if (!profiles || profiles.length < 2) {
      return Response.json({ error: 'Could not find both user profiles' }, { status: 400, headers: corsHeaders });
    }

    for (const p of profiles) {
      if (p.is_suspended) {
        return Response.json({ error: 'One of the users is suspended' }, { status: 400, headers: corsHeaders });
      }
      if (!p.profile_completed) {
        return Response.json({ error: 'Both users must have completed profiles' }, { status: 400, headers: corsHeaders });
      }
    }

    // 8. Insert the suggestion (queued, expires in 5 days)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SUGGESTION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const { data: suggestion, error: insertErr } = await supabase
      .from('friend_suggestions')
      .insert({
        suggested_by: suggesterId,
        user_a_id: orderedA,
        user_b_id: orderedB,
        status: 'queued',
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      // Unique constraint violation = someone already has an active suggestion
      if (insertErr.code === '23505') {
        return Response.json({ error: 'One of them already has a pending friend suggestion' }, { status: 409, headers: corsHeaders });
      }
      return Response.json({ error: insertErr.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({
      suggestion_id: suggestion.id,
      status: 'queued',
      expires_at: expiresAt.toISOString(),
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('suggest-friend-match error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
