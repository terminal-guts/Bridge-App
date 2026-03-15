import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, Linking, Platform } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import * as ImagePicker from 'expo-image-picker';
import { OnboardingData, Photo } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';

interface MatchmakerProfileStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export const MatchmakerProfileStep: React.FC<MatchmakerProfileStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [photo, setPhoto] = useState<Photo | null>(data.photos?.[0] || null);
  const [bio, setBio] = useState(data.bio || '');

  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto({
          id: `photo_${Date.now()}_0`,
          url: result.assets[0].uri,
          isMain: true,
          order: 0,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const validateAndContinue = () => {
    updateData({
      bio,
      photos: photo ? [photo] : [],
    });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={true}
    >
      <StyledView className="mt-8 flex-1">
        <H1 className="mb-2">Set up your profile</H1>
        <Body className="text-neutral-500 mb-8">
          This helps your friends' matches trust who they're talking to.
        </Body>

        <StyledView className="items-center mb-8">
          <StyledTouchableOpacity
            onPress={openImagePicker}
            className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 items-center justify-center border-2 border-dashed border-neutral-300"
          >
            {photo ? (
              <StyledImage source={{ uri: photo.url }} className="w-full h-full" />
            ) : (
              <StyledView className="items-center">
                <EvaIcon name="camera" variant="outline" size={32} color={COLORS.text.placeholder} />
                <Body className="text-neutral-400 text-xs mt-2 text-center px-2">
                  Add Photo
                </Body>
              </StyledView>
            )}
          </StyledTouchableOpacity>
          <Body className="text-neutral-500 text-xs mt-3">(Optional but highly recommended)</Body>
        </StyledView>

        <StyledView className="flex-1 mt-4">
          <Input
            label="Why are you a great matchmaker?"
            placeholder="I set up my roommate with their partner"
            value={bio}
            onChangeText={setBio}
            autoCapitalize="sentences"
            returnKeyType="done"
            maxLength={100}
            multiline
            numberOfLines={2}
          />
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
