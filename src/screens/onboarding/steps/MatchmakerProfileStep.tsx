import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
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

export const MatchmakerProfileStep: React.FC<MatchmakerProfileStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [photo, setPhoto] = useState<Photo | null>(data.photos?.[0] || null);

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
      photos: photo ? [photo] : [],
    });
    onNext();
  };

  return (
    <OnboardingLayout
      onContinue={validateAndContinue}
      hasTextInput={false}
      showBackButton={false}
    >
      <StyledView className="mt-8 flex-1">
        <H1 className="mb-2">Add a photo</H1>
        <Body className="text-neutral-500 mb-8">
          This shows when you match friends. Use a clear photo of your face.
        </Body>

        <StyledView className="items-center mb-8">
          <StyledTouchableOpacity
            onPress={openImagePicker}
            className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 items-center justify-center border-2 border-dashed border-neutral-300"
          >
            {photo ? (
              <Image
                source={{ uri: photo.url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <StyledView className="items-center">
                <EvaIcon name="camera" variant="outline" size={32} color={COLORS.text.tertiary} />
                <Body className="text-neutral-400 text-xs mt-2 text-center px-2">
                  Add Photo
                </Body>
              </StyledView>
            )}
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
