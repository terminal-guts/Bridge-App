import React, { useState, useEffect, useRef } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Button, Card, Chip } from '../../components/ui';
import { valueEmoji, interestEmoji } from '../../utils/emojiMaps';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Match } from '../../types';
import { getCurrentUser } from '../../services/authService';
import { getUserMatches, acceptMatch, rejectMatch } from '../../services/matchService';
import { getFriends } from '../../services/friendService';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('MatchDetailScreen');

interface MatchDetailScreenProps {
  navigation: NavigationProp<RootStackParamList, 'MatchDetail'>;
  route: RouteProp<RootStackParamList, 'MatchDetail'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Alert Helpers

/**
 * Show success alert for match acceptance
 */
const showMatchAcceptedAlert = (onStartChat: () => void, onLater: () => void) => {
  Alert.alert('Match Accepted!', 'You can now start chatting with your match!', [
    {
      text: 'Start Chatting',
      onPress: onStartChat,
    },
    {
      text: 'Later',
      onPress: onLater,
    },
  ]);
};

/**
 * Show confirmation alert for match rejection
 */
const showRejectConfirmAlert = (onConfirm: () => void) => {
  Alert.alert('Pass on this match?', 'Are you sure you want to pass on this match?', [
    {
      text: 'Cancel',
      style: 'cancel',
    },
    {
      text: 'Pass',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
};

/**
 * Show alert asking if user wants to recommend to friend
 */
const showRecommendPrompt = (profileName: string, onYes: () => void, onNo: () => void) => {
  Alert.alert(
    'Recommend to a Friend?',
    `Think ${profileName} might be a good match for one of your friends?`,
    [
      {
        text: 'No Thanks',
        style: 'cancel',
        onPress: onNo,
      },
      {
        text: 'Yes, Recommend',
        onPress: onYes,
      },
    ]
  );
};

/**
 * Show alert when user has no friends
 */
const showNoFriendsAlert = (onAddFriends: () => void, onCancel: () => void) => {
  Alert.alert('No Friends Yet', 'Add friends first to share match recommendations', [
    {
      text: 'Add Friends',
      onPress: onAddFriends,
    },
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: onCancel,
    },
  ]);
};

/**
 * Show alert for selecting a friend
 */
const showSelectFriendAlert = (
  friends: Array<{ text: string; onPress: () => void }>,
  onCancel: () => void
) => {
  const buttons = [...friends.slice(0, 5), { text: 'Cancel', onPress: onCancel }];
  Alert.alert('Select Friend', 'Choose a friend to recommend this match to:', buttons);
};

/**
 * Show recommendation result alert
 */
const showRecommendationResult = (success: boolean, onDismiss: () => void) => {
  if (success) {
    Alert.alert(
      'Recommendation Sent!',
      'Your friend will see this match in their recommendations',
      [{ text: 'OK', onPress: onDismiss }]
    );
  } else {
    Alert.alert(
      'Failed to Send',
      'Could not send recommendation. Please try again later.',
      [{ text: 'OK', onPress: onDismiss }]
    );
  }
};

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const matchRef = useRef<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    loadMatch();
  }, []);

  const loadMatch = async () => {
    setLoading(true);
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        Alert.alert('Error', 'User not authenticated');
        navigation.goBack();
        return;
      }

      const matchesResult = await getUserMatches();
      if (!matchesResult.ok || !matchesResult.data) {
        Alert.alert('Error', 'Failed to load match');
        navigation.goBack();
        return;
      }

      const foundMatch = matchesResult.data.find(m => m.id === matchId);
      if (!foundMatch) {
        Alert.alert('Error', 'Match not found');
        navigation.goBack();
        return;
      }

      setMatch(foundMatch);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load match');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const currentMatch = matchRef.current;
    if (!currentMatch) return;

    setActionLoading(true);
    const result = await acceptMatch(currentMatch.id);
    setActionLoading(false);

    if (!result.ok) {
      Alert.alert('Accept Failed', result.error?.message || 'Failed to accept match');
      return;
    }

