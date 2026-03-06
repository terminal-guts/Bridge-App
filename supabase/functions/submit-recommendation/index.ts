import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the recommender via JWT
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

    const recommenderId = user.id;
    const body = await req.json();
    const { recommended_person_id, recommended_to_friend_id, source_proposal_id } = body;

    if (!recommended_person_id || !recommended_to_friend_id) {
      return Response.json(
        { error: 'Missing recommended_person_id or recommended_to_friend_id' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Cannot recommend yourself
    if (recommended_person_id === recommenderId || recommended_to_friend_id === recommenderId) {
      return Response.json(
        { error: 'Cannot recommend yourself' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Cannot recommend someone to themselves
    if (recommended_person_id === recommended_to_friend_id) {
      return Response.json(
        { error: 'Cannot recommend a person to themselves' },
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = createAdminClient();

    // Block check: reject if recommended person and target friend have blocked each other
    const { data: blockRow } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(user_id.eq.${recommended_person_id},blocked_user_id.eq.${recommended_to_friend_id}),and(user_id.eq.${recommended_to_friend_id},blocked_user_id.eq.${recommended_person_id})`)
      .limit(1);

    if (blockRow && blockRow.length > 0) {
      return Response.json(
        { error: 'Unable to make this recommendation' },
        { status: 403, headers: corsHeaders },
      );
    }

    // Verify recommender is actually friends with the recommended_to person
    const { data: friendship } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${recommenderId},friend_id.eq.${recommended_to_friend_id}),and(user_id.eq.${recommended_to_friend_id},friend_id.eq.${recommenderId})`)
      .limit(1);

    if (!friendship || friendship.length === 0) {
      return Response.json(
        { error: 'You can only recommend to your friends' },
        { status: 403, headers: corsHeaders },
      );
    }

    // Upsert the recommendation (one per recommender per person/friend pair)
    const { error: insertErr } = await supabase
      .from('friend_recommendations')
      .upsert({
        recommender_id: recommenderId,
        recommended_person_id,
        recommended_to_friend_id,
        source_proposal_id: source_proposal_id || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'recommender_id,recommended_person_id,recommended_to_friend_id' });

    if (insertErr) {
      console.error('Recommendation insert error:', insertErr);
      return Response.json({ error: 'Failed to store recommendation' }, { status: 500, headers: corsHeaders });
    }

    return Response.json({
      status: 'success',
      message: 'Recommendation stored',
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('submit-recommendation error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
