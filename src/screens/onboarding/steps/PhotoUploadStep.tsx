import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import * as ImagePicker from 'expo-image-picker';
import { OnboardingData, Photo } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';

interface PhotoUploadStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  // Surfaced from OnboardingScreen when the eager photo upload is rejected by moderation.
  photoModerationError?: string | null;
  onClearPhotoModerationError?: () => void;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

const MIN_PHOTOS = 1;

export const PhotoUploadStep: React.FC<PhotoUploadStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  photoModerationError,
  onClearPhotoModerationError,
}) => {
  // Read photos straight from parent state — every change must propagate
  // immediately so the eager upload effect in OnboardingScreen fires the
  // moment a photo is picked, not when "Continue" is tapped.
  const photos: Photo[] = data.photos || [];
  const [error, setError] = useState('');

  const openImagePicker = async (slotIndex: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: Photo = {
          id: `photo_${Date.now()}_${slotIndex}`,
          url: asset.uri,
          isMain: slotIndex === 0,
          order: slotIndex,
        };

        const updated = [...photos];
        if (slotIndex < updated.length) {
          updated[slotIndex] = newPhoto;
        } else {
          updated.push(newPhoto);
        }
        updateData({ photos: updated });
        setError('');
        onClearPhotoModerationError?.();
      }
    } catch (err) {
      Alert.alert('Oops', 'Something went wrong picking that photo. Give it another try!');
    }
  };

  const handleAddPhoto = async (slotIndex: number) => {
    try {
      // Pre-check current status so we never call requestMediaLibraryPermissionsAsync
      // when iOS has locked the system prompt (would silently no-op). If the user
      // previously denied and can't be asked again, route them straight to Settings.
      const existing = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (existing.granted) {
        await openImagePicker(slotIndex);
        return;
      }

      if (!existing.canAskAgain) {
        const message = Platform.OS === 'ios'
          ? 'You can select specific photos or grant full access to your photo library in Settings.'
          : 'Please grant access to your photo library to add photos.';

        Alert.alert(
          'Photo Library Access',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            ...(Platform.OS === 'ios' ? [{ text: 'Select Photos', onPress: () => openImagePicker(slotIndex) }] : []),
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Prompt is still available — ask the user.
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted) {
        await openImagePicker(slotIndex);
      } else if (permissionResult.status === 'denied' && permissionResult.canAskAgain === false) {
        // User denied and the prompt is now locked — send them to Settings.
        const message = Platform.OS === 'ios'
          ? 'You can select specific photos or grant full access to your photo library in Settings.'
          : 'Please grant access to your photo library to add photos.';

        Alert.alert(
          'Photo Library Access',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            ...(Platform.OS === 'ios' ? [{ text: 'Select Photos', onPress: () => openImagePicker(slotIndex) }] : []),
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        // Limited / granted-with-restrictions / other — try the picker anyway.
        await openImagePicker(slotIndex);
      }
    } catch (err) {
      Alert.alert('Oops', 'We couldn\'t open your photos. Give it another try!');
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, isMain: i === 0, order: i }));
    updateData({ photos: updated });
  };

  const validateAndContinue = () => {
    if (photos.length < MIN_PHOTOS) {
      setError('Add at least one photo so your matches can see you');
      return;
    }
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-2">Add a Photo</H1>
        <Body className="text-neutral-500 text-sm mb-6">
          You can add more later.
        </Body>

        {/* Single photo slot — centered, large */}
        <StyledView className="items-center mb-6">
          <StyledView style={{ width: '65%', aspectRatio: 3 / 4 }}>
            {photos[0] ? (
              <StyledView className="w-full h-full relative">
                <StyledImage
                  source={{ uri: photos[0].url }}
                  className="w-full h-full rounded-2xl"
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                {/* Remove button */}
                <StyledTouchableOpacity
                  onPress={() => removePhoto(0)}
                  className="absolute top-3 right-3 bg-neutral-900/60 rounded-full w-8 h-8 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <EvaIcon name="close" variant="outline" size={18} color="white" />
                </StyledTouchableOpacity>
              </StyledView>
            ) : (
              <StyledTouchableOpacity
                onPress={() => handleAddPhoto(0)}
                className="w-full h-full bg-neutral-100 rounded-2xl items-center justify-center border-2 border-dashed border-neutral-300"
                accessibilityRole="button"
                accessibilityLabel="Add your photo"
              >
                <EvaIcon name="image" variant="outline" size={48} color={COLORS.text.tertiary} />
                <Body className="text-neutral-400 text-sm mt-3">Tap to add a photo</Body>
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </StyledView>

        {(photoModerationError || error) && (
          <Body className="text-error text-sm mt-2">{photoModerationError || error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
