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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isCompact = SCREEN_WIDTH < 380; // iPhone SE / 8 = 375pt
const LOTTIE_SIZE = Math.round(Math.min(SCREEN_HEIGHT * 0.28, 260));
const INVITE_BTN_WIDTH = Math.min(280, SCREEN_WIDTH - 64); // 32px padding each side
const SECTION_H_PADDING = isCompact ? 16 : 24;

// Maximum pending requests to render before showing an overflow indicator.
// Prevents layout bloat when a popular user has dozens of incoming requests.
const MAX_VISIBLE_REQUESTS = 5;

/** Split friends into needs-help vs already-helped, sorted by karma (highest first) */
export function partitionFriends(friends: FriendWithGridStatus[]) {
  const toMatch: FriendWithGridStatus[] = [];
  const helped: FriendWithGridStatus[] = [];
  // Single pass partition — avoids two filter() calls that each scan the full array
  for (const f of friends) {
    if (f.hasCompletedGrid) {
      helped.push(f);
    } else {
      toMatch.push(f);
    }
  }
  // Sort helped by karma descending — higher karma = better rank = appears first.
  // Direct numeric compare avoids the old getApproxRank linear-scan per comparison.
  helped.sort((a, b) =>
    (b.karmaScore?.karmaPoints ?? 0) - (a.karmaScore?.karmaPoints ?? 0)
  );
  return { toMatch, helped };
}

/** Compute activity status line for a crew member */
export function getFriendStatusLine(
  user: FriendWithGridStatus,
): { text: string; color?: string } | undefined {
  if (user.isMatched) return { text: 'Has a match!', color: COLORS.success };
  const assists = user.assistsCount || 0;
  if (assists > 0) return { text: `${assists} match${assists === 1 ? '' : 'es'} made`, color: COLORS.success };
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

  // Color thresholds — urgency builds gradually over the ~7h cycle:
  //   Green  >3h  — plenty of time, no pressure
  //   Amber  1-3h — time is getting limited, gentle nudge
  //   Red    <1h  — urgent, vote now or miss the window
  let color: string;
  let bgColor: string;
  let borderColor: string;
  if (remaining > 3 * 3600000) {
    color = COLORS.success;
    bgColor = 'rgba(52, 199, 89, 0.08)';
    borderColor = 'rgba(52, 199, 89, 0.25)';
  } else if (remaining > 1 * 3600000) {
    color = COLORS.amber;
    bgColor = 'rgba(245, 158, 11, 0.08)';
    borderColor = 'rgba(245, 158, 11, 0.25)';
  } else {
    color = COLORS.error;
    bgColor = 'rgba(239, 68, 68, 0.08)';
    borderColor = 'rgba(239, 68, 68, 0.25)';
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
              Every evening, 3 pairings from the community show up first. Vote on those, then help your friends find their person.
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
        <EvaIcon name="refresh" variant="outline" size={16} color={COLORS.primaryAccent} />
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
    backgroundColor: COLORS.card,
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryAccent,
  },
});

// ── Empty state (no friends yet) ──────────────────────────────────────────────
interface EmptyStateProps {
  onInvite: () => void;
  isMatchmaker?: boolean;
}

export function EmptyState({ onInvite, isMatchmaker }: EmptyStateProps) {
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
        {isMatchmaker
          ? 'Invite friends and help them find their person.'
          : 'The friends you trust most pick who you meet.\nStart by inviting a few from your contacts.'}
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
        {avatarFriends.map((f, i) => {
          const photoUrl = f.friend.photos?.[0]?.url;
          if (photoUrl) {
            return (
              <Image
                key={f.friendId}
                source={{ uri: getOptimizedPhotoUrl(photoUrl, 'avatar')! }}
                placeholder={f.friend.photos?.[0]?.blurhash ? { blurhash: f.friend.photos[0].blurhash } : undefined}
                style={[styles.crewAvatar, i > 0 && { marginLeft: -10 }]}
                transition={300}
              />
            );
          }
          // No-photo fallback: show initials circle
          const initial = (f.friend.firstName?.[0] ?? '?').toUpperCase();
          return (
            <View
              key={f.friendId}
              style={[
                styles.crewAvatar,
                i > 0 && { marginLeft: -10 },
                { alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.sm, color: COLORS.text.secondary }}>
                {initial}
              </Text>
            </View>
          );
        })}
        <View style={[styles.crewAddCircle, avatarFriends.length > 0 && { marginLeft: -10 }]}>
          <EvaIcon name="plus" variant="outline" size={16} color={COLORS.primaryAccent} />
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
      <EvaIcon name="heart" variant="outline" size={22} color={COLORS.primaryAccent} />
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
    <View style={styles.caughtUpContainer}>
      <EvaIcon name="checkmark-circle-2" variant="outline" size={16} color={COLORS.primaryAccent} />
      <Text style={styles.caughtUpFooter}>
        You're all set — check back at 7 PM for new matches
      </Text>
    </View>
  );
}

