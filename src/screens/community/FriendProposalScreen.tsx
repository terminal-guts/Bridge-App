/**
 * FriendProposalScreen
 *
 * Vote on a single proposal to help a friend find a match
 *
 * This screen shows ONE proposal for a specific friend and allows
 * the user to vote on whether the match is good for their friend.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Body, H1 } from '../../components/ui';
import { RootStackParamList } from '../../types';
import { communityService } from '../../services/communityServiceIndex';
import { showToast } from '../../utils/toast';
import { lightHaptic } from '../../utils/haptics';

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface FriendProposalScreenProps {
  navigation: NavigationProp<RootStackParamList, 'FriendProposal'>;
  route: RouteProp<RootStackParamList, 'FriendProposal'>;
}

export function FriendProposalScreen({ navigation, route }: FriendProposalScreenProps) {
  const { friendId, friendName } = route.params;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading friend's proposal
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [friendId]);

  const handleGoBack = useCallback(() => {
    lightHaptic();
    navigation.goBack();
  }, [navigation]);

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7C3AED" />
          <Body className="mt-4 text-neutral-600">Loading proposal...</Body>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="px-4 pt-4 pb-2 flex-row items-center border-b border-neutral-200">
        <StyledTouchableOpacity
          onPress={handleGoBack}
          className="mr-3"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </StyledTouchableOpacity>
        <H1 className="text-xl">Help {friendName}</H1>
      </StyledView>

      {/* Content */}
      <StyledView className="flex-1 items-center justify-center px-6">
        <StyledView className="bg-purple-50 rounded-full w-24 h-24 items-center justify-center mb-6">
          <Ionicons name="people" size={48} color="#7C3AED" />
        </StyledView>

        <H1 className="text-center mb-3">Coming Soon!</H1>
        <Body className="text-center text-neutral-600 mb-6">
          Friend-specific proposal voting will be available soon.
          {'\n\n'}
          For now, you can help all your friends by completing your daily proposals in the Community tab.
        </Body>

        <TouchableOpacity
          onPress={handleGoBack}
          className="bg-purple-600 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Body className="text-white font-semibold">Go Back</Body>
        </TouchableOpacity>
      </StyledView>
    </StyledSafeAreaView>
  );
}

export default FriendProposalScreen;
