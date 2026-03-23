import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';

import { UserRow } from '../../components/community/UserRow';
import { StaggerItem } from '../../hooks/useStaggeredList';
import { ProposalReviewView } from '../../components/community/proposal/ProposalReviewView';
import { GuideTarget } from '../../components/guides';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { communityService } from '../../services/communityServiceIndex';
import { getUserFriendCode, getIncomingRequests, acceptFriendRequest, declineFriendRequest, FriendRequest } from '../../services/friendService';
import { FriendWithGridStatus } from '../../types/community';
import { getUserProfile } from '../../services/profileService';
import { getAuthenticatedUserId } from '../../utils/auth';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { useGuide } from '../../hooks/useGuide';
import { beginnerTourGuide } from '../../config/guides';
import { CommunitySkeleton } from '../../components/ui/SkeletonLoader';
import { COLORS } from '../../theme/colors';
import { ScreenWrapper } from '../../components/ui';
import { getLast7PMCentral } from '../../utils/centralTime';
import { successHaptic, lightHaptic } from '../../utils/haptics';
import { getBatchUnreadFriendIds } from '../../services/messageService';
import { showToast } from '../../utils/toast';
import { BadgeAwardModal } from '../../components/badges/BadgeAwardModal';
import { getBadgeForFriend } from '../../services/badgeService';
import { FriendBadge } from '../../types/badges';
import { sendCrush, removeCrush } from '../../services/crushService';

// Extracted
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
  styles,
} from './CommunityScreen.components';

// UserRow height: paddingVertical 16*2 + avatar 68 + hairline border ~= 101px
const USER_ROW_ESTIMATED_HEIGHT = 101;

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
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());

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

  const handleCrushPress = useCallback(async (friendId: string, friendName: string) => {
    // Find the friend in current state to check crush status
    const friend = alreadyHelped.find(f => f.friendId === friendId);
    if (!friend) return;

    if (friend.hasCrushed) {
      // Un-crush: optimistic update + remove
      setAlreadyHelped(prev =>
        prev.map(f => f.friendId === friendId ? { ...f, hasCrushed: false } : f)
      );
      const result = await removeCrush(friendId);
      if (!result.ok) {
        // Revert on failure
        setAlreadyHelped(prev =>
          prev.map(f => f.friendId === friendId ? { ...f, hasCrushed: true } : f)
        );
      }
    } else {
      // Crush: optimistic update + send
      setAlreadyHelped(prev =>
        prev.map(f => f.friendId === friendId ? { ...f, hasCrushed: true } : f)
      );
      successHaptic();
      const result = await sendCrush(friendId);
      if (!result.ok) {
        // Revert on failure
        setAlreadyHelped(prev =>
          prev.map(f => f.friendId === friendId ? { ...f, hasCrushed: false } : f)
        );
        showToast.error('Could not send crush. Try again.');
      } else if (result.isMutual) {
        // Mutual crush! Both friends crushed on each other
        showToast.success(
          'It\'s mutual!',
          `You and ${friendName} both crushed — a match proposal has been created!`
        );
        // Refresh friends data to show the new proposal in the grid
        loadFriendsData();
      }
    }
  }, [alreadyHelped, loadFriendsData]);

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
      const [data, codeRes, requestsRes] = await Promise.all([
        communityService.getFriendsAreaData(),
        getUserFriendCode(),
        getIncomingRequests(),
      ]);

      if (codeRes.ok && codeRes.data) {
        setFriendCode(codeRes.data.code);
      }

      if (requestsRes.ok && requestsRes.data) {
        setPendingRequests(requestsRes.data);
      }

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
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
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

      // Fire voting gate queries in parallel — they don't depend on timer state.
      // communityService.ready (timer init) runs in background, not on critical path.
      const [task, available] = await Promise.all([
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

  // Preload Matches tab after Community finishes loading — users commonly switch to it next.
  // React Navigation 7 preload() begins loading the screen component subtree early.
  useEffect(() => {
    if (!loading && hasCompletedVoting) {
      const timer = setTimeout(() => {
        try {
          // preload is available on React Navigation 7 tab navigators
          (navigation as any).preload?.('Matches');
        } catch {
          // Silently ignore if preload is unavailable
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, hasCompletedVoting, navigation]);

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

  const handleAcceptRequest = useCallback(async (requestId: string) => {
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

  const voteHandlers = useMemo(
    () => buildVoteHandlers(usersToMatch, navigation),
    [usersToMatch, navigation],
  );
  const crewHandlers = useMemo(
    () => buildCrewHandlers(alreadyHelped, navigation, handleBadgePress, handleCrushPress),
    [alreadyHelped, navigation, handleBadgePress, handleCrushPress],
  );

  // Stable key extractors for FlatLists (avoids re-creating on each render)
  const voteKeyExtractor = useCallback((item: FriendWithGridStatus) => item.friendId, []);
  const crewKeyExtractor = useCallback((item: FriendWithGridStatus) => item.friendId, []);

  // Stable renderItem callbacks — avoids re-creating inline closures on each render,
  // which would defeat React.memo on UserRow and StaggerItem
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
        onCrushPress={crewHandlers.crushHandlers[user.friendId]}
      />
    </StaggerItem>
  ), [crewHandlers, unreadMap]);

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

  const navigateToContactInvite = () => (navigation as any).navigate('ContactInvite');

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
          <Text style={styles.headerTitle} accessibilityRole="header">
            Community
          </Text>
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
          contentContainerStyle={pendingRequests.length === 0 ? { flex: 1 } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryButton} />
          }
        >
          <HowItWorksCard />
          <PendingRequestsSection
            requests={pendingRequests}
            processingIds={processingRequestIds}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />
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
          <HowItWorksCard />
          <PendingRequestsSection
            requests={pendingRequests}
            processingIds={processingRequestIds}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />

          {/* #5: Invite nudge when <5 friends; #10: Impact card when >=5 friends */}
          {bannerSection.kind === 'invite' ? (
            <InviteBanner avatarFriends={bannerSection.avatarFriends} onPress={navigateToContactInvite} />
          ) : (
            <ImpactCard totalAssists={bannerSection.totalAssists} />
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

          {/* Already Helped section */}
          {alreadyHelped.length > 0 && (
            <View style={[styles.sectionHeader, usersToMatch.length > 0 && { marginTop: 20 }]}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.successAlt }]} />
              <Text style={styles.sectionTitle}>Your crew</Text>
            </View>
          )}

          <View className="pb-8">
            <FlashList
              data={alreadyHelped}
              keyExtractor={crewKeyExtractor}
              renderItem={renderCrewItem}
              estimatedItemSize={USER_ROW_ESTIMATED_HEIGHT}
              scrollEnabled={false}
              drawDistance={USER_ROW_ESTIMATED_HEIGHT * 8}
            />

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