// ── How Bridge Works card ─────────────────────────────────────────────────────

const HOW_IT_WORKS_DISMISSED_KEY = '@bridge_how_it_works_dismissed';

const HOW_IT_WORKS_STEPS = [
  {
    icon: 'flash' as const,
    color: COLORS.primaryAccent,
    label: 'Someone gets suggested for your friend — by Bridge or by you',
  },
  {
    icon: 'people' as const,
    color: COLORS.primaryAccent,
    label: 'Friends weigh in together on whether it\'s a good fit',
  },
  {
    icon: 'checkmark-circle-2' as const,
    color: COLORS.primaryAccent,
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
        <Text style={howStyles.heading} accessibilityRole="header">How Bridge works</Text>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss how Bridge works card"
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(67, 127, 255, 0.15)',
  },
  howHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
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
    color: COLORS.text.secondary,
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
        <View style={[requestStyles.accent, { backgroundColor: COLORS.primaryAccent }]} />
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
    color: COLORS.text.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: COLORS.primaryAccent,
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
    borderColor: COLORS.border,
  },
  overflowRow: {
    paddingVertical: 10,
    paddingHorizontal: SECTION_H_PADDING,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
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
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.lg,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: COLORS.primary,
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
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isCompact ? 24 : 32, paddingBottom: 24, backgroundColor: COLORS.screenBackground },
  emptyLottie: {
    width: LOTTIE_SIZE,
    height: LOTTIE_SIZE,
    marginBottom: 2,
    marginRight: 20,
  },
  emptyHeroText: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: isCompact ? FONT_SIZES['3xl'] : FONT_SIZES['4xl'],
    lineHeight: isCompact ? LINE_HEIGHTS['3xl'] : LINE_HEIGHTS['4xl'],
    color: COLORS.text.primary,
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: -0.3,
    width: '100%',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: isCompact ? FONT_SIZES.md : FONT_SIZES.base,
    lineHeight: isCompact ? LINE_HEIGHTS.md : LINE_HEIGHTS.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: isCompact ? 20 : 28,
  },
  crewBanner: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.card,
    backgroundColor: '#E5E7EB',
  },
  crewAddCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primaryAccent,
    borderStyle: 'dashed',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewBannerHeadline: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    flex: 1,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 12,
  },
  impactText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    flex: 1,
  },
  inviteContactsButton: {
    backgroundColor: COLORS.primary,
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
    // fontWeight must stay explicit — setDefaultFonts.ts only injects a derived
    // weight when none is present, so this is never stripped. Keeping it ensures
    // iOS renders the correct 700-weight variant even if fontFamily alone is set.
    fontWeight: '700' as const,
    fontSize: FONT_SIZES['5xl'],
    lineHeight: LINE_HEIGHTS['5xl'],
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
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
    color: COLORS.text.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  voteListBg: {
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  helpCountBadge: {
    backgroundColor: COLORS.primaryAccent,
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
  crewCountBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  crewListContainer: {
    paddingBottom: 16,
  },
  caughtUpContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: SECTION_H_PADDING,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: COLORS.primaryTint,
    borderRadius: 12,
  },
  caughtUpFooter: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.tertiary,
    textAlign: 'center' as const,
  },
});
