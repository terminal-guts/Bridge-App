import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { styled } from 'nativewind';
import { UserRow } from '../../components/community/UserRow';
import { ProposalReviewView } from '../../components/community/ProposalReviewView';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../../types';
import { communityService } from '../../services/communityServiceIndex';
import { FriendWithGridStatus } from '../../types/community';

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
      const helped = data.friends.filter((f: FriendWithGridStatus) => f.hasCompletedGrid);
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
    setHasCompletedVoting(true);
    await loadFriendsData();
  }, [loadFriendsData]);

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
      <View className="px-6 pt-12 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[22px] font-outfit-semibold text-[#010101] leading-tight">
            Community
          </Text>
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
        {usersToMatch.length > 0 && (
          <Text className="text-[16px] font-outfit-regular text-[#010101] opacity-60 mt-2">
            Help your friends
          </Text>
        )}
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
            onPress={() => navigation.navigate('Community')}
          >
            <Text style={styles.ctaText}>Add your first friend</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
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
            <View className="mt-6 mb-3 px-6">
              <Text className="text-[17px] font-jakarta-medium text-[#737373]">
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
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  tagline: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 21, color: '#0B1226', textAlign: 'center', marginBottom: 32 },
  illustration: { width: 300, height: 300, marginBottom: 32 },
  subtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, lineHeight: 17, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
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
