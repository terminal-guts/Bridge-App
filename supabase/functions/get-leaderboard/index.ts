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
    const entries = (rawEntries || []).map((row: { user_id: string; first_name?: string; weekly_karma?: number; rank: number; rank_change?: number; total_participants?: number }) => ({
      userId: row.user_id,
      firstName: row.first_name || 'User',
      weeklyKarma: row.weekly_karma || 0,
      rank: Number(row.rank),
      rankChange: Number(row.rank_change) || 0
    }));

    const topEntries = entries.filter(e => e.rank <= limit);
    let currentUserEntry = entries.find(e => e.userId === userId);

    // If current user has no karma entry yet, create a synthetic one
    if (!currentUserEntry) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('user_id', userId)
        .single();

      currentUserEntry = {
        userId,
        firstName: profile?.first_name || 'You',
        weeklyKarma: 0,
        rank: totalParticipants + 1,
        rankChange: 0,
      };
    }

    // 5. Enrich with photos and friendship status
    const participantIds = new Set(topEntries.map(e => e.userId));
    participantIds.add(currentUserEntry.userId);

    const participantIdList = Array.from(participantIds);

    const [profilesResult, friendsAsUser, friendsAsFriend, visibilityResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, photos')
        .in('user_id', participantIdList),
      supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .in('friend_id', participantIdList),
      supabase
        .from('friends')
        .select('user_id')
        .eq('friend_id', userId)
        .eq('status', 'accepted')
        .in('user_id', participantIdList),
      supabase
        .from('user_settings')
        .select('user_id, pref_leaderboard_visible')
        .in('user_id', participantIdList)
    ]);

    // Extract main photo storage path from the JSONB photos array.
    // photos[].url can be either a bare storage path ("photos/abc/1.jpg")
    // or a full Supabase URL — normalize to bare paths so createSignedUrls works.
    const extractStoragePath = (urlOrPath: string): string => {
      for (const marker of [
        '/storage/v1/object/public/profile-photos/',
        '/storage/v1/object/sign/profile-photos/',
        '/storage/v1/object/authenticated/profile-photos/',
      ]) {
        const idx = urlOrPath.indexOf(marker);
        if (idx >= 0) return urlOrPath.substring(idx + marker.length).split('?')[0];
      }
      return urlOrPath;
    };

    const photosMap: Record<string, string> = {};
    for (const p of (profilesResult.data || [])) {
      const photos = p.photos as Array<{ url?: string; isMain?: boolean; is_main?: boolean }> | null;
      if (!photos || photos.length === 0) continue;
      const main = photos.find((ph) => ph.isMain || ph.is_main) || photos[0];
      if (main?.url) photosMap[p.user_id] = extractStoragePath(main.url);
    }

    const friendIds = new Set([
      ...(friendsAsUser.data || []).map(f => f.friend_id),
      ...(friendsAsFriend.data || []).map(f => f.user_id),
    ]);

    // Build set of users who opted in to leaderboard visibility
    const visibleUserIds = new Set(
      (visibilityResult.data || [])
        .filter(v => v.pref_leaderboard_visible === true)
        .map(v => v.user_id)
    );

    // Resolve Signed URLs for photos
    const storagePaths = Object.values(photosMap);
    let signedUrlsMap: Record<string, string> = {};

    if (storagePaths.length > 0) {
      const { data: signedData, error: signedErr } = await supabase
        .storage
        .from('profile-photos')
        .createSignedUrls(storagePaths, 86400); // 24h

      if (!signedErr && signedData) {
        // Map signed URLs by both the raw path and any path format the client returns
        const pathRef: Record<string, string> = {};
        signedData.forEach((d, i) => {
          if (d.signedUrl) {
            // Index-based mapping is most reliable — createSignedUrls returns results in input order
            if (i < storagePaths.length) pathRef[storagePaths[i]] = d.signedUrl;
            // Also map by d.path in case it matches
            if (d.path) pathRef[d.path] = d.signedUrl;
          }
        });

        for (const [uid, path] of Object.entries(photosMap)) {
          signedUrlsMap[uid] = pathRef[path] || '';
        }
      } else if (signedErr) {
        console.error('createSignedUrls failed:', signedErr.message);
      }
    }

    // Anonymize users who haven't opted in and aren't friends of the viewer
    const finalLeaderboard = topEntries.map(e => {
      const isFriend = friendIds.has(e.userId);
      const isSelf = e.userId === userId;
      const isVisible = isSelf || isFriend || visibleUserIds.has(e.userId);
      return {
        ...e,
        firstName: isVisible ? e.firstName : 'Bridger',
        photoUrl: isVisible ? (signedUrlsMap[e.userId] || null) : null,
        isFriend,
        isAnonymous: !isVisible,
      };
    });

    const finalCurrentUser = {
      ...currentUserEntry,
      photoUrl: signedUrlsMap[currentUserEntry.userId] || null,
      isFriend: false,
      isAnonymous: false,
      spotsBehindFirst: entries.length > 0 ? entries[0].weeklyKarma - currentUserEntry.weeklyKarma : 0
    };

    return Response.json({
      leaderboard: finalLeaderboard,
      currentUser: finalCurrentUser,
      weekStart: currentWeekStart,
      totalParticipants: Number(totalParticipants)
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('get-leaderboard error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
