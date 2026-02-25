/**
 * FriendProposalScreen
 *
 * Shows a comparison screen pairing a friend with a suggested match candidate.
 * Accessed by tapping "Match" on a friend in the Community area.
 */

import React, { useMemo, useCallback } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types';
import { UserProfile } from '../../types';
import { Proposal } from '../../types/community';
import { ProposalReviewView } from '../../components/community/ProposalReviewView';
import { communityService } from '../../services/communityServiceIndex';

const StyledSafeAreaView = styled(SafeAreaView);

interface FriendProposalScreenProps {
  navigation: NavigationProp<RootStackParamList, 'FriendProposal'>;
  route: RouteProp<RootStackParamList, 'FriendProposal'>;
}

// Hardcoded candidate to pair the friend with
const MOCK_CANDIDATE: UserProfile = {
  id: 'mock-candidate-rachel',
  userId: 'mock-candidate-rachel',
  firstName: 'Rachel',
  lastName: 'Kim',
  age: 27,
  currentJob: 'Registered Nurse',
  gender: ['female'],
  pronouns: 'she/her',
  educationLevel: 'bachelors',
  school: 'NYU',
  height: "5'5\"",
  ethnicity: 'Asian',
  religion: 'Christian',
  politicalLeaning: 'liberal',
  location: 'New York, NY',
  drinkingFrequency: 'socially',
  cannabisFrequency: 'never',
  tobaccoFrequency: 'never',
  interests: ['Hiking', 'Cooking', 'Travel', 'Photography'],
  values: ['Family', 'Loyalty', 'Growth', 'Health'],
  photos: [{ id: 'photo-rachel-1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=85', isMain: true, order: 0 }],
  lifestyle: {},
  nonNegotiables: [],
  preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  partnerLifestylePreferences: {
    drinking: ['never', 'socially'],
    cannabis: ['never'],
    tobacco: ['never'],
    otherDrugs: ['no'],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function FriendProposalScreen({ navigation, route }: FriendProposalScreenProps) {
  const { friendId, friendName, friendPhotoUrl, friendAge, friendJob } = route.params;

  const friendProfile: UserProfile = useMemo(() => ({
    id: friendId,
    userId: friendId,
    firstName: friendName,
    lastName: '',
    age: friendAge ?? 28,
    currentJob: friendJob ?? 'Professional',
    gender: ['male'],
    pronouns: 'he/him',
    educationLevel: 'bachelors',
    school: '',
    height: "5'10\"",
    ethnicity: 'Unknown',
    religion: 'Christian',
    politicalLeaning: 'moderate',
    location: 'New York, NY',
    drinkingFrequency: 'socially',
    cannabisFrequency: 'never',
    tobaccoFrequency: 'never',
    interests: ['Music', 'Sports', 'Travel', 'Food'],
    values: ['Loyalty', 'Family', 'Ambition', 'Fun'],
    photos: friendPhotoUrl
      ? [{ id: `photo-${friendId}-1`, url: friendPhotoUrl, isMain: true, order: 0 }]
      : [],
    lifestyle: {},
    nonNegotiables: [],
    preferences: { ageMin: 22, ageMax: 32, gender: 'female', lookingFor: 'relationship' },
    partnerLifestylePreferences: {
      drinking: ['never', 'socially', 'sometimes'],
      cannabis: ['never'],
      tobacco: ['never'],
      otherDrugs: ['no'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [friendId, friendName, friendPhotoUrl, friendAge, friendJob]);

  const proposal: Proposal = useMemo(() => ({
    id: `friend-proposal-${friendId}`,
    userA: friendProfile,
    userB: MOCK_CANDIDATE,
    status: 'pending',
    poolYesVotes: 0,
    poolNoVotes: 0,
    friendYesVotes: 0,
    friendNoVotes: 0,
    yesVotes: 0,
    noVotes: 0,
    totalVotes: 0,
    poolEligible: true,
    compatibilityScore: 72,
    votingThreshold: 0.6,
    baseThreshold: 0.6,
    endorsements: [],
    proposalDate: new Date().toISOString(),
    votingExpiresAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [friendProfile, friendId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleVoteComplete = useCallback(() => {
    // Record the pairing so the same candidate is never proposed to this friend again
    communityService.submitFriendGridProposal(friendId, `friend-proposal-${friendId}`).catch(() => {});
    communityService.markFriendAsHelped(friendId).catch(() => {});
    navigation.goBack();
  }, [friendId, navigation]);

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <ProposalReviewView
        initialProposals={[proposal]}
        showBackButton={true}
        onBack={handleBack}
        onVoteComplete={handleVoteComplete}
      />
    </StyledSafeAreaView>
  );
}

export default FriendProposalScreen;
