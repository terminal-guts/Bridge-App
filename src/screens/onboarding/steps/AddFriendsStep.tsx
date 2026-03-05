import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import { Ionicons } from '@expo/vector-icons';
import { getUserFriendCode, addFriendByCode } from '../../../services/friendService';
import * as Clipboard from 'expo-clipboard';
import { showToast } from '../../../utils/toast';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('AddFriendsStep');

interface AddFriendsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const FRIEND_CODE_PATTERN = /^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const AddFriendsStep: React.FC<AddFriendsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [myCode, setMyCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addedFriends, setAddedFriends] = useState<string[]>([]);

  useEffect(() => {
    const loadCode = async () => {
      try {
        const result = await getUserFriendCode();
        if (result.ok && result.data) {
          setMyCode(result.data.code);
        }
      } catch (err) {
        logger.error('Failed to load friend code:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCode();
  }, []);

  const handleCopy = async () => {
    if (!myCode) return;
    try {
      await Clipboard.setStringAsync(myCode);
      showToast.success('Copied!', 'Friend code copied to clipboard');
    } catch (err) {
      logger.error('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    if (!myCode) return;
    try {
      await Share.share({
        message: `Add me on Bridge! My friend code is:\n\n${myCode}\n\nDownload Bridge and enter my code to connect!`,
      });
    } catch (err) {
      logger.error('Share failed:', err);
    }
  };

  const handleAddFriend = async () => {
    setError('');
    const normalized = friendCode.trim().toUpperCase();

    if (!normalized) {
      setError('Please enter a friend code');
      return;
    }

    if (!FRIEND_CODE_PATTERN.test(normalized)) {
      setError('Invalid format. Should be like: BRIDGE-XXXX-XXXX');
      return;
    }

    if (normalized === myCode) {
      setError("That's your own code");
      return;
    }

    setAdding(true);
    try {
      const result = await addFriendByCode(normalized);
      if (result.ok) {
        const name = result.data?.friendProfile?.firstName || 'Friend';
        setAddedFriends(prev => [...prev, name]);
        setFriendCode('');
        showToast.success('Friend added!', `${name} is now your friend`);
      } else {
        let msg = result.error?.message || 'Failed to add friend';
        if (msg.includes('already friends')) msg = "You're already friends with this person";
        else if (msg.includes('not found')) msg = 'Code not found. Double-check and try again.';
        setError(msg);
      }
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
      logger.error('Add friend error:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleContinue = () => {
    updateData({ friendsAdded: addedFriends });
    onNext();
  };

  const handleSkip = () => {
    updateData({ friendsAdded: [] });
    onNext();
  };

  return (
    <OnboardingLayout
      onContinue={handleContinue}
      showBackButton={true}
      hasTextInput={true}
    >
      <H1 className="mb-3">Add friends</H1>
      <Body className="text-neutral-600 mb-6">
        Friends vote on your daily matches and help you find the right person.
      </Body>

      {/* Your Friend Code */}
      {loading ? (
        <StyledView className="items-center py-6">
          <ActivityIndicator size="small" color="#437FFF" />
        </StyledView>
      ) : (
        <StyledView className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
          <Body className="text-neutral-600 text-sm mb-2 text-center">Your friend code</Body>
          <StyledTouchableOpacity onPress={handleCopy} className="items-center mb-3">
            <H2 className="text-primary-500">{myCode || '...'}</H2>
            <Body className="text-neutral-400 text-xs mt-1">Tap to copy</Body>
          </StyledTouchableOpacity>
          <StyledView className="flex-row">
            <StyledTouchableOpacity
              onPress={handleShare}
              className="flex-1 bg-primary-500 py-3 rounded-lg items-center mr-2"
            >
              <Body className="text-white font-semibold">Share</Body>
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={handleCopy}
              className="flex-1 bg-white border border-primary-300 py-3 rounded-lg items-center ml-2"
            >
              <Body className="text-primary-500 font-semibold">Copy</Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      )}

      {/* Enter a Friend's Code */}
      <StyledView className="mb-4">
        <Body className="font-semibold mb-2">Have a friend's code?</Body>
        <Input
          placeholder="BRIDGE-XXXX-XXXX"
          value={friendCode}
          onChangeText={(text) => {
            setFriendCode(text.toUpperCase());
            if (error) setError('');
          }}
          autoCapitalize="characters"
          error={error}
          containerClassName="mb-3"
        />
        <StyledTouchableOpacity
          onPress={handleAddFriend}
          disabled={adding}
          className={`py-3 rounded-lg items-center ${adding ? 'bg-primary-300' : 'bg-primary-500'}`}
        >
          <Body className="text-white font-semibold">
            {adding ? 'Adding...' : 'Add Friend'}
          </Body>
        </StyledTouchableOpacity>
      </StyledView>

      {/* Added Friends */}
      {addedFriends.length > 0 && (
        <StyledView className="mb-4">
          <Body className="text-neutral-600 text-sm mb-2">
            Added ({addedFriends.length}):
          </Body>
          {addedFriends.map((name, i) => (
            <StyledView key={i} className="flex-row items-center mb-1">
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Body className="text-neutral-700 ml-2">{name}</Body>
            </StyledView>
          ))}
        </StyledView>
      )}

      {/* Skip button */}
      <StyledTouchableOpacity onPress={handleSkip} className="items-center py-3">
        <Body className="text-neutral-600">Skip for now</Body>
      </StyledTouchableOpacity>
    </OnboardingLayout>
  );
};
