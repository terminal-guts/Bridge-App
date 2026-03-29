/**
 * CommunityScreen Components
 * Extracted from CommunityScreen.tsx for maintainability.
 */

import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { Image } from 'expo-image';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { EvaIcon } from '../../components/icons';
import { communityService } from '../../services/communityServiceIndex';
import { FriendWithGridStatus } from '../../types/community';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS, OVERLAYS } from '../../theme/shadows';
import { lightHaptic } from '../../utils/haptics';
import { FriendRequestCard } from '../../components/friends/FriendRequestCard';
import { FriendRequest } from '../../services/friendService';

// ── Mock leaderboard karma thresholds for rank interpolation ─────────────────
// Sorted descending — same values as LeaderboardScreen MOCK_WEEKLY
const MOCK_LEADERBOARD_KARMA = [87, 74, 68, 62, 55, 51, 48, 44, 39, 36, 32, 29, 25, 21, 18, 14, 11, 8, 5, 3];

/** Given a karma score, return approximate global leaderboard rank (1-indexed) */
function getApproxRank(karma: number): number {
  for (let i = 0; i < MOCK_LEADERBOARD_KARMA.length; i++) {
    if (karma >= MOCK_LEADERBOARD_KARMA[i]) return i + 1;
  }
  return MOCK_LEADERBOARD_KARMA.length + 1;
}

/** Split friends into needs-help vs already-helped, sorted by karma rank */
export function partitionFriends(friends: FriendWithGridStatus[]) {
  const toMatch = friends.filter(f => !f.hasCompletedGrid);
  const helped = friends
    .filter(f => f.hasCompletedGrid)
    .sort((a, b) =>
      getApproxRank(a.karmaScore?.karmaPoints ?? 0) - getApproxRank(b.karmaScore?.karmaPoints ?? 0)
    );
  return { toMatch, helped };
}

/** Compute activity status line for a crew member */
export function getFriendStatusLine(
  user: FriendWithGridStatus,
): string | undefined {
  if (user.isMatched) return 'Has a match!';
  const assists = user.assistsCount || 0;
  if (assists > 0) return `${assists} match${assists === 1 ? '' : 'es'} made`;
  return undefined;
}

