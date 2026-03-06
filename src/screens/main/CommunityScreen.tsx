import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, StyleSheet, Dimensions, Share, Alert, RefreshControl, Modal } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { styled } from 'nativewind';
import { UserRow } from '../../components/community/UserRow';
import { ProposalReviewView } from '../../components/community/ProposalReviewView';
import { GuideTarget } from '../../components/guides';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/OfflineBanner';
import { communityService } from '../../services/communityServiceIndex';
import { getUserFriendCode } from '../../services/friendService';
import { FriendWithGridStatus } from '../../types/community';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/ProfileCompletionBanner';
import { useGuide } from '../../hooks/useGuide';
import { beginnerTourGuide } from '../../config/guides';
import { CommunitySkeleton } from '../../components/ui/SkeletonLoader';

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

  useEffect(() => {
    const id = setInterval(() => {
      const ms = targetRef.current - Date.now();
      if (ms <= 0) {
        communityService.triggerReset();
        targetRef.current = Number(communityService.getNextResetAt());
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
    };
  }, []);

  // Computed fresh every render — never stale
  const remaining = Math.max(0, targetRef.current - Date.now());

  const hours   = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  let label: string;
  if (hours > 0) {
    label = `${hours}h ${minutes}m ${seconds}s`;
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
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor,
          borderRadius: 10,
          paddingHorizontal: 9,
          height: 34,
          gap: 5,
        }}>
          <Ionicons name="time-outline" size={13} color={color} />
          <Text style={{ fontSize: 13, fontWeight: '600', color }}>{label}</Text>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 22,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: '#101828',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#2B65F9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  btnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

interface CommunityScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Community'>;
}

