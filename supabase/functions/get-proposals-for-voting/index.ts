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

    // 6. Fetch profiles for enrichment
    let profilesMap: Record<string, any> = {};
    if (profileUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, age, gender, location, interests, values, bio, photos')
        .in('user_id', [...profileUserIds]);

      for (const p of (profiles || [])) {
        profilesMap[p.user_id] = p;
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