// ── Match reset countdown timer ───────────────────────────────────────────────
//
// Uses a ref for the target timestamp and a force-render counter.
// `remaining` is computed fresh from Date.now() on every render — never stored
// in state — so React batching and unmount/remount cycles can't stale-lock it.
export function MatchResetTimer() {
  // Target timestamp (epoch ms) from the service
  const targetRef = useRef(Number(communityService.getNextResetAt()));
  // Incrementing counter just to force a re-render every second
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const [infoVisible, setInfoVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulsingRef = useRef(false);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const ms = targetRef.current - Date.now();
      if (ms <= 0) {
        communityService.triggerReset();
        targetRef.current = Number(communityService.getNextResetAt());
      }

      // Start pulse when <30 min remaining
      const shouldPulse = ms > 0 && ms < 30 * 60 * 1000;
      if (shouldPulse && !pulsingRef.current) {
        pulsingRef.current = true;
        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        );
        pulseLoopRef.current.start();
      } else if (!shouldPulse && pulsingRef.current) {
        pulsingRef.current = false;
        pulseLoopRef.current?.stop();
        pulseLoopRef.current = null;
        pulseAnim.setValue(1);
      }

      tick(); // force re-render
    }, 1000);

    // Re-sync when dev toggle / triggerReset changes the reset time
    const unsub = communityService.onStateChange(() => {
      targetRef.current = Number(communityService.getNextResetAt());
      tick();
    });

    return () => {
      clearInterval(id);
      unsub();
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    };
  }, [pulseAnim]);

  // Computed fresh every render — never stale
  const remaining = Math.max(0, targetRef.current - Date.now());

  const hours   = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  let label: string;
  if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    label = `${minutes}m ${seconds}s`;
  } else {
    label = `${seconds}s`;
  }

  // Color thresholds: green 12-24h, orange 4-12h, red <4h
  let color: string;
  let bgColor: string;
  let borderColor: string;
  if (remaining > 12 * 3600000) {
    color = '#1D9E50';
    bgColor = 'rgba(52, 199, 89, 0.08)';
    borderColor = 'rgba(52, 199, 89, 0.25)';
  } else if (remaining > 4 * 3600000) {
    color = '#C96B00';
    bgColor = 'rgba(255, 141, 40, 0.08)';
    borderColor = 'rgba(255, 141, 40, 0.25)';
  } else {
    color = '#D92D20';
    bgColor = 'rgba(255, 56, 60, 0.08)';
    borderColor = 'rgba(255, 56, 60, 0.25)';
  }

  return (
    <>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setInfoVisible(true)} accessibilityRole="button" accessibilityLabel={`Daily reset timer, ${label} remaining`}>
        <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, timerPillStyles.container, {
          backgroundColor: bgColor,
          borderColor,
        }]}>
          <EvaIcon name="clock" variant="outline" size={13} color={color} />
          <Text style={[timerPillStyles.label, { color }]}>{label}</Text>
        </Animated.View>
      </TouchableOpacity>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={timerInfoStyles.overlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <View style={timerInfoStyles.card}>
            <Text style={timerInfoStyles.title}>Daily Reset</Text>
            <Text style={timerInfoStyles.body}>
              New proposals drop every day at 7 PM. Come back to vote on new matches and maybe get a match yourself!
            </Text>
            <TouchableOpacity style={timerInfoStyles.btn} onPress={() => setInfoVisible(false)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Dismiss daily reset info">
              <Text style={timerInfoStyles.btnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Empty state (no friends yet) ──────────────────────────────────────────────
interface EmptyStateProps {
  onInvite: () => void;
}

export function EmptyState({ onInvite }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      {/* Lottie animation centerpiece */}
      <LottieView
        source={require('../../../assets/Icons/AnimatedIcons/add-account.json')}
        autoPlay
        loop
        speed={0.5}
        style={styles.emptyLottie}
      />

      <Text style={styles.emptyHeroText}>
        Add your crew
      </Text>
      <Text style={styles.emptySubtext}>
        Your friends pick your matches.{'\n'}Invite from contacts to get started.
      </Text>

      {/* Primary CTA — Invite from Contacts */}
      <TouchableOpacity
        style={styles.inviteContactsButton}
        activeOpacity={0.85}
        onPress={onInvite}
        accessibilityRole="button"
        accessibilityLabel="Invite from contacts"
      >
        <EvaIcon name="people" variant="outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.inviteContactsButtonText}>Invite from Contacts</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Invite banner (< 5 friends) ──────────────────────────────────────────────
interface InviteBannerProps {
  avatarFriends: FriendWithGridStatus[];
  onPress: () => void;
}

export function InviteBanner({ avatarFriends, onPress }: InviteBannerProps) {
  return (
    <TouchableOpacity
      style={styles.crewBanner}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add your people, invite from contacts"
    >
      <View style={styles.crewAvatarRow}>
        {avatarFriends.map((f, i) => (
          <Image
            key={f.friendId}
            source={f.friend.photos?.[0]?.url ? { uri: getOptimizedPhotoUrl(f.friend.photos[0].url, 'avatar')! } : null}
            placeholder={f.friend.photos?.[0]?.blurhash ? { blurhash: f.friend.photos[0].blurhash } : undefined}
            style={[styles.crewAvatar, i > 0 && { marginLeft: -10 }]}
            transition={300}
          />
        ))}
        <View style={[styles.crewAddCircle, avatarFriends.length > 0 && { marginLeft: -10 }]}>
          <EvaIcon name="plus" variant="outline" size={16} color={COLORS.primaryButton} />
        </View>
      </View>
      <Text style={styles.crewBannerHeadline}>Add your people</Text>
    </TouchableOpacity>
  );
}

// ── Impact card (>= 5 friends) ───────────────────────────────────────────────
interface ImpactCardProps {
  totalAssists: number;
}

export function ImpactCard({ totalAssists }: ImpactCardProps) {
  return (
    <View style={styles.impactCard}>
      <EvaIcon name="heart" variant="outline" size={22} color={COLORS.primaryButton} />
      <Text style={styles.impactText}>
        {totalAssists > 0
          ? `You've helped make ${totalAssists} match${totalAssists === 1 ? '' : 'es'}`
          : 'Your votes matter! Help friends find their match.'}
      </Text>
    </View>
  );
}

// ── Caught-up footer ─────────────────────────────────────────────────────────
export function CaughtUpFooter() {
  return (
    <Text style={styles.caughtUpFooter}>
      All caught up — new proposals drop at 7 PM
    </Text>
  );
}

// ── How Bridge Works card ─────────────────────────────────────────────────────

const HOW_IT_WORKS_DISMISSED_KEY = '@bridge_how_it_works_dismissed';

const HOW_IT_WORKS_STEPS = [
  {
    icon: 'flash' as const,
    color: COLORS.primaryButton,
    label: 'A pairing is proposed by the algorithm or a friend',
  },
  {
    icon: 'people' as const,
    color: COLORS.emerald,
    label: 'Your community votes to approve or reject it',
  },
  {
    icon: 'checkmark-circle-2' as const,
    color: COLORS.primaryButton,
    label: 'Only approved pairings become matches — no open feed',
  },
];

export function HowItWorksCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HOW_IT_WORKS_DISMISSED_KEY).then(val => {
      if (val !== 'true') setVisible(true);
    }).catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(HOW_IT_WORKS_DISMISSED_KEY, 'true').catch(() => {});
  }, []);

  if (!visible) return null;

  return (
    <View style={howStyles.card}>
      <View style={howStyles.howHeader}>
        <Text style={howStyles.heading}>How Bridge works</Text>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss"
        >
          <EvaIcon name="close" variant="outline" size={16} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>

      {HOW_IT_WORKS_STEPS.map((step, i) => (
        <View key={i} style={howStyles.stepRow}>
          <View style={[howStyles.iconDot, { backgroundColor: step.color + '18' }]}>
            <EvaIcon name={step.icon} variant="outline" size={14} color={step.color} />
          </View>
          <Text style={howStyles.stepText}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}

const howStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#EEF3FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4E0FF',
  },
  howHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryButton,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  iconDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.muted,
    lineHeight: LINE_HEIGHTS.xs,
  },
});

