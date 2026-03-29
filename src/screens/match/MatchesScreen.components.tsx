/**
 * MatchesScreen sub-components — popup content, helpers, styles
 * Extracted from MatchesScreen.tsx for maintainability.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import ReanimatedAnimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { EvaIcon } from '../../components/icons';
import { ClockIcon } from '../../components/icons/Icons';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';
import { MatchEndedEvent, ActiveMatch, MatchProposal } from '../../types/community';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { MatchPoolLockedView } from '../../components/matches/MatchPoolLockedView';
import { ScreenWrapper } from '../../components/ui';
import { MatchesSkeleton } from '../../components/ui/SkeletonLoader';

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
  tagline: { fontFamily: FONTS.bold, fontWeight: '700' as const, fontSize: FONT_SIZES['4xl'], lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.text.heading, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
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

// ── Extracted screen-state components ─────────────────────────────────────────

/** Loading skeleton */
export function MatchesLoadingView() {
  return (
    <ScreenWrapper>
      <MatchesSkeleton />
    </ScreenWrapper>
  );
}

/** Profile-incomplete locked view */
export function MatchesLockedView({
  profile,
  navigation,
  handleRefresh,
  refreshing,
}: {
  profile: UserProfile | null;
  navigation: any;
  handleRefresh: () => Promise<void>;
  refreshing: boolean;
}) {
  return (
    <ScreenWrapper>
      <ReanimatedAnimated.View style={{ flex: 1 }} exiting={FadeOut.duration(300)}>
        <MatchPoolLockedView
          profile={profile}
          onNavigateToSection={(section) => {
            switch (section) {
              case 'Match Preferences':
                navigation.navigate('MatchPreferences');
                break;
              case 'Questions':
                navigation.navigate('MainTabs', { screen: 'Profile', params: { initialTab: 'questions' } });
                break;
              case 'Photos':
              case 'About Me':
              default:
                navigation.navigate('ProfileEdit');
                break;
            }
          }}
          onRingPress={() => navigation.navigate('Profile')}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </ReanimatedAnimated.View>
    </ScreenWrapper>
  );
}

/** Empty state — no active match or proposal */
export function EmptyStateView({
  profile,
  navigation,
  refreshing,
  handleRefresh,
  emptyCountdown,
  animateEntrance,
  popupEvent,
  handlePopupContinue,
  headerPad,
}: {
  profile: UserProfile | null;
  navigation: any;
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  emptyCountdown: string | null;
  animateEntrance: boolean;
  popupEvent: MatchEndedEvent | null;
  handlePopupContinue: () => void;
  headerPad?: number;
}) {
  const emptyContent = (
    <>
      <ProfileCompletionBanner
        profile={profile}
        onPress={() => navigation.navigate('Profile')}
      />
      <View style={[styles.headerRow, headerPad != null && { paddingTop: headerPad }]}>
        <Text style={styles.headerTitle} accessibilityRole="header">Match</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primaryButton} />
        }
      >
        <IllustrationAnimation />
        <Text style={styles.tagline}>Your friends are on it</Text>
        <Text style={styles.subtitle}>Help them out and they'll return the favor</Text>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Community')}
          accessibilityRole="button"
          accessibilityLabel="Vote for your friends"
        >
          <Text style={styles.ctaText}>Vote for Your Friends</Text>
        </TouchableOpacity>
        {emptyCountdown && (
          <View style={stateStyles.countdownRow}>
            <ClockIcon size={13} color={COLORS.text.light} />
            <Text style={stateStyles.countdownText}>New proposals in {emptyCountdown}</Text>
          </View>
        )}
      </ScrollView>
    </>
  );

  return (
    <ScreenWrapper>
      {animateEntrance ? (
        <ReanimatedAnimated.View style={{ flex: 1 }} entering={FadeIn.duration(400).delay(200)}>
          {emptyContent}
        </ReanimatedAnimated.View>
      ) : (
        emptyContent
      )}

      {/* Ended Match Popup — persists over empty state */}
      <EndedMatchPopupModal popupEvent={popupEvent} onContinue={handlePopupContinue} />
    </ScreenWrapper>
  );
}

