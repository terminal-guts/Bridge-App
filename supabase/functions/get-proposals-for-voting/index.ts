import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ProposalRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  [key: string]: unknown;
}

const GATE_SIZE = 3;

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

    // Matchmakers vote on proposals like daters (they are excluded as SUBJECTS
    // in generate-proposals, but participate in community voting).

    // ── Parallel: fetch everything we need (no proposal body, no global assignments) ──
    const [
      { data: blockedOutgoing },
      { data: blockedIncoming },
      { data: friendRows },
      { data: existingVotes },
      { data: existingRecs },
      { data: pendingProposals },
    ] = await Promise.all([
      supabase.from('blocked_users').select('blocked_user_id').eq('user_id', userId),
      supabase.from('blocked_users').select('user_id').eq('blocked_user_id', userId),
      supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
      supabase.from('proposal_votes').select('proposal_id').eq('voter_user_id', userId),
      supabase.from('friend_recommendations').select('source_proposal_id').eq('recommender_id', userId),
      // Only fetch the columns needed for filtering — no SELECT *
      supabase.from('proposals').select('id, user_a_id, user_b_id').eq('status', 'pending'),
    ]);

    // ── Build lookup sets ───────────────────────────────────────────────────
    const blockedIds = new Set<string>([
      ...(blockedOutgoing || []).map((r: { blocked_user_id: string }) => r.blocked_user_id),
      ...(blockedIncoming || []).map((r: { user_id: string }) => r.user_id),
    ]);

    const friendIds = new Set<string>();
    for (const row of (friendRows || [])) {
      if (row.user_id === userId) friendIds.add(row.friend_id);
      if (row.friend_id === userId) friendIds.add(row.user_id);
    }

    const alreadyActedIds = new Set([
      ...(existingVotes || []).map((v: { proposal_id: string }) => v.proposal_id),
      ...(existingRecs || []).filter((r: { source_proposal_id: string | null }) => r.source_proposal_id).map((r: { source_proposal_id: string | null }) => r.source_proposal_id),
    ]);

    // ── Filter eligible proposals for the gate ──────────────────────────────
    // Gate = non-friend proposals only. Friend proposals are voted on via
    // the Match button in the friends area, not in the gate.
    const eligible: ProposalRow[] = [];

    for (const p of (pendingProposals || [])) {
      // Skip proposals the user is part of
      if (p.user_a_id === userId || p.user_b_id === userId) continue;
      // Skip already acted on (voted or recommended)
      if (alreadyActedIds.has(p.id)) continue;
      // Skip proposals involving blocked users
      if (blockedIds.has(p.user_a_id) || blockedIds.has(p.user_b_id)) continue;
      // Skip friend proposals — those are handled in friends area
      if (friendIds.has(p.user_a_id) || friendIds.has(p.user_b_id)) continue;

      eligible.push(p);
    }

    // ── Fetch assignment counts ONLY for eligible proposals (not all proposals) ──
    // This replaces the previous full-table scan of pool_vote_assignments.
    const assignmentCounts = new Map<string, number>();
    const userAssignedIds = new Set<string>();

    if (eligible.length > 0) {
      const eligibleIds = eligible.map(p => p.id);
      const { data: assignments } = await supabase
        .from('pool_vote_assignments')
        .select('proposal_id, voter_id')
        .in('proposal_id', eligibleIds);

      for (const a of (assignments || [])) {
        assignmentCounts.set(a.proposal_id, (assignmentCounts.get(a.proposal_id) || 0) + 1);
        if (a.voter_id === userId) userAssignedIds.add(a.proposal_id);
      }
    }

    // ── Pick up to GATE_SIZE proposals, fewest assignments first ─────────
    // This ensures even vote distribution across all proposals.
    eligible.sort((a, b) => {
      const countA = assignmentCounts.get(a.id) || 0;
      const countB = assignmentCounts.get(b.id) || 0;
      return countA - countB;
    });

    const selected = eligible.slice(0, GATE_SIZE);

    // ── Daily assignment quota: cap at 6 new assignments per user per day ──
    const DAILY_ASSIGNMENT_CAP = 6;
    const todayMidnightUTC = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
    const { count: todayAssignmentCount } = await supabase
      .from('pool_vote_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('voter_id', userId)
      .gte('created_at', todayMidnightUTC);

    const remainingQuota = Math.max(0, DAILY_ASSIGNMENT_CAP - (todayAssignmentCount ?? 0));

    // ── Create pool_vote_assignments for any newly assigned proposals ────
    // Only create new rows for proposals not already assigned, up to remaining quota.
    const newAssignments = selected
      .filter(p => !userAssignedIds.has(p.id))
      .slice(0, remainingQuota);

    if (newAssignments.length > 0) {
      await supabase
        .from('pool_vote_assignments')
        .upsert(
          newAssignments.map(p => ({
            proposal_id: p.id,
            voter_id: userId,
            has_voted: false,
          })),
          { onConflict: 'proposal_id,voter_id' }
        );
    }

    // Tag selected proposals as pool votes
    const gateProposals = selected.map(p => ({
      ...p,
      vote_context: 'pool',
      is_friend_vote: false,
    }));

    // ── Enrich with profiles ────────────────────────────────────────────────
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

    const enriched = gateProposals.map(p => ({
      ...p,
      user_a_profile: profilesMap[p.user_a_id] || null,
      user_b_profile: profilesMap[p.user_b_id] || null,
    }));

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