// ── Handler map builders ─────────────────────────────────────────────────────

type HandlerMap = Record<string, () => void>;

/** Build per-friend callback maps for the "help your friends" list */
export function buildVoteHandlers(
  usersToMatch: FriendWithGridStatus[],
  navigation: any,
): { viewProfile: HandlerMap; matchHandlers: HandlerMap } {
  const viewProfile: HandlerMap = {};
  const matchHandlers: HandlerMap = {};
  for (const user of usersToMatch) {
    viewProfile[user.friendId] = () => {
      const photoUrl = getOptimizedPhotoUrl(user.friend.photos?.[0]?.url, 'profile');
      if (photoUrl) Image.prefetch(photoUrl).catch(() => {});
      navigation.navigate('ProfileView', { profile: user.friend });
    };
    matchHandlers[user.friendId] = () =>
      navigation.navigate('FriendProposal', {
        friendId: user.friendId,
        friendName: user.friend.firstName,
        friendPhotoUrl: user.friend.photos?.[0]?.url,
        friendAge: user.friend.age,
        friendJob: user.friend.currentJob,
      });
  }
  return { viewProfile, matchHandlers };
}

/** Build per-friend callback maps for the "your crew" list */
export function buildCrewHandlers(
  alreadyHelped: FriendWithGridStatus[],
  navigation: any,
  onBadgePress: (friendId: string, friendName: string) => void,
  onCrushPress?: (friendId: string, friendName: string) => void,
): { viewProfile: HandlerMap; chatHandlers: HandlerMap; badgeHandlers: HandlerMap; crushHandlers: HandlerMap } {
  const viewProfile: HandlerMap = {};
  const chatHandlers: HandlerMap = {};
  const badgeHandlers: HandlerMap = {};
  const crushHandlers: HandlerMap = {};
  for (const user of alreadyHelped) {
    viewProfile[user.friendId] = () => {
      const photoUrl = getOptimizedPhotoUrl(user.friend.photos?.[0]?.url, 'profile');
      if (photoUrl) Image.prefetch(photoUrl).catch(() => {});
      navigation.navigate('ProfileView', { profile: user.friend });
    };
    chatHandlers[user.friendId] = () =>
      navigation.navigate('Chat', {
        friendshipId: user.friendshipId,
        recipientId: user.friendId,
        recipientName: user.friend.firstName,
        recipientPhoto: user.friend.photos?.[0]?.url,
        isFriendChat: true,
      });
    badgeHandlers[user.friendId] = () =>
      onBadgePress(user.friendId, user.friend.firstName || 'Friend');
    if (onCrushPress) {
      crushHandlers[user.friendId] = () =>
        onCrushPress(user.friendId, user.friend.firstName || 'Friend');
    }
  }
  return { viewProfile, chatHandlers, badgeHandlers, crushHandlers };
}

