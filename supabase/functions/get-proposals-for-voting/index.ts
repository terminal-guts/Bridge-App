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

    // Fetch everything we need in parallel.  Key change from previous version:
    // we ONLY fetch proposals this user has an assignment for (generate-proposals
    // assigns every eligible community member to every new proposal at creation
    // time), so there's no JIT assignment / daily cap logic here.
    const [
      { data: blockedOutgoing },
      { data: blockedIncoming },
      { data: friendRows },
      { data: existingVotes },
      { data: assignments },
    ] = await Promise.all([
      supabase.from('blocked_users').select('blocked_user_id').eq('user_id', userId),
      supabase.from('blocked_users').select('user_id').eq('blocked_user_id', userId),
      supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
      supabase.from('proposal_votes').select('proposal_id').eq('voter_user_id', userId),
      supabase.from('pool_vote_assignments').select('proposal_id, has_voted').eq('voter_id', userId),
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

    // Only votes exclude proposals from the gate — recommendations do NOT.
    const alreadyActedIds = new Set(
      (existingVotes || []).map((v: { proposal_id: string }) => v.proposal_id),
    );

    // Unvoted assignments — these are the proposal IDs this user still owes a vote on.
    const assignedProposalIds = (assignments || [])
      .filter((a: { has_voted: boolean }) => !a.has_voted)
      .map((a: { proposal_id: string }) => a.proposal_id);

    if (assignedProposalIds.length === 0) {
      return Response.json({ proposals: [], pool_count: 0, friend_count: 0 }, { headers: corsHeaders });
    }

    // Fetch full rows for the proposals this user is assigned to.
    const { data: candidateProposals } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id, pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes, compatibility_score, status, created_at, voting_started_at, voting_expires_at, pool_eligible')
      .in('id', assignedProposalIds)
      .eq('status', 'pending');

    // ── Filter and split stranger vs friend proposals ───────────────────────
    // Gate is #1 priority — show up to GATE_SIZE.  Prefer stranger proposals;
    // fill remaining slots with friend proposals.
    const strangerEligible: ProposalRow[] = [];
    const friendEligible: ProposalRow[] = [];
    const demoPreAssigned: ProposalRow[] = [];

    for (const p of (candidateProposals || [])) {
      // Skip proposals the user is part of (defensive — shouldn't be assigned)
      if (p.user_a_id === userId || p.user_b_id === userId) continue;
      // Skip already acted on (voted)
      if (alreadyActedIds.has(p.id)) continue;
      // Skip proposals involving blocked users
      if (blockedIds.has(p.user_a_id) || blockedIds.has(p.user_b_id)) continue;

      // Demo proposals (pool_eligible=false) are assigned individually to specific
      // users (e.g. Apple reviewer).  If the user has an assignment to a demo
      // proposal, show ONLY demo proposals so the reviewer sees the demo bubble.
      if (p.pool_eligible === false) {
        demoPreAssigned.push(p);
        continue;
      }

      if (friendIds.has(p.user_a_id) || friendIds.has(p.user_b_id)) {
        friendEligible.push(p);
      } else {
        strangerEligible.push(p);
      }
    }

    const combined = demoPreAssigned.length > 0
      ? demoPreAssigned
      : [...strangerEligible, ...friendEligible];

    // Sort by fewest assignments first for even vote distribution across proposals.
    // (Only relevant for strangers + friends; demo proposals are already narrow.)
    if (demoPreAssigned.length === 0 && combined.length > GATE_SIZE) {
      const combinedIds = combined.map(p => p.id);
      const { data: assignmentCountRows } = await supabase
        .from('pool_vote_assignments')
        .select('proposal_id')
        .in('proposal_id', combinedIds);

      const countMap = new Map<string, number>();
      for (const row of (assignmentCountRows || [])) {
        countMap.set(row.proposal_id, (countMap.get(row.proposal_id) || 0) + 1);
      }
      combined.sort((a, b) => (countMap.get(a.id) || 0) - (countMap.get(b.id) || 0));
    }

    const selected = combined.slice(0, GATE_SIZE);

    // Tag proposals with vote context.  Friends of either subject vote via the
    // friend channel (weighted 1.25×).  Strangers vote via the pool.
    const friendEligibleIds = new Set(friendEligible.map(p => p.id));
    const gateProposals = selected.map(p => ({
      ...p,
      vote_context: friendEligibleIds.has(p.id) ? 'friend' : 'pool',
      is_friend_vote: friendEligibleIds.has(p.id),
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
