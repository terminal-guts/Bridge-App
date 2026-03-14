import React, { useState, useEffect, useCallback, useRef, useReducer, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal } from 'react-native';
import ReanimatedAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
    Easing,
} from 'react-native-reanimated';

import LottieView from 'lottie-react-native';
import { UserRow } from '../../components/community/UserRow';
import { StaggerItem } from '../../hooks/useStaggeredList';
import { ProposalReviewView } from '../../components/community/proposal/ProposalReviewView';
import { GuideTarget } from '../../components/guides';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { Image } from 'expo-image';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { communityService } from '../../services/communityServiceIndex';
import { getUserFriendCode } from '../../services/friendService';
import { FriendWithGridStatus } from '../../types/community';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { useGuide } from '../../hooks/useGuide';
import { beginnerTourGuide } from '../../config/guides';
import { CommunitySkeleton } from '../../components/ui/SkeletonLoader';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS } from '../../theme/shadows';
import { ScreenWrapper } from '../../components/ui';
import { getLast7PMCentral } from '../../utils/centralTime';
import { lightHaptic, successHaptic } from '../../utils/haptics';
import { getFriendUnreadCount, getBatchUnreadFriendIds } from '../../services/messageService';
import { getActiveSuggestions } from '../../services/friendProposalService';
import { showToast } from '../../utils/toast';
import { BadgeAwardModal } from '../../components/badges/BadgeAwardModal';
import { getBadgeForFriend } from '../../services/badgeService';
import { FriendBadge } from '../../types/badges';

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
function partitionFriends(friends: FriendWithGridStatus[]) {
  const toMatch = friends.filter(f => !f.hasCompletedGrid);
  const helped = friends
    .filter(f => f.hasCompletedGrid)
    .sort((a, b) =>
      getApproxRank(a.karmaScore?.karmaPoints ?? 0) - getApproxRank(b.karmaScore?.karmaPoints ?? 0)
    );
  return { toMatch, helped };
}

