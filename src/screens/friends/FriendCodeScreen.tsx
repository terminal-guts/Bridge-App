import React, { useState, useEffect, useRef } from 'react';
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
import { showToast } from '../../utils/toast';

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
    return "That's your own code";
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
      message: `Add me on Bridge! My friend code is:\n\n${friendCode}\n\nDownload Bridge and enter my code to connect!`,
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
    showToast.success('Copied!', 'Your friend code has been copied to clipboard');
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Load current user and friend code in a single sequential effect
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMountedRef.current) return;
        if (!user) {
          Alert.alert('Error', 'You must be logged in to view this page');
          navigation.goBack();
          return;
        }
        setCurrentUserId(user.id);
        const result = await getUserFriendCode();
        if (!isMountedRef.current) return;
        if (result.ok && result.data) {
          setMyFriendCode(result.data.code);
        } else {
          logger.error('Failed to load friend code:', result.error);
          Alert.alert('Error', 'Failed to load your friend code');
        }
      } catch (error) {
        logger.error('Failed to initialize friend code screen:', error);
        if (isMountedRef.current) Alert.alert('Error', 'Failed to load user information');
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };
    init();
  }, []);

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

    const normalizedCode = friendCode.trim().toUpperCase();
    const validationError = validateFriendCode(normalizedCode, myFriendCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setAdding(true);
    try {
      const result = await addFriendByCode(normalizedCode);

      if (result.ok && result.data) {
        setSuccess(true);
        setFriendCode('');
        const friendName = result.data.friendProfile?.firstName || 'Friend';
        Alert.alert(
          'Friend Added!',
          `${friendName} added as a friend`,
          [{ text: 'OK' }]
        );
      } else {
        let msg = result.error?.message || 'Failed to add friend';
        if (msg.includes('already friends')) {
          msg = "You're already friends with this person";
        } else if (msg.includes('not found')) {
          msg = "Invalid code";
        }
        setError(msg);
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
        <StyledView className="w-16" />
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
                  <StyledTouchableOpacity
                    onPress={handleCopy}
                    disabled={!myFriendCode}
                    className="flex-row items-center bg-white px-5 py-3 rounded-xl mb-1 w-full"
                    style={{ borderWidth: 1, borderColor: '#bfcfff' }}
                  >
                    <StyledView className="flex-1 items-center">
                      <H2 className="text-primary-500">{myFriendCode || '...'}</H2>
                    </StyledView>
                    <EvaIcon name="copy" variant="outline" color="primary" size={18} />
                  </StyledTouchableOpacity>
                  <Body className="text-neutral-400 text-xs text-center mb-4">Tap to copy</Body>
                  <StyledView className="flex-row w-full">
                    <StyledView className="flex-1">
                      <Button onPress={handleShare} variant="primary" size="sm" fullWidth disabled={!myFriendCode}>
                        Share Code
                      </Button>
                    </StyledView>
                    <StyledView className="w-3" />
                    <StyledView className="flex-1">
                      <Button onPress={handleCopy} variant="secondary" size="sm" fullWidth disabled={!myFriendCode}>
                        Copy
                      </Button>
                    </StyledView>
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
              <StyledView className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                <EvaIcon name="people" variant="outline" color="primary" size={20} />
              </StyledView>
              <StyledView className="flex-1">
                <Body className="text-neutral-900 font-medium mb-1">Vote on Their Daily Match</Body>
                <Body className="text-neutral-600 text-sm">Each day, your friend gets one suggestion. Your vote helps decide if it becomes a match.</Body>
              </StyledView>
            </StyledView>

            <StyledView className="flex-row">
              <StyledView className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                <EvaIcon name="award" variant="outline" color="primary" size={20} />
              </StyledView>
              <StyledView className="flex-1">
                <Body className="text-neutral-900 font-medium mb-1">Help Others, Help Yourself</Body>
                <Body className="text-neutral-600 text-sm">Voting for friends earns karma — and high karma makes you more likely to get a great match yourself.</Body>
              </StyledView>
            </StyledView>

            <StyledView className="flex-row">
              <StyledView className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                <EvaIcon name="heart" variant="outline" color="primary" size={20} />
              </StyledView>
              <StyledView className="flex-1">
                <Body className="text-neutral-900 font-medium mb-1">It Actually Matters</Body>
                <Body className="text-neutral-600 text-sm">When your friend ends up with someone great, that's real life impact — and you helped make it happen.</Body>
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