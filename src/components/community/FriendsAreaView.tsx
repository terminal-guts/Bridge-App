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

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { EvaIcon } from '../icons';
import { RootStackParamList } from '../../types';
import {
  FriendWithGridStatus,
  MatchProposal,
  ActiveMatch,
  CommunityTask,
} from '../../types/community';
import { FriendCard } from './FriendCard';
import { PendingProposalCard } from './PendingProposalCard';
import { AwaitingResponseCard } from './AwaitingResponseCard';
import { ActiveMatchCard } from './ActiveMatchCard';
import { EndMatchModal } from './EndMatchModal';
import { communityService } from '../../services/communityServiceIndex';
import { GuideTarget } from '../guides';
import { useGuide } from '../../hooks/useGuide';
import { friendsAreaGuide } from '../../config/guides';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchable = styled(TouchableOpacity);

interface FriendsAreaViewProps {
  taskProgress?: CommunityTask | null;
  isActive?: boolean; // Whether this page is currently visible
}

type DevTestState = 'active-match' | 'awaiting-response' | 'pending-proposal' | 'empty';

export function FriendsAreaView({ taskProgress, isActive = false }: FriendsAreaViewProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Internal state for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<FriendWithGridStatus[]>([]);
  const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);

  // DEV: Test state control
  const [devTestState, setDevTestState] = useState<DevTestState>('empty');
  const [timeRemaining, setTimeRemaining] = useState('');

  // Guide system
  const { startGuideIfNeeded } = useGuide();

  // Calculate time remaining until 8am tomorrow
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow8am = new Date();
      tomorrow8am.setHours(8, 0, 0, 0);

      // If it's past 8am today, set to 8am tomorrow
      if (now.getHours() >= 8) {
        tomorrow8am.setDate(tomorrow8am.getDate() + 1);
      }

      const diff = tomorrow8am.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load Friends Area data
  const loadFriendsArea = useCallback(async () => {
    try {
      setLoading(true);

      const data = await communityService.getFriendsAreaData();
      setFriends(data.friends);
      setPendingProposals(data.pendingProposals);
      setActiveMatch(data.activeMatch);

      setLoading(false);
    } catch (error) {
      console.error('[FriendsAreaView] Error loading data:', error);
      setLoading(false);
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
          console.log(`[FriendsAreaView] Removed ${prev.length - nonExpired.length} expired proposal(s)`);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriendsArea();
    setRefreshing(false);
  };

  const handleViewFriendGrid = useCallback((friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return;

    // Navigate to FriendGrid screen (same design as Daily Grid)
    navigation.navigate('FriendGrid', {
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

    console.log('[FriendsAreaView] Navigating to Chat with:', {
      matchId: activeMatch.matchId,
      recipientName: activeMatch.partnerProfile.firstName,
    });

    // Navigate to Chat screen
    navigation.navigate('Chat', {
      matchId: activeMatch.matchId,
      recipientName: activeMatch.partnerProfile.firstName,
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
      setShowEndMatchModal(false);
      await communityService.endActiveMatch(activeMatch.matchId, reason);
      await loadFriendsArea(); // Reload data
      console.log('[FriendsAreaView] Match ended. Reason:', reason);
    } catch (error) {
      console.error('[FriendsAreaView] Error ending match:', error);
    }
  };

  const handleChatWithFriend = useCallback((friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return;

    // Navigate to Chat screen with friend
    navigation.navigate('Chat', {
      recipientId: friend.friendId,
      recipientName: friend.friend.firstName,
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
  // Only show friends who are anchors today
  const friendsWhoAreAnchors = friends.filter((f) => f.isAnchorToday);
  const pendingFriends = friendsWhoAreAnchors.filter((f) => !f.hasCompletedGrid);
  const completedFriends = friendsWhoAreAnchors
    .filter((f) => f.hasCompletedGrid)
    .sort((a, b) => b.streakDays - a.streakDays); // Sort by streak descending (leaderboard)

  // Separate proposals by status
  const truePendingProposals = pendingProposals.filter(
    (p) => p.yourDecision === 'pending'
  );

  const awaitingResponseProposals = pendingProposals.filter(
    (p) => p.yourDecision === 'accepted' && p.partnerDecision === 'pending'
  );

  // DEV: Filter data based on test state
  // NOTE: Friends and grids ALWAYS show in every state (they are unaffected by match/proposal status)
  const getFilteredData = () => {
    switch (devTestState) {
      case 'active-match':
        return {
          activeMatch,
          pendingProposals: [],
          awaitingResponse: [],
          friends: friendsWhoAreAnchors,
        };
      case 'awaiting-response':
        return {
          activeMatch: null,
          pendingProposals: [],
          awaitingResponse: awaitingResponseProposals,
          friends: friendsWhoAreAnchors,
        };
      case 'pending-proposal':
        return {
          activeMatch: null,
          pendingProposals: truePendingProposals,
          awaitingResponse: [],
          friends: friendsWhoAreAnchors,
        };
      case 'empty':
      default:
        return {
          activeMatch: null,
          pendingProposals: [],
          awaitingResponse: [],
          friends: friendsWhoAreAnchors,
        };
    }
  };

  const filteredData = getFilteredData();

  // Recalculate friends lists based on filtered data
  const filteredPendingFriends = filteredData.friends.filter((f) => !f.hasCompletedGrid);
  const filteredCompletedFriends = filteredData.friends
    .filter((f) => f.hasCompletedGrid)
    .sort((a, b) => b.streakDays - a.streakDays);

  // Loading state
  if (loading) {
    return (
      <StyledView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1E293B" />
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
        {/* DEV: Test State Toolbar */}
        <StyledView className="bg-blue-50 border-b-2 border-blue-200 px-4 py-3">
          <StyledText className="text-xs font-bold text-blue-900 mb-2">
            🛠️ DEV MODE - Test States (Friends always visible)
          </StyledText>
          <StyledView className="flex-row flex-wrap gap-2">
            <StyledTouchable
              onPress={() => setDevTestState('active-match')}
              className={`px-3 py-1.5 rounded-lg ${devTestState === 'active-match' ? 'bg-blue-500' : 'bg-white'}`}
              style={{ borderWidth: 1, borderColor: '#3B82F6' }}
            >
              <StyledText className={`text-xs font-semibold ${devTestState === 'active-match' ? 'text-white' : 'text-blue-700'}`}>
                Active Match
              </StyledText>
            </StyledTouchable>

            <StyledTouchable
              onPress={() => setDevTestState('awaiting-response')}
              className={`px-3 py-1.5 rounded-lg ${devTestState === 'awaiting-response' ? 'bg-blue-500' : 'bg-white'}`}
              style={{ borderWidth: 1, borderColor: '#3B82F6' }}
            >
              <StyledText className={`text-xs font-semibold ${devTestState === 'awaiting-response' ? 'text-white' : 'text-blue-700'}`}>
                Awaiting Response
              </StyledText>
            </StyledTouchable>

            <StyledTouchable
              onPress={() => setDevTestState('pending-proposal')}
              className={`px-3 py-1.5 rounded-lg ${devTestState === 'pending-proposal' ? 'bg-blue-500' : 'bg-white'}`}
              style={{ borderWidth: 1, borderColor: '#3B82F6' }}
            >
              <StyledText className={`text-xs font-semibold ${devTestState === 'pending-proposal' ? 'text-white' : 'text-blue-700'}`}>
                Pending Proposal
              </StyledText>
            </StyledTouchable>

            <StyledTouchable
              onPress={() => setDevTestState('empty')}
              className={`px-3 py-1.5 rounded-lg ${devTestState === 'empty' ? 'bg-blue-500' : 'bg-white'}`}
              style={{ borderWidth: 1, borderColor: '#3B82F6' }}
            >
              <StyledText className={`text-xs font-semibold ${devTestState === 'empty' ? 'text-white' : 'text-blue-700'}`}>
                Empty
              </StyledText>
            </StyledTouchable>
          </StyledView>
        </StyledView>

        {/* SECTION 1: Active Match (HIGHEST PRIORITY - only show if there is an active match) */}
        {filteredData.activeMatch && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 pt-6 pb-4">
              <ActiveMatchCard
                match={activeMatch}
                onMessage={handleMessageMatch}
                onEndMatch={activeMatch.canEndMatch ? handleEndMatch : undefined}
              />
            </StyledView>
          </GuideTarget>
        )}

        {/* SECTION 2A: Awaiting Response (HIGHEST PRIORITY - replaces pending when user accepted) */}
        {!filteredData.activeMatch && devTestState === 'awaiting-response' && filteredData.awaitingResponse.length === 0 && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 pt-6 pb-4">
              <StyledView
                className="rounded-2xl shadow-lg border-2"
                style={{
                  backgroundColor: '#FFFBEB', // Warm amber background
                  borderColor: '#FEF3C7',
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                  padding: 16, // Standardized padding
                }}
              >
                {/* Icon with glow effect */}
                <StyledView className="flex-row items-start mb-3">
                  <StyledView className="relative mr-3">
                    <StyledView
                      className="w-16 h-16 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: '#FEF3C7',
                        shadowColor: '#F59E0B',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <EvaIcon name="hourglass" variant="outline" color="warning" size={28} />
                    </StyledView>
                  </StyledView>

                  {/* Right Side: Header + Info */}
                  <StyledView className="flex-1">
                    <StyledText className="text-sm font-bold text-amber-900 mb-2">
                      Awaiting Response
                    </StyledText>
                    <StyledText className="text-base font-semibold text-amber-900 mb-1">
                      They're reviewing now
                    </StyledText>
                    <StyledText className="text-xs text-amber-700">
                      You accepted a proposal
                    </StyledText>
                  </StyledView>
                </StyledView>

                {/* Encouraging banner */}
                <StyledView
                  className="bg-amber-100 rounded-xl border border-amber-200"
                  style={{ padding: 12 }}
                >
                  <StyledText className="text-sm font-semibold text-amber-900 text-center">
                    ✨ Fingers crossed! Check back soon.
                  </StyledText>
                </StyledView>
              </StyledView>
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

        {/* SECTION 2B: Pending Proposals (HIGH PRIORITY - only show if there are proposals) */}
        {!filteredData.activeMatch && filteredData.awaitingResponse.length === 0 && filteredData.pendingProposals.length > 0 && (
          <GuideTarget id="match-status-section">
            <StyledView className="px-4 py-4 bg-rose-50">
              <StyledView className="flex-row items-center mb-3">
                <StyledView style={{ marginRight: 8 }}>
                  <EvaIcon name="heart" variant="outline" color="coral" size={18} />
                </StyledView>
                <StyledText className="text-lg font-semibold text-neutral-900">
                  Pending Proposals
                </StyledText>
                <StyledView className="ml-2 bg-rose-500 rounded-full px-2 py-0.5">
                  <StyledText className="text-xs font-bold text-white">
                    {filteredData.pendingProposals.length}
                  </StyledText>
                </StyledView>
              </StyledView>

              <StyledView>
                {filteredData.pendingProposals.map((proposal, index) => (
                  <StyledView key={proposal.id} style={{ marginTop: index > 0 ? 16 : 0 }}>
                    <PendingProposalCard
                      proposal={proposal}
                      onViewProfile={() => handleViewProposal(proposal)}
                    />
                  </StyledView>
                ))}
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
                  shadowColor: '#F43F5E',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
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
                        shadowColor: '#F43F5E',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <StyledText className="text-3xl">💫</StyledText>
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
                    ✨ Stay tuned! New proposals drop soon.
                  </StyledText>
                </StyledView>
              </StyledView>
            </StyledView>
          </GuideTarget>
        )}

        {/* SECTION 3A: Grids (Friends needing help today) */}
        {filteredPendingFriends.length > 0 && (
          <StyledView className="px-4 pt-4 pb-2">
            <StyledView className="flex-row items-center justify-between mb-3">
              <StyledText className="text-lg font-bold text-neutral-900">
                Grids
              </StyledText>

              {/* Countdown Timer */}
              <GuideTarget id="timer-display">
                <StyledView className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
                  <StyledView style={{ marginRight: 4 }}>
                    <EvaIcon name="clock" variant="fill" color="warning" size={14} />
                  </StyledView>
                  <StyledText className="text-sm font-bold text-orange-600">
                    {timeRemaining}
                  </StyledText>
                </StyledView>
              </GuideTarget>
            </StyledView>

            <GuideTarget id="grids-section-header">
              <StyledView className="bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm">
                {filteredPendingFriends.map((friend, index) => {
                  const friendCard = (
                    <FriendCard
                      key={friend.friendshipId}
                      friend={friend}
                      isPending={true}
                      onViewGrid={() => handleViewFriendGrid(friend.friendId)}
                      onMessage={() => handleChatWithFriend(friend.friendId)}
                      onViewProfile={() => handleViewFriendProfile(friend.friendId)}
                    />
                  );

                  // Wrap first friend card with GuideTarget
                  if (index === 0) {
                    return (
                      <GuideTarget key={friend.friendshipId} id="friend-row-0">
                        {friendCard}
                      </GuideTarget>
                    );
                  }

                  return friendCard;
                })}
              </StyledView>
            </GuideTarget>
          </StyledView>
        )}

        {/* SECTION 3A: Empty State for Grids */}
        {filteredPendingFriends.length === 0 && (
          <StyledView className="px-4 pt-4 pb-2">
            <StyledView className="flex-row items-center justify-between mb-3">
              <StyledText className="text-lg font-bold text-neutral-900">
                Grids
              </StyledText>

              {/* Countdown Timer */}
              <GuideTarget id="timer-display">
                <StyledView className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
                  <StyledView style={{ marginRight: 4 }}>
                    <EvaIcon name="clock" variant="fill" color="warning" size={14} />
                  </StyledView>
                  <StyledText className="text-sm font-bold text-orange-600">
                    {timeRemaining}
                  </StyledText>
                </StyledView>
              </GuideTarget>
            </StyledView>

            <GuideTarget id="grids-section-header">
              <StyledView className="bg-blue-50 rounded-2xl p-6 items-center">
                <StyledText className="text-3xl mb-2">✨</StyledText>
                <StyledText className="text-base font-medium text-neutral-700 text-center">
                  {filteredData.friends.length > 0
                    ? "You helped all your friends today"
                    : "Add friends to see their grids here"}
                </StyledText>
              </StyledView>
            </GuideTarget>
          </StyledView>
        )}

        {/* SECTION 3B: Leaderboard (ranked by streak) */}
        {filteredCompletedFriends.length > 0 && (
          <GuideTarget id="leaderboard-section">
            <StyledView className="px-4 pt-4 pb-4">
              <StyledView className="flex-row items-center mb-3">
                <StyledText className="text-lg font-bold text-neutral-900">
                  Leaderboard
                </StyledText>
                <StyledView style={{ marginLeft: 6 }}>
                  <EvaIcon name="award" variant="outline" color="warning" size={16} />
                </StyledView>
              </StyledView>

              <StyledView className="bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm">
                {filteredCompletedFriends.map((friend) => (
                  <FriendCard
                    key={friend.friendshipId}
                    friend={friend}
                    isPending={false}
                    onViewGrid={() => handleViewFriendGrid(friend.friendId)}
                    onMessage={() => handleChatWithFriend(friend.friendId)}
                    onViewProfile={() => handleViewFriendProfile(friend.friendId)}
                  />
                ))}
              </StyledView>
            </StyledView>
          </GuideTarget>
        )}

        {/* SECTION 3B: Empty State for Leaderboard */}
        {filteredCompletedFriends.length === 0 && (
          <GuideTarget id="leaderboard-section">
            <StyledView className="px-4 pt-4 pb-4">
              <StyledView className="flex-row items-center mb-3">
                <StyledText className="text-lg font-bold text-neutral-900">
                  Leaderboard
                </StyledText>
                <StyledView style={{ marginLeft: 6 }}>
                  <EvaIcon name="award" variant="outline" color="warning" size={16} />
                </StyledView>
              </StyledView>
              <StyledView className="bg-neutral-50 rounded-2xl p-6 items-center">
                <StyledText className="text-base text-neutral-600 text-center">
                  {filteredData.friends.length > 0
                    ? "Help friends to see them on the leaderboard"
                    : "Friend streaks will appear here"}
                </StyledText>
              </StyledView>
            </StyledView>
          </GuideTarget>
        )}

        {/* All Empty State - Only show when everything is empty */}
        {truePendingProposals.length === 0 &&
          awaitingResponseProposals.length === 0 &&
          friendsWhoAreAnchors.length === 0 &&
          !activeMatch && (
            <StyledView className="flex-1 items-center justify-center px-6" style={{ minHeight: 400 }}>
              <StyledText className="text-5xl mb-4">✨</StyledText>
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
    </>
  );
}

export default FriendsAreaView;
