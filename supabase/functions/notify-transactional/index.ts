/**
 * notify-transactional — Database webhook / trigger endpoint
 *
 * Handles server-side push for the 3 transactional notifications:
 *   - New Match (matches INSERT)
 *   - New Message (messages INSERT)
 *   - Proposal Deciding (proposals UPDATE → 'deciding')
 *
 * Called via Supabase Database Webhooks or pg_net triggers.
 *
 * POST body: {
 *   type: 'match' | 'message' | 'deciding',
 *   record: <the inserted/updated row>,
 *   old_record?: <previous row state, for updates>
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/admin-auth.ts';
import { sendPush, getNextCopyVariant } from '../_shared/send-push.ts';

// ── Copy variants ────────────────────────────────────────────────

const MATCH_COPY = [
  { title: "It's official", body: (name: string) => `💘 You and ${name} matched. Say hi.` },
  { title: 'Match made', body: (name: string) => `💘 You and ${name}. Your friends saw it coming.` },
  { title: 'It happened', body: (name: string) => `💘 ${name} is waiting. Don't keep them hanging.` },
];

const DECIDING_COPY = [
  {
    title: 'Your community has spoken',
    body: (name: string) => `Your friends approved ${name} for you. Time to decide.`,
  },
  {
    title: 'The votes are in',
    body: (name: string, _n?: number) => `Your friends said yes to ${name}. Your call now.`,
  },
  {
    title: 'Decision time',
    body: (name: string) => `Your community thinks you and ${name} could be something. What do you think?`,
  },
];

// ── Shared celebration copy ──────────────────────────────────────

const CELEBRATION_COPY = [
  {
    title: 'You called it',
    body: (friends: string, a: string, b: string) => `You and ${friends} helped ${a} and ${b} match. Nice work.`,
  },
  {
    title: 'Matchmaker moment',
    body: (_friends: string, a: string, b: string) => `🎉 ${a} and ${b} matched — and you helped make it happen.`,
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const forbidden = requireServiceRole(req);
  if (forbidden) return forbidden;

  try {
    const supabase = createAdminClient();
    const { type, record, old_record } = await req.json();

    if (!type || !record) {
      return Response.json({ error: 'type and record required' }, { status: 400, headers: corsHeaders });
    }

    const results: Array<{ user: string; sent: boolean; reason?: string }> = [];

    // ── NEW MATCH ──────────────────────────────────────────────────
    if (type === 'match') {
      const user1Id = record.user1_id;
      const user2Id = record.user2_id;

      // Get both users' names
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name')
        .in('user_id', [user1Id, user2Id]);

      const name1 = profiles?.find((p: { user_id: string; first_name?: string }) => p.user_id === user1Id)?.first_name || 'Someone';
      const name2 = profiles?.find((p: { user_id: string; first_name?: string }) => p.user_id === user2Id)?.first_name || 'Someone';

      // Notify user1
      const v1 = await getNextCopyVariant(supabase, user1Id, 'match', MATCH_COPY.length);
      const r1 = await sendPush(supabase, {
        userId: user1Id,
        notificationType: 'match',
        category: 'transactional',
        title: MATCH_COPY[v1].title,
        body: MATCH_COPY[v1].body(name2),
        data: { screen: 'Matches' },
        copyVariant: v1,
        metadata: { dedup_key: `match_${record.id}_1` },
      });
      results.push({ user: user1Id, ...r1 });

      // Notify user2
      const v2 = await getNextCopyVariant(supabase, user2Id, 'match', MATCH_COPY.length);
      const r2 = await sendPush(supabase, {
        userId: user2Id,
        notificationType: 'match',
        category: 'transactional',
        title: MATCH_COPY[v2].title,
        body: MATCH_COPY[v2].body(name1),
        data: { screen: 'Matches' },
        copyVariant: v2,
        metadata: { dedup_key: `match_${record.id}_2` },
      });
      results.push({ user: user2Id, ...r2 });

      // ── SHARED CELEBRATION — notify voters who helped ──────────
      if (record.proposal_id) {
        // Delay shared celebration by scheduling it 15 min later
        // For now, send inline (edge function doesn't support delayed execution)
        // TODO: Use pg_cron one-off or queue for 15min delay
        const { data: voters } = await supabase
          .from('proposal_votes')
          .select('voter_id')
          .eq('proposal_id', record.proposal_id)
          .eq('vote_type', 'YES')
          .neq('voter_id', user1Id)
          .neq('voter_id', user2Id);

        if (voters && voters.length > 0) {
          const voterIds = voters.map((v: { voter_id: string }) => v.voter_id);

          // Get voter names for the copy
          const { data: voterProfiles } = await supabase
            .from('user_profiles')
            .select('user_id, first_name')
            .in('user_id', voterIds);

          const voterNames = voterProfiles?.map((p: { first_name?: string }) => p.first_name).filter(Boolean) || [];
          const friendsStr = voterNames.length <= 2
            ? voterNames.join(' and ')
            : `${voterNames[0]} and ${voterNames.length - 1} others`;

          // Send celebration to each voter
          for (const voterId of voterIds) {
            const cv = await getNextCopyVariant(supabase, voterId, 'shared_celebration', CELEBRATION_COPY.length);
            const copy = CELEBRATION_COPY[cv];

            await sendPush(supabase, {
              userId: voterId,
              notificationType: 'shared_celebration',
              category: 'engagement',
              title: copy.title,
              body: copy.body(friendsStr, name1, name2),
              data: { screen: 'Community' },
              copyVariant: cv,
              metadata: { dedup_key: `celebration_${record.id}_${voterId}` },
            });
          }
        }
      }
    }

    // ── NEW MESSAGE ────────────────────────────────────────────────
    if (type === 'message') {
      const receiverId = record.receiver_id;
      const senderId = record.sender_id;

      // Don't notify sender
      if (receiverId === senderId) {
        return Response.json({ status: 'skipped', reason: 'self_message' }, { headers: corsHeaders });
      }

      const { data: senderProfile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('user_id', senderId)
        .maybeSingle();

      const senderName = senderProfile?.first_name || 'Someone';

      // Determine preview
      let preview: string;
      const msgType = record.type;
      if (msgType === 'audio') {
        preview = '🎙️ Sent you a voice note';
      } else if (msgType === 'image') {
        preview = '🖼️ Sent you a photo';
      } else {
        const content = record.content || 'Sent you a message';
        preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
      }

      const r = await sendPush(supabase, {
        userId: receiverId,
        notificationType: 'message',
        category: 'transactional',
        title: senderName,
        body: preview,
        data: { screen: 'Chat', matchId: record.match_id },
      });
      results.push({ user: receiverId, ...r });
    }

    // ── PROPOSAL DECIDING ──────────────────────────────────────────
    if (type === 'deciding') {
      // Only process if status just changed to 'deciding'
      if (record.status !== 'deciding') {
        return Response.json({ status: 'skipped', reason: 'not_deciding' }, { headers: corsHeaders });
      }
      if (old_record?.status === 'deciding') {
        return Response.json({ status: 'skipped', reason: 'already_deciding' }, { headers: corsHeaders });
      }

      const userAId = record.user_a_id;
      const userBId = record.user_b_id;

      // Get partner names
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name')
        .in('user_id', [userAId, userBId]);

      const nameA = profiles?.find((p: { user_id: string; first_name?: string }) => p.user_id === userAId)?.first_name || 'someone special';
      const nameB = profiles?.find((p: { user_id: string; first_name?: string }) => p.user_id === userBId)?.first_name || 'someone special';

      // Notify user_a about user_b
      const va = await getNextCopyVariant(supabase, userAId, 'deciding', DECIDING_COPY.length);
      const ra = await sendPush(supabase, {
        userId: userAId,
        notificationType: 'deciding',
        category: 'transactional',
        title: DECIDING_COPY[va].title,
        body: DECIDING_COPY[va].body(nameB),
        data: { screen: 'Matches', proposalId: record.id },
        copyVariant: va,
        metadata: { dedup_key: `deciding_${record.id}_a` },
      });
      results.push({ user: userAId, ...ra });

      // Notify user_b about user_a
      const vb = await getNextCopyVariant(supabase, userBId, 'deciding', DECIDING_COPY.length);
      const rb = await sendPush(supabase, {
        userId: userBId,
        notificationType: 'deciding',
        category: 'transactional',
        title: DECIDING_COPY[vb].title,
        body: DECIDING_COPY[vb].body(nameA),
        data: { screen: 'Matches', proposalId: record.id },
        copyVariant: vb,
        metadata: { dedup_key: `deciding_${record.id}_b` },
      });
      results.push({ user: userBId, ...rb });
    }

    return Response.json({ status: 'success', results }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('[notify-transactional] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
