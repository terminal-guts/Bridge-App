import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image, Alert, Platform, Linking } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import * as ImagePicker from 'expo-image-picker';
import { H3, Body } from '../../components/ui/Typography';
import { Card, ScreenWrapper } from '../../components/ui';
import { mediumHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { createLogger } from '../../utils/secureLogger';
import { Text } from 'react-native';
import { EvaIcon } from '../../components/icons';

const logger = createLogger('EditPhotosScreen');

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledText = styled(Text);

interface EditPhotosScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditPhotos'>;
}

export const EditPhotosScreen: React.FC<EditPhotosScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, originalProfileJson } = useEditProfile();

  const handleAddPhoto = useCallback(() => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => launchCamera() },
        { text: 'Choose from Library', onPress: () => launchLibrary() },
      ]
    );
  }, [profile]);

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        'Bridge needs access to your camera to take profile photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });
    handlePhotoResult(result);
  };

  const launchLibrary = async () => {
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Photo Access Required',
        'Bridge needs access to your photo library to add profile photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });
    handlePhotoResult(result);
  };

  const handlePhotoResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0] && profile) {
      const newPhoto = {
        id: Date.now().toString(),
        url: result.assets[0].uri,
        isMain: profile.photos.length === 0,
        order: profile.photos.length,
      };
      setProfile({ ...profile, photos: [...profile.photos, newPhoto] });
    }
  };

  const handleRemovePhoto = useCallback((photoId: string) => {
    if (!profile) return;
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setProfile({
            ...profile,
            photos: profile.photos.filter(p => p.id !== photoId),
          });
        },
      },
    ]);
  }, [profile, setProfile]);

  const handleMovePhotoUp = useCallback((index: number) => {
    if (!profile || index === 0) return;
    const newPhotos = [...profile.photos];
    [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
    newPhotos.forEach((photo, idx) => { photo.order = idx; });
    setProfile({ ...profile, photos: newPhotos });
  }, [profile, setProfile]);

  const handleMovePhotoDown = useCallback((index: number) => {
    if (!profile || index === profile.photos.length - 1) return;
    const newPhotos = [...profile.photos];
    [newPhotos[index + 1], newPhotos[index]] = [newPhotos[index], newPhotos[index + 1]];
    newPhotos.forEach((photo, idx) => { photo.order = idx; });
    setProfile({ ...profile, photos: newPhotos });
  }, [profile, setProfile]);

  const handleSetMainPhoto = useCallback((index: number) => {
    if (!profile) return;
    const newPhotos = [...profile.photos];
    newPhotos.forEach(photo => { photo.isMain = false; });
    const selectedPhoto = newPhotos.splice(index, 1)[0];
    selectedPhoto.isMain = true;
    newPhotos.unshift(selectedPhoto);
    newPhotos.forEach((photo, idx) => { photo.order = idx; });
    setProfile({ ...profile, photos: newPhotos });
    mediumHaptic();
  }, [profile, setProfile]);

  if (loading || !profile) {
    return (
      <ScreenWrapper>
        <StyledView className="flex-1 justify-center items-center">
          <Body className="text-neutral-500">{loading ? 'Loading...' : 'Failed to load profile'}</Body>
        </StyledView>
      </ScreenWrapper>
    );
  }

  return (
    <SectionScreenWrapper
      title="Photos"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
    >
      <Card className="mb-6">
        <StyledView className="flex-row items-center justify-between mb-2">
          <StyledView className="flex-row items-center">
            <H3>Photos <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
          </StyledView>
          <Body className={`text-sm font-semibold ${profile.photos.length === 0 ? 'text-error' : 'text-neutral-400'}`}>
            {profile.photos.length}/3
          </Body>
        </StyledView>
        <Body className="text-neutral-600 text-sm mb-4">
          {profile.photos.length === 0
            ? 'Add at least one photo.'
            : 'Use the star to set your main photo.'}
        </Body>

        <StyledView className="flex-row flex-wrap -mx-2">
          {profile.photos.map((photo, index) => (
            <StyledView key={photo.id} className="w-1/3 px-2 mb-4">
              <StyledView className="relative aspect-[3/4] rounded-lg overflow-hidden">
                <StyledImage source={{ uri: photo.url }} className="w-full h-full" resizeMode="cover" />

                {photo.isMain && (
                  <StyledView className="absolute top-2 left-2 bg-primary-500 px-2 py-1 rounded">
                    <Body className="text-white text-xs font-semibold">Main</Body>
                  </StyledView>
                )}

                <StyledTouchableOpacity
                  onPress={() => handleRemovePhoto(photo.id)}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                >
                  <EvaIcon name="close" variant="outline" size={16} color="white" />
                </StyledTouchableOpacity>

                <StyledView className="absolute bottom-0 left-0 right-0 bg-black/60 flex-row justify-around py-1">
                  <StyledTouchableOpacity
                    onPress={() => handleMovePhotoUp(index)}
                    disabled={index === 0}
                    className="px-2 py-1"
                  >
                    <EvaIcon name="arrow-ios-back" variant="outline" size={18} color="white" />
                  </StyledTouchableOpacity>

                  <StyledTouchableOpacity
                    onPress={() => handleSetMainPhoto(index)}
                    className="px-2 py-1"
                  >
                    <EvaIcon
                      name="star"
                      variant={photo.isMain ? "fill" : "outline"}
                      size={18}
                      color={photo.isMain ? "#FCD34D" : "white"}
                    />
                  </StyledTouchableOpacity>

                  <StyledTouchableOpacity
                    onPress={() => handleMovePhotoDown(index)}
                    disabled={index === profile.photos.length - 1}
                    className="px-2 py-1"
                  >
                    <EvaIcon name="arrow-ios-forward" variant="outline" size={18} color="white" />
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>
            </StyledView>
          ))}

          {profile.photos.length < 3 && (
            <StyledView className="w-1/3 px-2 mb-4">
              <StyledTouchableOpacity
                onPress={handleAddPhoto}
                className="aspect-[3/4] rounded-lg border-2 border-dashed border-primary-300 bg-primary-50 items-center justify-center"
              >
                <EvaIcon name="plus-circle" variant="outline" size={32} color="#437FFF" />
                <Body className="text-primary-500 text-xs mt-2 text-center px-1">
                  {profile.photos.length === 0 ? 'Add Photos' : `+ ${3 - profile.photos.length} more`}
                </Body>
              </StyledTouchableOpacity>
            </StyledView>
          )}
        </StyledView>
      </Card>
    </SectionScreenWrapper>
  );
};
