import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { calculateCompatibility, passesBasicFilter } from '../_shared/scoring.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { MAX_POOL_VOTES } from '../_shared/constants.ts';

const MIN_COMPATIBILITY_SCORE = 30.0;
const VOTERS_PER_PROPOSAL = 6;
const MAX_VOTING_GATE = 3;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────
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

    let proposalCreated = false;
    let compatibilityScore: number | null = null;

    // ── Phase A: Create a proposal FOR this user ─────────────────────

    // Check if user already has an active proposal
    const { data: activeProposals } = await supabase
      .from('proposals')
      .select('id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .in('status', ['pending', 'deciding'])
      .limit(1);

    // Check if user has an active match
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('id')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .in('status', ['pending', 'accepted', 'active'])
      .limit(1);

    const hasActiveProposal = (activeProposals || []).length > 0;
    const hasActiveMatch = (activeMatches || []).length > 0;

    if (!hasActiveProposal && !hasActiveMatch) {
      // Fetch this user's profile + preferences
      const [profileRes, prefsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
      ]);

      if (profileRes.data && prefsRes.data) {
        const myProfile = profileRes.data;
        const myPrefs = prefsRes.data;

        // Early return if my profile is not completed
        if (!myProfile.profile_completed) {
          return Response.json({
            status: 'profile_incomplete',
            proposal_created: false,
            message: 'Profile must be completed before entering matchmaking pool',
          }, { headers: corsHeaders });
        }

        // Early return if user opted to only match others
        if (myProfile.matchmaking_only) {
          return Response.json({
            status: 'matchmaking_only',
            proposal_created: false,
            message: 'User opted to match others only — not entering matching pool',
          }, { headers: corsHeaders });
        }

        // Early return if user is paused — they can still vote but shouldn't enter matchmaking
        if (myProfile.is_paused) {
          return Response.json({
            status: 'profile_paused',
            proposal_created: false,
            message: 'Profile is paused — not entering matchmaking pool',
          }, { headers: corsHeaders });
        }

        // Fetch all other eligible profiles (not paused, profile completed)
        const { data: allProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('is_paused', false)
          .eq('profile_completed', true)
          .neq('user_id', userId);

        const otherIds = (allProfiles || []).map((p: { user_id: string }) => p.user_id).filter(Boolean);

        const { data: allPrefs } = await supabase
          .from('user_preferences')
          .select('*')
          .in('user_id', otherIds);

        const prefsMap: Record<string, Record<string, unknown>> = {};
        for (const p of (allPrefs || [])) {
          prefsMap[p.user_id] = p;
        }

        // Only users with preferences (completed onboarding)
        const eligibleOthers = (allProfiles || []).filter((p: { user_id: string }) => prefsMap[p.user_id]);

        if (eligibleOthers.length > 0) {
          // Build exclusion sets (same pattern as generate-proposals)
          const [existingRes, activeProposalRes, blockedRes, matchesRes, friendshipsRes] = await Promise.all([
            supabase.from('proposals').select('user_a_id, user_b_id, status').in('status', ['rejected', 'declined', 'passed_to_match']),
            supabase.from('proposals').select('user_a_id, user_b_id').in('status', ['pending', 'deciding']),
            supabase.from('blocked_users').select('user_id, blocked_user_id'),
            supabase.from('matches').select('user_id_1, user_id_2').in('status', ['pending', 'accepted', 'active']),
            supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted'),
          ]);

          const existingPairs = new Set<string>();
          for (const row of (existingRes.data || [])) {
            const key = [row.user_a_id, row.user_b_id].sort().join('|');
            existingPairs.add(key);
          }

          const usersWithActiveProposal = new Set<string>();
          for (const row of (activeProposalRes.data || [])) {
            usersWithActiveProposal.add(row.user_a_id);
            usersWithActiveProposal.add(row.user_b_id);
          }

          const blockedPairs = new Set<string>();
          for (const row of (blockedRes.data || [])) {
            const key = [row.user_id, row.blocked_user_id].sort().join('|');
            blockedPairs.add(key);
          }

          const matchedUsers = new Set<string>();
          const matchPairs = new Set<string>();
          for (const row of (matchesRes.data || [])) {
            const key = [row.user_id_1, row.user_id_2].sort().join('|');
            matchPairs.add(key);
            matchedUsers.add(row.user_id_1);
            matchedUsers.add(row.user_id_2);
          }

          const friendPairs = new Set<string>();
          for (const row of (friendshipsRes.data || [])) {
            const key = [row.user_id, row.friend_id].sort().join('|');
            friendPairs.add(key);
          }

          // Fetch deep question answers for scoring
          const candidateIds = eligibleOthers.map((p: { user_id: string }) => p.user_id);
          const { data: deepAnswers } = await supabase
            .from('deep_question_answers')
            .select('user_id, answers')
            .in('user_id', [userId, ...candidateIds]);

          const deepMap: Record<string, Array<{ question_id: string; answer_text: string }>> = {};
          for (const row of (deepAnswers || [])) {
            if (row.answers && typeof row.answers === 'object') {
              if (Array.isArray(row.answers)) {
                deepMap[row.user_id] = row.answers;
              } else {
                deepMap[row.user_id] = Object.entries(row.answers as Record<string, unknown>).map(([qid, answer]) => ({
                  question_id: qid,
                  answer_text: typeof answer === 'string' ? answer : (answer as Record<string, unknown> | null)?.answer_text as string || '',
                }));
              }
            }
          }

          // New user boost for the requesting user
          const myCreatedMs = myProfile.created_at ? new Date(myProfile.created_at as string).getTime() : 0;
          const myDaysOld = (Date.now() - myCreatedMs) / (24 * 60 * 60 * 1000);
          const myNewBoost = myDaysOld <= 3 ? 5 : myDaysOld <= 7 ? 3 : myDaysOld <= 14 ? 2 : 0;

          // Starvation boost: check how long since this user's last proposal
          const { data: myLastProposal } = await supabase
            .from('proposals')
            .select('created_at')
            .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(1);

          let myStarvationBoost = 0;
          if (!myLastProposal || myLastProposal.length === 0) {
            myStarvationBoost = 8; // Never had a proposal
          } else {
            const daysSince = (Date.now() - new Date(myLastProposal[0].created_at).getTime()) / (24 * 60 * 60 * 1000);
            if (daysSince >= 3) {
              myStarvationBoost = Math.min(Math.floor((daysSince - 2) * 2), 8);
            }
          }

          // Score candidates
          let bestCandidate: { profile: { user_id: string; [key: string]: unknown }; score: number; category_scores: Record<string, number>; weighted_scores: Record<string, number> } | null = null;
          let bestScore = -1;

          for (const other of eligibleOthers) {
            // Skip if other user has active proposal or match
            if (usersWithActiveProposal.has(other.user_id) || matchedUsers.has(other.user_id)) {
              continue;
            }

            const pairKey = [userId, other.user_id].sort().join('|');
            if (existingPairs.has(pairKey) || blockedPairs.has(pairKey) || matchPairs.has(pairKey) || friendPairs.has(pairKey)) {
              continue;
            }

            const otherPrefs = prefsMap[other.user_id];
            if (!passesBasicFilter(myProfile, myPrefs, other, otherPrefs)) {
              continue;
            }

            const result = calculateCompatibility(
              myProfile, myPrefs, other, otherPrefs,
              null,
              deepMap[userId] || [],
              deepMap[other.user_id] || [],
            );

            // Apply new user boost (highest of the two users)
            const otherCreatedMs = other.created_at ? new Date(other.created_at as string).getTime() : 0;
            const otherDaysOld = (Date.now() - otherCreatedMs) / (24 * 60 * 60 * 1000);
            const otherNewBoost = otherDaysOld <= 3 ? 5 : otherDaysOld <= 7 ? 3 : otherDaysOld <= 14 ? 2 : 0;
            result.total_score += Math.max(myNewBoost, otherNewBoost);

            // Apply starvation boost (average of both)
            result.total_score += myStarvationBoost / 2;

            if (result.total_score >= MIN_COMPATIBILITY_SCORE && result.total_score > bestScore) {
              bestScore = result.total_score;
              bestCandidate = {
                profile: other,
                score: result.total_score,
                category_scores: result.category_scores,
                weighted_scores: result.weighted_scores,
              };
            }
          }

          // Create proposal with best candidate
          if (bestCandidate) {
            const [aId, bId] = [userId, bestCandidate.profile.user_id].sort();
            const now = new Date().toISOString();
            const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

            const displayScore = Math.floor(Math.random() * 30) + 70; // Random 70-99
            const { error: insertErr } = await supabase
              .from('proposals')
              .insert({
                user_a_id: aId,
                user_b_id: bId,
                status: 'pending',
                compatibility_score: displayScore,
                category_scores: bestCandidate.category_scores,
                pool_yes_votes: 0,
                pool_no_votes: 0,
                friend_yes_votes: 0,
                friend_no_votes: 0,
                user_a_decision: 'pending',
                user_b_decision: 'pending',
                voting_started_at: now,
                voting_expires_at: expiresAt,
                created_at: now,
                updated_at: now,
              });

            if (!insertErr) {
              proposalCreated = true;
              compatibilityScore = bestCandidate.score;
            } else if (insertErr.code === '23505') {
              // Duplicate — race condition with cron, safe to ignore
            } else {
              console.error('Failed to create proposal:', insertErr.message);
            }
          }
        }
      }
    }

    // ── Phase B: Backfill voting gates for ALL users ─────────────────

    // Fetch all pending proposals
    const { data: pendingProposals } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id')
      .eq('status', 'pending');

    if (!pendingProposals || pendingProposals.length === 0) {
      return Response.json({
        status: proposalCreated ? 'proposal_created' : 'no_proposals',
        proposal_created: proposalCreated,
        compatibility_score: compatibilityScore,
        voters_backfilled: 0,
      }, { headers: corsHeaders });
    }

    // Fetch all existing pool_vote_assignments for pending proposals
    const pendingIds = pendingProposals.map(p => p.id);
    const { data: allAssignments } = await supabase
      .from('pool_vote_assignments')
      .select('proposal_id, voter_id, has_voted')
      .in('proposal_id', pendingIds);

    // Build lookup: proposal -> set of assigned voter IDs
    const proposalAssignments: Record<string, Set<string>> = {};
    // Build lookup: voter -> count of unvoted assignments
    const voterUnvotedCount: Record<string, number> = {};

    for (const a of (allAssignments || [])) {
      if (!proposalAssignments[a.proposal_id]) {
        proposalAssignments[a.proposal_id] = new Set();
      }
      proposalAssignments[a.proposal_id].add(a.voter_id);

      if (!a.has_voted) {
        voterUnvotedCount[a.voter_id] = (voterUnvotedCount[a.voter_id] || 0) + 1;
      }
    }

    // Fetch all eligible users (not paused, have preferences)
    const { data: allUsers } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('is_paused', false);

    const { data: allUserPrefs } = await supabase
      .from('user_preferences')
      .select('user_id');

    const usersWithPrefs = new Set((allUserPrefs || []).map(p => p.user_id));
    const eligibleVoters = (allUsers || [])
      .map(u => u.user_id)
      .filter(id => usersWithPrefs.has(id));

    // Fetch friendships for exclusion (friends vote through friend channel, not pool)
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted');

    const friendsMap: Record<string, Set<string>> = {};
    for (const row of (friendships || [])) {
      if (!friendsMap[row.user_id]) friendsMap[row.user_id] = new Set();
      if (!friendsMap[row.friend_id]) friendsMap[row.friend_id] = new Set();
      friendsMap[row.user_id].add(row.friend_id);
      friendsMap[row.friend_id].add(row.user_id);
    }

    // Fetch existing votes so we don't assign proposals a user already voted on
    const { data: existingVotes } = await supabase
      .from('proposal_votes')
      .select('proposal_id, voter_id')
      .in('proposal_id', pendingIds);

    const votedOn: Record<string, Set<string>> = {};
    for (const v of (existingVotes || [])) {
      if (!votedOn[v.voter_id]) votedOn[v.voter_id] = new Set();
      votedOn[v.voter_id].add(v.proposal_id);
    }

    let totalBackfilled = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const insertBatch: Array<{ proposal_id: string; voter_id: string; assignment_date: string; has_voted: boolean }> = [];

    // For each voter with < MAX_VOTING_GATE unvoted assignments, find proposals to assign
    for (const voterId of eligibleVoters) {
      const currentUnvoted = voterUnvotedCount[voterId] || 0;
      if (currentUnvoted >= MAX_VOTING_GATE) continue;

      let slotsToFill = MAX_VOTING_GATE - currentUnvoted;

      for (const proposal of pendingProposals) {
        if (slotsToFill <= 0) break;

        // Skip if voter is a participant
        if (proposal.user_a_id === voterId || proposal.user_b_id === voterId) continue;

        // Skip if already assigned
        if (proposalAssignments[proposal.id]?.has(voterId)) continue;

        // Skip if already voted on this proposal
        if (votedOn[voterId]?.has(proposal.id)) continue;

        // Skip if voter is friends with either participant (friends vote through friend channel)
        const voterFriends = friendsMap[voterId] || new Set();
        if (voterFriends.has(proposal.user_a_id) || voterFriends.has(proposal.user_b_id)) continue;

        // Skip if proposal already has MAX_POOL_VOTES
        const assignedCount = proposalAssignments[proposal.id]?.size || 0;
        if (assignedCount >= MAX_POOL_VOTES) continue;

        // Assign!
        insertBatch.push({
          proposal_id: proposal.id,
          voter_id: voterId,
          assignment_date: todayStr,
          has_voted: false,
        });

        // Track locally so subsequent iterations see this assignment
        if (!proposalAssignments[proposal.id]) {
          proposalAssignments[proposal.id] = new Set();
        }
        proposalAssignments[proposal.id].add(voterId);
        slotsToFill--;
        totalBackfilled++;
      }
    }

    // Bulk insert all new assignments
    if (insertBatch.length > 0) {
      const { error: insertErr } = await supabase
        .from('pool_vote_assignments')
        .insert(insertBatch);

      if (insertErr) {
        console.error('Failed to insert backfill assignments:', insertErr.message);
        totalBackfilled = 0;
      }
    }

    return Response.json({
      status: proposalCreated ? 'proposal_created' : 'backfill_only',
      proposal_created: proposalCreated,
      compatibility_score: compatibilityScore,
      voters_backfilled: totalBackfilled,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('generate-proposal-for-user error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
