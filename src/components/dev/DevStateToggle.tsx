import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../theme/shadows';

// ── DEV STATE TOGGLE — DELETE THIS FILE WHEN DONE ───────────────────────────
const SAUL_ID = 'b853df7d-19db-4212-8fdf-8696bc72a167';
const MOLLY_ID = '3ae08fed-c47f-4044-a5ca-f67be336ef90';

const findProposal = async () => {
  const { data } = await supabase.from('proposals').select('id, status')
    .or(`user_a_id.eq.${SAUL_ID},user_b_id.eq.${SAUL_ID}`)
    .in('status', ['deciding', 'pending', 'passed_to_match'])
    .order('created_at', { ascending: false }).limit(1).single();
  return data;
};

const findMatch = async (pid: string) => {
  const { data } = await supabase.from('matches').select('id')
    .eq('proposal_id', pid).limit(1).single();
  return data;
};

export function DevStateToggle() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState('');

  const run = async (label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const prop = await findProposal();
      if (!prop && label !== 'E') return;
      const pid = prop?.id;

      if (label === 'N' || label === 'Y' || label === 'M') {
        if (pid) {
          const m = await findMatch(pid);
          if (m) await supabase.from('matches').delete().eq('id', m.id);
          await supabase.from('proposals').update({
            status: 'deciding', confirmed_at: null, declined_at: null,
            user_a_decision: label === 'Y' ? 'accepted' : 'pending',
            user_a_decided_at: label === 'Y' ? new Date().toISOString() : null,
            user_b_decision: label === 'M' ? 'accepted' : 'pending',
            user_b_decided_at: label === 'M' ? new Date().toISOString() : null,
          }).eq('id', pid);
        }
      } else if (label === 'B' && pid) {
        await supabase.from('proposals').update({
          status: 'deciding', confirmed_at: new Date().toISOString(), declined_at: null,
          user_a_decision: 'accepted', user_a_decided_at: new Date().toISOString(),
          user_b_decision: 'accepted', user_b_decided_at: new Date().toISOString(),
        }).eq('id', pid);
        const existing = await findMatch(pid);
        if (!existing) {
          await supabase.from('matches').insert({
            user_id_1: SAUL_ID, user_id_2: MOLLY_ID, status: 'active',
            matched_at: new Date().toISOString(), proposal_id: pid,
          });
        }
      } else if (label === 'E') {
        if (pid) {
          const m = await findMatch(pid);
          if (m) await supabase.from('matches').delete().eq('id', m.id);
          await supabase.from('proposals').update({
            status: 'declined', declined_at: new Date().toISOString(),
          }).eq('id', pid);
        }
      } else if (label === 'R') {
        const { data: votes } = await supabase.from('proposal_votes')
          .select('id, proposal_id, vote_type, is_friend_vote, vote_weight')
          .eq('voter_user_id', SAUL_ID).order('created_at', { ascending: false }).limit(1);
        if (votes && votes.length > 0) {
          const v = votes[0];
          await supabase.from('proposal_votes').delete().eq('id', v.id);
          const col = v.vote_type === 'YES'
            ? (v.is_friend_vote ? 'friend_yes_votes' : 'pool_yes_votes')
            : (v.is_friend_vote ? 'friend_no_votes' : 'pool_no_votes');
          const wcol = v.vote_type === 'YES' ? 'weighted_yes' : 'weighted_no';
          const { data: p } = await supabase.from('proposals')
            .select(`${col}, ${wcol}`).eq('id', v.proposal_id).single();
          if (p) {
            await supabase.from('proposals').update({
              [col]: Math.max((p as any)[col] - 1, 0),
              [wcol]: Math.max((p as any)[wcol] - (v.vote_weight || 1), 0),
            }).eq('id', v.proposal_id);
          }
        }
      }
      setLast(label);
    } finally { setBusy(false); }
  };

  const buttons = [
    { label: 'N', title: 'New', color: '#10B981' },
    { label: 'Y', title: 'You', color: '#3B82F6' },
    { label: 'M', title: 'Molly', color: '#EC4899' },
    { label: 'B', title: 'Both', color: '#8B5CF6' },
    { label: 'E', title: 'Empty', color: '#6B7280' },
    { label: 'R', title: 'Revert', color: '#F59E0B' },
  ];

  return (
    <View style={s.container}>
      {open ? (
        <View style={s.menu}>
          {buttons.map(b => (
            <TouchableOpacity key={b.label} onPress={() => run(b.label)}
              style={[s.btn, { backgroundColor: b.color, opacity: busy ? 0.5 : 1 },
                last === b.label && s.btnActive]}>
              <Text style={s.btnText}>{b.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setOpen(false)}
            style={[s.btn, { backgroundColor: '#EF4444' }]}>
            <Text style={s.btnText}>X</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setOpen(true)} style={s.fab}>
          <Text style={s.fabText}>DEV</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', bottom: 96, right: 16, zIndex: 9999 },
  fab: {
    backgroundColor: 'rgba(37, 99, 235, 0.9)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    ...SHADOWS.lg,
  },
  fabText: { color: '#FFF', fontSize: 12, fontWeight: '700', fontFamily: FONTS.bold, letterSpacing: 0.8 },
  menu: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  btn: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, minWidth: 40, alignItems: 'center' },
  btnActive: { borderWidth: 2, borderColor: '#FFF' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 13, fontFamily: FONTS.bold },
});

export default DevStateToggle;
