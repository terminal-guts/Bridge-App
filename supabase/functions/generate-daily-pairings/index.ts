import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { calculateCompatibility, passesBasicFilter } from '../_shared/scoring.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RECENCY_PENALTY = 15;
const RECENCY_WINDOW_DAYS = 7;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const midnightTomorrow = new Date();
    midnightTomorrow.setUTCDate(midnightTomorrow.getUTCDate() + 1);
    midnightTomorrow.setUTCHours(0, 0, 0, 0);
    const expiresAt = midnightTomorrow.toISOString();

    // 1. Fetch eligible users (not paused, have preferences)
    const { data: profiles, error: profilesErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_paused', false);

    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length < 2) {
      return Response.json({
        status: 'insufficient_users',
        date: today,
        eligible_users: profiles?.length || 0,
        pairings_created: 0,
      }, { headers: corsHeaders });
    }

    const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);

    const { data: allPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .in('user_id', userIds);

    const prefsMap: Record<string, any> = {};
    for (const p of (allPrefs || [])) prefsMap[p.user_id] = p;

    const eligibleProfiles = profiles.filter((p: any) => prefsMap[p.user_id]);

    if (eligibleProfiles.length < 2) {
      return Response.json({
        status: 'insufficient_users',
        date: today,
        eligible_users: eligibleProfiles.length,
        pairings_created: 0,
      }, { headers: corsHeaders });
    }

    // 2. Fetch exclusion sets + existing pairings in parallel
    const [existingPairingsRes, blockedRes, matchesRes] = await Promise.all([
      supabase.from('daily_pairings').select('user_id').eq('pairing_date', today),
      supabase.from('blocked_users').select('user_id, blocked_user_id'),
      supabase.from('matches').select('user_id_1, user_id_2').in('status', ['active', 'pending', 'accepted']),
    ]);

    const alreadyPaired = new Set((existingPairingsRes.data || []).map((p: any) => p.user_id));

    const blockedPairs = new Set<string>();
    for (const row of (blockedRes.data || [])) {
      blockedPairs.add([row.user_id, row.blocked_user_id].sort().join('|'));
    }

    const matchPairs = new Set<string>();
    const matchedUsers = new Set<string>();
    for (const row of (matchesRes.data || [])) {
      matchPairs.add([row.user_id_1, row.user_id_2].sort().join('|'));
      matchedUsers.add(row.user_id_1);
      matchedUsers.add(row.user_id_2);
    }

    // Exclude users who already have a pairing today OR have an active match
    const unpaired = eligibleProfiles.filter((p: any) =>
      !alreadyPaired.has(p.user_id) && !matchedUsers.has(p.user_id)
    );

    if (unpaired.length < 2) {
      return Response.json({
        status: 'all_users_paired',
        date: today,
        eligible_users: eligibleProfiles.length,
        pairings_created: 0,
      }, { headers: corsHeaders });
    }

    // 3. Fetch recent pairings for recency penalty
    const recencyDate = new Date();
    recencyDate.setUTCDate(recencyDate.getUTCDate() - RECENCY_WINDOW_DAYS);
    const recencyDateStr = recencyDate.toISOString().split('T')[0];

    const { data: recentPairings } = await supabase
      .from('daily_pairings')
      .select('user_id, partner_id')
      .gte('pairing_date', recencyDateStr);

    const recentPairSet = new Set<string>();
    for (const row of (recentPairings || [])) {
      recentPairSet.add([row.user_id, row.partner_id].sort().join('|'));
    }

    // 5. Fetch deep question answers
    const unpairedIds = unpaired.map((p: any) => p.user_id);
    const { data: deepAnswers } = await supabase
      .from('deep_question_answers')
      .select('user_id, answers')
      .in('user_id', unpairedIds);

    const deepMap: Record<string, any[]> = {};
    for (const row of (deepAnswers || [])) {
      if (row.answers && typeof row.answers === 'object') {
        if (Array.isArray(row.answers)) {
          deepMap[row.user_id] = row.answers;
        } else {
          deepMap[row.user_id] = Object.entries(row.answers).map(([qid, answer]) => ({
            question_id: qid,
            answer_text: typeof answer === 'string' ? answer : (answer as any)?.answer_text || '',
          }));
        }
      }
    }

    // 6. Score all viable pairs
    type ScoredEdge = {
      userA: string; userB: string;
      score: number;
      categoryScores: Record<string, number>;
      weightedScores: Record<string, number>;
    };

    const edges: ScoredEdge[] = [];

    for (let i = 0; i < unpaired.length; i++) {
      for (let j = i + 1; j < unpaired.length; j++) {
        const a = unpaired[i];
        const b = unpaired[j];
        const pairKey = [a.user_id, b.user_id].sort().join('|');

        // Skip blocked or already matched
        if (blockedPairs.has(pairKey) || matchPairs.has(pairKey)) continue;

        const pA = prefsMap[a.user_id] || {};
        const pB = prefsMap[b.user_id] || {};

        if (!passesBasicFilter(a, pA, b, pB)) continue;

        const deepA = deepMap[a.user_id] || [];
        const deepB = deepMap[b.user_id] || [];
        const result = calculateCompatibility(a, pA, b, pB, null, deepA, deepB);

        let adjustedScore = result.total_score;

        // Apply recency penalty
        if (recentPairSet.has(pairKey)) {
          adjustedScore -= RECENCY_PENALTY;
        }

        if (adjustedScore > 0) {
          edges.push({
            userA: a.user_id,
            userB: b.user_id,
            score: adjustedScore,
            categoryScores: result.category_scores,
            weightedScores: result.weighted_scores,
          });
        }
      }
    }

    // 7. Greedy maximum-weight matching
    edges.sort((a, b) => b.score - a.score);

    const matched = new Set<string>();
    const pairings: ScoredEdge[] = [];

    for (const edge of edges) {
      if (matched.has(edge.userA) || matched.has(edge.userB)) continue;
      pairings.push(edge);
      matched.add(edge.userA);
      matched.add(edge.userB);
    }

    if (pairings.length === 0) {
      return Response.json({
        status: 'no_viable_pairings',
        date: today,
        eligible_users: unpaired.length,
        pairings_created: 0,
        unmatched_users: unpaired.length,
      }, { headers: corsHeaders });
    }

    // 8. Insert two rows per pair (one per direction)
    const now = new Date().toISOString();
    const rows: any[] = [];

    for (const p of pairings) {
      const baseRow = {
        pairing_date: today,
        compatibility_score: p.score,
        category_scores: p.categoryScores,
        weighted_scores: p.weightedScores,
        seen: false,
        proposal_created: false,
        created_at: now,
        expires_at: expiresAt,
      };

      rows.push({ ...baseRow, user_id: p.userA, partner_id: p.userB });
      rows.push({ ...baseRow, user_id: p.userB, partner_id: p.userA });
    }

    const { error: insertErr } = await supabase
      .from('daily_pairings')
      .insert(rows);

    if (insertErr) throw insertErr;

    const scores = pairings.map(p => p.score);

    return Response.json({
      status: 'success',
      date: today,
      eligible_users: unpaired.length,
      pairings_created: pairings.length,
      avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
      top_score: Math.round(Math.max(...scores) * 10) / 10,
      min_score: Math.round(Math.min(...scores) * 10) / 10,
      unmatched_users: unpaired.length - matched.size,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('generate-daily-pairings error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
