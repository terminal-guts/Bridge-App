import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import {
  FRIEND_VOTE_WEIGHT,
  MAX_PROPOSAL_DAYS,
  DECISION_DEADLINE_HOURS,
  THRESHOLD_SCHEDULE,
  CONFIRMATION_MIN_POOL_VOTES,
  CONFIRMATION_MIN_TOTAL_VOTES,
  CONFIRMATION_MIN_YES_VOTES,
  REJECTION_FLOOR_YES_RATE,
  REJECTION_FLOOR_MIN_VOTES,
  IMMEDIATE_CANCEL_POOL_VOTES,
} from '../_shared/constants.ts';

interface ProposalTiming {
  voting_started_at?: string | null;
  created_at?: string;
}

function getProposalDay(proposal: ProposalTiming): number {
  const created = proposal.voting_started_at || proposal.created_at;
  if (!created) return 1;
  const createdDate = new Date(created);
  const now = new Date();
  const delta = now.getTime() - createdDate.getTime();
  const day = Math.floor(delta / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(day, MAX_PROPOSAL_DAYS + 1);
}

function getCurrentThreshold(proposal: ProposalTiming): number | null {
  const day = getProposalDay(proposal);
  if (day > MAX_PROPOSAL_DAYS) return null;
  return THRESHOLD_SCHEDULE[day] ?? 0.55;
}

function calculateWeightedYesPct(weightedYes: number, weightedNo: number): number {
  const total = weightedYes + weightedNo;
  return total === 0 ? 0.0 : weightedYes / total;
}

function poolYesRate(poolYes: number, poolNo: number): number {
  const total = poolYes + poolNo;
  return total === 0 ? 0.0 : poolYes / total;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const forbidden = await requireServiceRole(req);
  if (forbidden) return forbidden;

  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch all proposals in 'pending' status (voting phase)
    const { data: proposals, error: fetchErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', 'pending');

    if (fetchErr) throw fetchErr;

    let confirmedCount = 0;
    let rejectedCount = 0;
    let expiredCount = 0;

    for (const proposal of (proposals || [])) {
      const poolYes = proposal.pool_yes_votes || 0;
      const poolNo = proposal.pool_no_votes || 0;
      const friendYes = proposal.friend_yes_votes || 0;
      const friendNo = proposal.friend_no_votes || 0;
      const weightedYes = proposal.weighted_yes || 0;
      const weightedNo = proposal.weighted_no || 0;

      let newStatus = 'pending';
      const updateData: Record<string, unknown> = {};
      const isExpired = getProposalDay(proposal) > MAX_PROPOSAL_DAYS;

      // Check immediate cancel (first 6 pool votes all NO) — runs before expiry check
      if (newStatus === 'pending') {
        const { data: poolVotes } = await supabase
          .from('proposal_votes')
          .select('vote_type')
          .eq('proposal_id', proposal.id)
          .eq('is_friend_vote', false)
          .order('created_at', { ascending: true })
          .limit(IMMEDIATE_CANCEL_POOL_VOTES);

        if (poolVotes && poolVotes.length >= IMMEDIATE_CANCEL_POOL_VOTES) {
          const allNo = poolVotes.every((v: { vote_type: string }) => v.vote_type === 'NO');
          if (allNo) {
            newStatus = 'rejected';
            Object.assign(updateData, {
              status: 'rejected',
              rejected_at: nowIso,
              updated_at: nowIso,
            });
          }
        }
      }

      // Check rejection floors
      if (newStatus === 'pending') {
        const totalPool = poolYes + poolNo;
        const totalAll = totalPool + friendYes + friendNo;

        if (totalPool >= REJECTION_FLOOR_MIN_VOTES && poolYesRate(poolYes, poolNo) < REJECTION_FLOOR_YES_RATE) {
          newStatus = 'rejected';
          Object.assign(updateData, { status: 'rejected', rejected_at: nowIso, updated_at: nowIso });
        } else if (totalAll >= REJECTION_FLOOR_MIN_VOTES) {
          const combinedYesRate = totalAll > 0 ? (poolYes + friendYes) / totalAll : 0;
          if (combinedYesRate < REJECTION_FLOOR_YES_RATE) {
            newStatus = 'rejected';
            Object.assign(updateData, { status: 'rejected', rejected_at: nowIso, updated_at: nowIso });
          }
        }
      }

      // Check confirmation
      if (newStatus === 'pending') {
        const totalPool = poolYes + poolNo;
        const totalAll = totalPool + friendYes + friendNo;
        const totalYes = poolYes + friendYes;

        if (totalPool >= CONFIRMATION_MIN_POOL_VOTES && totalAll >= CONFIRMATION_MIN_TOTAL_VOTES && totalYes >= CONFIRMATION_MIN_YES_VOTES) {
          const threshold = getCurrentThreshold(proposal);
          if (threshold === null || calculateWeightedYesPct(weightedYes, weightedNo) >= threshold) {
            newStatus = 'deciding';
            const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 60 * 60 * 1000).toISOString();
            Object.assign(updateData, {
              status: 'deciding',
              community_decided_at: nowIso,
              passed_to_users_at: nowIso,
              decision_deadline_at: deadline,
              updated_at: nowIso,
            });
          }
        }
      }

      // Expired quality floor (day 4+): auto-promote only if quality is acceptable
      if (newStatus === 'pending' && isExpired) {
        const totalAll = poolYes + poolNo + friendYes + friendNo;
        const totalYes = poolYes + friendYes;
        const combinedYesRate = totalAll > 0 ? totalYes / totalAll : 0;

        if (totalAll < 3) {
          // Too few votes to judge — expire (can be retried later), not auto-send
          newStatus = 'expired';
          Object.assign(updateData, {
            status: 'expired',
            expired_at: nowIso,
            updated_at: nowIso,
          });
        } else if (combinedYesRate < 0.40) {
          // Community clearly said no — reject
          newStatus = 'rejected';
          Object.assign(updateData, {
            status: 'rejected',
            rejected_at: nowIso,
            updated_at: nowIso,
          });
        } else {
          // Quality floor passed — auto-promote to deciding
          newStatus = 'deciding';
          const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 60 * 60 * 1000).toISOString();
          Object.assign(updateData, {
            status: 'deciding',
            community_decided_at: nowIso,
            passed_to_users_at: nowIso,
            decision_deadline_at: deadline,
            updated_at: nowIso,
          });
        }
      }

      // Apply update
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('proposals')
          .update(updateData)
          .eq('id', proposal.id);

        if (newStatus === 'deciding') {
          confirmedCount++;
        } else if (newStatus === 'rejected') {
          rejectedCount++;
          // Apply karma for rejection
          await supabase.rpc('apply_karma_on_outcome', {
            p_proposal_id: proposal.id,
            p_outcome: 'rejected',
          });
        } else if (newStatus === 'expired') {
          expiredCount++;
        }
      }
    }

    // 2. STREAK MANAGEMENT: Run at end of daily cycle
    // (a) Freeze streaks where either friend had NO active proposal today
    await supabase.rpc('freeze_inactive_streaks');

    // (b) Kill dead streaks where friend HAD a proposal, user did NOT vote, and wasn't already frozen
    await supabase.rpc('kill_dead_streaks');

    // (c) Weekly Karma Snapshot: Runs idempotently on every daily cycle.
    // The RPC itself handles the logic of only inserting if it's a new week_start.
    const { data: snapshotData, error: snapshotErr } = await supabase.rpc('snapshot_weekly_karma_rpc');
    if (snapshotErr) {
      console.error('Weekly karma snapshot failed:', snapshotErr);
    }

    // (d) Daily Rank Snapshot: Captures current leaderboard ranks for rank-change arrows.
    const { data: rankSnapData, error: rankSnapErr } = await supabase.rpc('snapshot_daily_ranks');
    if (rankSnapErr) {
      console.error('Daily rank snapshot failed:', rankSnapErr);
    }

    // 3. Check decision deadlines on 'deciding' proposals
    const { data: decidingProposals } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', 'deciding')
      .lt('decision_deadline_at', nowIso);

    let autoDeclinedCount = 0;
    for (const proposal of (decidingProposals || [])) {
      if (proposal.user_a_decision === 'pending' || proposal.user_b_decision === 'pending') {
        await supabase
          .from('proposals')
          .update({ status: 'declined', updated_at: nowIso })
          .eq('id', proposal.id);

        // Apply karma for auto-declined deciding proposal
        await supabase.rpc('apply_karma_on_outcome', {
          p_proposal_id: proposal.id,
          p_outcome: 'rejected',
        });

        autoDeclinedCount++;
      }
    }

    return Response.json({
      status: 'success',
      proposals_checked: (proposals || []).length,
      confirmed: confirmedCount,
      rejected: rejectedCount,
      expired: expiredCount,
      auto_declined: autoDeclinedCount,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('proposal-lifecycle error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