// ── Pending Friend Requests Section ──────────────────────────────────────────

interface PendingRequestsSectionProps {
  requests: FriendRequest[];
  processingIds: Set<string>;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

/**
 * Renders incoming friend requests pinned above all other community content.
 * Returns null when there are no pending requests — no empty state shown.
 */
export function PendingRequestsSection({
  requests,
  processingIds,
  onAccept,
  onDecline,
}: PendingRequestsSectionProps) {
  if (requests.length === 0) return null;

  return (
    <View style={requestStyles.container}>
      <View style={requestStyles.header}>
        <View style={[requestStyles.accent, { backgroundColor: '#22C55E' }]} />
        <Text style={requestStyles.title}>FRIEND REQUESTS</Text>
        <View style={requestStyles.badge}>
          <Text style={requestStyles.badgeText}>{requests.length}</Text>
        </View>
      </View>
      <View style={requestStyles.cardList}>
        {requests.map(req => (
          <FriendRequestCard
            key={req.id}
            request={req}
            onAccept={() => onAccept(req.id)}
            onDecline={() => onDecline(req.id)}
            isProcessing={processingIds.has(req.id)}
          />
        ))}
      </View>
    </View>
  );
}

const requestStyles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
    gap: 8,
  },
  accent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  badgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#FFFFFF',
  },
  cardList: {
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
  },
});

// ── Styles ───────────────────────────────────────────────────────────────────

const timerPillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 34,
    gap: 4,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
  },
});

const timerInfoStyles = StyleSheet.create({
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
    alignItems: 'center',
    ...SHADOWS.xxl,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text.heading,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: COLORS.primaryButton,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  btnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.card,
  },
});

export const styles = StyleSheet.create({
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 24 },
  emptyLottie: {
    width: 260,
    height: 260,
    marginBottom: 16,
  },
  emptyHeroText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: FONT_SIZES['4xl'],
    lineHeight: LINE_HEIGHTS['4xl'],
    color: COLORS.text.heading,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    width: '100%',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    color: COLORS.text.light,
    textAlign: 'center',
    marginBottom: 28,
  },
  tagline: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES['3xl'], lineHeight: 26, color: COLORS.text.primary, textAlign: 'center', marginBottom: 12 },
  illustration: { width: 300, height: 300, marginBottom: 32 },
  subtitle: { fontFamily: FONTS.semiBold, fontSize: 17, lineHeight: 24, color: COLORS.text.primary, textAlign: 'center', marginBottom: 20, width: '100%' },
  ctaButton: {
    backgroundColor: COLORS.primaryAccent,
    width: 250,
    height: 47,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accentBlue,
  },
  ctaText: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.lg, color: COLORS.card },
  crewBanner: {
    backgroundColor: COLORS.backgroundFriendActive,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderPeriwinkle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.sm,
  },
  crewAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.backgroundFriendActive,
    backgroundColor: COLORS.backgroundGrayMedium,
  },
  crewAddCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primaryButton,
    borderStyle: 'dashed',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewBannerHeadline: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.textDarkHeading,
    flex: 1,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundBlueTint,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderPeriwinkle,
    gap: 12,
    ...SHADOWS.sm,
  },
  impactText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.primaryButton,
    flex: 1,
  },
  inviteContactsButton: {
    backgroundColor: COLORS.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 50,
    borderRadius: 9999,
    ...SHADOWS.accentBlue,
    marginBottom: 24,
  },
  inviteContactsButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: FONT_SIZES['6xl'],
    lineHeight: 38,
    color: COLORS.text.black,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFriendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.backgroundBlueTint,
    borderWidth: 1,
    borderColor: COLORS.borderPeriwinkle,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  voteListBg: {
    backgroundColor: 'rgba(43, 101, 249, 0.02)',
  },
  // ── Help count badge ──────────────────────────────────────────
  helpCountBadge: {
    backgroundColor: COLORS.primaryButton,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  helpCountText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.card,
  },
  // ── Suggest a Match row ───────────────────────────────────────────
  suggestMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EDFB',
  },
  suggestMatchText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
  },
  // ── Caught up footer ──────────────────────────────────────────────
  caughtUpFooter: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.placeholder,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});
