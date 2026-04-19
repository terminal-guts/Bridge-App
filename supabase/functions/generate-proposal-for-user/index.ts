import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { calculateCompatibility, passesBasicFilter } from '../_shared/scoring.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { REPAIR_AFTER_DAYS } from '../_shared/constants.ts';

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

        // Early return if user is paused — they can still vote but shouldn't enter matchmaking
        if (myProfile.is_paused) {
          return Response.json({
            status: 'profile_paused',
            proposal_created: false,
            message: 'Profile is paused — not entering matchmaking pool',
          }, { headers: corsHeaders });
        }

        // Fetch all other eligible profiles (not paused, profile completed, daters only)
        // Matchmakers are excluded — they facilitate but are never proposed as candidates.
        const { data: allProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('is_paused', false)
          .eq('profile_completed', true)
          .neq('user_id', userId)
          .or('role.eq.dater,role.is.null');

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
          // Build exclusion sets (same pattern as generate-proposals).
          // Permanent blocks: declined / passed_to_match → never re-propose.
          // Temporary blocks: rejected / expired within last REPAIR_AFTER_DAYS.
          const [permanentRes, temporaryRes, activeProposalRes, blockedRes, matchesRes, friendshipsRes] = await Promise.all([
            supabase.from('proposals').select('user_a_id, user_b_id').in('status', ['declined', 'passed_to_match']),
            supabase.from('proposals').select('user_a_id, user_b_id, rejected_at, expired_at, status').in('status', ['rejected', 'expired']),
            supabase.from('proposals').select('user_a_id, user_b_id').in('status', ['pending', 'deciding']),
            supabase.from('blocked_users').select('user_id, blocked_user_id'),
            supabase.from('matches').select('user_id_1, user_id_2').in('status', ['pending', 'accepted', 'active']),
            supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted'),
          ]);

          const existingPairs = new Set<string>();
          for (const row of (permanentRes.data || [])) {
            const key = [row.user_a_id, row.user_b_id].sort().join('|');
            existingPairs.add(key);
          }
          const cutoffMs = Date.now() - (REPAIR_AFTER_DAYS * 24 * 60 * 60 * 1000);
          for (const row of (temporaryRes.data || [])) {
            const tsStr = row.rejected_at || row.expired_at;
            const tsMs = tsStr ? new Date(tsStr).getTime() : 0;
            if (!tsMs || tsMs > cutoffMs) {
              const key = [row.user_a_id, row.user_b_id].sort().join('|');
              existingPairs.add(key);
            }
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

            // Cap compatibility score at 100 (boosts can push it past 100).
            result.total_score = Math.min(100, result.total_score);

            // No minimum score floor — hard blockers already filter above.
            // Community voting is the quality gate.
            if (result.total_score > bestScore) {
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
            const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

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

    // NOTE: Phase B (voter-assignment backfill) removed under gate-overhaul-v2.
    // The gate is now computed on-the-fly from proposal_votes history — no
    // per-user-per-proposal pool_vote_assignments rows are needed.

    return Response.json({
      status: proposalCreated ? 'proposal_created' : 'no_proposals',
      proposal_created: proposalCreated,
      compatibility_score: compatibilityScore,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('generate-proposal-for-user error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
