/**
 * CommunityScreen Components
 * Extracted from CommunityScreen.tsx for maintainability.
 */

import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Image } from 'expo-image';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { EvaIcon } from '../../components/icons';
import { communityService } from '../../services/communityServiceIndex';
import { FriendWithGridStatus } from '../../types/community';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS, OVERLAYS } from '../../theme/shadows';
import { FriendRequestCard } from '../../components/friends/FriendRequestCard';
import { FriendRequest } from '../../services/friendService';

// ── Responsive sizing ────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const isCompact = SCREEN_WIDTH < 380; // iPhone SE / 8 = 375pt
const LOTTIE_SIZE = isCompact ? 200 : 260;
const INVITE_BTN_WIDTH = Math.min(280, SCREEN_WIDTH - 64); // 32px padding each side
const SECTION_H_PADDING = isCompact ? 16 : 24;

// Maximum pending requests to render before showing an overflow indicator.
// Prevents layout bloat when a popular user has dozens of incoming requests.
const MAX_VISIBLE_REQUESTS = 5;

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
  if (remaining === 0) {
    // Timer hit zero — reset is in progress, avoid showing bare "0s"
    label = 'Resetting\u2026';
  } else if (hours > 0) {
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
            <Text style={timerInfoStyles.title}>Fresh matches at 7 PM</Text>
            <Text style={timerInfoStyles.body}>
              Every evening, new pairings show up for your friends. Pop in, share your take, and see who Bridge has in mind for you too.
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

// ── Inline load error ────────────────────────────────────────────────────────
// Replaces Alert.alert — shows a dismissible inline card with a retry button.

interface InlineLoadErrorProps {
  onRetry: () => void;
}

export function InlineLoadError({ onRetry }: InlineLoadErrorProps) {
  return (
    <View style={inlineErrorStyles.container}>
      <EvaIcon name="wifi-off" variant="outline" size={20} color={COLORS.error} />
      <Text style={inlineErrorStyles.message}>
        Couldn't load your community. Check your connection and try again.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={inlineErrorStyles.retryBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Retry loading community data"
      >
        <EvaIcon name="refresh" variant="outline" size={16} color={COLORS.primaryButton} />
        <Text style={inlineErrorStyles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const inlineErrorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  message: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    color: COLORS.text.secondary,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundBlueTint,
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryButton,
  },
});

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
        Bring your people
      </Text>
      <Text style={styles.emptySubtext}>
        The friends you trust most pick who you meet.{'\n'}Start by inviting a few from your contacts.
      </Text>

      {/* Primary CTA — Invite from Contacts */}
      <TouchableOpacity
        style={styles.inviteContactsButton}
        activeOpacity={0.85}
        onPress={onInvite}
        accessibilityRole="button"
        accessibilityLabel="Invite from contacts"
      >
        <EvaIcon name="people" variant="outline" size={20} color={COLORS.card} style={{ marginRight: 8 }} />
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
      <Text style={styles.crewBannerHeadline}>Grow your crew</Text>
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
          ? `You've played a part in ${totalAssists} match${totalAssists === 1 ? '' : 'es'} so far`
          : 'Every vote brings a friend closer to finding their person.'}
      </Text>
    </View>
  );
}

// ── Caught-up footer ─────────────────────────────────────────────────────────
export function CaughtUpFooter() {
  return (
    <Text style={styles.caughtUpFooter}>
      You're all set for now — check back at 7 PM for new matches
    </Text>
  );
}

// ── How Bridge Works card ─────────────────────────────────────────────────────

const HOW_IT_WORKS_DISMISSED_KEY = '@bridge_how_it_works_dismissed';