const StyledSafeAreaView = styled(SafeAreaView);

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

  const loadFriendsData = useCallback(async () => {
    try {
      const [data, codeRes] = await Promise.all([
        communityService.getFriendsAreaData(),
        getUserFriendCode()
      ]);

      if (codeRes.ok && codeRes.data) {
        setFriendCode(codeRes.data.code);
      }

      const toMatch = data.friends.filter((f: FriendWithGridStatus) => !f.hasCompletedGrid);
      const helped = data.friends
        .filter((f: FriendWithGridStatus) => f.hasCompletedGrid)
        .sort((a: FriendWithGridStatus, b: FriendWithGridStatus) => b.assistsCount - a.assistsCount);
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);
    } catch (error) {
      console.error("Failed to load community data:", error);
      Alert.alert('Error', 'Failed to load community data. Pull down to refresh.');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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
    setLoading(true);
    try {
      // Fetch profile in parallel with the voting-gate check.
      // This eliminates the duplicate profile fetch that was in a separate useEffect.
      const profilePromise = getUserProfile().then(result => {
        if (result.ok && result.data) setProfile(result.data);
      });

      // Wait for AsyncStorage state to load before reading voting progress.
      await communityService.ready;
      const task = await communityService.getCommunityTaskProgress();
      let votingDone = task.hasVotedOnProposals;

      // If the user hasn't voted yet, check whether any proposals exist.
      // If none are available, skip the gate — no point showing "All Caught Up"
      // to a new user who has nothing to vote on.
      if (!votingDone) {
        const available = await communityService.getProposalsToVote();
        if (available.length === 0) {
          votingDone = true;
        }
      }

      setHasCompletedVoting(votingDone);
      if (votingDone) {
        await loadFriendsData();
      }

      // Ensure profile fetch completes before removing the loading state
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
  useFocusEffect(useCallback(() => {
    // Check if beginner tour should play (first visit or re-enabled from Settings)
    startGuideIfNeeded(beginnerTourGuide);

    if (!initializedRef.current) {
      initializedRef.current = true;
      return; // skip first focus (handled by the init useEffect)
    }
    // Refresh profile on each tab focus so the completion banner stays current
    getUserProfile().then(result => {
      if (result.ok && result.data) setProfile(result.data);
    });
    if (hasCompletedVoting) {
      loadFriendsData();
    }
  }, [hasCompletedVoting, loadFriendsData, startGuideIfNeeded]));

  const handleVotesComplete = useCallback(async () => {
    // Brief delay to allow the last vote to commit to the database
    // before querying hasCompletedGrid (which checks proposal_votes)
    await new Promise(resolve => setTimeout(resolve, 800));
    await loadFriendsData();
    setHasCompletedVoting(true);
    navigation.navigate('Community');
  }, [loadFriendsData, navigation]);

  if (loading || hasCompletedVoting === null) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <CommunitySkeleton />
      </StyledSafeAreaView>
    );
  }

  // Gate: must vote on 3 proposals before entering the community area
  if (!hasCompletedVoting) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <ProposalReviewView
          onVotesComplete={handleVotesComplete}
          isActive={true}
        />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <OfflineBanner />
      <ProfileCompletionBanner
        profile={profile}
        onPress={() => (navigation as any).navigate('Profile')}
      />

      {/* Header section */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 32, lineHeight: 38, color: '#010101', letterSpacing: -0.5 }}>
            Community
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MatchResetTimer />
            <GuideTarget id="add-friend-button">
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('FriendCode')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#F4F7FF',
                  borderWidth: 1,
                  borderColor: '#D1DEFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={20} color="#2B65F9" />
              </TouchableOpacity>
            </GuideTarget>
          </View>
        </View>
      </View>

      {usersToMatch.length === 0 && alreadyHelped.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B65F9" />
          }
        >
          <View style={styles.emptyContainer}>
            <Text style={styles.subtitle}>
              Share your friend code to connect with people you know. Once you're friends, you can vote on each other's matches.
            </Text>

            {friendCode ? (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>YOUR FRIEND CODE</Text>
                <Text style={styles.codeValue}>{friendCode}</Text>
                <View style={styles.codeButtonRow}>
                  <TouchableOpacity
                    style={styles.shareIconButton}
                    onPress={() => Share.share({ message: `Add me on Bridge! My friend code is:\n\n${friendCode}\n\nDownload Bridge and enter my code to connect!` })}
                  >
                    <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.shareIconButtonText}>Share Code</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.enterCodeButton}
                    activeOpacity={0.85}
                    onPress={() => (navigation as any).navigate('FriendCode')}
                  >
                    <Text style={styles.enterCodeButtonText}>Enter Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B65F9" />
          }
        >
          {usersToMatch.length > 0 && (
            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#9CA3AF', marginTop: SCREEN_HEIGHT * 0.055, marginBottom: 4, paddingHorizontal: 24 }}>
              Help your friends
            </Text>
          )}
          {/* Main list */}
          <View>
            {usersToMatch.map((user, index) => (
              <UserRow
                key={user.friendId}
                item={user}
                index={index}
                onViewProfile={() => (navigation as any).navigate('ProfileView', { profile: user.friend })}
                onMatch={() => (navigation as any).navigate('FriendProposal', {
                  friendId: user.friendId,
                  friendName: user.friend.firstName,
                  friendPhotoUrl: user.friend.photos?.[0]?.url,
                  friendAge: user.friend.age,
                  friendJob: user.friend.currentJob,
                })}
                onChat={() => (navigation as any).navigate('Chat', {
                  friendshipId: user.friendshipId,
                  recipientId: user.friendId,
                  recipientName: user.friend.firstName,
                  recipientPhoto: user.friend.photos?.[0]?.url,
                  isFriendChat: true,
                })}
              />
            ))}
          </View>

          {/* Already Helped section */}
          {alreadyHelped.length > 0 && (
            <View style={{ marginTop: 20, marginBottom: 4, paddingHorizontal: 24 }}>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#9CA3AF' }}>
                Sitting tight
              </Text>
            </View>
          )}

          <View className="pb-8">
            {alreadyHelped.map((user, index) => (
              <UserRow
                key={user.friendId}
                item={user}
                index={index}
                onViewProfile={() => (navigation as any).navigate('ProfileView', { profile: user.friend })}
                onChat={() => (navigation as any).navigate('Chat', {
                  friendshipId: user.friendshipId,
                  recipientId: user.friendId,
                  recipientName: user.friend.firstName,
                  recipientPhoto: user.friend.photos?.[0]?.url,
                  isFriendChat: true,
                })}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </StyledSafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 80, width: '100%' },
  tagline: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 26, color: '#0B1226', textAlign: 'center', marginBottom: 12 },
  illustration: { width: 300, height: 300, marginBottom: 32 },
  subtitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 24, color: '#0B1226', textAlign: 'center', marginBottom: 20, width: '100%' },
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
  ctaText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  codeContainer: {
    backgroundColor: '#F4F7FF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D1DEFF',
  },
  codeLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#2B65F9',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: '#010101',
    marginBottom: 16,
  },
  codeButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  shareIconButton: {
    flex: 1,
    backgroundColor: '#2B65F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareIconButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  enterCodeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2B65F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  enterCodeButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#2B65F9',
  },
});

export default CommunityScreen;
