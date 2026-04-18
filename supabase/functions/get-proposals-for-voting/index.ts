import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ProposalRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

const GATE_SIZE = 3;

// Returns the timestamp of the most recent 7PM Central boundary in UTC.
// Used to count "votes cast today" for the sort primary.  CDT is UTC-5, so
// 7PM CDT = 00:00 UTC of the next day.  During CST (winter), 7PM CST = 01:00 UTC.
// We use a simple fixed-offset approximation (midnight UTC) — for Bridge's
// voting-balance purpose, being off by an hour around DST transitions is
// acceptable.
function last7pmCentralCutoff(): string {
  const now = new Date();
  // Midnight UTC of today (or yesterday if we're before midnight UTC).
  const utcMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  // If we're before midnight UTC (meaning between 7PM Central yesterday and
  // midnight UTC today), the last cutoff was yesterday's midnight UTC.
  // Otherwise it's today's midnight UTC.
  if (now.getTime() < utcMidnight.getTime()) {
    utcMidnight.setUTCDate(utcMidnight.getUTCDate() - 1);
  }
  return utcMidnight.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the user via JWT
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
    const todayCutoff = last7pmCentralCutoff();

    // Fetch in parallel:
    //   1. Block relationships for this user (both directions)
    //   2. Friendships for this user (either side)
    //   3. Proposals this user has already voted on (filter them out)
    //   4. All currently-pending proposals (we'll filter + sort in memory)
    //   5. Today's vote counts per proposal (for sort primary)
    //   6. Paused/suspended user_ids (global set — small)
    //   7. Pre-assigned demo proposals for this user (reviewer/demo accounts)
    const [
      { data: blockedOutgoing },
      { data: blockedIncoming },
      { data: friendRows },
      { data: existingVotes },
      { data: pendingProposals },
      { data: todayVoteCounts },
      { data: pausedOrSuspended },
      { data: demoAssignments },
    ] = await Promise.all([
      supabase.from('blocked_users').select('blocked_user_id').eq('user_id', userId),
      supabase.from('blocked_users').select('user_id').eq('blocked_user_id', userId),
      supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
      supabase.from('proposal_votes').select('proposal_id').eq('voter_user_id', userId),
      supabase.from('proposals').select('id, user_a_id, user_b_id, pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes, compatibility_score, status, created_at, voting_started_at, voting_expires_at, pool_eligible').eq('status', 'pending'),
      supabase.from('proposal_votes').select('proposal_id').gte('created_at', todayCutoff),
      supabase.from('user_profiles').select('user_id').or('is_paused.eq.true,is_suspended.eq.true'),
      // Pre-assigned demo proposals (reviewer demo flow) — the ONLY remaining
      // reason we still read pool_vote_assignments.  Demo proposals have
      // pool_eligible=false and are shown only to the specific user whose id
      // is in their pool_vote_assignments row.
      supabase.from('pool_vote_assignments').select('proposal_id').eq('voter_id', userId),
    ]);

    const blockedIds = new Set<string>([
      ...(blockedOutgoing || []).map((r: { blocked_user_id: string }) => r.blocked_user_id),
      ...(blockedIncoming || []).map((r: { user_id: string }) => r.user_id),
    ]);

    const friendIds = new Set<string>();
    for (const row of (friendRows || [])) {
      if (row.user_id === userId) friendIds.add(row.friend_id);
      if (row.friend_id === userId) friendIds.add(row.user_id);
    }

    const alreadyVotedIds = new Set(
      (existingVotes || []).map((v: { proposal_id: string }) => v.proposal_id),
    );

    const pausedOrSuspendedIds = new Set(
      (pausedOrSuspended || []).map((r: { user_id: string }) => r.user_id),
    );

    const demoAssignedIds = new Set(
      (demoAssignments || []).map((a: { proposal_id: string }) => a.proposal_id),
    );

    // Build a per-proposal count of today's votes.
    const votesToday = new Map<string, number>();
    for (const row of (todayVoteCounts || [])) {
      votesToday.set(row.proposal_id, (votesToday.get(row.proposal_id) || 0) + 1);
    }

    // Filter: apply all exclusions, then split stranger vs friend.
    const strangerEligible: ProposalRow[] = [];
    const friendEligible: ProposalRow[] = [];
    const demoEligible: ProposalRow[] = [];

    for (const p of (pendingProposals || [])) {
      // Don't show proposals the user is a subject of (defensive)
      if (p.user_a_id === userId || p.user_b_id === userId) continue;
      // Don't show proposals the user already voted on
      if (alreadyVotedIds.has(p.id)) continue;
      // Don't show proposals involving blocked users
      if (blockedIds.has(p.user_a_id) || blockedIds.has(p.user_b_id)) continue;
      // Don't show proposals where either subject is paused or suspended
      // (defensive — the auto-expire trigger should also have caught this)
      if (pausedOrSuspendedIds.has(p.user_a_id) || pausedOrSuspendedIds.has(p.user_b_id)) continue;

      // Demo proposals (pool_eligible=false) only show to users with an explicit
      // assignment (reviewer demo flow).
      if (p.pool_eligible === false) {
        if (demoAssignedIds.has(p.id)) {
          demoEligible.push(p);
        }
        continue;
      }

      if (friendIds.has(p.user_a_id) || friendIds.has(p.user_b_id)) {
        friendEligible.push(p);
      } else {
        strangerEligible.push(p);
      }
    }

    // If user has demo assignments, show ONLY those (reviewer flow).
    if (demoEligible.length > 0) {
      const enriched = await enrichWithProfiles(supabase, demoEligible.slice(0, GATE_SIZE).map(p => ({
        ...p,
        vote_context: 'pool' as const,
        is_friend_vote: false,
      })));
      return Response.json({
        proposals: enriched,
        pool_count: enriched.length,
        friend_count: 0,
      }, { headers: corsHeaders });
    }

    // Sort both pools: primary = fewest votes today ASC; secondary = oldest
    // created_at ASC; tertiary = random (stable per-request via Math.random).
    // The cascade only applies when the prior key ties.
    const sortByGatePriority = (a: ProposalRow, b: ProposalRow) => {
      const votesA = votesToday.get(a.id) || 0;
      const votesB = votesToday.get(b.id) || 0;
      if (votesA !== votesB) return votesA - votesB;
      const createdA = new Date(a.created_at).getTime();
      const createdB = new Date(b.created_at).getTime();
      if (createdA !== createdB) return createdA - createdB;
      return Math.random() - 0.5;
    };

    strangerEligible.sort(sortByGatePriority);
    friendEligible.sort(sortByGatePriority);

    // Take up to GATE_SIZE from the stranger pool; fill remainder with friends.
    const selected: ProposalRow[] = [
      ...strangerEligible.slice(0, GATE_SIZE),
    ];
    if (selected.length < GATE_SIZE) {
      selected.push(...friendEligible.slice(0, GATE_SIZE - selected.length));
    }

    // Tag with vote context (friend vote has 1.25× weight)
    const friendEligibleIds = new Set(friendEligible.map(p => p.id));
    const gateProposals = selected.map(p => ({
      ...p,
      vote_context: friendEligibleIds.has(p.id) ? 'friend' : 'pool',
      is_friend_vote: friendEligibleIds.has(p.id),
    }));

    const enriched = await enrichWithProfiles(supabase, gateProposals);

    return Response.json({
      proposals: enriched,
      pool_count: enriched.length,
      friend_count: 0,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('get-proposals-for-voting error:', err);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});

// ────────────────────────────────────────────────────────────────────────────

async function enrichWithProfiles(
  supabase: ReturnType<typeof createAdminClient>,
  // deno-lint-ignore no-explicit-any
  gateProposals: Array<any>,
) {
  const profileUserIds = new Set<string>();
  for (const p of gateProposals) {
    profileUserIds.add(p.user_a_id);
    profileUserIds.add(p.user_b_id);
  }

  let profilesMap: Record<string, Record<string, unknown>> = {};
  if (profileUserIds.size > 0) {
    const profileIds = [...profileUserIds];

    const [profilesResult, preferencesResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, age, gender, pronouns, height_inches, ethnicity, religion, political_leaning, location, interests, values, bio, photos, drinking_frequency, cannabis_frequency, tobacco_frequency, other_drugs_frequency, profile_completed')
        .in('user_id', profileIds),
      supabase
        .from('user_preferences')
        .select('user_id, age_min, age_max, preferred_height_min_inches, preferred_height_max_inches, partner_drinking, partner_cannabis, partner_tobacco, partner_other_drugs')
        .in('user_id', profileIds),
    ]);

    const preferencesMap: Record<string, Record<string, unknown>> = {};
    for (const pref of (preferencesResult.data || [])) {
      preferencesMap[pref.user_id] = pref;
    }

    for (const p of (profilesResult.data || [])) {
      const prefs = preferencesMap[p.user_id] || {};
      profilesMap[p.user_id] = {
        ...p,
        age_min: prefs.age_min,
        age_max: prefs.age_max,
        height_min: prefs.preferred_height_min_inches,
        height_max: prefs.preferred_height_max_inches,
        partner_lifestyle_preferences: {
          drinking: prefs.partner_drinking?.length ? prefs.partner_drinking : null,
          cannabis: prefs.partner_cannabis?.length ? prefs.partner_cannabis : null,
          tobacco: prefs.partner_tobacco?.length ? prefs.partner_tobacco : null,
          otherDrugs: prefs.partner_other_drugs?.length ? prefs.partner_other_drugs : null,
        },
        partner_drinking: prefs.partner_drinking || null,
        partner_cannabis: prefs.partner_cannabis || null,
        partner_tobacco: prefs.partner_tobacco || null,
        partner_other_drugs: prefs.partner_other_drugs || null,
      };
    }
  }

  return gateProposals.map(p => ({
    ...p,
    user_a_profile: profilesMap[p.user_a_id] || null,
    user_b_profile: profilesMap[p.user_b_id] || null,
  }));
}
