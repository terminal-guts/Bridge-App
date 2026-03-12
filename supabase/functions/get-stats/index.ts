import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json(
        { error: 'Missing authorization header' },
        { status: 401, headers: corsHeaders },
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders },
      );
    }

    const userId = user.id;
    const supabase = createAdminClient();

    // ── Get user's university ─────────────────────────────────────
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('school')
      .eq('user_id', userId)
      .single();

    if (profileErr) throw profileErr;

    const university = profile?.school || 'Rice University';

    // ── Call both RPCs in parallel ────────────────────────────────
    const [userStatsResult, campusStatsResult] = await Promise.all([
      supabase.rpc('get_user_stats', { p_user_id: userId }),
      supabase.rpc('get_campus_stats', { p_university: university, p_requesting_user_id: userId }),
    ]);

    if (userStatsResult.error) throw userStatsResult.error;
    if (campusStatsResult.error) throw campusStatsResult.error;

    return Response.json(
      {
        userStats: userStatsResult.data,
        campusStats: campusStatsResult.data,
      },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error('get-stats error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
