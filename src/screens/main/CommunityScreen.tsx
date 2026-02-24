import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { styled } from 'nativewind';
import { UserRow } from '../../components/community/UserRow';
import { ProposalReviewView } from '../../components/community/ProposalReviewView';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../../types';
import { communityService } from '../../services/communityServiceIndex';
import { FriendWithGridStatus } from '../../types/community';

// ── Match reset countdown timer ───────────────────────────────────────────────
function MatchResetTimer() {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, communityService.getNextResetAt() - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      const ms = communityService.getNextResetAt() - Date.now();
      if (ms <= 0) {
        communityService.triggerReset();
        setRemaining(24 * 60 * 60 * 1000);
      } else {
        setRemaining(ms);
      }
    };

    const interval = setInterval(tick, 1000);
    // Re-sync when dev toggle changes the reset time
    const unsub = communityService.onStateChange(() => {
      setRemaining(Math.max(0, communityService.getNextResetAt() - Date.now()));
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

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
  );
}

interface CommunityScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Community'>;
}

const StyledSafeAreaView = styled(SafeAreaView);

export function CommunityScreen({ navigation }: CommunityScreenProps) {
  const [usersToMatch, setUsersToMatch] = useState<FriendWithGridStatus[]>([]);
  const [alreadyHelped, setAlreadyHelped] = useState<FriendWithGridStatus[]>([]);
  const [loading, setLoading] = useState(true);
  // null = still checking, true = can see friends area, false = must vote first
  const [hasCompletedVoting, setHasCompletedVoting] = useState<boolean | null>(null);

  const loadFriendsData = useCallback(async () => {
    try {
      const data = await communityService.getFriendsAreaData();
      const toMatch = data.friends.filter((f: FriendWithGridStatus) => !f.hasCompletedGrid);
      const helped = data.friends
        .filter((f: FriendWithGridStatus) => f.hasCompletedGrid)
        .sort((a: FriendWithGridStatus, b: FriendWithGridStatus) => b.assistsCount - a.assistsCount);
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);
    } catch (error) {
      console.error("Failed to load community data:", error);
    }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const task = await communityService.getCommunityTaskProgress();
      const votingDone = task.hasVotedOnProposals;
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
    if (!initializedRef.current) {
      initializedRef.current = true;
      return; // skip first focus (handled by the init useEffect)
    }
    if (hasCompletedVoting) {
      loadFriendsData();
    }
  }, [hasCompletedVoting, loadFriendsData]));

  const handleVotesComplete = useCallback(async () => {
    await loadFriendsData();
    setHasCompletedVoting(true);
    navigation.navigate('Community');
  }, [loadFriendsData, navigation]);

  if (loading || hasCompletedVoting === null) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2B65F9" />
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

      {/* Header section */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 32, lineHeight: 38, color: '#010101', letterSpacing: -0.5 }}>
            Community
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MatchResetTimer />
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
          </View>
        </View>
      </View>

      {usersToMatch.length === 0 && alreadyHelped.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.tagline}>Your circle starts with one friend</Text>
          <Image
            source={require('../../../assets/no_match_illustration.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            Add friends to help them find{'\n'}meaningful connections
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => (navigation as any).navigate('FriendCode')}
          >
            <Text style={styles.ctaText}>Add your first friend</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                onMatch={() => (navigation as any).navigate('FriendProposal', {
                  friendId: user.friendId,
                  friendName: user.friend.firstName,
                  friendPhotoUrl: user.friend.photos?.[0]?.url,
                  friendAge: user.friend.age,
                  friendJob: user.friend.currentJob,
                })}
              />
            ))}
          </View>

          {/* Already Helped section */}
          {alreadyHelped.length > 0 && (
            <View style={{ marginTop: 20, marginBottom: 4, paddingHorizontal: 24 }}>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#9CA3AF' }}>
                Already helped
              </Text>
            </View>
          )}

          <View className="pb-8">
            {alreadyHelped.map((user, index) => (
              <UserRow key={user.friendId} item={user} index={index} />
            ))}
          </View>
        </ScrollView>
      )}
    </StyledSafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  tagline: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 26, color: '#0B1226', textAlign: 'center', marginBottom: 12 },
  illustration: { width: 300, height: 300, marginBottom: 32 },
  subtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, lineHeight: 17, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
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
});

export default CommunityScreen;
