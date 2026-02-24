import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { communityService, MockMatchState, MockFriendsState } from '../services/communityService';

const MATCH_OPTIONS: { label: string; value: MockMatchState }[] = [
  { label: 'Empty',         value: 'empty' },
  { label: 'New Match',     value: 'new_match' },
  { label: 'They Voted',    value: 'awaiting_you' },
  { label: 'You Voted',     value: 'awaiting_them' },
  { label: 'Active Match',  value: 'active_match' },
];

const FRIENDS_OPTIONS: { label: string; value: MockFriendsState }[] = [
  { label: 'Empty',        value: 'empty' },
  { label: 'With Friends', value: 'with_friends' },
];

const TIMER_PRESETS: { label: string; ms: number; color: string }[] = [
  { label: '20h 🟢', ms: 20 * 3600000,    color: '#1D9E50' },
  { label: '8h 🟠',  ms: 8  * 3600000,    color: '#C96B00' },
  { label: '2h 🔴',  ms: 2  * 3600000,    color: '#D92D20' },
  { label: '30s ⏱',  ms: 30 * 1000,       color: '#D92D20' },
];

export function DevStateToggle() {
  const [visible, setVisible] = useState(false);
  const [matchState, setMatchStateLocal] = useState<MockMatchState>(
    communityService.getCurrentMatchState(),
  );
  const [friendsState, setFriendsStateLocal] = useState<MockFriendsState>(
    communityService.getCurrentFriendsState(),
  );

  const applyMatchState = (state: MockMatchState) => {
    setMatchStateLocal(state);
    communityService.setMatchState(state);
  };

  const applyFriendsState = (state: MockFriendsState) => {
    setFriendsStateLocal(state);
    communityService.setFriendsState(state);
  };

  return (
    <>
      {/* Floating trigger button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>DEV</Text>
      </TouchableOpacity>

      {/* Bottom sheet modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          {/* Prevent taps on the sheet itself from closing */}
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.handle} />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.sheetTitle}>Dev State Toggle</Text>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── Matches ────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>MATCHES</Text>
            <View style={styles.chipGrid}>
              {MATCH_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, matchState === opt.value && styles.chipActive]}
                  onPress={() => applyMatchState(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, matchState === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Community / Friends ────────────────────────── */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>COMMUNITY</Text>
            <View style={styles.chipGrid}>
              {FRIENDS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, friendsState === opt.value && styles.chipActive]}
                  onPress={() => applyFriendsState(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, friendsState === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, { borderColor: '#FECACA', backgroundColor: '#FFF5F5' }]}
                onPress={() => {
                  communityService.resetToVotingGate();
                  setVisible(false);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: '#D92D20' }]}>↩ Reset Voting Gate</Text>
              </TouchableOpacity>
            </View>

            {/* ── Timer ─────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>RESET TIMER</Text>
            <View style={styles.chipGrid}>
              {TIMER_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.chip}
                  onPress={() => communityService.setTimeRemaining(preset.ms)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, { color: preset.color }]}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SafeAreaView />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const BLUE = '#2563EB';

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  fabText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#010101',
  },
  closeBtn: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: BLUE,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: BLUE,
    fontWeight: '700',
  },
});

export default DevStateToggle;
