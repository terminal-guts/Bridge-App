import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ── Weekly Summary Push Notification ─────────────────────────────────────────
// Runs every Sunday at 7 PM Central (Monday 00:00 UTC), right after
// snapshot-weekly-karma. Sends every user a push notification with:
//   - Total matches made app-wide this week
//   - Total votes cast app-wide this week
//   - Who won the $100 leaderboard prize (best matchmaker)
// ─────────────────────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo recommends batches of up to 100 notifications per request
const BATCH_SIZE = 100;

interface WeeklyStats {
  totalMatches: number;
  totalVotes: number;
  winnerName: string;
  winnerKarma: number;
}

async function getWeeklyStats(supabase: ReturnType<typeof createAdminClient>): Promise<WeeklyStats> {
  // Get the current week boundary (Sunday 7PM Central = Monday 00:00 UTC)
  // Since this runs AT the boundary, "this week" is the one that just ended.
  // The snapshot just ran, so karma_weekly_snapshots has the START of the week
  // that just completed. We need to look back 7 days.
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartISO = weekStart.toISOString();

  // 1. Total matches created this week (proposals that became matches)
  const { count: totalMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStartISO);

  // 2. Total votes cast this week
  const { count: totalVotes } = await supabase
    .from('proposal_votes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStartISO);

  // 3. Best matchmaker — user with highest weekly karma gain
  // get_leaderboard_data requires (p_current_user_id, p_limit).
  // We pass a dummy UUID since we just need the ranked list, not "my rank".
  const DUMMY_UUID = '00000000-0000-0000-0000-000000000000';
  const { data: leaderboard, error: lbError } = await supabase
    .rpc('get_leaderboard_data', { p_current_user_id: DUMMY_UUID, p_limit: 1 });

  if (lbError) {
    console.error('Leaderboard RPC error:', lbError);
  }

  let winnerName = 'a Bridge matchmaker';
  let winnerKarma = 0;

  if (leaderboard && leaderboard.length > 0) {
    const top = leaderboard[0];
    winnerName = top.first_name || 'a Bridge matchmaker';
    winnerKarma = top.weekly_karma || 0;
  }

  return {
    totalMatches: totalMatches || 0,
    totalVotes: totalVotes || 0,
    winnerName,
    winnerKarma,
  };
}

async function getAllPushTokens(supabase: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data } = await supabase
    .from('user_settings')
    .select('push_token')
    .not('push_token', 'is', null)
    .eq('push_notifications', true);

  if (!data) return [];
  return data
    .map((row: any) => row.push_token)
    .filter((token: string) => token && token.startsWith('ExponentPushToken'));
}

function buildNotificationBody(stats: WeeklyStats): { title: string; body: string } {
  const { totalMatches, totalVotes, winnerName, winnerKarma } = stats;

  const matchWord = totalMatches === 1 ? 'match' : 'matches';
  const voteWord = totalVotes === 1 ? 'vote' : 'votes';

  // No activity at all — don't send a depressing "0 matches, 0 votes" notification
  if (totalMatches === 0 && totalVotes === 0) {
    return {
      title: 'New week on Bridge',
      body: 'The leaderboard just reset. Vote for your friends this week to climb the ranks and win $100!',
    };
  }

  // Winner has karma — announce them
  if (winnerKarma > 0) {
    return {
      title: 'This week on Bridge',
      body: `${totalMatches} ${matchWord} made, ${totalVotes} ${voteWord} cast. ${winnerName} won the $100 prize with ${winnerKarma} karma!`,
    };
  }

  // Activity happened but no clear karma winner (e.g. karma just reset)
  return {
    title: 'This week on Bridge',
    body: `${totalMatches} ${matchWord} made and ${totalVotes} ${voteWord} cast this week. New leaderboard starts now — who's winning $100?`,
  };
}

async function sendPushBatch(tokens: string[], title: string, body: string): Promise<number> {
  let sent = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map(token => ({
      to: token,
      title,
      body,
      data: { screen: 'Leaderboard' },
      sound: 'default',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      if (res.ok) {
        sent += batch.length;
      } else {
        console.error(`Push batch failed (${i}-${i + batch.length}):`, await res.text());
      }
    } catch (err) {
      console.error(`Push batch error (${i}-${i + batch.length}):`, err);
    }
  }

  return sent;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Day-of-week guard: only run on Sunday 7PM Central boundary
    // (Monday 00:00 UTC) unless forced
    const now = new Date();
    const isMondayUTC = now.getUTCDay() === 1;
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    if (!isMondayUTC && !force) {
      return Response.json({
        status: 'skipped',
        message: 'Weekly summary only runs on Sunday 7 PM Central (Monday 00:00 UTC). Use ?force=true to override.',
      }, { headers: corsHeaders });
    }

    const supabase = createAdminClient();

    // 1. Gather stats for the week that just ended
    const stats = await getWeeklyStats(supabase);
    console.log('Weekly stats:', stats);

    // 2. Build notification
    const { title, body } = buildNotificationBody(stats);
    console.log('Notification:', { title, body });

    // 3. Get all push tokens
    const tokens = await getAllPushTokens(supabase);
    console.log(`Found ${tokens.length} push tokens`);

    if (tokens.length === 0) {
      return Response.json({
        status: 'success',
        message: 'No push tokens found, no notifications sent',
        stats,
      }, { headers: corsHeaders });
    }

    // 4. Send in batches
    const sent = await sendPushBatch(tokens, title, body);

    return Response.json({
      status: 'success',
      stats,
      notification: { title, body },
      tokenCount: tokens.length,
      sent,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('send-weekly-summary error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
