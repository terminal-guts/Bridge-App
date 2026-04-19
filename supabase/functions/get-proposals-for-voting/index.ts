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

// Gate capacity per user per cycle.  Bumped 3 → 5 on 2026-04-18 (ticket A1 in
// docs/plans/proposal-gate-overhaul.md) so users with spare session bandwidth
// can vote more and pending proposals hit the 8-vote decision threshold faster.
//
// NOTE: this MUST ship in lockstep with a frontend release that bumps the
// daily-vote target from 3 → 5 in `src/services/communityBackendService.ts`
// (hasVoted threshold + progress-bar cap).  If backend is deployed before the
// frontend release reaches App Store users, the gate will fetch 5 proposals
// but the frontend will declare the user done at 3, hiding the other 2 until
// the next day.  Harmless but inconsistent.  Deploy day-of-app-release.
const GATE_SIZE = 5;

// Returns the timestamp (as UTC ISO) of the most recent 19:00 America/Chicago
// boundary.  Used to count "votes cast today" for the gate sort primary.
//
// Handles DST correctly — during CDT (spring/summer, UTC-5), 7PM CDT = 00:00
// UTC the next day; during CST (fall/winter, UTC-6), 7PM CST = 01:00 UTC the
// next day.  A naive UTC-midnight cutoff would be off by an hour for half the
// year, drifting the sort fairness.
function last7pmCentralCutoff(): string {
  const now = new Date();

  // Use Intl.DateTimeFormat to get the current Chicago wall-clock components.
  // parts: [{type:'year',...}, {type:'month',...}, ...]
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  const chicagoYear = Number(parts.year);
  const chicagoMonth = Number(parts.month);
  const chicagoDay = Number(parts.day);
  const chicagoHour = Number(parts.hour);

  // Target date-in-Chicago: today's 19:00 if we're past 19:00, else yesterday's.
  let targetYear = chicagoYear, targetMonth = chicagoMonth, targetDay = chicagoDay;
  if (chicagoHour < 19) {
    // Roll back one calendar day in Chicago.  Use a UTC date as scratch and
    // subtract 24h — correct across month/year boundaries.
    const scratch = new Date(Date.UTC(chicagoYear, chicagoMonth - 1, chicagoDay));
    scratch.setUTCDate(scratch.getUTCDate() - 1);
    targetYear = scratch.getUTCFullYear();
    targetMonth = scratch.getUTCMonth() + 1;
    targetDay = scratch.getUTCDate();
  }

  // Now convert "{targetYear}-{targetMonth}-{targetDay} 19:00 America/Chicago"
  // to a UTC ISO string.  Easiest: binary search on UTC offsets ±24h to find
  // the timestamp whose Chicago representation matches 19:00 on that date.
  // Simpler implementation: construct candidate timestamps at UTC-5 and UTC-6
  // and pick whichever Chicago-formats back to 19:00 on the target date.
  const candidates = [
    // Assume CDT (UTC-5): 19:00 Chicago = 24:00 UTC on the target date
    Date.UTC(targetYear, targetMonth - 1, targetDay, 24, 0, 0),
    // Assume CST (UTC-6): 19:00 Chicago = 25:00 UTC on the target date (i.e. 01:00 UTC next day)
    Date.UTC(targetYear, targetMonth - 1, targetDay, 25, 0, 0),
  ];
  for (const utcMs of candidates) {
    const d = new Date(utcMs);
    const fmtCheck = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false,
    });
    const checkParts: Record<string, string> = {};
    for (const p of fmtCheck.formatToParts(d)) {
      if (p.type !== 'literal') checkParts[p.type] = p.value;
    }
    if (
      Number(checkParts.year) === targetYear &&
      Number(checkParts.month) === targetMonth &&
      Number(checkParts.day) === targetDay &&
      Number(checkParts.hour) === 19
    ) {
      return d.toISOString();
    }
  }

  // Fallback if DST-gap math misses (shouldn't happen for 19:00 — DST spring-
  // forward is at 02:00 local, not near 19:00).  Return the CDT candidate.
  return new Date(candidates[0]).toISOString();
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
