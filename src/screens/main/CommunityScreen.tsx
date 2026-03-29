import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';

import { UserRow } from '../../components/community/UserRow';
import { StaggerItem } from '../../hooks/useStaggeredList';
import { ProposalReviewView } from '../../components/community/proposal/ProposalReviewView';
import { GuideTarget } from '../../components/guides';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { communityService } from '../../services/communityServiceIndex';
import { getIncomingRequests, acceptFriendRequest, declineFriendRequest, FriendRequest } from '../../services/friendService';
import { FriendWithGridStatus } from '../../types/community';
import { getUserProfile, getCachedMinimalProfileStatus } from '../../services/profileService';
import { getAuthenticatedUserId } from '../../utils/auth';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { useGuide } from '../../hooks/useGuide';
import { beginnerTourGuide } from '../../config/guides';
import { CommunitySkeleton } from '../../components/ui/SkeletonLoader';
import { fetchLeaderboard } from '../../services/leaderboardService';
import { COLORS } from '../../theme/colors';
import { ScreenWrapper, ScreenTitle } from '../../components/ui';
import { getLast7PMCentral } from '../../utils/centralTime';
import { successHaptic, lightHaptic } from '../../utils/haptics';
import { getBatchUnreadFriendIds } from '../../services/messageService';
import { showToast } from '../../utils/toast';
import { BadgeAwardModal } from '../../components/badges/BadgeAwardModal';
import { getBadgeForFriend } from '../../services/badgeService';
import { FriendBadge } from '../../types/badges';
import {
  MatchResetTimer,
  partitionFriends,
  getFriendStatusLine,
  EmptyState,
  InviteBanner,
  ImpactCard,
  CaughtUpFooter,
  HowItWorksCard,
  buildVoteHandlers,
  buildCrewHandlers,
  PendingRequestsSection,
  InlineLoadError,
  styles,
} from './CommunityScreen.components';

// Compact (SE): 12*2 + 56 + 1 ~= 81px | Standard: 16*2 + 68 + 1 ~= 101px
const USER_ROW_ESTIMATED_HEIGHT = Dimensions.get('window').width < 380 ? 81 : 101;

interface CommunityScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Community'>;
}