/** Ended match popup modal */
export function EndedMatchPopupModal({
  popupEvent,
  onContinue,
}: {
  popupEvent: MatchEndedEvent | null;
  onContinue: () => void;
}) {
  return (
    <Modal
      visible={!!popupEvent}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={popupStyles.overlay}>
        <View style={popupStyles.card}>
          {popupEvent && <EndedMatchPopupContent event={popupEvent} />}
          <TouchableOpacity style={popupStyles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={popupStyles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/** End match confirmation modal (top-sheet style) */
export function EndMatchModal({
  visible,
  endMatchReason,
  endMatchCustomReason,
  endMatchSubmitting,
  onReasonSelect,
  onCustomReasonChange,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  endMatchReason: string;
  endMatchCustomReason: string;
  endMatchSubmitting: boolean;
  onReasonSelect: (reason: string) => void;
  onCustomReasonChange: (text: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tsStyles.overlay}
      >
        <View style={tsStyles.card}>
          <TouchableOpacity
            style={tsStyles.closeBtn}
            onPress={onDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: FONT_SIZES['2xl'], color: COLORS.navInactiveIcon }}>✕</Text>
          </TouchableOpacity>

          <View style={[tsStyles.iconWrap, { backgroundColor: COLORS.backgroundWarmPeach }]}>
            <EvaIcon name="close-circle" variant="outline" size={40} color={COLORS.error} />
          </View>
          <Text style={tsStyles.title}>End this match?</Text>
          <Text style={tsStyles.subtitle}>
            You'll re-enter the matchmaking pool.{'\n'}Your reason will be shared with them.
          </Text>

          <View style={tsStyles.pillRow}>
            {END_MATCH_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[tsStyles.pill, endMatchReason === reason && tsStyles.pillActive]}
                onPress={() => onReasonSelect(reason)}
              >
                <Text style={[tsStyles.pillText, endMatchReason === reason && tsStyles.pillTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={tsStyles.textArea}
            placeholder={endMatchReason === 'Other' ? 'Tell us a bit more...' : 'Additional details (optional)'}
            placeholderTextColor={COLORS.text.placeholder}
            value={endMatchCustomReason}
            onChangeText={onCustomReasonChange}
            multiline
            maxLength={300}
          />

          <TouchableOpacity
            style={[tsStyles.submitBtn, { backgroundColor: COLORS.error }, (!endMatchReason || endMatchSubmitting) && tsStyles.submitBtnDisabled]}
            onPress={onConfirm}
            disabled={!endMatchReason || endMatchSubmitting}
          >
            <Text style={tsStyles.submitBtnText}>{endMatchSubmitting ? 'Ending...' : 'End Match'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1 }}
          onPress={onDismiss}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Timer info modal */
export function TimerInfoModal({
  visible,
  screenState,
  onClose,
}: {
  visible: boolean;
  screenState: ScreenState;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.timerInfoOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.timerInfoCard}>
          <Text style={styles.timerInfoTitle}>
            {screenState === 'active_match' ? 'Match Timer' : 'Time to Decide'}
          </Text>
          <Text style={styles.timerInfoBody}>
            {screenState === 'active_match'
              ? 'Your match window is ticking. Make the most of it — start a conversation!'
              : screenState === 'awaiting_you'
              ? "They already said yes. Decide before time runs out — you don't want to miss this."
              : screenState === 'awaiting_them'
              ? "You've made your move. They have until the timer runs out to decide."
              : 'Both of you have a window to decide. If time runs out, the proposal expires.'}
          </Text>
          <TouchableOpacity style={styles.timerInfoBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.timerInfoBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/** Confetti celebration overlay */
export function ConfettiOverlay({
  active,
  confettiRef,
}: {
  active: boolean;
  confettiRef: React.RefObject<LottieView | null>;
}) {
  const CONFETTI_ANIM = require('../../../assets/Icons/AnimatedIcons/confetti.json');
  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LottieView
        ref={confettiRef}
        source={CONFETTI_ANIM}
        autoPlay
        loop={false}
        style={{ flex: 1 }}
        speed={1}
      />
    </View>
  );
}

// ── Timer computation helper ─────────────────────────────────────────────────

export function computeTimerInfo(
  screenState: ScreenState,
  activeMatch: ActiveMatch | null,
  currentProposal: MatchProposal | null,
  now: number,
): { timerLabel: string | null; timerClr: string; timerBg: string; timerBdrClr: string } {
  const expiryTs: number | null = (() => {
    if (screenState === 'active_match') {
      const exp = activeMatch?.expiresAt;
      return exp ? new Date(exp).getTime() : null;
    }
    return currentProposal?.expiresAt ? new Date(currentProposal.expiresAt).getTime() : null;
  })();

  let timerLabel: string | null = null;
  let timerClr = COLORS.success;
  let timerBg = 'rgba(52, 199, 89, 0.08)';
  let timerBdrClr = 'rgba(52, 199, 89, 0.25)';

  if (expiryTs) {
    const diffMs = expiryTs - now;
    if (diffMs > 0) {
      const totalHours = diffMs / 3600000;
      const h = Math.floor(totalHours);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      timerLabel = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
      timerClr = timerColor(totalHours);
      timerBg = timerBgColor(totalHours);
      timerBdrClr = timerBorderColor(totalHours);
    }
  }

  return { timerLabel, timerClr, timerBg, timerBdrClr };
}

/** Build card display props from match/proposal state */
export function buildCardProps(
  screenState: ScreenState,
  activeMatch: ActiveMatch | null,
  currentProposal: MatchProposal | null,
) {
  const partner =
    screenState === 'active_match'
      ? activeMatch!.partnerProfile
      : currentProposal!.partnerProfile;

  const partnerPhoto = partner?.photos?.[0]?.url || '';
  const partnerPhotoBlurhash = partner?.photos?.[0]?.blurhash || undefined;
  const partnerName = partner?.firstName || 'Unknown';
  const partnerAge = partner?.age;

  const endorsers = screenState === 'active_match'
    ? activeMatch?.endorsers
    : currentProposal?.endorsers;

  const endorserAvatars = endorsers
    ?.map((e: any) => e.endorserProfile?.photos?.[0]?.url)
    .filter(Boolean) ?? [];

  const endorserNames = endorsers
    ?.map((e: any) => e.endorserProfile?.firstName)
    .filter(Boolean) ?? [];

  const matchDate: string = (() => {
    if (screenState === 'active_match') {
      return formatMatchDate(activeMatch!.matchedAt);
    }
    const ref = currentProposal?.approvedAt || currentProposal?.expiresAt;
    if (!ref) return '';
    const dateStr = new Date(ref).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Proposed ${dateStr}`;
  })();

  return { partner, partnerPhoto, partnerPhotoBlurhash, partnerName, partnerAge, endorserAvatars, endorserNames, matchDate };
}
