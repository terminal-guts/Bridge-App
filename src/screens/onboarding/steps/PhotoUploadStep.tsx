import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, Linking, Platform } from 'react-native';
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
}) => {
  const [photos, setPhotos] = useState<Photo[]>(data.photos || []);
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

        setPhotos(prev => {
          const updated = [...prev];
          if (slotIndex < updated.length) {
            updated[slotIndex] = newPhoto;
          } else {
            updated.push(newPhoto);
          }
          return updated;
        });
        setError('');
      }
    } catch (err) {
      Alert.alert('Oops', 'Something went wrong picking that photo. Give it another try!');
    }
  };

  const handleAddPhoto = async (slotIndex: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted) {
        await openImagePicker(slotIndex);
      } else if (permissionResult.status === 'denied') {
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
        await openImagePicker(slotIndex);
      }
    } catch (err) {
      Alert.alert('Oops', 'We couldn\'t open your photos. Give it another try!');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-assign isMain to first photo and fix ordering
      return updated.map((p, i) => ({
        ...p,
        isMain: i === 0,
        order: i,
      }));
    });
  };

  const validateAndContinue = () => {
    if (photos.length < MIN_PHOTOS) {
      setError('Add at least one photo so your matches can see you');
      return;
    }

    updateData({ photos });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Add a photo</H1>
        <Body className="text-neutral-500 text-sm mb-8">
          Just one for now — you can add more from your profile later.
        </Body>

        {/* Single photo slot — centered, large */}
        <StyledView className="items-center mb-6">
          <StyledView style={{ width: '65%', aspectRatio: 3 / 4 }}>
            {photos[0] ? (
              <StyledView className="w-full h-full relative">
                <StyledImage
                  source={{ uri: photos[0].url }}
                  className="w-full h-full rounded-2xl"
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

        {error && (
          <Body className="text-error text-sm mt-2">{error}</Body>
        )}
      </StyledScrollView>
    </OnboardingLayout>
  );
};