export function CommunityScreen({ navigation }: CommunityScreenProps) {
  const { startGuideIfNeeded } = useGuide();
  const [usersToMatch, setUsersToMatch] = useState<FriendWithGridStatus[]>([]);
  const [alreadyHelped, setAlreadyHelped] = useState<FriendWithGridStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompletedVoting, setHasCompletedVoting] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());

  // Auto-refresh data when connectivity is restored after being offline
  const reconnectHandlerRef = useRef<(() => void) | null>(null);
  useNetworkStatus(useCallback(() => {
    // Small delay to let the connection stabilize before fetching
    setTimeout(() => {
      reconnectHandlerRef.current?.();
    }, 1500);
  }, []));

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
      // Only update state if the unread set actually changed — avoids
      // re-rendering the entire crew FlashList when nothing is new.
      setUnreadMap(prev => {
        const prevKeys = Object.keys(prev);
        if (prevKeys.length === unreadSet.size && prevKeys.every(k => unreadSet.has(k))) {
          return prev; // identical — skip state update
        }
        const map: Record<string, boolean> = {};
        for (const id of unreadSet) {
          map[id] = true;
        }
        return map;
      });
    } catch {
      // Silent fail — unread dots are non-critical
    }
  }, [profile?.userId]);

  const loadFriendsData = useCallback(async () => {
    try {
      const [data, requestsRes] = await Promise.all([
        communityService.getFriendsAreaData(),
        getIncomingRequests(),
      ]);

      if (requestsRes.ok && requestsRes.data) {
        setPendingRequests(requestsRes.data);
      }

      const { toMatch, helped } = partitionFriends(data.friends);
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);
      setLoadError(false);

      // Load unread counts for "your crew" friends (they have chat)
      loadUnreadCounts(helped);
    } catch (error) {
      console.error("Failed to load community data:", error);
      setLoadError(true);
    }
  }, [loadUnreadCounts]);

  const refreshingRef = useRef(false);
  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
    refreshingRef.current = true;
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
      showToast.success('Up to date');
    } catch (error) {
      console.error('Pull-to-refresh failed:', error);
      showToast.error('Refresh failed. Check your connection.');
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  }, [loadFriendsData]);

  const initialize = useCallback(async () => {
    // Bail out if not authenticated (e.g. after sign-out while screen is still mounted)
    // Uses in-memory cached userId — instant, no AsyncStorage or network
    const userId = await getAuthenticatedUserId();
    if (!userId) return;

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
        // Re-check profile + voting gate together so we can guard on role
        (async () => {
          const profileResult = await getUserProfile();
          if (profileResult.ok && profileResult.data) setProfile(profileResult.data);
          // Re-check voting gate in background to self-correct if vote was removed
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
      // Load profile in parallel with voting gate queries so we can check role
      const [profileResult, task, available] = await Promise.all([
        getUserProfile(),
        communityService.getCommunityTaskProgress(),
        communityService.getProposalsToVote(),
      ]);

      if (profileResult.ok && profileResult.data) setProfile(profileResult.data);

      let votingDone = task.hasVotedOnProposals;
      if (!votingDone && available.length === 0) votingDone = true;

      // Only cache "done" for users who actually voted on 3+ proposals this cycle.
      // If votingDone is true merely because no proposals exist, don't cache —
      // new proposals may appear later in the same cycle.
      if (task.hasVotedOnProposals) {
        communityService.cacheVotingComplete(true, cycleId).catch(() => {});
      }

      setHasCompletedVoting(votingDone);
      if (votingDone) {
        await loadFriendsData();
      }
    } catch (error) {
      console.error("Failed to check task progress:", error);
      setHasCompletedVoting(false);
    } finally {
      setLoading(false);
    }
  }, [loadFriendsData]);

  const initializedRef = useRef(false);

  // Wire up reconnect handler to re-initialize on connectivity restore
  reconnectHandlerRef.current = initialize;

  useEffect(() => {
    initialize();

    // Reload whenever the dev state toggle changes mock state
    return communityService.onStateChange(() => {
      initializedRef.current = true; // prevent useFocusEffect double-load
      initialize();
    });
  }, [initialize]);

  // Re-initialize when the app returns from background after 2+ minutes.
  // useFocusEffect only fires on navigation events, not AppState changes, so
  // without this the Community tab shows stale friend/voting data after the
  // app was backgrounded for hours.
  const lastActiveCommunityRef = useRef(Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastActiveCommunityRef.current;
        if (elapsed > 120_000) {
          initializedRef.current = false; // allow full re-init
          initialize();
        }
      } else if (nextState === 'background') {
        lastActiveCommunityRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [initialize]);

  // Preload Matches tab after Community finishes loading — users commonly switch to it next.
  // React Navigation 7 preload() begins loading the screen component subtree early.
  // Only for daters — matchmakers have no Matches tab (preloading it crashes the navigator).
  // Also warm the leaderboard cache so navigating there is instant.
  useEffect(() => {
    if (!loading && hasCompletedVoting) {
      const timer = setTimeout(() => {
        // Only preload Matches for daters — MatchmakerTabs has no Matches screen
        if (profile?.role !== 'matchmaker') {
          try {
            (navigation as any).preload?.('Matches');
          } catch {
            // Silently ignore if preload is unavailable
          }
        }
        // Background-warm the leaderboard cache — no spinner when user taps Leaderboard
        fetchLeaderboard(50).catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, hasCompletedVoting, navigation]);

  // Single focus handler: refresh profile + friends + guide on every tab/screen focus
  useFocusEffect(useCallback(() => {
    // Matchmakers must never see the dater beginner tour — it references 'tab-matches'
    // which doesn't exist in MatchmakerTabs. Two guards run in sequence:
    // 1. Synchronous: if we're already in MatchmakerTabs, bail immediately.
    // 2. Async: check the cached role — prevents the guide from starting even when
    //    a matchmaker's stale 'dater' cache causes them to open in MainTabs. The
    //    async check is fast (AsyncStorage in-memory mirror, < 1ms on warm start).
    // Triple guard: synchronous route check + synchronous profile check + async cache check.
    // All three must agree this is NOT a matchmaker before starting the dater tour.
    const routeNames: string[] = (navigation as any).getState?.()?.routeNames ?? [];
    const isInMatchmakerTabs = !routeNames.includes('Matches');
    if (!isInMatchmakerTabs && profile?.role !== 'matchmaker') {
      getCachedMinimalProfileStatus().then(status => {
        if (status?.role !== 'matchmaker') {
          startGuideIfNeeded(beginnerTourGuide);
        }
      });
    }

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

    // Refresh profile + friends in parallel
    // NOTE: Do NOT invalidate the friends cache here — getFriendsAreaData()
    // uses stale-while-revalidate internally (serves cached data instantly,
    // refreshes in background). Invalidating on every focus defeats the
    // pattern and forces a full network round-trip on every tab switch.
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
    successHaptic();
    // Cache so next cold open skips the voting gate
    const cycleId = String(getLast7PMCentral());
    communityService.cacheVotingComplete(true, cycleId).catch(() => {});
    navigation.navigate('Community');
  }, [loadFriendsData, navigation]);

  const processingRequestRef = useRef(new Set<string>());
  const handleAcceptRequest = useCallback(async (requestId: string) => {
    if (processingRequestRef.current.has(requestId)) return;
    processingRequestRef.current.add(requestId);
    setProcessingRequestIds(prev => new Set([...prev, requestId]));
    const result = await acceptFriendRequest(requestId);
    if (result.ok) {
      successHaptic();
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      if ('invalidateFriendsCache' in communityService) {
        (communityService as any).invalidateFriendsCache();
      }
      await loadFriendsData();
    } else {
      showToast.error('Could not accept request. Try again.');
    }
    processingRequestRef.current.delete(requestId);
    setProcessingRequestIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  }, [loadFriendsData]);

  const handleDeclineRequest = useCallback(async (requestId: string) => {
    lightHaptic();
    // Optimistic removal — decline is fast and recoverable
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    const result = await declineFriendRequest(requestId);
    if (!result.ok) {
      showToast.error('Could not decline request. Try again.');
      loadFriendsData(); // restore correct state
    }
  }, [loadFriendsData]);

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

  // Stable keys derived from friend IDs — prevents handler map re-creation
  // when the arrays are new references but contain the same friends.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const voteIdsKey = useMemo(() => usersToMatch.map(u => u.friendId).join(','), [usersToMatch]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const crewIdsKey = useMemo(() => alreadyHelped.map(u => u.friendId).join(','), [alreadyHelped]);

  const voteHandlers = useMemo(
    () => buildVoteHandlers(usersToMatch, navigation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voteIdsKey, navigation],
  );
  const crewHandlers = useMemo(
    () => buildCrewHandlers(alreadyHelped, navigation, handleBadgePress),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crewIdsKey, navigation, handleBadgePress],
  );

  const voteKeyExtractor = useCallback((item: FriendWithGridStatus) => item.friendId, []);
  const crewKeyExtractor = useCallback((item: FriendWithGridStatus) => item.friendId, []);

  const renderVoteItem = useCallback(({ item: user, index }: ListRenderItemInfo<FriendWithGridStatus>) => (
    <StaggerItem index={index}>
      <UserRow
        item={user}
        index={index}
        showVoteRing
        onViewProfile={voteHandlers.viewProfile[user.friendId]}
        onMatch={voteHandlers.matchHandlers[user.friendId]}
      />
    </StaggerItem>
  ), [voteHandlers]);

  const renderCrewItem = useCallback(({ item: user, index }: ListRenderItemInfo<FriendWithGridStatus>) => (
    <StaggerItem index={index}>
      <UserRow
        item={user}
        index={index}
        statusLine={getFriendStatusLine(user)}
        hasUnread={!!unreadMap[user.friendId]}
        onViewProfile={crewHandlers.viewProfile[user.friendId]}
        onChat={crewHandlers.chatHandlers[user.friendId]}
        onBadgePress={crewHandlers.badgeHandlers[user.friendId]}
      />
    </StaggerItem>
  ), [crewHandlers, unreadMap]);

  const navigateToContactInvite = useCallback(() => (navigation as any).navigate('ContactInvite'), [navigation]);

  if (loading || hasCompletedVoting === null) {
    return (
      <ScreenWrapper>
        <CommunitySkeleton />
      </ScreenWrapper>
    );
  }

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
      {profile?.role !== 'matchmaker' && (
        <ProfileCompletionBanner
          profile={profile}
          onPress={() => (navigation as any).navigate('Profile')}
        />
      )}

      {/* Header section */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <ScreenTitle>Community</ScreenTitle>
          <View style={styles.headerRight}>
            <MatchResetTimer />
            {!showInviteBanner && (
              <GuideTarget id="add-friend-button">
                <TouchableOpacity
                  onPress={navigateToContactInvite}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  style={styles.addFriendBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Add friend"
                >
                  <EvaIcon name="person-add" variant="outline" size={18} color={COLORS.primaryButton} />
                </TouchableOpacity>
              </GuideTarget>
            )}
          </View>
        </View>
      </View>

      {usersToMatch.length === 0 && alreadyHelped.length === 0 ? (
        <ScrollView
          contentContainerStyle={pendingRequests.length === 0 && !loadError ? { flex: 1 } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryButton} />
          }
        >
          {loadError && (
            <InlineLoadError onRetry={loadFriendsData} />
          )}
          <PendingRequestsSection
            requests={pendingRequests}
            processingIds={processingRequestIds}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />
          <HowItWorksCard />
          <EmptyState onInvite={navigateToContactInvite} />
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryButton} />
          }
        >
          {loadError && (
            <InlineLoadError onRetry={loadFriendsData} />
          )}
          <PendingRequestsSection
            requests={pendingRequests}
            processingIds={processingRequestIds}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />
          <HowItWorksCard />

          {bannerSection.kind === 'invite' ? (
            <InviteBanner avatarFriends={bannerSection.avatarFriends} onPress={navigateToContactInvite} />
          ) : (
            <ImpactCard totalAssists={bannerSection.totalAssists} />
          )}

          {usersToMatch.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.primaryButton }]} />
              <Text style={styles.sectionTitle} accessibilityRole="header">Waiting on you</Text>
              <View style={styles.helpCountBadge} accessibilityLabel={`${usersToMatch.length} friends need your help`}>
                <Text style={styles.helpCountText}>{usersToMatch.length}</Text>
              </View>
            </View>
          )}
          {usersToMatch.length > 0 && (
            <View style={styles.voteListBg}>
              <FlashList
                data={usersToMatch}
                keyExtractor={voteKeyExtractor}
                renderItem={renderVoteItem}
                estimatedItemSize={USER_ROW_ESTIMATED_HEIGHT}
                scrollEnabled={false}
                drawDistance={USER_ROW_ESTIMATED_HEIGHT * 8}
              />
            </View>
          )}

          {alreadyHelped.length > 0 && usersToMatch.length > 0 && (
            <View style={styles.sectionDivider} />
          )}
          {alreadyHelped.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.successAlt }]} />
              <Text style={styles.sectionTitle} accessibilityRole="header">Your crew</Text>
              <View style={[styles.helpCountBadge, { backgroundColor: COLORS.successAlt }]} accessibilityLabel={`${alreadyHelped.length} friends all set`}>
                <Text style={styles.helpCountText}>{alreadyHelped.length}</Text>
              </View>
            </View>
          )}

          <View style={styles.crewListContainer}>
            <FlashList
              data={alreadyHelped}
              keyExtractor={crewKeyExtractor}
              renderItem={renderCrewItem}
              estimatedItemSize={USER_ROW_ESTIMATED_HEIGHT}
              scrollEnabled={false}
              drawDistance={USER_ROW_ESTIMATED_HEIGHT * 8}
            />
            {/* DEFERRED: Suggest a Match — pulled pre-launch, see _deferred/suggest-a-match/DEFERRED.md */}
          </View>

          {/* Slim caught-up footer — only when no pending votes */}
          {usersToMatch.length === 0 && alreadyHelped.length > 0 && (
            <CaughtUpFooter />
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

export default CommunityScreen;
