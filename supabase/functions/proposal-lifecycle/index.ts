import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const FRIEND_VOTE_WEIGHT = 1.25;
const MAX_PROPOSAL_DAYS = 5;
const DECISION_DEADLINE_HOURS = 48;

const THRESHOLD_SCHEDULE: Record<number, number | null> = {
  1: 0.65, 2: 0.65,
  3: 0.60, 4: 0.55,
  5: null,
};

function getProposalDay(proposal: any): number {
  const created = proposal.voting_started_at || proposal.created_at;
  if (!created) return 1;
  const createdDate = new Date(created);
  const now = new Date();
  const delta = now.getTime() - createdDate.getTime();
  const day = Math.floor(delta / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(day, MAX_PROPOSAL_DAYS + 1);
}

function getCurrentThreshold(proposal: any): number | null {
  const day = getProposalDay(proposal);
  if (day > MAX_PROPOSAL_DAYS) return null;
  return THRESHOLD_SCHEDULE[day] ?? 0.55;
}

function calculateWeightedYesPct(poolYes: number, poolNo: number, friendYes: number, friendNo: number): number {
  const weightedYes = poolYes + (friendYes * FRIEND_VOTE_WEIGHT);
  const weightedNo = poolNo + (friendNo * FRIEND_VOTE_WEIGHT);
  const total = weightedYes + weightedNo;
  return total === 0 ? 0.0 : weightedYes / total;
}

function poolYesRate(poolYes: number, poolNo: number): number {
  const total = poolYes + poolNo;
  return total === 0 ? 0.0 : poolYes / total;
}

function friendYesRate(friendYes: number, friendNo: number): number {
  const total = friendYes + friendNo;
  return total === 0 ? 0.0 : friendYes / total;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
    let poolStoppedCount = 0;

    for (const proposal of (proposals || [])) {
      const poolYes = proposal.pool_yes_votes || 0;
      const poolNo = proposal.pool_no_votes || 0;
      const friendYes = proposal.friend_yes_votes || 0;
      const friendNo = proposal.friend_no_votes || 0;

      let newStatus = 'pending';
      const updateData: Record<string, any> = {};

      // Check expiry (5-day hard cutoff)
      if (getProposalDay(proposal) > MAX_PROPOSAL_DAYS) {
        newStatus = 'expired';
        const deadline = new Date(Date.now() + DECISION_DEADLINE_HOURS * 60 * 60 * 1000).toISOString();
        Object.assign(updateData, {
          status: 'expired',
          expired_at: nowIso,
          passed_to_users_at: nowIso,
          decision_deadline_at: deadline,
          updated_at: nowIso,
        });
      }

      // Check immediate cancel (first 6 pool votes all NO)
      if (newStatus === 'pending') {
        const { data: poolVotes } = await supabase
          .from('proposal_votes')
          .select('vote_type')
          .eq('proposal_id', proposal.id)
          .eq('is_friend_vote', false)
          .order('created_at', { ascending: true })
          .limit(6);

        if (poolVotes && poolVotes.length >= 6) {
          const allNo = poolVotes.every((v: any) => v.vote_type === 'NO');
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

      // Check pool floor cancel
      if (newStatus === 'pending') {
        const totalPool = poolYes + poolNo;
        const totalAll = totalPool + friendYes + friendNo;

        if (totalPool >= 12 && poolYesRate(poolYes, poolNo) < 0.35) {
          newStatus = 'rejected';
          Object.assign(updateData, { status: 'rejected', rejected_at: nowIso, updated_at: nowIso });
        } else if (totalAll >= 12) {
          const combinedYesRate = totalAll > 0 ? (poolYes + friendYes) / totalAll : 0;
          if (combinedYesRate < 0.35) {
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

        if (totalPool >= 6 && totalAll >= 12 && totalYes >= 8) {
          const threshold = getCurrentThreshold(proposal);
          if (threshold === null || calculateWeightedYesPct(poolYes, poolNo, friendYes, friendNo) >= threshold) {
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

      // Check pool eligibility
      if (newStatus === 'pending') {
        const eligible = poolYesRate(poolYes, poolNo) >= 0.35 ||
          (friendYes + friendNo >= 6 && friendYesRate(friendYes, friendNo) >= 0.70);

        if (eligible !== proposal.pool_eligible) {
          Object.assign(updateData, { pool_eligible: eligible, updated_at: nowIso });
          if (!eligible) poolStoppedCount++;
        }
      }

      // Apply update
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('proposals')
          .update(updateData)
          .eq('id', proposal.id);

        if (newStatus === 'deciding') confirmedCount++;
        else if (newStatus === 'rejected') rejectedCount++;
        else if (newStatus === 'expired') expiredCount++;
      }
    }

    // 2. Check decision deadlines on 'deciding' and 'expired' proposals
    const { data: decidingProposals } = await supabase
      .from('proposals')
      .select('*')
      .in('status', ['deciding', 'expired'])
      .lt('decision_deadline_at', nowIso);

    let autoDeclinedCount = 0;
    for (const proposal of (decidingProposals || [])) {
      if (proposal.user_a_decision === 'pending' || proposal.user_b_decision === 'pending') {
        await supabase
          .from('proposals')
          .update({ status: 'declined', updated_at: nowIso })
          .eq('id', proposal.id);
        autoDeclinedCount++;
      }
    }

    return Response.json({
      status: 'success',
      proposals_checked: (proposals || []).length,
      confirmed: confirmedCount,
      rejected: rejectedCount,
      expired: expiredCount,
      pool_stopped: poolStoppedCount,
      auto_declined: autoDeclinedCount,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('proposal-lifecycle error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
