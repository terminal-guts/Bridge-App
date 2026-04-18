import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import {
  MAX_PROPOSAL_DAYS,
  DECISION_DEADLINE_HOURS,
  DAILY_QUORUM_PCT,
  REJECT_YES_RATE,
  ACCEPT_YES_RATE,
  DAY3_LENIENT_YES_RATE,
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
  return Math.floor(delta / (24 * 60 * 60 * 1000)) + 1;
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
    let stayedPendingCount = 0;

    // Batch fetch assignment counts and vote counts per proposal for the quorum calc.
    const proposalIds = (proposals || []).map(p => p.id);
    const assignedCounts = new Map<string, number>();
    const votedCounts = new Map<string, number>();

    if (proposalIds.length > 0) {
      const [assignedRes, votedRes] = await Promise.all([
        supabase.from('pool_vote_assignments')
          .select('proposal_id')
          .in('proposal_id', proposalIds),
        supabase.from('pool_vote_assignments')
          .select('proposal_id')
          .in('proposal_id', proposalIds)
          .eq('has_voted', true),
      ]);
      for (const row of (assignedRes.data || [])) {
        assignedCounts.set(row.proposal_id, (assignedCounts.get(row.proposal_id) || 0) + 1);
      }
      for (const row of (votedRes.data || [])) {
        votedCounts.set(row.proposal_id, (votedCounts.get(row.proposal_id) || 0) + 1);
      }
    }

    for (const proposal of (proposals || [])) {
      const poolYes = proposal.pool_yes_votes || 0;
      const poolNo = proposal.pool_no_votes || 0;
      const friendYes = proposal.friend_yes_votes || 0;
      const friendNo = proposal.friend_no_votes || 0;

      const totalYes = poolYes + friendYes;
      const totalNo = poolNo + friendNo;
      const totalVotes = totalYes + totalNo;
      const yesRate = totalVotes > 0 ? totalYes / totalVotes : 0;

      const assignedCount = assignedCounts.get(proposal.id) || 0;
      const votedCount = votedCounts.get(proposal.id) || 0;
      const turnoutPct = assignedCount > 0 ? votedCount / assignedCount : 0;

      const day = getProposalDay(proposal);
      const atOrPastDay3 = day >= MAX_PROPOSAL_DAYS;

      let newStatus: 'pending' | 'deciding' | 'rejected' = 'pending';
      const updateData: Record<string, unknown> = {};

      if (atOrPastDay3) {
        // Day 3+: force a decision.  Lenient threshold — accept if yes-rate ≥ 50%.
        // No quorum gate at day 3: if nobody voted, we treat 0% as below 50% → reject.
        if (totalVotes > 0 && yesRate >= DAY3_LENIENT_YES_RATE) {
          newStatus = 'deciding';
        } else {
          newStatus = 'rejected';
        }
      } else if (turnoutPct < DAILY_QUORUM_PCT) {
        // Day 1-2, insufficient turnout — hold another day.
        newStatus = 'pending';
      } else {
        // Day 1-2, quorum met — apply yes-rate thresholds.
        if (yesRate < REJECT_YES_RATE) {
          newStatus = 'rejected';
        } else if (yesRate > ACCEPT_YES_RATE) {
          newStatus = 'deciding';
        } else {
          // 35-70% — inconclusive, hold another day.
          newStatus = 'pending';
        }
      }

      if (newStatus === 'deciding') {
        const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 60 * 60 * 1000).toISOString();
        Object.assign(updateData, {
          status: 'deciding',
          community_decided_at: nowIso,
          passed_to_users_at: nowIso,
          decision_deadline_at: deadline,
          updated_at: nowIso,
        });
      } else if (newStatus === 'rejected') {
        Object.assign(updateData, {
          status: 'rejected',
          rejected_at: nowIso,
          updated_at: nowIso,
        });
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('proposals')
          .update(updateData)
          .eq('id', proposal.id)
          .eq('status', 'pending'); // concurrency guard

        if (newStatus === 'deciding') {
          confirmedCount++;
        } else if (newStatus === 'rejected') {
          rejectedCount++;
          await supabase.rpc('apply_karma_on_outcome', {
            p_proposal_id: proposal.id,
            p_outcome: 'rejected',
          });
        }
      } else {
        stayedPendingCount++;
      }
    }

    // 2. STREAK MANAGEMENT: Run at end of daily cycle
    // (a) Freeze streaks where either friend had NO active proposal today
    await supabase.rpc('freeze_inactive_streaks');

    // (b) Kill dead streaks where friend HAD a proposal, user did NOT vote, and wasn't already frozen
    await supabase.rpc('kill_dead_streaks');

    // (c) Weekly Karma Snapshot: idempotent — RPC only inserts on new week_start.
    const { error: snapshotErr } = await supabase.rpc('snapshot_weekly_karma_rpc');
    if (snapshotErr) {
      console.error('Weekly karma snapshot failed:', snapshotErr);
    }

    // (d) Daily Rank Snapshot: captures leaderboard ranks for rank-change arrows.
    const { error: rankSnapErr } = await supabase.rpc('snapshot_daily_ranks');
    if (rankSnapErr) {
      console.error('Daily rank snapshot failed:', rankSnapErr);
    }

    // 3. Check decision deadlines on 'deciding' proposals
    const { data: decidingProposals } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', 'deciding')
      .lt('decision_deadline_at', nowIso);

    let autoExpiredCount = 0;
    for (const proposal of (decidingProposals || [])) {
      if (proposal.user_a_decision === 'pending' || proposal.user_b_decision === 'pending') {
        const { error: expireErr } = await supabase
          .from('proposals')
          .update({ status: 'expired', expired_at: nowIso, updated_at: nowIso })
          .eq('id', proposal.id);

        if (expireErr) {
          console.error(`Failed to expire deciding proposal ${proposal.id}:`, expireErr.message);
          continue;
        }

        // Skip karma adjustment — community approved these proposals.
        // They expired because subjects didn't respond, not voter inaccuracy.
        autoExpiredCount++;
      }
    }

    return Response.json({
      status: 'success',
      proposals_checked: (proposals || []).length,
      confirmed: confirmedCount,
      rejected: rejectedCount,
      stayed_pending: stayedPendingCount,
      auto_expired_deciding: autoExpiredCount,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('proposal-lifecycle error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