    showMatchAcceptedAlert(handleStartChat, () => navigation.goBack());
  };

  const handleRejectConfirmed = async () => {
    const currentMatch = matchRef.current;
    if (!currentMatch) return;

    setActionLoading(true);
    const result = await rejectMatch(currentMatch.id, 'Not interested');
    setActionLoading(false);

    if (!result.ok) {
      Alert.alert('Error', result.error?.message || 'Failed to reject match');
      return;
    }

    // After successful rejection, ask about friend recommendation
    promptFriendRecommendation();
  };

  const handleReject = async () => {
    showRejectConfirmAlert(handleRejectConfirmed);
  };

  const promptFriendRecommendation = async () => {
    if (!match || !profile) return;

    showRecommendPrompt(
      profile.firstName,
      () => showFriendsList(),
      () => navigation.goBack()
    );
  };

  const navigateToAddFriends = () => {
    navigation.goBack();
    navigation.navigate('FriendCode');
  };

  const showFriendsList = async () => {
    try {
      const friendsResult = await getFriends();

      if (!friendsResult.ok || !friendsResult.data || friendsResult.data.length === 0) {
        showNoFriendsAlert(navigateToAddFriends, () => navigation.goBack());
        return;
      }

      // Create buttons for each friend
      const friendButtons = friendsResult.data.map((friend) => ({
        text: friend.profile.firstName,
        onPress: () => handleRecommendToFriend(friend.friendId),
      }));

      showSelectFriendAlert(friendButtons, () => navigation.goBack());
    } catch (error) {
      logger.error('Failed to load friends:', error);
      navigation.goBack();
    }
  };

  const handleRecommendToFriend = async (friendUserId: string) => {
    if (!match || !profile) return;

    // TODO: Implement recommendToFriend functionality in friendService
    logger.info('Recommend to friend:', { profileId: profile.userId, friendId: friendUserId });
    Alert.alert('Coming Soon', 'Recommend to friend feature is not yet implemented.');
    navigation.goBack();
  };

  const handleStartChat = () => {
    if (!match || !profile) return;
    navigation.navigate('Chat', {
      matchId: match.id,
      recipientName: profile.firstName,
      recipientPhoto: profile.photos?.[0]?.url,
    });
  };

  const handleUnmatch = () => {
    // Handle unmatch logic (exit match)
    if (!match) return;
    handleReject();
  };

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50 justify-center items-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </StyledSafeAreaView>
    );
  }

  if (!match) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 items-center justify-center">
          <Body>Match not found</Body>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  const profile = match.currentUserId === match.user1Id
    ? match.user2Profile
    : match.user1Profile;

  if (!profile) return null;

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200">
        <StyledTouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Match Details</H3>
        <StyledTouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#101828" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1">
        {/* Photo Gallery */}
        {profile.photos && profile.photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {profile.photos.map((photo) => (
              <StyledImage
                key={photo.id}
                source={{ uri: photo.url }}
                className="w-screen h-96"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <StyledView className="w-full h-96 mb-4 bg-neutral-100 items-center justify-center">
            <Body className="text-neutral-400">No photos available</Body>
          </StyledView>
        )}

        <StyledView className="px-4">
          {/* Match Info Banner */}
          <Card className="mb-4 bg-primary-50 border border-primary-200">
            <StyledView className="flex-row items-center justify-between">
              <StyledView className="flex-row items-center">
                <StyledView className="bg-primary-500 p-2 rounded-full mr-3">
                  <Ionicons name="heart" size={20} color="white" />
                </StyledView>
                <StyledView>
                  <Body className="text-primary-700 font-semibold">Perfect Match!</Body>
                  <Body className="text-primary-600 text-sm">
                    Community Score: {match.communityScore}%
                  </Body>
                </StyledView>
              </StyledView>
              {match.status === 'accepted' && (
                <StyledView className="bg-success/10 px-2 py-1 rounded-full">
                  <Body className="text-success text-xs font-semibold">MATCHED</Body>
                </StyledView>
              )}
            </StyledView>
          </Card>

          {/* Basic Info */}
          <Card className="mb-4">
            <H1 className="mb-2">{profile.firstName}, {profile.age}</H1>
            <StyledView className="space-y-1">
              <StyledView className="flex-row items-center">
                <Ionicons name="briefcase-outline" size={16} color="#667085" />
                <Body className="text-neutral-600 ml-2">{profile.currentJob}</Body>
              </StyledView>
              {profile.companyPosition && (
                <StyledView className="flex-row items-center">
                  <Ionicons name="business-outline" size={16} color="#667085" />
                  <Body className="text-neutral-600 ml-2">{profile.companyPosition}</Body>
                </StyledView>
              )}
              {profile.educationLevel && (
                <StyledView className="flex-row items-center">
                  <Ionicons name="school-outline" size={16} color="#667085" />
                  <Body className="text-neutral-600 ml-2">{profile.educationLevel}</Body>
                </StyledView>
              )}
              <StyledView className="flex-row items-center">
                <Ionicons name="location-outline" size={16} color="#667085" />
                <Body className="text-neutral-600 ml-2">{profile.location}</Body>
              </StyledView>
              {profile.height && (
                <StyledView className="flex-row items-center">
                  <Ionicons name="resize-outline" size={16} color="#667085" />
                  <Body className="text-neutral-600 ml-2">{profile.height}</Body>
                </StyledView>
              )}
            </StyledView>
          </Card>

          {/* Interests */}
          <Card className="mb-4">
            <H3 className="mb-3">Interests</H3>
            <StyledView className="flex-row flex-wrap -mx-1">
              {profile.interests.map((interest, index) => (
                <StyledView key={index} className="px-1 mb-2">
                  <Chip label={`${interestEmoji(interest)} ${interest}`} />
                </StyledView>
              ))}
            </StyledView>
          </Card>

          {/* Values */}
          <Card className="mb-4">
            <H3 className="mb-3">Values</H3>
            <StyledView className="flex-row flex-wrap -mx-1">
              {profile.values.map((value, index) => (
                <StyledView key={index} className="px-1 mb-2">
                  <Chip label={`${valueEmoji(value)} ${value}`} />
                </StyledView>
              ))}
            </StyledView>
          </Card>

          {/* Lifestyle */}
          <Card className="mb-4">
            <H3 className="mb-3">Lifestyle</H3>
            <StyledView className="space-y-2">
              {profile.lifestyle?.drinking ? (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Drinking</Body>
                  <Body className="capitalize">{profile.lifestyle.drinking}</Body>
                </StyledView>
              ) : null}
              {profile.lifestyle?.smoking ? (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Smoking</Body>
                  <Body className="capitalize">{profile.lifestyle.smoking}</Body>
                </StyledView>
              ) : null}
              {profile.lifestyle?.exercise ? (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Exercise</Body>
                  <Body className="capitalize">{profile.lifestyle.exercise}</Body>
                </StyledView>
              ) : null}
              {profile.lifestyle?.children ? (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Children</Body>
                  <Body className="capitalize">{profile.lifestyle.children.replace('_', ' ')}</Body>
                </StyledView>
              ) : null}
              {profile.religion && (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Religion</Body>
                  <Body>{profile.religion}</Body>
                </StyledView>
              )}
              {profile.politicalLeaning && (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Politics</Body>
                  <Body>{profile.politicalLeaning}</Body>
                </StyledView>
              )}
              {profile.lifestyle.pets && profile.lifestyle.pets.length > 0 && (
                <StyledView className="flex-row justify-between">
                  <Body className="text-neutral-600">Pets</Body>
                  <Body>{profile.lifestyle.pets.join(', ')}</Body>
                </StyledView>
              )}
            </StyledView>
          </Card>

          {/* Questions */}
          {profile.deepQuestions && profile.deepQuestions.length > 0 && (
            <Card
              onPress={() => navigation.navigate('DeepQuestions', { userId: profile.userId, editable: false })}
              className="mb-4"
            >
              <StyledView className="flex-row justify-between items-center">
                <StyledView className="flex-1">
                  <H3 className="mb-1">Questions</H3>
                  <Body className="text-neutral-600">
                    View {profile.firstName}'s {profile.deepQuestions.length} answers
                  </Body>
                </StyledView>
                <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
              </StyledView>
            </Card>
          )}

          {/* Action Buttons */}
          {match.status === 'accepted' ? (
            <StyledView className="mb-8">
              <Button
                onPress={handleStartChat}
                variant="primary"
                size="lg"
                fullWidth
                className="mb-3"
              >
                Start Chatting
              </Button>
              <Button
                onPress={handleUnmatch}
                variant="ghost"
                size="lg"
                fullWidth
              >
                Unmatch
              </Button>
            </StyledView>
          ) : (
            <StyledView className="flex-row mb-8 gap-4">
              <Button
                onPress={handleReject}
                variant="secondary"
                size="lg"
                className="flex-1"
                disabled={actionLoading}
              >
                Pass
              </Button>
              <Button
                onPress={handleAccept}
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Accept Match'}
              </Button>
            </StyledView>
          )}
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};