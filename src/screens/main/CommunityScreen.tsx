import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';

import { UserRow } from '../../components/community/UserRow';
import { StaggerItem } from '../../hooks/useStaggeredList';
import { CardErrorBoundary } from '../../components/ui/ErrorBoundary';
import { ProposalReviewView } from '../../components/community/proposal/ProposalReviewView';
import { GuideTarget } from '../../components/guides';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { communityService } from '../../services/communityServiceIndex';
import { getIncomingRequests, acceptFriendRequest, declineFriendRequest, FriendRequest } from '../../services/friendService';
import { FriendWithGridStatus, Proposal } from '../../types/community';
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
import { KarmaInfoModal } from '../../components/community/karma/KarmaInfoModal';
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

  // Karma info modal — hoisted from UserRow so only one Modal instance exists
  const [karmaModalVisible, setKarmaModalVisible] = useState(false);
  const handleKarmaPress = useCallback(() => setKarmaModalVisible(true), []);

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

    // ── Fast path: render cached friends immediately, but ALWAYS verify voting ──
    // The voting gate is #1 priority — never trust the cache for it.
    // Friends area cache is safe to use for instant rendering.
    const cachedFriends = await communityService.getCachedFriendsArea();

    if (cachedFriends) {
      // Show cached friends instantly (will be refreshed in background)
      // Wrap in try-catch: corrupted cache should never crash the app.
      // If cache is bad, silently discard it — fresh data will load from network.
      try {
        const { toMatch, helped } = partitionFriends(cachedFriends);
        setUsersToMatch(toMatch);
        setAlreadyHelped(helped);
      } catch (cacheErr) {
        console.error('Corrupted friends cache, discarding:', cacheErr);
        if ('invalidateFriendsCache' in communityService) {
          (communityService as any).invalidateFriendsCache();
        }
      }
    }

    // ── Always check voting gate from network — never skip ────────────────
    try {
      const [profileResult, task, available] = await Promise.all([
        getUserProfile(),
        communityService.getCommunityTaskProgress(),
        communityService.getProposalsToVote().catch((err) => {
          console.error('Failed to fetch proposals:', err);
          showToast.error('Could not load proposals', 'Pull down to refresh and try again.');
          return null; // null = fetch failed (distinct from [] = genuinely no proposals)
        }),
      ]);

      if (profileResult.ok && profileResult.data) setProfile(profileResult.data);

      // Gate shows whenever there are unvoted proposals.
      // If fetch failed (null), DON'T skip the gate — require the user to retry.
      // Only pass through when we successfully confirmed zero proposals exist.
      const votingDone = available !== null && (available.length === 0 || task.hasVotedOnProposals);

      // Only cache "done" when user genuinely voted 3+ AND no proposals remain.
      // Never cache when votingDone is just "no proposals exist" — new ones may appear.
      if (task.hasVotedOnProposals && available !== null && available.length === 0) {
        communityService.cacheVotingComplete(true, cycleId).catch(() => {});
      } else {
        // Clear stale cache so gate always shows when proposals exist
        communityService.cacheVotingComplete(false, cycleId).catch(() => {});
      }

      setHasCompletedVoting(votingDone);
      if (votingDone) {
        await loadFriendsData();
      }
    } catch (error) {
      console.error("Failed to check task progress:", error);
      // On error, show the gate if we have no cached voting state
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
    // Skip guide entirely until profile loads — prevents dater tour flashing for matchmakers on cold start
    // Only start guide AFTER the voting gate has been completed.
    // Starting it during the gate overlays a dark screen on top of proposals — unusable.
    if (profile && hasCompletedVoting) {
      const routeNames: string[] = (navigation as any).getState?.()?.routeNames ?? [];
      const isInMatchmakerTabs = !routeNames.includes('Matches');
      if (!isInMatchmakerTabs && profile.role !== 'matchmaker') {
        getCachedMinimalProfileStatus().then(status => {
          if (status?.role !== 'matchmaker') {
            startGuideIfNeeded(beginnerTourGuide);
          }
        });
      }
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
    // Invalidate friends cache so friend proposals voted in the gate
    // correctly move from "Waiting on you" to "Your crew"
    if ('invalidateFriendsCache' in communityService) {
      (communityService as any).invalidateFriendsCache();
    }
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
      <CardErrorBoundary
        onError={(error) => {
          // Clear potentially corrupted cache on crash so next render works
          if ('invalidateFriendsCache' in communityService) {
            (communityService as any).invalidateFriendsCache();
          }
          console.error('[CommunityScreen] Render crash caught:', error.message);
        }}
      >
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
                  <EvaIcon name="person-add" variant="outline" size={18} color={COLORS.primaryAccent} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryAccent} />
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
          <EmptyState onInvite={navigateToContactInvite} isMatchmaker={profile?.role === 'matchmaker'} />
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryAccent} />
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
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.primaryAccent }]} />
              <Text style={styles.sectionTitle} accessibilityRole="header">Waiting on you</Text>
              <View style={styles.helpCountBadge} accessibilityLabel={`${usersToMatch.length} friends need your help`}>
                <Text style={styles.helpCountText}>{usersToMatch.length}</Text>
              </View>
            </View>
          )}
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
                    onKarmaPress={handleKarmaPress}
                  />
                </StaggerItem>
              ))}
            </View>
          )}

          {alreadyHelped.length > 0 && usersToMatch.length > 0 && (
            <View style={styles.sectionDivider} />
          )}
          {alreadyHelped.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.primaryMuted }]} />
              <Text style={styles.sectionTitle} accessibilityRole="header">Your crew</Text>
              <View style={styles.crewCountBadge} accessibilityLabel={`${alreadyHelped.length} friends all set`}>
                <Text style={styles.helpCountText}>{alreadyHelped.length}</Text>
              </View>
            </View>
          )}

          <View style={styles.crewListContainer}>
            {alreadyHelped.map((user, index) => (
              <StaggerItem key={user.friendId} index={index}>
                <UserRow
                  item={user}
                  index={index}
                  statusLine={getFriendStatusLine(user)}
                  hasUnread={!!unreadMap[user.friendId]}
                  onViewProfile={crewHandlers.viewProfile[user.friendId]}
                  onChat={crewHandlers.chatHandlers[user.friendId]}
                  onBadgePress={crewHandlers.badgeHandlers[user.friendId]}
                  onKarmaPress={handleKarmaPress}
                />
              </StaggerItem>
            ))}
            {/* DEFERRED: Suggest a Match — pulled pre-launch, see _deferred/suggest-a-match/DEFERRED.md */}
          </View>

          {/* Slim caught-up footer — only when no pending votes */}
          {usersToMatch.length === 0 && alreadyHelped.length > 0 && (
            <CaughtUpFooter />
          )}
        </ScrollView>
      )}
      {/* Karma Info Modal — single instance hoisted from UserRow */}
      <KarmaInfoModal visible={karmaModalVisible} onClose={() => setKarmaModalVisible(false)} />
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
      </CardErrorBoundary>
    </ScreenWrapper>
  );
}

export default CommunityScreen;
