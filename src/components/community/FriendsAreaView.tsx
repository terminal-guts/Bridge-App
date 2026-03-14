/**
 * FriendsAreaView Component
 *
 * Page 3 of Community tab with three vertically scrollable sections:
 * - TOP: Pending proposals (proposals awaiting your acceptance)
 * - MIDDLE: Friend list (friends who are anchors today)
 * - BOTTOM: Active match card (if you have one)
 *
 * Features:
 * - Self-contained component that fetches its own data
 * - Pull-to-refresh to update all sections
 * - Empty states for each section if no data
 * - Navigates to FriendGrid screen when tapping friend row
 * - Navigates to ProfileView when viewing proposals or friend profiles
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { EvaIcon, IconScoutIcon } from '../icons';
import { RootStackParamList } from '../../types';
import {
  FriendWithGridStatus,
  FriendWithVariant,
  MatchProposal,
  ActiveMatch,
  CommunityTask,
} from '../../types/community';
import { FriendCard } from '../ui/FriendCard';
import { BadgeAwardModal } from '../badges/BadgeAwardModal';
import { getBadgeForFriend } from '../../services/badgeService';
import { FriendBadge } from '../../types/badges';
import { TimerBadge } from './TimerBadge';
import { CelebrationBanner } from './CelebrationBanner';
import { PendingProposalCard } from './proposal/PendingProposalCard';
import { AwaitingResponseCard } from './match/AwaitingResponseCard';
import { ActiveMatchCard } from './match/ActiveMatchCard';
import { EndMatchModal } from './match/EndMatchModal';
import { communityService } from '../../services/communityServiceIndex';
import { FriendRequest, getIncomingRequests, acceptFriendRequest, declineFriendRequest, removeFriend } from '../../services/friendService';
import { FriendRequestCard } from '../friends/FriendRequestCard';
import { GuideTarget } from '../guides';
import { useGuide } from '../../hooks/useGuide';
import { friendsAreaGuide } from '../../config/guides';
import { SEPARATOR } from '../../constants/friendsArea';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { UNIVERSAL_PROPOSAL_RELEASE_HOUR } from '../../constants/timings';
import { SHADOWS } from '../../theme/shadows';
import { createLogger } from '../../utils/secureLogger';
import { showToast } from '../../utils/toast';
import { successHaptic, warningHaptic, errorHaptic } from '../../utils/haptics';
import { getPreviousStreaks, saveCurrentStreaks, detectStreakChanges } from '../../services/streakTrackingService';

const logger = createLogger('FriendsAreaView');

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledFlatList = styled(FlatList);
const StyledTouchable = styled(TouchableOpacity);

interface FriendsAreaViewProps {
  taskProgress?: CommunityTask | null;
  isActive?: boolean; // Whether this page is currently visible
}

export function FriendsAreaView({ taskProgress, isActive = false }: FriendsAreaViewProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Internal state for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<FriendWithGridStatus[]>([]);
  const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);

  // Friend request state
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

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

  // DEV: Test state control (disabled for real user testing)
  const [timeRemaining, setTimeRemaining] = useState('');

  // Guide system
  const { startGuideIfNeeded } = useGuide();

  // Calculate time remaining until universal drop time (UTC)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();

      // Calculate next Universal Drop Time (UTC)
      const nextDrop = new Date();
      nextDrop.setUTCHours(UNIVERSAL_PROPOSAL_RELEASE_HOUR, 0, 0, 0);

      // If the drop time has already passed today (UTC), move to tomorrow
      if (now.getTime() >= nextDrop.getTime()) {
        nextDrop.setUTCDate(nextDrop.getUTCDate() + 1);
      }

      const diff = nextDrop.getTime() - now.getTime();

      // Prevent negative time (clock skew edge case)
      if (diff < 0) {
        setTimeRemaining('0h 0m');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Ensure non-negative values
      setTimeRemaining(`${Math.max(0, hours)}h ${Math.max(0, minutes)}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load Friends Area data
  const loadFriendsArea = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [data, previousStreaks, requestsResult] = await Promise.all([
        communityService.getFriendsAreaData(),
        getPreviousStreaks(),
        getIncomingRequests(),
      ]);

      setFriends(data.friends);
      setPendingProposals(data.pendingProposals);
      if (requestsResult.ok && requestsResult.data) {
        setIncomingRequests(requestsResult.data);
      }
      setActiveMatch(data.activeMatch);

      // Detect and announce streak changes (deaths + milestones)
      if (data.friends.length > 0) {
        const friendsForTracking = data.friends.map(f => ({
          friendId: f.friendId,
          friendName: f.friend?.firstName || 'A friend',
          streakDays: f.streakDays || 0,
        }));

        const changes = detectStreakChanges(friendsForTracking, previousStreaks);
        for (const change of changes) {
          if (change.type === 'death') {
            errorHaptic();
            showToast.error('Streak ended', `Your ${change.previousDays}-day streak with ${change.friendName} ended.`);
          }
        }

        await saveCurrentStreaks(friendsForTracking);
      }

      if (!silent) setLoading(false);
    } catch (error) {
      logger.error('[FriendsAreaView] Error loading data:', error);
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriendsArea();
  }, [loadFriendsArea]);

  // Start friends area guide when page becomes active (startGuideIfNeeded checks AsyncStorage)
  useEffect(() => {
    if (isActive && !loading) {
      const timer = setTimeout(() => {
        startGuideIfNeeded(friendsAreaGuide);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, loading, startGuideIfNeeded]);

  // Auto-cleanup expired proposals
  useEffect(() => {
    const checkExpiration = () => {
      setPendingProposals(prev => {
        const now = new Date().getTime();
        const nonExpired = prev.filter((proposal) => {
          const expiresAt = new Date(proposal.expiresAt).getTime();
          return expiresAt > now;
        });

        // Only update if something changed
        if (nonExpired.length !== prev.length) {
          logger.info(`[FriendsAreaView] Removed ${prev.length - nonExpired.length} expired proposal(s)`);
          return nonExpired;
        }
        return prev;
      });
    };

    // Check immediately
    checkExpiration();

    // Then check every minute
    const interval = setInterval(checkExpiration, 60000);

    return () => clearInterval(interval);
  }, []); // Empty deps - only run once on mount

  // Streak milestone celebration — fires when a friend crosses 7/14/30 threshold
  const handleStreakMilestone = useCallback((days: number, friendName: string) => {
    successHaptic();
    if (days >= 30) {
      showToast.success('Legendary streak!', `You and ${friendName} hit ${days} days!`);
    } else if (days >= 14) {
      showToast.success('Hot streak!', `You and ${friendName} hit ${days} days!`);
    } else {
      showToast.info('Streak growing!', `You and ${friendName} hit ${days} days!`);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriendsArea();
    setRefreshing(false);
  };

  const handleAcceptRequest = useCallback(async (requestId: string, senderName: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await acceptFriendRequest(requestId);
      if (result.ok) {
        successHaptic();
        showToast.success(`You and ${senderName} are now friends!`);
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
        // Silently reload friends list to include the new friend (no spinner)
        loadFriendsArea(true);
      } else {
        errorHaptic();
        showToast.error('Could not accept request', result.error?.message || '');
      }
    } catch {
      errorHaptic();
      showToast.error('Something went wrong');
    } finally {
      setProcessingRequestId(null);
    }
  }, [loadFriendsArea]);

  const handleDeclineRequest = useCallback(async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await declineFriendRequest(requestId);
      if (result.ok) {
        // Silent removal — no toast
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch {
      // Silent failure
    } finally {
      setProcessingRequestId(null);
    }
  }, []);

  const handleRemoveFriend = useCallback(async (friendId: string) => {
    const result = await removeFriend(friendId);
    if (result.ok) {
      setFriends(prev => prev.filter(f => f.friendId !== friendId));
      showToast.info('Friend removed');
    } else {
      showToast.error('Could not remove friend');
    }
  }, []);

  const handleHelpFriend = useCallback((friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return;

    // Navigate to FriendProposal screen - vote on a single proposal for this friend
    navigation.navigate('FriendProposal', {
      friendId: friend.friendId,
      friendName: friend.friend.firstName,
    });
  }, [friends, navigation]);

  const handleViewProposal = (proposal: MatchProposal) => {
    // Navigate to MatchProposalScreen
    navigation.navigate('MatchProposal', { proposalId: proposal.id });
  };

  const handleMessageMatch = () => {
    if (!activeMatch) return;

    logger.info('[FriendsAreaView] Navigating to Chat with:', {
      matchId: activeMatch.matchId,
      recipientName: activeMatch.partnerProfile?.firstName || 'Match',
    });

    // Navigate to Chat screen
    navigation.navigate('Chat', {
      matchId: activeMatch.matchId,
      recipientName: activeMatch.partnerProfile?.firstName || 'Match',
      recipientPhoto: activeMatch.partnerProfile?.photos?.[0]?.url,
    });
  };

  const handleEndMatch = () => {
    if (!activeMatch) return;
    // Open the modal instead of directly ending
    setShowEndMatchModal(true);
  };

  const handleEndMatchSubmit = async (reason: string) => {
    if (!activeMatch) return;

    try {
      await communityService.endActiveMatch(activeMatch.matchId || activeMatch.id, reason);
      await loadFriendsArea(); // Reload data
      setShowEndMatchModal(false); // Close modal only after success
      logger.info('[FriendsAreaView] Match ended. Reason:', reason);
    } catch (error) {
      logger.error('[FriendsAreaView] Error ending match:', error);
      // Modal stays open so user can retry or cancel
      showToast.error('Could not end match', 'Check your connection and try again.');
    }
  };

  const handleChatWithFriend = useCallback((friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return;

    // Navigate to Chat screen with friend
    navigation.navigate('Chat', {
      friendshipId: friend.friendshipId,
      recipientId: friend.friendId,
      recipientName: friend.friend.firstName,
      recipientPhoto: friend.friend.photos?.[0]?.url,
      isFriendChat: true, // Distinguish from match chat
    });
  }, [friends, navigation]);

  const handleViewFriendProfile = useCallback((friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return;

    // Navigate to ProfileView screen (no actions, just viewing)
    navigation.navigate('ProfileView', {
      userId: friend.friendId,
      profile: friend.friend,
      showActions: false,
    });
  }, [friends, navigation]);

  // Split friends into pending (need help) and completed (already helped today)
  // Only show friends who need help finding matches
  const friendsNeedingHelp = friends.filter((f) => !f.hasCompletedGrid);
  const friendsAlreadyHelped = friends
    .filter((f) => f.hasCompletedGrid)
    .sort((a, b) => b.streakDays - a.streakDays); // Sort by streak descending (leaderboard)

  // Combine friends into single array with variant tags for FlatList
  const combinedFriends = useMemo((): FriendWithVariant[] => {
    const pending: FriendWithVariant[] = friendsNeedingHelp.map(f => ({ ...f, variant: 'pending' as const }));
    const completed: FriendWithVariant[] = friendsAlreadyHelped.map(f => ({ ...f, variant: 'completed' as const }));
    return [...pending, ...completed];
  }, [friendsNeedingHelp, friendsAlreadyHelped]);

  // Separate proposals by status
  const truePendingProposals = pendingProposals.filter(
    (p) => p.yourDecision === 'pending'
  );

  const awaitingResponseProposals = pendingProposals.filter(
    (p) => p.yourDecision === 'accepted' && p.partnerDecision === 'pending'
  );

  // Show all real data - no dev filtering
  const filteredData = {
    activeMatch,
    pendingProposals: truePendingProposals,
    awaitingResponse: awaitingResponseProposals,
    friendsNeedingHelp,
    friendsAlreadyHelped,
  };

  // Loading state
  if (loading) {
    return (
      <StyledView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.text.heading} />
        <StyledText className="mt-4 text-neutral-600">Loading Friends Area...</StyledText>
      </StyledView>
    );
  }

  return (
    <>
      <StyledScrollView
        className="flex-1 bg-neutral-50"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F43F5E"
          />
        }
      >
        {/* SECTION 0: Friend Requests (only visible when there are incoming requests) */}
        {incomingRequests.length > 0 && (
          <StyledView className="px-4 pt-4 pb-2">
            <StyledView className="flex-row items-center mb-3">
              <StyledView style={{ marginRight: 8 }}>
                <EvaIcon name="person-add" variant="outline" color="primary" size={20} />
              </StyledView>
              <StyledText style={{
                fontSize: FONT_SIZES.lg,
                fontWeight: '600',
                fontFamily: FONTS.semiBold,
                color: COLORS.text.primary,
              }}>
                Friend Requests
              </StyledText>
              <StyledView style={{
                backgroundColor: '#3B82F6',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8,
                paddingHorizontal: 6,
              }}>
                <StyledText style={{
                  color: '#FFFFFF',
                  fontSize: FONT_SIZES.xs,
                  fontWeight: '700',
                  fontFamily: FONTS.bold,
                }}>
                  {incomingRequests.length}
                </StyledText>
              </StyledView>
            </StyledView>
            {incomingRequests.map(request => (
              <FriendRequestCard
                key={request.id}
                request={request}
                onAccept={() => handleAcceptRequest(request.id, request.senderProfile.firstName || 'Friend')}
                onDecline={() => handleDeclineRequest(request.id)}
                isProcessing={processingRequestId === request.id}
              />
            ))}
          </StyledView>
        )}

        {/* SECTION 1: Active Match (HIGHEST PRIORITY - only show if there is an active match) */}
        {filteredData.activeMatch && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 pt-6 pb-4">
              <ActiveMatchCard
                match={filteredData.activeMatch}
                onMessage={handleMessageMatch}
                onEndMatch={filteredData.activeMatch.canEndMatch ? handleEndMatch : undefined}
              />
            </StyledView>
          </GuideTarget>
        )}

        {!filteredData.activeMatch && filteredData.awaitingResponse.length > 0 && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 py-4 bg-amber-50">
              <StyledView className="flex-row items-center mb-3">
                <StyledView style={{ marginRight: 8 }}>
                  <EvaIcon name="clock" variant="outline" color="warning" size={20} />
                </StyledView>
                <StyledText className="text-lg font-semibold text-neutral-900">
                  Awaiting Their Response
                </StyledText>
              </StyledView>

              <StyledView>
                {/* Only show the first/latest awaiting response */}
                <AwaitingResponseCard proposal={filteredData.awaitingResponse[0]} />
              </StyledView>
            </StyledView>
          </GuideTarget>
        )}

        {/* SECTION 2B: Pending Proposals (HIGH PRIORITY - limit to exactly 1 per day as per spec) */}
        {!filteredData.activeMatch && filteredData.awaitingResponse.length === 0 && filteredData.pendingProposals.length > 0 && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 py-4 bg-rose-50">
              <StyledView className="flex-row items-center mb-3">
                <StyledView style={{ marginRight: 8 }}>
                  <EvaIcon name="heart" variant="outline" color="coral" size={18} />
                </StyledView>
                <StyledText className="text-lg font-semibold text-neutral-900">
                  Today's Proposal
                </StyledText>
                {/* Note: In production, backend handles "exactly 1", but we ensure it here too */}
              </StyledView>

              <StyledView>
                {/* Show ONLY the first pending proposal (the daily drop) */}
                <PendingProposalCard
                  proposal={filteredData.pendingProposals[0]}
                  onViewProfile={() => handleViewProposal(filteredData.pendingProposals[0])}
                />
              </StyledView>
            </StyledView>
          </GuideTarget>
        )}

        {/* Empty State Message - Show when no match, proposals, or awaiting response */}
        {!filteredData.activeMatch && filteredData.pendingProposals.length === 0 && filteredData.awaitingResponse.length === 0 && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 pt-6 pb-4">
              <StyledView
                className="rounded-2xl shadow-lg border-2"
                style={{
                  backgroundColor: '#FFF1F2', // Same warm rose as active match
                  borderColor: '#FFE4E6',
                  ...SHADOWS.accentRed,
                  padding: 16, // Standardized padding
                }}
              >
                {/* Icon with glow effect */}
                <StyledView className="flex-row items-start mb-3">
                  <StyledView className="relative mr-3">
                    <StyledView
                      className="w-16 h-16 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: '#FFE4E6',
                        ...SHADOWS.accentRed,
                      }}
                    >
                      <EvaIcon name="heart" variant="outline" size={32} color="#7C3AED" />
                    </StyledView>
                  </StyledView>

                  {/* Right Side: Header + Info */}
                  <StyledView className="flex-1">
                    <StyledText className="text-sm font-bold text-rose-900 mb-2">
                      Looking for Matches
                    </StyledText>
                    <StyledText className="text-base font-semibold text-rose-900 mb-1">
                      Your match is coming
                    </StyledText>
                    <StyledText className="text-xs text-rose-700">
                      The community is searching
                    </StyledText>
                  </StyledView>
                </StyledView>

                {/* Encouraging banner */}
                <StyledView
                  className="bg-rose-100 border border-rose-200 rounded-xl"
                  style={{ padding: 12 }}
                >
                  <StyledText className="text-sm font-semibold text-rose-900 text-center">
                    Stay tuned! Next proposal drops at {UNIVERSAL_PROPOSAL_RELEASE_HOUR}:00 UTC.
                  </StyledText>
                </StyledView>
              </StyledView>
            </StyledView>
          </GuideTarget>
        )}

        {/* SECTION 3: Combined Friends List (Pending + Completed) */}
        {combinedFriends.length > 0 ? (
          <StyledView style={{ paddingTop: 20 }}>
            {/* Section Header with Timer - Enhanced Design */}
            <StyledView style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <StyledView className="flex-row items-center justify-between mb-3">
                <StyledView>
                  <StyledText style={{
                    fontSize: FONT_SIZES['5xl'],
                    fontWeight: '800',
                    fontFamily: FONTS.extraBold,
                    color: COLORS.text.primary,
                    letterSpacing: -0.5,
                  }}>
                    Friends
                  </StyledText>
                  <StyledText style={{
                    fontSize: FONT_SIZES.md,
                    fontWeight: '500',
                    fontFamily: FONTS.medium,
                    color: COLORS.text.secondary,
                    marginTop: 2,
                  }}>
                    Help your crew find matches
                  </StyledText>
                </StyledView>
                <GuideTarget id="timer-display">
                  <TimerBadge timeRemaining={timeRemaining} />
                </GuideTarget>
              </StyledView>
            </StyledView>

            {/* Friends List (plain map — no virtualization cap inside ScrollView) */}
            <GuideTarget id="help-friends-section">
              <StyledView style={{ backgroundColor: COLORS.card }}>
                {combinedFriends.map((friendItem, index) => {
                  const friendCard = (
                    <FriendCard
                      friend={friendItem}
                      variant={friendItem.variant}
                      onHelpMatch={() => handleHelpFriend(friendItem.friendId)}
                      onMessage={() => handleChatWithFriend(friendItem.friendId)}
                      onViewProfile={() => handleViewFriendProfile(friendItem.friendId)}
                      onStreakMilestone={handleStreakMilestone}
                      onBadgePress={() => handleBadgePress(friendItem.friendId, friendItem.friend?.firstName || 'Friend')}
                      onRemoveFriend={() => handleRemoveFriend(friendItem.friendId)}
                    />
                  );

                  // Check if we need to insert the "Already Helped" separator before this item
                  const prevItem = index > 0 ? combinedFriends[index - 1] : null;
                  const showSeparator = prevItem?.variant === 'pending' && friendItem.variant === 'completed';

                  return (
                    <React.Fragment key={friendItem.friendshipId}>
                      {showSeparator && (
                        <StyledView
                          style={{
                            height: 56,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: COLORS.backgroundSubtle,
                            paddingVertical: 16,
                          }}
                        >
                          <StyledView style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, width: '100%' }}>
                            <StyledView style={{
                              flex: 1,
                              height: 1.5,
                              backgroundColor: COLORS.backgroundGrayMedium,
                              opacity: 0.6,
                            }} />
                            <StyledView style={{
                              backgroundColor: COLORS.backgroundGray,
                              paddingHorizontal: 14,
                              paddingVertical: 6,
                              borderRadius: 12,
                              marginHorizontal: 12,
                              borderWidth: 1,
                              borderColor: COLORS.backgroundGrayMedium,
                            }}>
                              <StyledText
                                style={{
                                  fontSize: FONT_SIZES.xs,
                                  color: COLORS.text.label,
                                  fontWeight: '700',
                                  fontFamily: FONTS.bold,
                                  letterSpacing: 0.8,
                                  textTransform: 'uppercase',
                                }}
                              >
                                Already Helped
                              </StyledText>
                            </StyledView>
                            <StyledView style={{
                              flex: 1,
                              height: 1.5,
                              backgroundColor: COLORS.backgroundGrayMedium,
                              opacity: 0.6,
                            }} />
                          </StyledView>
                        </StyledView>
                      )}
                      {index === 0 && friendItem.variant === 'pending' ? (
                        <GuideTarget id="friend-row-0">
                          {friendCard}
                        </GuideTarget>
                      ) : (
                        friendCard
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Celebration banner if all friends helped */}
                {friendsNeedingHelp.length === 0 && friends.length > 0 && (
                  <CelebrationBanner />
                )}
              </StyledView>
            </GuideTarget>
          </StyledView>
        ) : (
          /* Empty State - No friends at all */
          <StyledView className="px-4 pt-4 pb-4">
            <StyledView className="bg-blue-50 rounded-2xl p-6 items-center">
              <IconScoutIcon name="kindness" size={40} style={{ marginBottom: 8 }} />
              <StyledText className="text-base font-medium text-neutral-700 text-center mb-4">
                Add friends to help them find matches
              </StyledText>
              <StyledTouchable
                className="bg-primary-500 px-5 py-2.5 rounded-xl"
                onPress={() => navigation.navigate('ContactInvite')}
              >
                <StyledText className="text-white font-semibold text-sm">Invite from Contacts</StyledText>
              </StyledTouchable>
            </StyledView>
          </StyledView>
        )}

        {/* All Empty State - Only show when everything is empty (no match, no proposals, no friends) */}
        {truePendingProposals.length === 0 &&
          awaitingResponseProposals.length === 0 &&
          friends.length === 0 &&
          !activeMatch && (
            <StyledView className="flex-1 items-center justify-center px-6" style={{ minHeight: 400 }}>
              <IconScoutIcon name="friendship-first" size={48} style={{ marginBottom: 16 }} />
              <StyledText className="text-xl font-semibold text-neutral-900 mb-2 text-center">
                All Caught Up
              </StyledText>
              <StyledText className="text-base text-neutral-600 text-center">
                No proposals or friends need help right now.{'\n'}Check back soon!
              </StyledText>
            </StyledView>
          )}
      </StyledScrollView>

      {/* End Match Modal */}
      <EndMatchModal
        visible={showEndMatchModal}
        onClose={() => setShowEndMatchModal(false)}
        onSubmit={handleEndMatchSubmit}
      />

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
    </>
  );
}

export default FriendsAreaView;
