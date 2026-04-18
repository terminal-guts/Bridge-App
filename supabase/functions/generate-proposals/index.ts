import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { calculateCompatibility, passesBasicFilter } from '../_shared/scoring.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import { REPAIR_AFTER_DAYS } from '../_shared/constants.ts';

const MAX_PROPOSALS_PER_RUN = 50;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const forbidden = await requireServiceRole(req);
  if (forbidden) return forbidden;

  try {
    const body = await req.json().catch(() => ({}));
    const maxProposals = Math.min(body.max_proposals || MAX_PROPOSALS_PER_RUN, MAX_PROPOSALS_PER_RUN);
    const supabase = createAdminClient();

    // ── 1. Fetch eligible users (not paused, profile completed, wants to be matched) ──
    // Only daters (role = 'dater' or role IS NULL for legacy accounts) enter the dating pool.
    // Matchmakers are excluded — they facilitate proposals but are never proposed themselves.
    const { data: profiles, error: profilesErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_paused', false)
      .eq('is_suspended', false)
      .eq('profile_completed', true)
      .or('matchmaking_only.is.null,matchmaking_only.eq.false')
      .or('role.eq.dater,role.is.null');

    if (profilesErr) throw profilesErr;

    // Active profiles for voter eligibility — excludes demo/reviewer accounts
    // and users still in onboarding.  Matchmakers ARE included as voters.
    const { data: allActiveProfiles, error: activeErr } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('is_paused', false)
      .eq('is_suspended', false)
      .eq('profile_completed', true);

    if (activeErr) throw activeErr;
    if (!profiles || profiles.length < 2) {
      return Response.json({
        status: 'insufficient_users',
        eligible_users: profiles?.length || 0,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    const userIds = profiles.map((p: { user_id: string }) => p.user_id).filter(Boolean);

    // 2. Fetch preferences (only users with preferences are eligible)
    const { data: allPrefs, error: prefsErr } = await supabase
      .from('user_preferences')
      .select('*')
      .in('user_id', userIds);

    if (prefsErr) throw prefsErr;

    const prefsMap: Record<string, Record<string, unknown>> = {};
    for (const p of (allPrefs || [])) {
      prefsMap[p.user_id] = p;
    }

    // Filter to users who have preferences (completed onboarding)
    const eligibleProfiles = profiles.filter((p: { user_id: string }) => prefsMap[p.user_id]);

    if (eligibleProfiles.length < 2) {
      return Response.json({
        status: 'insufficient_users',
        eligible_users: eligibleProfiles.length,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    // 3. Fetch exclusion sets in parallel
    // Split proposal history into permanent vs temporary blocks:
    //   permanent: declined (either side said no after community accepted) or
    //              passed_to_match (proposal already led to a match)
    //   temporary: rejected or expired during the community-pending phase —
    //              re-eligible after REPAIR_AFTER_DAYS.
    const [permanentRes, temporaryRes, activeProposalRes, blockedRes, matchesRes, friendshipsRes] = await Promise.all([
      supabase.from('proposals').select('user_a_id, user_b_id')
        .in('status', ['declined', 'passed_to_match']),
      supabase.from('proposals').select('user_a_id, user_b_id, rejected_at, expired_at, status')
        .in('status', ['rejected', 'expired']),
      // Users who already have an active proposal (one at a time)
      supabase.from('proposals').select('user_a_id, user_b_id')
        .in('status', ['pending', 'deciding']),
      supabase.from('blocked_users').select('user_id, blocked_user_id'),
      supabase.from('matches').select('user_id_1, user_id_2').in('status', ['pending', 'accepted', 'active']),
      supabase.from('friends').select('user_id, friend_id').eq('status', 'accepted'),
    ]);

    // Permanent blocks — these pairs never re-propose.
    const existingPairs = new Set<string>();
    for (const row of (permanentRes.data || [])) {
      const key = [row.user_a_id, row.user_b_id].sort().join('|');
      existingPairs.add(key);
    }

    // Temporary blocks — rejected/expired pairs within the last REPAIR_AFTER_DAYS
    // are still blocked.  Older than that → re-eligible.
    const cutoffMs = Date.now() - (REPAIR_AFTER_DAYS * 24 * 60 * 60 * 1000);
    for (const row of (temporaryRes.data || [])) {
      const tsStr = row.rejected_at || row.expired_at;
      const tsMs = tsStr ? new Date(tsStr).getTime() : 0;
      // If no timestamp, conservatively block (treat as still-in-window).
      if (!tsMs || tsMs > cutoffMs) {
        const key = [row.user_a_id, row.user_b_id].sort().join('|');
        existingPairs.add(key);
      }
    }

    // Users who already have an active proposal — cannot get a new one
    const usersWithActiveProposal = new Set<string>();
    for (const row of (activeProposalRes.data || [])) {
      usersWithActiveProposal.add(row.user_a_id);
      usersWithActiveProposal.add(row.user_b_id);
    }

    const blockedPairs = new Set<string>();
    // blockedByUser[X] = set of users X has blocked or been blocked by.
    // Used to exclude voters who have any block relationship with either subject.
    const blockedByUser: Record<string, Set<string>> = {};
    for (const row of (blockedRes.data || [])) {
      const key = [row.user_id, row.blocked_user_id].sort().join('|');
      blockedPairs.add(key);
      if (!blockedByUser[row.user_id]) blockedByUser[row.user_id] = new Set();
      if (!blockedByUser[row.blocked_user_id]) blockedByUser[row.blocked_user_id] = new Set();
      blockedByUser[row.user_id].add(row.blocked_user_id);
      blockedByUser[row.blocked_user_id].add(row.user_id);
    }

    // Users with active matches — excluded from matchmaking entirely
    const matchedUsers = new Set<string>();
    const matchPairs = new Set<string>();
    for (const row of (matchesRes.data || [])) {
      const key = [row.user_id_1, row.user_id_2].sort().join('|');
      matchPairs.add(key);
      matchedUsers.add(row.user_id_1);
      matchedUsers.add(row.user_id_2);
    }

    // friendsMap: used only for suggestion/boost lookups.  Friends of user_a/user_b
    // are NO LONGER excluded from being assigned as voters — the gate filters them
    // at display time and falls back to friend proposals when non-friend ones run out.
    const friendsMap: Record<string, Set<string>> = {};
    for (const row of (friendshipsRes.data || [])) {
      if (!friendsMap[row.user_id]) friendsMap[row.user_id] = new Set();
      if (!friendsMap[row.friend_id]) friendsMap[row.friend_id] = new Set();
      friendsMap[row.user_id].add(row.friend_id);
      friendsMap[row.friend_id].add(row.user_id);
    }

    // Declare createdProposals to accumulate all proposals created this cycle.
    const createdProposals: Array<{ id: string; user_a_id: string; user_b_id: string; status: string }> = [];

    // ── Step 0: Friend suggestion housekeeping ──
    // 0a expires stale suggestions; 0b builds a boost set used during scoring.

    // 0a. Expire stale suggestions (queued or stashed but past their TTL)
    const { error: expireErr } = await supabase
      .from('friend_suggestions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('status', ['queued', 'stashed'])
      .lt('expires_at', new Date().toISOString());

    if (expireErr) {
      console.warn('Warning: could not expire stale friend suggestions:', expireErr.message);
    }

    // 0b. Fetch all still-queued suggestions to build a boost set for the algorithm
    const { data: queuedSuggestions, error: suggestionsErr } = await supabase
      .from('friend_suggestions')
      .select('user_a_id, user_b_id')
      .eq('status', 'queued')
      .gt('expires_at', new Date().toISOString());

    if (suggestionsErr) {
      console.warn('Warning: could not fetch queued friend suggestions:', suggestionsErr.message);
    }

    // Build a set of suggested pair keys so the scoring step can apply a compatibility boost
    const suggestedPairs = new Set<string>(
      (queuedSuggestions || []).map((s: { user_a_id: string; user_b_id: string }) =>
        [s.user_a_id, s.user_b_id].sort().join('|')
      )
    );

    // 4. Fetch deep question answers for scoring
    const { data: deepAnswers } = await supabase
      .from('deep_question_answers')
      .select('user_id, answers')
      .in('user_id', userIds);

    const deepMap: Record<string, Array<{ question_id: string; answer_text: string }>> = {};
    for (const row of (deepAnswers || [])) {
      if (row.answers && typeof row.answers === 'object') {
        // answers is JSONB — could be an array or an object with question_id keys
        if (Array.isArray(row.answers)) {
          deepMap[row.user_id] = row.answers;
        } else {
          // Convert object format to array format
          deepMap[row.user_id] = Object.entries(row.answers as Record<string, unknown>).map(([qid, answer]) => ({
            question_id: qid,
            answer_text: typeof answer === 'string' ? answer : (answer as Record<string, unknown> | null)?.answer_text as string || '',
          }));
        }
      }
    }

    // 4b. Starvation fairness: count consecutive cycles without a proposal per user
    // A user is "starved" if they have no proposals in recent history
    const { data: recentProposals } = await supabase
      .from('proposals')
      .select('user_a_id, user_b_id, created_at')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const lastProposalDate: Record<string, number> = {};
    for (const row of (recentProposals || [])) {
      const tsMs = new Date(row.created_at).getTime();
      if (!lastProposalDate[row.user_a_id] || tsMs > lastProposalDate[row.user_a_id]) {
        lastProposalDate[row.user_a_id] = tsMs;
      }
      if (!lastProposalDate[row.user_b_id] || tsMs > lastProposalDate[row.user_b_id]) {
        lastProposalDate[row.user_b_id] = tsMs;
      }
    }

    // Build new-user set (created_at within last 7 days) and starvation boost map
    const nowMs = Date.now();
    const newUserBoost: Record<string, number> = {};
    const starvationBoost: Record<string, number> = {};
    for (const p of eligibleProfiles) {
      const uid = p.user_id as string;
      // New user boost: +5 for first 3 days, +3 for days 4-7, +2 for days 8-14
      const createdMs = p.created_at ? new Date(p.created_at as string).getTime() : 0;
      const daysOld = (nowMs - createdMs) / (24 * 60 * 60 * 1000);
      if (daysOld <= 3) newUserBoost[uid] = 5;
      else if (daysOld <= 7) newUserBoost[uid] = 3;
      else if (daysOld <= 14) newUserBoost[uid] = 2;

      // Starvation boost: +2 per day without proposal (max +8, kicks in after 3 days)
      const lastTs = lastProposalDate[uid];
      if (!lastTs) {
        // Never had a proposal — max starvation boost
        starvationBoost[uid] = 8;
      } else {
        const daysSince = (nowMs - lastTs) / (24 * 60 * 60 * 1000);
        if (daysSince >= 3) {
          starvationBoost[uid] = Math.min(Math.floor((daysSince - 2) * 2), 8);
        }
      }
    }

    // 5. Generate candidate pairs with pre-filtering
    const candidates: Array<{
      profileA: Record<string, unknown>; prefsA: Record<string, unknown>; profileB: Record<string, unknown>; prefsB: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < eligibleProfiles.length; i++) {
      for (let j = i + 1; j < eligibleProfiles.length; j++) {
        const a = eligibleProfiles[i];
        const b = eligibleProfiles[j];

        // Skip users who already have an active proposal, match, or queued friend suggestion
        if (usersWithActiveProposal.has(a.user_id) || usersWithActiveProposal.has(b.user_id)) {
          continue;
        }
        if (matchedUsers.has(a.user_id) || matchedUsers.has(b.user_id)) {
          continue;
        }

        const pairKey = [a.user_id, b.user_id].sort().join('|');

        // Skip excluded pairs (permanent block, temporary block within 45 days, blocked users, active match)
        if (existingPairs.has(pairKey) || blockedPairs.has(pairKey) || matchPairs.has(pairKey)) {
          continue;
        }

        const pA = prefsMap[a.user_id] || {};
        const pB = prefsMap[b.user_id] || {};

        // Quick gender/age filter
        if (passesBasicFilter(a, pA, b, pB)) {
          candidates.push({ profileA: a, prefsA: pA, profileB: b, prefsB: pB });
        }
      }
    }

    if (candidates.length === 0 && createdProposals.length === 0) {
      return Response.json({
        status: 'no_candidates',
        eligible_users: eligibleProfiles.length,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    // 6. Score and rank pairs
    const scored: Array<{
      user_a_id: string; user_b_id: string;
      compatibility_score: number;
      category_scores: Record<string, number>;
      weighted_scores: Record<string, number>;
    }> = [];

    for (const { profileA, prefsA, profileB, prefsB } of candidates) {
      const deepA = deepMap[profileA.user_id] || [];
      const deepB = deepMap[profileB.user_id] || [];

      const result = calculateCompatibility(profileA, prefsA, profileB, prefsB, null, deepA, deepB);

      // Apply new user boost (highest of the two users)
      const aNewBoost = newUserBoost[profileA.user_id as string] || 0;
      const bNewBoost = newUserBoost[profileB.user_id as string] || 0;
      result.total_score += Math.max(aNewBoost, bNewBoost);

      // Apply starvation fairness boost (sum of both users — both deserve proposals)
      const aStarve = starvationBoost[profileA.user_id as string] || 0;
      const bStarve = starvationBoost[profileB.user_id as string] || 0;
      result.total_score += (aStarve + bStarve) / 2;

      // Apply friend suggestion boost: if a matchmaker queued this pair, multiply score by 1.25
      const pairKey = [profileA.user_id, profileB.user_id].sort().join('|');
      if (suggestedPairs.has(pairKey)) {
        result.total_score *= 1.25;
      }

      // No minimum score floor — hard blockers (gender, age, prior pairing,
      // active proposal/match, blocked users) already filter in passesBasicFilter
      // and the exclusion sets above. Community voting is the quality gate.
      // Enforce user_a_id < user_b_id
      const [uA, uB] = profileA.user_id < profileB.user_id
        ? [profileA.user_id, profileB.user_id]
        : [profileB.user_id, profileA.user_id];

      scored.push({
        user_a_id: uA,
        user_b_id: uB,
        compatibility_score: result.total_score,
        category_scores: result.category_scores,
        weighted_scores: result.weighted_scores,
      });
    }

    scored.sort((a, b) => b.compatibility_score - a.compatibility_score);

    // Exclusive allocation: each user appears in at most one proposal per cycle
    const allocated = new Set<string>();
    const topPairs: typeof scored = [];
    for (const pair of scored) {
      if (allocated.has(pair.user_a_id) || allocated.has(pair.user_b_id)) {
        continue; // User already allocated in this cycle
      }
      topPairs.push(pair);
      allocated.add(pair.user_a_id);
      allocated.add(pair.user_b_id);
      if (topPairs.length >= maxProposals) break;
    }

    if (topPairs.length === 0 && createdProposals.length === 0) {
      return Response.json({
        status: 'no_viable_matches',
        eligible_users: eligibleProfiles.length,
        candidates_filtered: candidates.length,
        proposals_created: 0,
      }, { headers: corsHeaders });
    }

    // 7. Create proposals in DB
    const now = new Date().toISOString();
    const votingExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    for (const pair of topPairs) {
      const { data: created, error: insertErr } = await supabase
        .from('proposals')
        .insert({
          user_a_id: pair.user_a_id,
          user_b_id: pair.user_b_id,
          status: 'pending',
          compatibility_score: pair.compatibility_score,
          category_scores: pair.category_scores,
          pool_yes_votes: 0,
          pool_no_votes: 0,
          friend_yes_votes: 0,
          friend_no_votes: 0,
          user_a_decision: 'pending',
          user_b_decision: 'pending',
          voting_started_at: now,
          voting_expires_at: votingExpires,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertErr) {
        // Skip duplicates (unique constraint violation)
        if (insertErr.code === '23505') continue;
        console.error(`Error creating proposal: ${insertErr.message}`);
        continue;
      }

      if (created) {
        createdProposals.push(created);
      }
    }

    // 8. Assign pool voters — every eligible community member gets an assignment
    // for every pending proposal (including friends of either subject; the gate
    // filters them at display time).  This is the core of the gate overhaul:
    // no per-proposal voter cap, no daily assignment cap.

    // Include ALL pending proposals (newly created + still-pending from prior cycles)
    const { data: existingPending } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id, status')
      .eq('status', 'pending');

    const createdIds = new Set(createdProposals.map(p => p.id));
    const allToAssign = [
      ...createdProposals,
      ...(existingPending || []).filter(p => !createdIds.has(p.id))
    ];

    // Fetch existing assignments so we only insert missing rows (idempotent).
    const proposalIds = allToAssign.map(p => p.id);
    let totalAssigned = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    if (proposalIds.length > 0) {
      const { data: existingAssignments } = await supabase
        .from('pool_vote_assignments')
        .select('proposal_id, voter_id')
        .in('proposal_id', proposalIds);

      const assignedMap = new Map<string, Set<string>>();
      for (const row of (existingAssignments || [])) {
        if (!assignedMap.has(row.proposal_id)) {
          assignedMap.set(row.proposal_id, new Set());
        }
        assignedMap.get(row.proposal_id)!.add(row.voter_id);
      }

      const insertBatch: Array<{ proposal_id: string; voter_id: string; assignment_date: string; has_voted: boolean }> = [];

      for (const proposal of allToAssign) {
        const ua = proposal.user_a_id;
        const ub = proposal.user_b_id;
        const already = assignedMap.get(proposal.id) || new Set();
        const blockedForA = blockedByUser[ua] || new Set();
        const blockedForB = blockedByUser[ub] || new Set();

        // Eligible voters:
        //   - not user_a, not user_b
        //   - no block relationship with either subject
        //   - not already assigned
        //   - profile_completed, not paused, not suspended (allActiveProfiles already enforces this)
        for (const u of (allActiveProfiles || [])) {
          const uid = u.user_id;
          if (uid === ua || uid === ub) continue;
          if (blockedForA.has(uid) || blockedForB.has(uid)) continue;
          if (already.has(uid)) continue;

          insertBatch.push({
            proposal_id: proposal.id,
            voter_id: uid,
            assignment_date: todayStr,
            has_voted: false,
          });
        }
      }

      // Insert in chunks to avoid hitting request-size limits.
      const CHUNK = 500;
      for (let i = 0; i < insertBatch.length; i += CHUNK) {
        const chunk = insertBatch.slice(i, i + CHUNK);
        const { error: assignErr } = await supabase
          .from('pool_vote_assignments')
          .insert(chunk);
        if (!assignErr) {
          totalAssigned += chunk.length;
        } else if (assignErr.code === '23505') {
          // Unique constraint — race with concurrent run.  Retry each row
          // individually so the rest of the chunk lands.
          for (const row of chunk) {
            const { error: singleErr } = await supabase
              .from('pool_vote_assignments')
              .insert(row);
            if (!singleErr) totalAssigned++;
            else if (singleErr.code !== '23505') {
              console.error(`Assignment insert error for proposal ${row.proposal_id}: ${singleErr.message}`);
            }
          }
        } else {
          console.error(`Assignment batch insert error: ${assignErr.message}`);
        }
      }
    }

    return Response.json({
      status: 'success',
      eligible_users: eligibleProfiles.length,
      candidates_filtered: candidates.length,
      proposals_created: createdProposals.length,
      proposals_assigned: allToAssign.length,
      pool_voters_assigned: totalAssigned,
      top_score: topPairs[0]?.compatibility_score || 0,
      avg_score: topPairs.length > 0
        ? Math.round(topPairs.reduce((s, p) => s + p.compatibility_score, 0) / topPairs.length * 10) / 10
        : 0,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('generate-proposals error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
