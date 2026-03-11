import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user via JWT
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

    // 2. Parse request params
    const { limit = 50 } = await req.json().catch(() => ({}));

    // 3. Get the current week_start
    const { data: weekStartData, error: weekStartErr } = await supabase.rpc('get_current_week_start');
    if (weekStartErr) throw weekStartErr;
    const currentWeekStart = weekStartData;

    // 4. Fetch the Leaderboard Data
    // We join karma_scores with karma_weekly_snapshots for the current week.
    // Logic: weeklyKarma = currentPoints - karmaAtStart
    // Use the optimized RPC get_leaderboard_data

    const { data: rawEntries, error: lbErr } = await supabase.rpc('get_leaderboard_data', {
      p_current_user_id: userId,
      p_limit: limit
    });

    if (lbErr) throw lbErr;

    // Total participants comes from the RPC return (it's repeated in each row)
    const totalParticipants = rawEntries?.[0]?.total_participants || 0;

    // Format entries
    const entries = (rawEntries || []).map((row: any) => ({
      userId: row.user_id,
      firstName: row.first_name || 'User',
      weeklyKarma: row.weekly_karma || 0,
      rank: Number(row.rank)
    }));

    const topEntries = entries.filter(e => e.rank <= limit);
    const currentUserEntry = entries.find(e => e.userId === userId);

    // 5. Enrich with photos and friendship status
    const participantIds = new Set(topEntries.map(e => e.userId));
    if (currentUserEntry) participantIds.add(currentUserEntry.userId);

    const participantIdList = Array.from(participantIds);

    const [photosResult, friendshipsResult] = await Promise.all([
      supabase
        .from('user_photos')
        .select('user_id, storage_path')
        .in('user_id', participantIdList)
        .or('is_main.eq.true,order.eq.0') // Corrected column name to 'order'
        .order('order', { ascending: true }), // Corrected column name to 'order'
      supabase
        .from('friendships') // Corrected table name to 'friendships'
        .select('friend_id')
        .eq('user_id', userId)
        .in('friend_id', participantIdList)
    ]);

    const photosMap: Record<string, string> = {};
    for (const p of (photosResult.data || [])) {
      if (!photosMap[p.user_id]) photosMap[p.user_id] = p.storage_path;
    }

    const friendIds = new Set((friendshipsResult.data || []).map(f => f.friend_id));

    // Resolve Signed URLs for photos
    const storagePaths = Object.values(photosMap);
    let signedUrlsMap: Record<string, string> = {};

    if (storagePaths.length > 0) {
      const { data: signedData, error: signedErr } = await supabase
        .storage
        .from('profile-photos')
        .createSignedUrls(storagePaths, 86400); // 24h

      if (!signedErr && signedData) {
        const pathRef: Record<string, string> = {};
        signedData.forEach(d => {
          if (d.signedUrl) pathRef[d.path] = d.signedUrl;
        });

        for (const [uid, path] of Object.entries(photosMap)) {
          signedUrlsMap[uid] = pathRef[path] || '';
        }
      }
    }

    const finalLeaderboard = topEntries.map(e => ({
      ...e,
      photoUrl: signedUrlsMap[e.userId] || null,
      isFriend: friendIds.has(e.userId)
    }));

    const finalCurrentUser = currentUserEntry ? {
      ...currentUserEntry,
      photoUrl: signedUrlsMap[currentUserEntry.userId] || null,
      isFriend: false, // current user is not their own friend in this context
      spotsBehindFirst: entries.length > 0 ? entries[0].weeklyKarma - currentUserEntry.weeklyKarma : 0
    } : null;

    return Response.json({
      leaderboard: finalLeaderboard,
      currentUser: finalCurrentUser,
      weekStart: currentWeekStart,
      totalParticipants: Number(totalParticipants)
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('get-leaderboard error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