const HOW_IT_WORKS_STEPS = [
  {
    icon: 'flash' as const,
    color: COLORS.primaryButton,
    label: 'Someone gets suggested for your friend — by Bridge or by you',
  },
  {
    icon: 'people' as const,
    color: COLORS.emerald,
    label: 'Friends weigh in together on whether it\'s a good fit',
  },
  {
    icon: 'checkmark-circle-2' as const,
    color: COLORS.primaryButton,
    label: 'Only friend-approved matches go through — no swiping, no guessing',
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
    backgroundColor: COLORS.backgroundFriendActive,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderPeriwinkle,
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
 * Caps visible cards at MAX_VISIBLE_REQUESTS to prevent scroll bloat; shows
 * an overflow count so users know there are more.
 */
export function PendingRequestsSection({
  requests,
  processingIds,
  onAccept,
  onDecline,
}: PendingRequestsSectionProps) {
  if (requests.length === 0) return null;

  const visibleRequests = requests.slice(0, MAX_VISIBLE_REQUESTS);
  const overflowCount = requests.length - visibleRequests.length;

  return (
    <View style={requestStyles.container}>
      <View style={requestStyles.header}>
        <View style={[requestStyles.accent, { backgroundColor: COLORS.match.icon }]} />
        <Text style={requestStyles.title}>FRIEND REQUESTS</Text>
        <View style={requestStyles.badge}>
          <Text style={requestStyles.badgeText}>{requests.length}</Text>
        </View>
      </View>
      <View style={requestStyles.cardList}>
        {visibleRequests.map(req => (
          <FriendRequestCard
            key={req.id}
            request={req}
            onAccept={() => onAccept(req.id)}
            onDecline={() => onDecline(req.id)}
            isProcessing={processingIds.has(req.id)}
          />
        ))}
        {overflowCount > 0 && (
          <View style={requestStyles.overflowRow}>
            <Text style={requestStyles.overflowText}>
              +{overflowCount} more request{overflowCount === 1 ? '' : 's'}
            </Text>
          </View>
        )}
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
    paddingHorizontal: SECTION_H_PADDING,
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
    backgroundColor: COLORS.match.icon,
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
    color: COLORS.card,
  },
  cardList: {
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
  },
  overflowRow: {
    paddingVertical: 10,
    paddingHorizontal: SECTION_H_PADDING,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSubtle,
  },
  overflowText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
  },
});

// ── Styles ───────────────────────────────────────────────────────────────────

const timerPillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: isCompact ? 6 : 8,
    height: isCompact ? 30 : 34,
    gap: 4,
  },
  label: {
    fontSize: isCompact ? FONT_SIZES.sm : FONT_SIZES.md,
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
    lineHeight: LINE_HEIGHTS.lg,
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
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isCompact ? 24 : 32, paddingBottom: 24 },
  emptyLottie: {
    width: LOTTIE_SIZE,
    height: LOTTIE_SIZE,
    marginBottom: isCompact ? 8 : 16,
  },
  emptyHeroText: {
    fontFamily: FONTS.bold,
    fontSize: isCompact ? FONT_SIZES['3xl'] : FONT_SIZES['4xl'],
    lineHeight: isCompact ? LINE_HEIGHTS['3xl'] : LINE_HEIGHTS['4xl'],
    color: COLORS.text.heading,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    width: '100%',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: isCompact ? FONT_SIZES.md : FONT_SIZES.base,
    lineHeight: isCompact ? LINE_HEIGHTS.md : LINE_HEIGHTS.base,
    color: COLORS.text.light,
    textAlign: 'center',
    marginBottom: isCompact ? 20 : 28,
  },
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
    width: INVITE_BTN_WIDTH,
    height: isCompact ? 46 : 50,
    borderRadius: 9999,
    ...SHADOWS.accentBlue,
    marginBottom: 24,
  },
  inviteContactsButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: isCompact ? FONT_SIZES.lg : FONT_SIZES.xl,
    color: COLORS.card,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: isCompact ? FONT_SIZES['4xl'] : FONT_SIZES['5xl'],
    lineHeight: isCompact ? LINE_HEIGHTS['4xl'] : LINE_HEIGHTS['5xl'],
    color: COLORS.text.black,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isCompact ? 6 : 8,
  },
  addFriendBtn: {
    width: isCompact ? 30 : 34,
    height: isCompact ? 30 : 34,
    borderRadius: isCompact ? 15 : 17,
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
    paddingHorizontal: SECTION_H_PADDING,
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
    backgroundColor: COLORS.backgroundBlueTint,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderPeriwinkle,
    paddingVertical: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.borderWarm,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
  },
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
  crewListContainer: {
    paddingBottom: 32,
  },
  caughtUpFooter: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.placeholder,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: SECTION_H_PADDING,
  },
});
