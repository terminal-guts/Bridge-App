import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, Linking, Platform, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { OnboardingData, Photo } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

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
const StyledScrollView = styled(ScrollView);

const MAX_PHOTOS = 3;
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
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const openCamera = async (slotIndex: number) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
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
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleTakePhoto = async (slotIndex: number) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted) {
        await openCamera(slotIndex);
      } else {
        Alert.alert(
          'Camera Access Required',
          'Please grant camera access to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to access camera. Please try again.');
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
      Alert.alert('Error', 'Failed to access photo library. Please try again.');
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

  const showPhotoOptions = (slotIndex: number) => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => handleTakePhoto(slotIndex) },
      { text: 'Choose from Library', onPress: () => handleAddPhoto(slotIndex) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validateAndContinue = () => {
    if (photos.length < MIN_PHOTOS) {
      setError('Please add at least 1 photo');
      return;
    }

    updateData({ photos });
    onNext();
  };

  // Generate slot indices: filled photos + empty slots up to MAX_PHOTOS
  const totalSlots = Math.min(MAX_PHOTOS, Math.max(photos.length + 1, 2)); // Show at least 2 slots

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={onNext}
      hasTextInput={false}
    >
      <StyledScrollView className="mt-8" showsVerticalScrollIndicator={false}>
        <H1 className="mb-3">Add Your Photos</H1>
        <Body className="text-neutral-500 text-sm mb-6">
          Add up to {MAX_PHOTOS} photos. Your first photo will be your main profile photo.
        </Body>

        {/* Photo Grid - 2 columns */}
        <StyledView className="flex-row flex-wrap justify-between mb-4">
          {Array.from({ length: totalSlots }).map((_, index) => {
            const existingPhoto = photos[index];
            const isMainSlot = index === 0;

            return (
              <StyledView
                key={index}
                className="mb-3"
                style={{ width: '48%', aspectRatio: 3 / 4 }}
              >
                {existingPhoto ? (
                  <StyledView className="w-full h-full relative">
                    <StyledImage
                      source={{ uri: existingPhoto.url }}
                      className="w-full h-full rounded-xl"
                    />
                    {/* Main badge */}
                    {isMainSlot && (
                      <StyledView className="absolute top-2 left-2 bg-primary-500 px-2 py-0.5 rounded-full">
                        <Body className="text-white text-xs font-semibold">Main</Body>
                      </StyledView>
                    )}
                    {/* Remove button */}
                    <StyledTouchableOpacity
                      onPress={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-neutral-900/60 rounded-full w-7 h-7 items-center justify-center"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </StyledTouchableOpacity>
                    {/* Replace button */}
                    <StyledTouchableOpacity
                      onPress={() => showPhotoOptions(index)}
                      className="absolute bottom-2 right-2 bg-neutral-900/60 rounded-full w-7 h-7 items-center justify-center"
                    >
                      <Ionicons name="refresh" size={14} color="white" />
                    </StyledTouchableOpacity>
                  </StyledView>
                ) : (
                  <StyledTouchableOpacity
                    onPress={() => showPhotoOptions(index)}
                    className="w-full h-full bg-neutral-100 rounded-xl items-center justify-center border-2 border-dashed border-neutral-300"
                  >
                    <Ionicons
                      name={isMainSlot ? 'camera-outline' : 'add'}
                      size={isMainSlot ? 36 : 28}
                      color="#98A2B3"
                    />
                    <Body className="text-neutral-400 text-xs mt-1">
                      {isMainSlot ? 'Main Photo' : 'Add Photo'}
                    </Body>
                  </StyledTouchableOpacity>
                )}
              </StyledView>
            );
          })}
        </StyledView>

        <Body className="text-neutral-400 text-xs text-center mb-4">
          {photos.length}/{MAX_PHOTOS} photos added
        </Body>

        {error && (
          <Body className="text-error text-sm mt-2">{error}</Body>
        )}
      </StyledScrollView>
    </OnboardingLayout>
  );
};
