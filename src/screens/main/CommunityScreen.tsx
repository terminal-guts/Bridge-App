import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { UserRow } from '../../components/community/UserRow';
import { NavigationProp } from '@react-navigation/native';
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await communityService.getFriendsAreaData();
        // Filter users based on their completion status
        const toMatch = data.friends.filter((f: FriendWithGridStatus) => !f.hasCompletedGrid);
        const helped = data.friends.filter((f: FriendWithGridStatus) => f.hasCompletedGrid);
        setUsersToMatch(toMatch);
        setAlreadyHelped(helped);
      } catch (error) {
        console.error("Failed to load community data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2B65F9" />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header section */}
      <View className="px-6 pt-16 pb-2">
        <Text className="text-[22px] font-outfit-semibold text-[#010101] leading-tight">
          Community
        </Text>
        <Text className="text-[16px] font-outfit-regular text-[#010101] opacity-60 mt-2">
          Help find their soulmates
        </Text>
      </View>

      <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
        {/* Main list */}
        <View>
          {usersToMatch.map((user, index) => (
            <UserRow key={user.friendId} item={user} index={index} />
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
    </StyledSafeAreaView>
  );
}

export default CommunityScreen;
