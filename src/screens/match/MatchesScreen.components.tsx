/**
 * MatchesScreen sub-components -- popup content, helpers, styles
 * Extracted from MatchesScreen.tsx for maintainability.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, KeyboardAvoidingView, Platform, RefreshControl, useWindowDimensions } from 'react-native';
import ReanimatedAnimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { DURATIONS } from '../../constants/animations';
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
  if (hoursLeft >= 24) return COLORS.success;
  if (hoursLeft >= 12) return COLORS.waitingAmber;
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
      headline: 'This one timed out',
      body: 'Neither of you decided before the window closed. No worries — your friends are already working on your next match.',
    },
    you_rejected: {
      icon: 'sun',
      headline: 'You passed',
      body: "Totally okay — trust your gut. The right person is worth waiting for, and your friends will keep looking.",
    },
    they_rejected: {
      icon: 'heart',
      headline: 'Not the right fit',
      body: "They weren't feeling it this time. Your friends are still looking out for you — the next one could be the one.",
    },
    match_ended: {
      icon: 'activity',
      headline: 'A Fresh Start',
      body: "You're back and ready for something new. Your friends are still here to help you find a great connection.",
    },
  };

  const { icon, headline, body } = config[type];

  return (
    <View style={popupStyles.content}>
      <EvaIcon name={icon} variant="outline" size={36} color={COLORS.primary} />
      <Text style={popupStyles.headline}>{headline}</Text>
      {type === 'match_ended' && endReason ? (
        <View style={popupStyles.reasonBox}>
          <Text style={popupStyles.reasonLabel}>{partnerName} shared:</Text>
          <Text style={popupStyles.reasonText}>"{endReason}"</Text>
        </View>
      ) : null}
      <Text style={popupStyles.body}>{body}</Text>
    </View>
  );
}

// Animated illustration for the empty state — scales proportionally across devices
// SE (667pt) → ~187px, standard (844pt) → ~236px, Pro Max (932pt) → ~260px
const VALENTINE_COUPLE_ANIM = require('../../../assets/Icons/AnimatedIcons/valentine-couple.json');
export function IllustrationAnimation() {
  const { height } = useWindowDimensions();
  const illustrationSize = Math.round(Math.min(height * 0.28, 280));
  return (
    <LottieView
      source={VALENTINE_COUPLE_ANIM}
      autoPlay
      loop
      style={{ width: illustrationSize, height: illustrationSize, marginBottom: 2 }}
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
  headline: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.textDarkHeading,
    textAlign: 'center',
    marginTop: 12,
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
    lineHeight: LINE_HEIGHTS.lg,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.lg,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  headerTitle: { fontFamily: FONTS.bold, fontWeight: '700' as const, fontSize: FONT_SIZES['5xl'], lineHeight: LINE_HEIGHTS['5xl'], color: COLORS.text.black, letterSpacing: -0.5 },
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
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 24 },
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
    lineHeight: LINE_HEIGHTS.lg,
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
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
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
    lineHeight: LINE_HEIGHTS.lg,
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
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
      <ReanimatedAnimated.View style={{ flex: 1 }} exiting={FadeOut.duration(DURATIONS.normal)}>
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
  // Responsive CTA and spacing -- scales proportionally across devices
  // SE (375x667) -> ~225px wide / 44px tall, Pro Max (430x932) -> ~258px wide / 50px tall
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const ctaWidth = Math.round(Math.min(screenWidth * 0.6, 280));
  const ctaHeight = Math.round(Math.max(screenHeight * 0.058, 44)); // min 44px touch target
  const subtitleMB = Math.round(screenHeight * 0.033); // ~22px SE, ~28px Pro Max

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
        <Text style={styles.tagline}>No matches yet</Text>
        <Text style={[styles.subtitle, { marginBottom: subtitleMB }]}>Help your friends find their person and they'll do the same for you.</Text>
        <TouchableOpacity
          style={[styles.ctaButton, { width: ctaWidth, height: ctaHeight }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Community')}
          accessibilityRole="button"
          accessibilityLabel="Help your friends"
        >
          <Text style={styles.ctaText}>Help Your Friends</Text>
        </TouchableOpacity>
        {emptyCountdown && (
          <View style={stateStyles.countdownRow}>
            <ClockIcon size={13} color={COLORS.text.light} />
            <Text style={stateStyles.countdownText}>Next matches drop in {emptyCountdown}</Text>
          </View>
        )}
      </ScrollView>
    </>
  );

  return (
    <ScreenWrapper>
      {animateEntrance ? (
        <ReanimatedAnimated.View style={{ flex: 1 }} entering={FadeIn.duration(DURATIONS.slow).delay(DURATIONS.micro)}>
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
          >
            <EvaIcon name="close" variant="outline" size={20} color={COLORS.navInactiveIcon} />
          </TouchableOpacity>

          <View style={[tsStyles.iconWrap, { backgroundColor: COLORS.backgroundWarmPeach }]}>
            <EvaIcon name="close-circle" variant="outline" size={40} color={COLORS.error} />
          </View>
          <Text style={tsStyles.title}>End this match?</Text>
          <Text style={tsStyles.subtitle}>
            Your friends can start finding someone new.{'\n'}Your reason helps them understand what happened.
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
            placeholder={endMatchReason === 'Other' ? 'Tell us a bit more...' : 'Any other thoughts? (optional)'}
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
            {screenState === 'active_match' ? 'Match Timer' : 'How the Timer Works'}
          </Text>
          <Text style={styles.timerInfoBody}>
            {screenState === 'active_match'
              ? 'You have a limited window to chat. Say hi and see where things go!'
              : screenState === 'awaiting_you'
              ? "They already said yes — now it's your turn! Take a look and decide before time runs out."
              : screenState === 'awaiting_them'
              ? "Nice, you said yes! Now it's in their hands. You'll hear back before the timer runs out."
              : 'You both have a window to check each other out and decide. If time runs out, the match expires and your friends will find someone new.'}
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
        speed={0.8}
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
  let timerBg = timerBgColor(48);
  let timerBdrClr = timerBorderColor(48);

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
      ? activeMatch?.partnerProfile ?? null
      : currentProposal?.partnerProfile ?? null;

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
      if (!activeMatch?.matchedAt) return '';
      return formatMatchDate(activeMatch.matchedAt);
    }
    const ref = currentProposal?.approvedAt || currentProposal?.expiresAt;
    if (!ref) return '';
    const dateStr = new Date(ref).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Suggested ${dateStr}`;
  })();

  return { partner, partnerPhoto, partnerPhotoBlurhash, partnerName, partnerAge, endorserAvatars, endorserNames, matchDate };
}
