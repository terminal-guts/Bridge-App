import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

    // 1. Get pool vote assignments for this user
    const { data: assignments } = await supabase
      .from('pool_vote_assignments')
      .select('proposal_id, has_voted')
      .eq('voter_id', userId);

    const assignedProposalIds = (assignments || [])
      .filter((a: any) => !a.has_voted)
      .map((a: any) => a.proposal_id);

    // 2. Get user's friends
    const { data: friendRows } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    const friendIds = new Set<string>();
    for (const row of (friendRows || [])) {
      if (row.user_id === userId) friendIds.add(row.friend_id);
      if (row.friend_id === userId) friendIds.add(row.user_id);
    }

    // 3. Get existing votes by this user (to exclude already-voted proposals)
    const { data: existingVotes } = await supabase
      .from('proposal_votes')
      .select('proposal_id')
      .eq('voter_user_id', userId);

    const alreadyVotedIds = new Set((existingVotes || []).map((v: any) => v.proposal_id));

    // 4. Fetch all pending proposals
    const { data: pendingProposals } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', 'pending');

    const poolProposals: any[] = [];
    const friendProposals: any[] = [];
    const allProposalIds = new Set<string>();

    for (const p of (pendingProposals || [])) {
      // Skip proposals the user is part of
      if (p.user_a_id === userId || p.user_b_id === userId) continue;
      // Skip already voted
      if (alreadyVotedIds.has(p.id)) continue;

      allProposalIds.add(p.id);

      // Check if this is a friend proposal (user_a or user_b is a friend)
      const isFriendProposal = friendIds.has(p.user_a_id) || friendIds.has(p.user_b_id);

      if (isFriendProposal) {
        friendProposals.push({
          ...p,
          vote_context: 'friend',
          is_friend_vote: true,
          friend_of: friendIds.has(p.user_a_id) ? p.user_a_id : p.user_b_id,
        });
      } else if (assignedProposalIds.includes(p.id)) {
        poolProposals.push({
          ...p,
          vote_context: 'pool',
          is_friend_vote: false,
        });
      }
    }

    // 5. Collect all user IDs we need profiles for
    const profileUserIds = new Set<string>();
    for (const p of [...poolProposals, ...friendProposals]) {
      profileUserIds.add(p.user_a_id);
      profileUserIds.add(p.user_b_id);
    }

    // 6. Fetch profiles and preferences for enrichment
    let profilesMap: Record<string, any> = {};
    if (profileUserIds.size > 0) {
      const profileIds = [...profileUserIds];

      const [profilesResult, preferencesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, age, gender, pronouns, height_inches, ethnicity, religion, political_leaning, location, interests, values, bio, photos, drinking_frequency, cannabis_frequency, tobacco_frequency, other_drugs_frequency, profile_completed')
          .in('user_id', profileIds),
        supabase
          .from('user_preferences')
          .select('user_id, age_min, age_max, preferred_height_min_inches, preferred_height_max_inches, partner_drinking, partner_cannabis, partner_tobacco, partner_other_drugs, preferred_ethnicities, preferred_politics')
          .in('user_id', profileIds)
      ]);

      const preferencesMap: Record<string, any> = {};
      for (const pref of (preferencesResult.data || [])) {
        preferencesMap[pref.user_id] = pref;
      }

      for (const p of (profilesResult.data || [])) {
        const prefs = preferencesMap[p.user_id] || {};
        profilesMap[p.user_id] = {
          ...p,
          // Merge preference fields into the profile row so mapProfileRow can pick them up
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
          // Also put raw fields directly so mapProfileRow fallback can find them
          partner_drinking: prefs.partner_drinking || null,
          partner_cannabis: prefs.partner_cannabis || null,
          partner_tobacco: prefs.partner_tobacco || null,
          partner_other_drugs: prefs.partner_other_drugs || null,
          preferred_ethnicities: prefs.preferred_ethnicities,
          preferred_politics: prefs.preferred_politics,
        };
      }
    }

    // 7. Enrich proposals with profile data
    function enrichProposal(p: any) {
      return {
        ...p,
        user_a_profile: profilesMap[p.user_a_id] || null,
        user_b_profile: profilesMap[p.user_b_id] || null,
      };
    }

    const enrichedPool = poolProposals.map(enrichProposal);
    const enrichedFriend = friendProposals.map(enrichProposal);
    const allProposals = [...enrichedFriend, ...enrichedPool];

    return Response.json({
      proposals: allProposals,
      pool_count: enrichedPool.length,
      friend_count: enrichedFriend.length,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('get-proposals-for-voting error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
