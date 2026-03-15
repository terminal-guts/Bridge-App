/**
 * MatchesScreen sub-components — popup content, helpers, styles
 * Extracted from MatchesScreen.tsx for maintainability.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { EvaIcon } from '../../components/icons';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';
import { MatchEndedEvent } from '../../types/community';

// ── Screen state type ─────────────────────────────────────────────────────────
export type ScreenState = 'empty' | 'neither_voted' | 'awaiting_you' | 'awaiting_them' | 'active_match';

export function deriveScreenState(
  activeMatch: any,
  pendingProposals: any[],
): ScreenState {
  if (activeMatch) return 'active_match';
  if (pendingProposals.length > 0) {
    const p = pendingProposals[0];
    const yours = p.yourDecision ?? 'pending';
    const theirs = p.partnerDecision ?? 'pending';
    if (yours === 'pending' && theirs !== 'pending') return 'awaiting_you';
    if (yours !== 'pending' && theirs === 'pending') return 'awaiting_them';
    return 'neither_voted';
  }
  return 'empty';
}

export const CARD_STATUS: Record<Exclude<ScreenState, 'empty'>, 'active_match' | 'awaiting_you' | 'awaiting_them' | 'new_match'> = {
  active_match: 'active_match',
  neither_voted: 'new_match',
  awaiting_you: 'awaiting_you',
  awaiting_them: 'awaiting_them',
};

export const END_MATCH_REASONS = [
  'Conversation fizzled',
  'No connection',
  'Not on same page',
  'Felt uncomfortable',
  'Bad timing',
  'Other',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function computeApprovalPercent(id: string): number {
  return 70 + (id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 30);
}

export function timerColor(hoursLeft: number): string {
  if (hoursLeft >= 24) return '#34C759';
  if (hoursLeft >= 12) return '#D4AA01';
  if (hoursLeft >= 4) return '#FF8D28';
  return '#FF3B30';
}

export function timerBgColor(hoursLeft: number): string {
  if (hoursLeft >= 24) return 'rgba(52, 199, 89, 0.08)';
  if (hoursLeft >= 12) return 'rgba(212, 170, 1, 0.08)';
  if (hoursLeft >= 4) return 'rgba(255, 141, 40, 0.08)';
  return 'rgba(255, 59, 48, 0.08)';
}

export function timerBorderColor(hoursLeft: number): string {
  if (hoursLeft >= 24) return 'rgba(52, 199, 89, 0.25)';
  if (hoursLeft >= 12) return 'rgba(212, 170, 1, 0.25)';
  if (hoursLeft >= 4) return 'rgba(255, 141, 40, 0.25)';
  return 'rgba(255, 59, 48, 0.25)';
}

export function formatMatchDate(isoDate: string): string {
  return `Matched ${new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })}`;
}

// ── Per-variant popup content ────────────────────────────────────────────────
export function EndedMatchPopupContent({ event }: { event: MatchEndedEvent }) {
  const { type, partnerName, endReason } = event;

  const config: Record<MatchEndedEvent['type'], { icon: string; headline: string; body: string }> = {
    expired: {
      icon: 'clock',
      headline: 'Your match expired',
      body: 'The proposal timed out before anyone decided. Stay active — your next match could come soon.',
    },
    you_rejected: {
      icon: 'smiling-face',
      headline: 'You passed',
      body: "That's totally okay — trust your instincts. Keep at it, the right fit is worth waiting for. Every pass brings you closer to someone great.",
    },
    they_rejected: {
      icon: 'heart',
      headline: "It didn't work out this time",
      body: "They decided to go a different direction. Your friends are still out there finding the right match for you.",
    },
    match_ended: {
      icon: 'activity',
      headline: 'A Fresh Start',
      body: "You're back in the matching pool. Your community is still here to help you find your next great connection.",
    },
  };

  const { icon, headline, body } = config[type];

  return (
    <View style={popupStyles.content}>
      <EvaIcon name={icon} variant="outline" size={36} color={COLORS.primary} />
      <Text style={popupStyles.headline}>{headline}</Text>
      {type === 'match_ended' && endReason ? (
        <View style={popupStyles.reasonBox}>
          <Text style={popupStyles.reasonLabel}>{partnerName} wrote:</Text>
          <Text style={popupStyles.reasonText}>"{endReason}"</Text>
        </View>
      ) : null}
      <Text style={popupStyles.body}>{body}</Text>
    </View>
  );
}

// Animated illustration for the empty state
const VALENTINE_COUPLE_ANIM = require('../../../assets/Icons/AnimatedIcons/valentine-couple.json');
export function IllustrationAnimation() {
  return (
    <LottieView
      source={VALENTINE_COUPLE_ANIM}
      autoPlay
      loop
      style={styles.illustration}
    />
  );
}

// ── Popup Styles ─────────────────────────────────────────────────────────────

export const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAYS.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    marginHorizontal: 32,
  },
  content: { alignItems: 'center' },
  icon: { fontSize: FONT_SIZES['6xl'], marginBottom: 12 },
  headline: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.textDarkHeading,
    textAlign: 'center',
    marginBottom: 12,
  },
  reasonBox: {
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderNeutral,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    marginBottom: 16,
  },
  reasonLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.placeholder,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  reasonText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.textGray800,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  continueBtn: {
    backgroundColor: COLORS.primaryButton,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },
});

// ── Main Styles ──────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.screenBackground },
  header: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  headerTitle: { fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONT_SIZES['6xl'], lineHeight: 38, color: COLORS.text.black, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.base, lineHeight: 18, color: COLORS.navInactiveIcon, paddingHorizontal: 24, paddingBottom: 4 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 34,
  },
  timerText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 24 },
  illustration: { width: 260, height: 260, marginBottom: 2 },
  tagline: { fontFamily: FONTS.bold, fontSize: FONT_SIZES['4xl'], lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.text.heading, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.base, lineHeight: LINE_HEIGHTS.base, color: COLORS.text.light, textAlign: 'center', marginBottom: 28 },
  ctaButton: {
    backgroundColor: COLORS.primaryButton,
    width: 260,
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accentBlue,
  },
  ctaText: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.xl, color: COLORS.card },
  timerInfoOverlay: {
    flex: 1,
    backgroundColor: OVERLAYS.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerInfoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  timerInfoTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.textDarkHeading,
    marginBottom: 8,
    textAlign: 'center',
  },
  timerInfoBody: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  timerInfoBtn: {
    backgroundColor: COLORS.primaryButton,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  timerInfoBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.card,
  },
});

// ── Top-sheet modal styles ──────────────────────────────────────────────────

export const tsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAYS.medium,
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    ...SHADOWS.xxl,
  },
  closeBtn: {
    position: 'absolute',
    top: 58,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundProgressTrack,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.textDarkHeading,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.borderNeutral,
    backgroundColor: COLORS.card,
  },
  pillActive: {
    borderColor: COLORS.primaryAccent,
    backgroundColor: COLORS.backgroundFriendActive,
  },
  pillText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.navInactiveIcon,
  },
  pillTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primaryAccent,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: COLORS.borderNeutral,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textDarkHeading,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: COLORS.backgroundOffWhite,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },
});

// ── State-specific layout styles ────────────────────────────────────────────

export const stateStyles = StyleSheet.create({
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    marginBottom: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  votedCheckmark: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    marginRight: 4,
  },
  votedText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  countdownRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 16,
    gap: 4,
  },
  countdownText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.light,
  },
});
