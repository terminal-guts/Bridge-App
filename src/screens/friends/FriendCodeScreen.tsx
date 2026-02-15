import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, TouchableOpacity, Share, ScrollView, Alert, ActivityIndicator, Text } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Button, Input, Card } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';
import * as Clipboard from 'expo-clipboard';
import { getUserFriendCode, addFriendByCode } from '../../services/friendService';
import { supabase } from '../../lib/supabase';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../components/OfflineBanner';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('FriendCodeScreen');

interface FriendCodeScreenProps {
  navigation: NavigationProp<RootStackParamList, 'FriendCode'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledText = styled(Text);

// Constants
const FRIEND_CODE_PATTERN = /^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// Validation Functions

/**
 * Validate friend code format
 */
const validateFriendCodeFormat = (code: string): boolean => {
  return FRIEND_CODE_PATTERN.test(code.toUpperCase());
};

/**
 * Check if code is user's own code
 */
const isOwnCode = (code: string, userCode: string): boolean => {
  return code.toUpperCase() === userCode;
};

/**
 * Validate friend code and return error message if invalid
 */
const validateFriendCode = (code: string, userCode: string): string => {
  if (!code.trim()) {
    return 'Please enter a friend code';
  }

  if (!validateFriendCodeFormat(code)) {
    return 'Invalid code format. Should be like: BRIDGE-XXXX-XXXX';
  }

  if (isOwnCode(code, userCode)) {
    return "You can't add yourself as a friend!";
  }

  return '';
};

// Sharing Functions

/**
 * Share friend code via native share dialog
 */
const shareFriendCode = async (friendCode: string): Promise<void> => {
  try {
    await Share.share({
      message: `Add me on Bridge! My friend code is: ${friendCode}\n\nBridge - The first community-driven dating experience`,
      title: 'My Bridge Friend Code',
    });
  } catch (error) {
    logger.error('Error sharing:', error);
  }
};

/**
 * Copy friend code to clipboard
 */
const copyToClipboard = async (friendCode: string): Promise<void> => {
  try {
    await Clipboard.setStringAsync(friendCode);
    Alert.alert('Copied!', 'Your friend code has been copied to clipboard');
  } catch (error) {
    logger.error('Error copying to clipboard:', error);
    Alert.alert('Error', 'Failed to copy friend code');
  }
};

export const FriendCodeScreen: React.FC<FriendCodeScreenProps> = ({ navigation }) => {
  const [friendCode, setFriendCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [myFriendCode, setMyFriendCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isOffline } = useNetworkStatus();

  // Load current user and their friend code on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadFriendCode();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        Alert.alert('Error', 'You must be logged in to view this page');
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadFriendCode = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const result = await getUserFriendCode(currentUserId);
      if (result.ok && result.data) {
        setMyFriendCode(result.data.code);
      } else {
        logger.error('Failed to load friend code:', result.error);
        Alert.alert('Error', 'Failed to load your friend code');
      }
    } catch (error) {
      logger.error('Failed to load friend code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to add friends');
      return;
    }

    if (isOffline) {
      Alert.alert('Offline', 'Cannot add friends while offline. Please check your connection and try again.');
      return;
    }

    setError('');
    setSuccess(false);

    const validationError = validateFriendCode(friendCode, myFriendCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setAdding(true);
    try {
      const result = await addFriendByCode(friendCode);

      if (result.ok && result.data) {
        setSuccess(true);
        setFriendCode('');
        const friendName = result.data.friendProfile?.firstName || 'Friend';
        Alert.alert(
          'Friend Added!',
          `${friendName} has been added to your friends list`,
          [
            {
              text: 'View Friends',
              onPress: () => navigation.replace('FriendList'),
            },
            {
              text: 'Add Another',
              style: 'cancel',
            },
          ]
        );
      } else {
        setError(result.error?.message || 'Failed to add friend');
      }
    } catch (error: any) {
      setError('An unexpected error occurred. Please try again.');
      logger.error('Failed to add friend:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleInputChange = (text: string) => {
    setFriendCode(text);
    setError('');
    setSuccess(false);
  };

  const handleShare = () => shareFriendCode(myFriendCode);
  const handleCopy = () => copyToClipboard(myFriendCode);

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />
      <OfflineBanner />

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
        <StyledTouchableOpacity onPress={() => navigation.goBack()}>
          <EvaIcon name="arrow-back" variant="outline" color="text" size={24} />
        </StyledTouchableOpacity>
        <H3>Add Friends</H3>
        <StyledTouchableOpacity onPress={() => navigation.replace('FriendList')}>
          <Body className="text-primary-500">View All</Body>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-6 pb-8">
          {/* Loading State */}
          {loading ? (
            <StyledView className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#437FFF" />
              <Body className="text-neutral-500 mt-4">Loading your friend code...</Body>
            </StyledView>
          ) : (
            <>
              {/* Your Friend Code */}
              <Card className="mb-6 bg-primary-50 border border-primary-200">
                <StyledView className="items-center">
                  <StyledView className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center mb-3">
                    <EvaIcon name="person-add" variant="outline" color="white" size={28} />
                  </StyledView>
                  <H3 className="mb-1">Your Friend Code</H3>
                  <StyledView className="bg-white px-4 py-2 rounded-lg mb-4">
                    <H2 className="text-primary-500 font-mono">{myFriendCode || 'Loading...'}</H2>
                  </StyledView>
                  <Body className="text-neutral-600 text-center mb-4 px-4">
                    Share this code with friends to connect on Bridge
                  </Body>
                  <StyledView className="flex-row space-x-4">
                    <Button onPress={handleShare} variant="primary" size="sm" disabled={!myFriendCode}>
                      Share Code
                    </Button>
                    <Button onPress={handleCopy} variant="secondary" size="sm" disabled={!myFriendCode}>
                      Copy
                    </Button>
                  </StyledView>
                </StyledView>
              </Card>

        {/* Add Friend */}
        <Card className="mb-4">
          <StyledView className="mb-4">
            <Input
              label="Friend Code"
              placeholder="Enter friend code"
              value={friendCode}
              onChangeText={handleInputChange}
              error={error}
              autoCapitalize="characters"
              containerClassName="mb-2"
            />
            <StyledView className="flex-row items-center">
              <Body className="text-neutral-500 text-xs">Format: BRIDGE-</Body>
              <StyledText className="text-neutral-500 text-xs font-bold">XXXX</StyledText>
              <Body className="text-neutral-500 text-xs">-</Body>
              <StyledText className="text-neutral-500 text-xs font-bold">XXXX</StyledText>
            </StyledView>
          </StyledView>

          <Button onPress={handleAddFriend} variant="primary" fullWidth loading={adding}>
            Add Friend
          </Button>

          {success && (
            <StyledView className="mt-4 bg-success/10 p-3 rounded-lg">
              <Body className="text-success text-center">
                Friend added successfully! You can now share survey candidates.
              </Body>
            </StyledView>
          )}
        </Card>

        {/* Benefits of Adding Friends */}
        <Card>
          <H3 className="mb-3">Why Add Friends?</H3>
          <StyledView className="space-y-3">
            <StyledView className="flex-row">
              <StyledView className="w-5 h-5 bg-primary-100 rounded-full items-center justify-center mr-3 mt-0.5">
                <EvaIcon name="checkmark" variant="fill" color="primary" size={12} />
              </StyledView>
              <StyledView className="flex-1">
                <Body className="text-neutral-900 font-medium mb-1">Help Match Your Friends Daily</Body>
                <Body className="text-neutral-600 text-sm">
                  Every day, you can view and propose matches from your friends' grids. Your proposals help them find genuine connections.
                </Body>
              </StyledView>
            </StyledView>

            <StyledView className="flex-row">
              <StyledView className="w-5 h-5 bg-primary-100 rounded-full items-center justify-center mr-3 mt-0.5">
                <EvaIcon name="checkmark" variant="fill" color="primary" size={12} />
              </StyledView>
              <StyledView className="flex-1">
                <Body className="text-neutral-900 font-medium mb-1">Influence Their Match Quality</Body>
                <Body className="text-neutral-600 text-sm">
                  Signal good or bad match types for your friends. Your input helps the algorithm find better matches for them.
                </Body>
              </StyledView>
            </StyledView>

            <StyledView className="flex-row">
              <StyledView className="w-5 h-5 bg-primary-100 rounded-full items-center justify-center mr-3 mt-0.5">
                <EvaIcon name="checkmark" variant="fill" color="primary" size={12} />
              </StyledView>
              <StyledView className="flex-1">
                <Body className="text-neutral-900 font-medium mb-1">Build Your Matchmaker Reputation</Body>
                <Body className="text-neutral-600 text-sm">
                  Earn assists when your proposals become successful matches. High karma increases your influence in the community.
                </Body>
              </StyledView>
            </StyledView>
          </StyledView>
        </Card>
            </>
          )}
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};