/** Compute activity status line for a crew member */
function getFriendStatusLine(
  user: FriendWithGridStatus,
  suggestionsMap?: Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>,
): string | undefined {
  // Show suggestion indicator (takes priority over assists count)
  const suggestion = suggestionsMap?.get(user.friend.userId || '');
  if (suggestion) return `Suggested for ${suggestion.suggestedForName}`;
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
function MatchResetTimer() {
  // Target timestamp (epoch ms) from the service
  const targetRef = useRef(Number(communityService.getNextResetAt()));
  // Incrementing counter just to force a re-render every second
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const [infoVisible, setInfoVisible] = useState(false);
  const pulseAnim = useSharedValue(1);
  const pulsingRef = useRef(false);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));

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
        pulseAnim.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ), -1, false
        );
      } else if (!shouldPulse && pulsingRef.current) {
        pulsingRef.current = false;
        cancelAnimation(pulseAnim);
        pulseAnim.value = 1;
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
      cancelAnimation(pulseAnim);
    };
  }, []);

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
      <TouchableOpacity activeOpacity={0.7} onPress={() => setInfoVisible(true)}>
        <ReanimatedAnimated.View style={[pulseStyle, {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor,
          borderRadius: 10,
          paddingHorizontal: 9,
          height: 34,
          gap: 5,
        }]}>
          <EvaIcon name="clock" variant="outline" size={13} color={color} />
          <Text style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.semiBold, color }}>{label}</Text>
        </ReanimatedAnimated.View>
      </TouchableOpacity>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={timerInfoStyles.overlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <View style={timerInfoStyles.card}>
            <Text style={timerInfoStyles.title}>Daily Reset</Text>
            <Text style={timerInfoStyles.body}>
              New proposals drop every day at 7 PM. Come back to vote on new matches and maybe get a match yourself!
            </Text>
            <TouchableOpacity style={timerInfoStyles.btn} onPress={() => setInfoVisible(false)} activeOpacity={0.85}>
              <Text style={timerInfoStyles.btnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

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
    paddingBottom: 22,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['2xl'],
    color: '#101828',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: '#667085',
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

interface CommunityScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Community'>;
}


export function CommunityScreen({ navigation }: CommunityScreenProps) {
  const { startGuideIfNeeded } = useGuide();
  const [usersToMatch, setUsersToMatch] = useState<FriendWithGridStatus[]>([]);
  const [alreadyHelped, setAlreadyHelped] = useState<FriendWithGridStatus[]>([]);
  const [loading, setLoading] = useState(true);
  // null = still checking, true = can see friends area, false = must vote first
  const [hasCompletedVoting, setHasCompletedVoting] = useState<boolean | null>(null);
  const [friendCode, setFriendCode] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [suggestionsMap, setSuggestionsMap] = useState<Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>>(new Map());

  // Badge award modal state
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [badgeTargetFriend, setBadgeTargetFriend] = useState<{ id: string; name: string } | null>(null);
  const [existingBadge, setExistingBadge] = useState<FriendBadge | null>(null);

  const handleBadgePress = useCallback(async (friendId: string, friendName: string) => {
    const result = await getBadgeForFriend(friendId);
    if (result.ok) {
      setExistingBadge(result.data || null);
    }
    setBadgeTargetFriend({ id: friendId, name: friendName });
    setBadgeModalVisible(true);
  }, []);

  const loadUnreadCounts = useCallback(async (friends: FriendWithGridStatus[]) => {
    if (!profile?.userId || friends.length === 0) return;
    try {
      // Single query for all friends instead of N parallel queries
      const unreadSet = await getBatchUnreadFriendIds(
        profile.userId,
        friends.map(f => f.friendId),
      );
      const map: Record<string, boolean> = {};
      for (const id of unreadSet) {
        map[id] = true;
      }
      setUnreadMap(map);
    } catch {
      // Silent fail — unread dots are non-critical
    }
  }, [profile?.userId]);

  const loadFriendsData = useCallback(async () => {
    try {
      const [data, codeRes, suggestions] = await Promise.all([
        communityService.getFriendsAreaData(),
        getUserFriendCode(),
        getActiveSuggestions(),
      ]);

      if (codeRes.ok && codeRes.data) {
        setFriendCode(codeRes.data.code);
      }
      setSuggestionsMap(suggestions);

      const { toMatch, helped } = partitionFriends(data.friends);
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);

      // Load unread counts for sitting tight friends (they have chat)
      loadUnreadCounts(helped);
    } catch (error) {
      console.error("Failed to load community data:", error);
      Alert.alert('Error', 'Failed to load community data. Pull down to refresh.');
    }
  }, [loadUnreadCounts]);

  const onRefresh = useCallback(async () => {
    lightHaptic();
    setRefreshing(true);
    // Invalidate in-memory + AsyncStorage cache so pull-to-refresh always fetches fresh data
    if ('invalidateFriendsCache' in communityService) {
      (communityService as any).invalidateFriendsCache();
    }
    try {
      await Promise.all([
        loadFriendsData(),
        getUserProfile().then(result => {
          if (result.ok && result.data) setProfile(result.data);
        }),
      ]);
    } catch (error) {
      console.error('Pull-to-refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadFriendsData]);

  const initialize = useCallback(async () => {
    const cycleId = String(getLast7PMCentral());

    // ── Fast path: try to render from cache instantly ──────────────────────
    const [cachedVoting, cachedFriends] = await Promise.all([
      communityService.getCachedVotingComplete(cycleId),
      communityService.getCachedFriendsArea(),
    ]);

    // If we have a cached "voting done" and cached friends, render immediately
    if (cachedVoting === true && cachedFriends) {
      const { toMatch, helped } = partitionFriends(cachedFriends);
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);
      setHasCompletedVoting(true);
      setLoading(false);

      // Background revalidate — update state silently if data changed
      Promise.all([
        loadFriendsData(),
        getUserProfile().then(result => {
          if (result.ok && result.data) setProfile(result.data);
        }),
        // Re-check voting gate in background to self-correct if vote was removed
        (async () => {
          const task = await communityService.getCommunityTaskProgress();
          let votingDone = task.hasVotedOnProposals;
          if (!votingDone) {
            const available = await communityService.getProposalsToVote();
            if (available.length === 0) votingDone = true;
          }
          // Only cache if user actually voted 3+ times; never cache "no proposals"
          if (task.hasVotedOnProposals) {
            communityService.cacheVotingComplete(true, cycleId).catch(() => {});
          } else {
            // Clear any stale cache so new proposals trigger the gate
            communityService.cacheVotingComplete(false, cycleId).catch(() => {});
          }
          if (!votingDone) setHasCompletedVoting(false);
        })(),
      ]).catch(() => {});
      return;
    }

    // ── Slow path: no cache, full network init ────────────────────────────
    setLoading(true);
    try {
      const profilePromise = getUserProfile().then(result => {
        if (result.ok && result.data) setProfile(result.data);
      });

      // Fire voting gate queries in parallel with communityService.ready —
      // they don't depend on the timer state, just on Supabase auth
      const [, task, available] = await Promise.all([
        communityService.ready,
        communityService.getCommunityTaskProgress(),
        communityService.getProposalsToVote(),
      ]);
      let votingDone = task.hasVotedOnProposals;

      if (!votingDone) {
        if (available.length === 0) {
          votingDone = true;
        }
      }

      // Only cache "done" if user actually voted on 3+ proposals this cycle.
      // If votingDone is true merely because no proposals exist yet, don't cache —
      // new proposals may appear later in the same cycle.
      if (task.hasVotedOnProposals) {
        communityService.cacheVotingComplete(true, cycleId).catch(() => {});
      }

      setHasCompletedVoting(votingDone);
      if (votingDone) {
        await loadFriendsData();
      }

      await profilePromise;
    } catch (error) {
      console.error("Failed to check task progress:", error);
      setHasCompletedVoting(false);
    } finally {
      setLoading(false);
    }
  }, [loadFriendsData]);

  // Ref must be declared before the useEffect that references it
  const initializedRef = useRef(false);

  useEffect(() => {
    initialize();

    // Reload whenever the dev state toggle changes mock state
    return communityService.onStateChange(() => {
      initializedRef.current = true; // prevent useFocusEffect double-load
      initialize();
    });
  }, [initialize]);
  // Single focus handler: refresh profile + friends + guide on every tab/screen focus
  useFocusEffect(useCallback(() => {
    // Check if beginner tour should play (first visit or re-enabled from Settings)
    startGuideIfNeeded(beginnerTourGuide);

    if (!initializedRef.current) {
      initializedRef.current = true;
      return; // skip first focus (handled by the init useEffect)
    }

    // Skip refetch if data was loaded very recently (rapid tab switching)
    const lastLoad = 'getLastFriendsAreaLoadTime' in communityService
      ? (communityService as any).getLastFriendsAreaLoadTime() : 0;
    if (Date.now() - lastLoad < 10_000) {
      // Still refresh profile (lightweight, cached) but skip heavy friends reload
      getUserProfile().then(result => {
        if (result.ok && result.data) setProfile(result.data);
      });
      return;
    }

    // Invalidate friends cache when returning from stack screens (e.g. ContactInvite)
    if ('invalidateFriendsCache' in communityService) {
      (communityService as any).invalidateFriendsCache();
    }
    // Refresh profile + friends in parallel
    getUserProfile().then(result => {
      if (result.ok && result.data) setProfile(result.data);
    });
    loadFriendsData();
  }, [hasCompletedVoting, loadFriendsData, startGuideIfNeeded]));

  const handleVotesComplete = useCallback(async () => {
    // Brief delay to allow the last vote to commit to the database
    // before querying hasCompletedGrid (which checks proposal_votes)
    await new Promise(resolve => setTimeout(resolve, 800));
    await loadFriendsData();
    setHasCompletedVoting(true);
    // #7: Haptic reward on unlocking friends area
    successHaptic();
    // Cache so next cold open skips the voting gate
    const cycleId = String(getLast7PMCentral());
    communityService.cacheVotingComplete(true, cycleId).catch(() => {});
    navigation.navigate('Community');
  }, [loadFriendsData, navigation]);

  // ── Memoized derived values ──────────────────────────────────────────────
  // Computed once when list data changes, not on every render tick
  const totalFriends = usersToMatch.length + alreadyHelped.length;
  const showInviteBanner = totalFriends > 0 && totalFriends < 5;

  const bannerSection = useMemo(() => {
    if (totalFriends < 5) {
      const avatarFriends = [...usersToMatch, ...alreadyHelped].slice(0, 4);
      return { kind: 'invite' as const, avatarFriends };
    }
    const totalAssists =
      alreadyHelped.reduce((sum, f) => sum + (f.assistsCount || 0), 0) +
      usersToMatch.reduce((sum, f) => sum + (f.assistsCount || 0), 0);
    return { kind: 'impact' as const, totalAssists };
  }, [totalFriends, usersToMatch, alreadyHelped]);

  // Stable per-item callback maps — keyed by friendId so memo on UserRow is effective
  const voteHandlers = useMemo(() => {
    const viewProfile: Record<string, () => void> = {};
    const matchHandlers: Record<string, () => void> = {};
    for (const user of usersToMatch) {
      viewProfile[user.friendId] = () =>
        (navigation as any).navigate('ProfileView', { profile: user.friend });
      matchHandlers[user.friendId] = () =>
        (navigation as any).navigate('FriendProposal', {
          friendId: user.friendId,
          friendName: user.friend.firstName,
          friendPhotoUrl: user.friend.photos?.[0]?.url,
          friendAge: user.friend.age,
          friendJob: user.friend.currentJob,
        });
    }
    return { viewProfile, matchHandlers };
  }, [usersToMatch, navigation]);

  const crewHandlers = useMemo(() => {
    const viewProfile: Record<string, () => void> = {};
    const chatHandlers: Record<string, () => void> = {};
    const badgeHandlers: Record<string, () => void> = {};
    for (const user of alreadyHelped) {
      viewProfile[user.friendId] = () =>
        (navigation as any).navigate('ProfileView', { profile: user.friend });
      chatHandlers[user.friendId] = () =>
        (navigation as any).navigate('Chat', {
          friendshipId: user.friendshipId,
          recipientId: user.friendId,
          recipientName: user.friend.firstName,
          recipientPhoto: user.friend.photos?.[0]?.url,
          isFriendChat: true,
        });
      badgeHandlers[user.friendId] = () =>
        handleBadgePress(user.friendId, user.friend.firstName || 'Friend');
    }
    return { viewProfile, chatHandlers, badgeHandlers };
  }, [alreadyHelped, navigation, handleBadgePress]);

  if (loading || hasCompletedVoting === null) {
    return (
      <ScreenWrapper>
        <CommunitySkeleton />
      </ScreenWrapper>
    );
  }

  // Gate: must vote on 3 proposals before entering the community area
  if (!hasCompletedVoting) {
    return (
      <ScreenWrapper>
        <ProposalReviewView
          onVotesComplete={handleVotesComplete}
          isActive={true}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <OfflineBanner />
      <ProfileCompletionBanner
        profile={profile}
        onPress={() => (navigation as any).navigate('Profile')}
      />

      {/* Header section */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text style={styles.headerTitle}>
            Community
          </Text>
          <View style={styles.headerRight}>
            <MatchResetTimer />
            {!showInviteBanner && (
              <GuideTarget id="add-friend-button">
                <TouchableOpacity
                  onPress={() => (navigation as any).navigate('ContactInvite')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  style={styles.addFriendBtn}
                >
                  <EvaIcon name="person-add" variant="outline" size={18} color="#2B65F9" />
                </TouchableOpacity>
              </GuideTarget>
            )}
          </View>
        </View>
      </View>

      {usersToMatch.length === 0 && alreadyHelped.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryButton} />
          }
        >
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
              onPress={() => (navigation as any).navigate('ContactInvite')}
            >
              <EvaIcon name="people" variant="outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.inviteContactsButtonText}>Invite from Contacts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryButton} />
          }
        >
          {/* #5: Invite nudge when <5 friends; #10: Impact card when >=5 friends */}
          {bannerSection.kind === 'invite' ? (
            <TouchableOpacity
              style={styles.crewBanner}
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate('ContactInvite')}
            >
              <View style={styles.crewAvatarRow}>
                {bannerSection.avatarFriends.map((f, i) => (
                  <Image
                    key={f.friendId}
                    source={{ uri: f.friend.photos?.[0]?.url || 'https://via.placeholder.com/36' }}
                    style={[styles.crewAvatar, i > 0 && { marginLeft: -10 }]}
                  />
                ))}
                <View style={[styles.crewAddCircle, bannerSection.avatarFriends.length > 0 && { marginLeft: -10 }]}>
                  <EvaIcon name="plus" variant="outline" size={16} color="#2B65F9" />
                </View>
              </View>
              <Text style={styles.crewBannerHeadline}>Add your people</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.impactCard}>
              <EvaIcon name="heart" variant="outline" size={22} color="#2B65F9" />
              <Text style={styles.impactText}>
                {bannerSection.totalAssists > 0
                  ? `You've helped make ${bannerSection.totalAssists} match${bannerSection.totalAssists === 1 ? '' : 'es'}`
                  : 'Your votes matter! Help friends find their match.'}
              </Text>
            </View>
          )}

          {usersToMatch.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.primaryButton }]} />
              <Text style={styles.sectionTitle}>Help your friends</Text>
              <View style={styles.helpCountBadge}>
                <Text style={styles.helpCountText}>{usersToMatch.length}</Text>
              </View>
            </View>
          )}
          {/* Main list — #3: vote ring + #9: vote-only action */}
          {usersToMatch.length > 0 && (
            <View style={styles.voteListBg}>
              {usersToMatch.map((user, index) => (
                <StaggerItem key={user.friendId} index={index}>
                  <UserRow
                    item={user}
                    index={index}
                    showVoteRing

                    onViewProfile={voteHandlers.viewProfile[user.friendId]}
                    onMatch={voteHandlers.matchHandlers[user.friendId]}
                  />
                </StaggerItem>
              ))}
            </View>
          )}

          {/* Already Helped section */}
          {alreadyHelped.length > 0 && (
            <View style={[styles.sectionHeader, usersToMatch.length > 0 && { marginTop: 20 }]}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.successAlt }]} />
              <Text style={styles.sectionTitle}>Your crew</Text>
            </View>
          )}

          <View className="pb-8">
            {alreadyHelped.map((user, index) => (
                <StaggerItem key={user.friendId} index={index}>
                  <UserRow
                    item={user}
                    index={index}
                    statusLine={getFriendStatusLine(user, suggestionsMap)}
                    hasUnread={!!unreadMap[user.friendId]}

                    onViewProfile={crewHandlers.viewProfile[user.friendId]}
                    onChat={crewHandlers.chatHandlers[user.friendId]}
                    onBadgePress={crewHandlers.badgeHandlers[user.friendId]}
                  />
                </StaggerItem>
            ))}

            {/* Suggest a Match — inline row at bottom of crew list */}
            {(usersToMatch.length + alreadyHelped.length) >= 2 && (
              <TouchableOpacity
                style={styles.suggestMatchRow}
                activeOpacity={0.75}
                onPress={() => { lightHaptic(); navigation.getParent()?.navigate('SuggestMatch'); }}
              >
                <EvaIcon name="heart" variant="outline" size={16} color="#437FFF" />
                <Text style={styles.suggestMatchText}>Suggest a Match</Text>
                <EvaIcon name="arrow-ios-forward" variant="outline" size={14} color="#437FFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Slim caught-up footer — only when no pending votes */}
          {usersToMatch.length === 0 && alreadyHelped.length > 0 && (
            <Text style={styles.caughtUpFooter}>
              All caught up — new proposals drop at 7 PM
            </Text>
          )}
        </ScrollView>
      )}
      {/* Badge Award Modal */}
      {badgeTargetFriend && (
        <BadgeAwardModal
          visible={badgeModalVisible}
          onClose={() => {
            setBadgeModalVisible(false);
            setBadgeTargetFriend(null);
            setExistingBadge(null);
          }}
          friendId={badgeTargetFriend.id}
          friendName={badgeTargetFriend.name}
          existingBadge={existingBadge}
          onSuccess={() => {
            showToast.success('Badge saved!');
          }}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60, width: '100%' },
  emptyLottie: {
    width: 260,
    height: 260,
    marginBottom: 16,
  },
  emptyHeroText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: FONT_SIZES['5xl'],
    lineHeight: 34,
    color: '#0B1226',
    textAlign: 'center',
    marginBottom: 8,
    width: '100%',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: 22,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 24,
    width: '100%',
  },
  tagline: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES['3xl'], lineHeight: 26, color: '#0B1226', textAlign: 'center', marginBottom: 12 },
  illustration: { width: 300, height: 300, marginBottom: 32 },
  subtitle: { fontFamily: FONTS.semiBold, fontSize: 17, lineHeight: 24, color: '#0B1226', textAlign: 'center', marginBottom: 20, width: '100%' },
  ctaButton: {
    backgroundColor: '#007AFF',
    width: 250,
    height: 47,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 122, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.lg, color: COLORS.card },
  crewBanner: {
    backgroundColor: COLORS.backgroundFriendActive,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1DEFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: COLORS.primaryButton,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#101828',
    flex: 1,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1DEFF',
    gap: 10,
    shadowColor: COLORS.primaryButton,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
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
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  inviteContactsButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
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
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#D1DEFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryButton,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#667085',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  voteListBg: {
    backgroundColor: 'rgba(43, 101, 249, 0.02)',
  },
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
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.primaryAccent,
  },
  // ── Help count badge ──────────────────────────────────────────
  helpCountBadge: {
    backgroundColor: COLORS.primaryButton,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  helpCountText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.card,
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

export default CommunityScreen;
