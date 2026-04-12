import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../theme/shadows';
import { getAuthenticatedUserId } from '../../utils/auth';

/**
 * ── DEMO TOGGLE ─────────────────────────────────────────────────────────────
 * A specialized tool for App Store reviewers to test various app states
 * like pending proposals, acceptances, and matches without waiting for real users.
 */

const findCurrentProposal = async (userId: string) => {
  const { data } = await supabase.from('proposals').select('id, status, user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .in('status', ['deciding', 'pending', 'passed_to_match', 'declined'])
    .order('created_at', { ascending: false }).limit(1).single();
  return data;
};

const findMatch = async (pid: string) => {
  const { data } = await supabase.from('matches').select('id')
    .eq('proposal_id', pid).limit(1).single();
  return data;
};

export function DemoToggle() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState('');

  const run = async (label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return;

      if (label === 'G') {
        // Trigger proposal generation
        const { generateProposalForUser } = await import('../../services/proposalApiService');
        const res = await generateProposalForUser();
        if (res.ok) {
          Alert.alert('Success', 'New proposal generated! Refresh the Match tab.');
        } else {
          Alert.alert('Notice', 'No new proposals could be generated at this time (might already have one or no candidates left).');
        }
        return;
      }

      const prop = await findCurrentProposal(userId);
      if (!prop && label !== 'R') {
        Alert.alert('No Proposal', 'No recent proposal found to manipulate. Try "Gen Prop" first.');
        return;
      }

      const pid = prop?.id;
      const amIUserA = prop?.user_a_id === userId;
      const partnerId = amIUserA ? prop?.user_b_id : prop?.user_a_id;

      if (label === 'N' && pid) {
        // Reset to "New" state (both pending)
        const m = await findMatch(pid);
        if (m) await supabase.from('matches').delete().eq('id', m.id);
        await supabase.from('proposals').update({
          status: 'deciding', confirmed_at: null, declined_at: null,
          user_a_decision: 'pending', user_a_decided_at: null,
          user_b_decision: 'pending', user_b_decided_at: null,
        }).eq('id', pid);
      } else if (label === 'Y' && pid) {
        // I accept, partner pending
        const m = await findMatch(pid);
        if (m) await supabase.from('matches').delete().eq('id', m.id);
        await supabase.from('proposals').update({
          status: 'deciding', confirmed_at: null, declined_at: null,
          [amIUserA ? 'user_a_decision' : 'user_b_decision']: 'accepted',
          [amIUserA ? 'user_a_decided_at' : 'user_b_decided_at']: new Date().toISOString(),
          [amIUserA ? 'user_b_decision' : 'user_a_decision']: 'pending',
          [amIUserA ? 'user_b_decided_at' : 'user_a_decided_at']: null,
        }).eq('id', pid);
      } else if (label === 'P' && pid) {
        // Partner accepts, I'm pending
        const m = await findMatch(pid);
        if (m) await supabase.from('matches').delete().eq('id', m.id);
        await supabase.from('proposals').update({
          status: 'deciding', confirmed_at: null, declined_at: null,
          [amIUserA ? 'user_a_decision' : 'user_b_decision']: 'pending',
          [amIUserA ? 'user_a_decided_at' : 'user_b_decided_at']: null,
          [amIUserA ? 'user_b_decision' : 'user_a_decision']: 'accepted',
          [amIUserA ? 'user_b_decided_at' : 'user_a_decided_at']: new Date().toISOString(),
        }).eq('id', pid);
      } else if (label === 'M' && pid) {
        // Both accept -> Active Match
        await supabase.from('proposals').update({
          status: 'deciding', confirmed_at: new Date().toISOString(), declined_at: null,
          user_a_decision: 'accepted', user_a_decided_at: new Date().toISOString(),
          user_b_decision: 'accepted', user_b_decided_at: new Date().toISOString(),
        }).eq('id', pid);

        const existing = await findMatch(pid);
        if (!existing && partnerId) {
          await supabase.from('matches').insert({
            user_id_1: userId < partnerId ? userId : partnerId,
            user_id_2: userId < partnerId ? partnerId : userId,
            status: 'active',
            matched_at: new Date().toISOString(),
            proposal_id: pid,
          });
        }
      } else if (label === 'E' && pid) {
        // Declined
        const m = await findMatch(pid);
        if (m) await supabase.from('matches').delete().eq('id', m.id);
        await supabase.from('proposals').update({
          status: 'declined', declined_at: new Date().toISOString(),
        }).eq('id', pid);
      } else if (label === 'R') {
        // Revert last vote cast by user
        const { data: votes } = await supabase.from('proposal_votes')
          .select('id, proposal_id, vote_type, is_friend_vote')
          .eq('voter_user_id', userId).order('created_at', { ascending: false }).limit(1);

        if (votes && votes.length > 0) {
          const v = votes[0];
          await supabase.from('proposal_votes').delete().eq('id', v.id);
          Alert.alert('Success', 'Last vote reverted. Refresh the Community tab.');
        } else {
          Alert.alert('Notice', 'No recent votes found to revert.');
        }
      }
      setLast(label);
    } catch (err) {
      console.error('[DemoToggle] Error:', err);
      Alert.alert('Error', 'Demo action failed. Check connection.');
    } finally { setBusy(false); }
  };

  const buttons = [
    { label: 'G', title: 'Gen Prop', color: '#10B981' },
    { label: 'N', title: 'Reset (New)', color: '#64748B' },
    { label: 'Y', title: 'You Accept', color: '#3B82F6' },
    { label: 'P', title: 'Partner Accepts', color: '#EC4899' },
    { label: 'M', title: 'Match', color: '#8B5CF6' },
    { label: 'E', title: 'Decline', color: '#EF4444' },
    { label: 'R', title: 'Revert Vote', color: '#F59E0B' },
  ];

  return (
    <View style={s.container}>
      {open ? (
        <View style={s.menu}>
          <Text style={s.header}>DEMO MODE</Text>
          {buttons.map(b => (
            <TouchableOpacity key={b.label} onPress={() => run(b.label)}
              style={[s.btn, { backgroundColor: b.color, opacity: busy ? 0.5 : 1 },
                last === b.label && s.btnActive]}>
              <View style={s.row}>
                <Text style={s.btnText}>{b.label}</Text>
                <Text style={s.btnTitle}>{b.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setOpen(false)}
            style={[s.btn, { backgroundColor: '#1E293B' }]}>
            <Text style={s.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setOpen(true)} style={s.fab}>
          {busy ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.fabText}>DEMO</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, right: 16, zIndex: 9999 },
  fab: {
    backgroundColor: 'rgba(37, 99, 235, 0.95)', borderRadius: 24,
    width: 64, height: 48, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.lg,
  },
  fabText: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: FONTS.bold, letterSpacing: 0.8 },
  menu: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 12,
    gap: 8,
    alignItems: 'stretch',
    width: 180,
    ...SHADOWS.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: FONTS.bold,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  btn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 40 },
  btnActive: { borderWidth: 2, borderColor: '#FFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 13, fontFamily: FONTS.bold, width: 14, textAlign: 'center' },
  btnTitle: { color: '#FFF', fontWeight: '600', fontSize: 12, fontFamily: FONTS.medium },
});

export default DemoToggle;
