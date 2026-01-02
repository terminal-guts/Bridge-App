import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, Linking, Platform } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { OnboardingData, Photo } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

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

export const PhotoUploadStep: React.FC<PhotoUploadStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [photo, setPhoto] = useState<Photo | null>(
    data.photos && data.photos.length > 0 ? data.photos[0] : null
  );
  const [error, setError] = useState('');

  const openImagePicker = async () => {
    try {
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: Photo = {
          id: `photo_${Date.now()}`,
          url: asset.uri,
          isMain: true,
          order: 1,
        };

        setPhoto(newPhoto);
        setError('');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to select photo. Please try again.'
      );
    }
  };

  const openCamera = async () => {
    try {
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: Photo = {
          id: `photo_${Date.now()}`,
          url: asset.uri,
          isMain: true,
          order: 1,
        };

        setPhoto(newPhoto);
        setError('');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        'Error',
        'Failed to take photo. Please try again.'
      );
    }
  };

  const takePhoto = async () => {
    try {
      console.log('Requesting camera permissions...');
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission result:', permissionResult);

      if (permissionResult.granted) {
        console.log('Camera permission granted, opening camera...');
        await openCamera();
      } else {
        console.log('Camera permission denied or not granted:', permissionResult.status);
        Alert.alert(
          'Camera Access Required',
          'Please grant camera access to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert(
        'Error',
        'Failed to access camera. Please try again.'
      );
    }
  };

  const addPhoto = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted) {
        // Full access granted
        await openImagePicker();
      } else if (permissionResult.status === 'denied') {
        // Permission denied - offer options
        const message = Platform.OS === 'ios'
          ? 'You can select specific photos or grant full access to your photo library in Settings.'
          : 'Please grant access to your photo library to add photos.';

        Alert.alert(
          'Photo Library Access',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            ...(Platform.OS === 'ios' ? [{
              text: 'Select Photos',
              onPress: () => openImagePicker(),
            }] : []),
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      } else {
        // Limited access or undetermined - can still use picker on iOS
        await openImagePicker();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert(
        'Error',
        'Failed to access photo library. Please try again.'
      );
    }
  };

  const removePhoto = () => {
    setPhoto(null);
  };

  const validateAndContinue = () => {
    if (!photo) {
      setError('Please add a photo');
      return;
    }

    updateData({ photos: [photo] });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={onNext}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Add Your Photo</H1>
      <Body className="text-neutral-500 text-sm mb-8">
        Your photo should clearly show your face.{'\n'}You can add more photos and change them later!{'\n\n'}AI generated or edited photos will be rejected.
      </Body>

      {/* Single Photo Upload */}
      <StyledView className="items-center mb-6">
        <StyledView className="w-64 aspect-[3/4] relative">
          {photo ? (
            <>
              <StyledImage
                source={{ uri: photo.url }}
                className="w-full h-full rounded-lg"
              />
              <StyledTouchableOpacity
                onPress={removePhoto}
                className="absolute top-3 right-3 bg-neutral-900/60 rounded-full w-10 h-10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="white" />
              </StyledTouchableOpacity>
              <StyledView className="absolute bottom-3 left-3 right-3 gap-2">
                <StyledTouchableOpacity
                  onPress={takePhoto}
                  className="bg-primary-500 py-3 rounded-lg"
                >
                  <Body className="text-white text-center font-semibold">Take New Photo</Body>
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  onPress={addPhoto}
                  className="bg-neutral-900/60 py-3 rounded-lg"
                >
                  <Body className="text-white text-center font-semibold">Choose from Library</Body>
                </StyledTouchableOpacity>
              </StyledView>
            </>
          ) : (
            <StyledView className="w-full h-full bg-neutral-100 rounded-lg items-center justify-center border-2 border-dashed border-neutral-300">
              <Ionicons name="camera-outline" size={48} color="#98A2B3" />
              <Body className="text-neutral-500 text-sm mt-3 mb-6">Add your photo</Body>
              <StyledView className="w-full px-6 gap-3">
                <StyledTouchableOpacity
                  onPress={takePhoto}
                  className="bg-primary-500 py-3 rounded-lg"
                >
                  <Body className="text-white text-center font-semibold">Take Photo</Body>
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  onPress={addPhoto}
                  className="bg-neutral-200 py-3 rounded-lg"
                >
                  <Body className="text-neutral-900 text-center font-semibold">Choose from Library</Body>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
          )}
        </StyledView>
      </StyledView>

      {error && (
        <Body className="text-error text-sm mt-4">{error}</Body>
      )}
      </StyledView>
    </OnboardingLayout>
  );
};