import React, { useCallback, useState } from 'react';
import { View, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import * as ImagePicker from 'expo-image-picker';
import { H3, Body, Caption } from '../../components/ui/Typography';
import { Card, ScreenWrapper, AnimatedPressable } from '../../components/ui';
import { mediumHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES, TEXT_STYLES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { DURATIONS } from '../../constants/animations';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { createLogger } from '../../utils/secureLogger';
import { EvaIcon } from '../../components/icons';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { uploadPhoto } from '../../services/photoService';

const logger = createLogger('EditPhotosScreen');

interface EditPhotosScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditPhotos'>;
}

export const EditPhotosScreen: React.FC<EditPhotosScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, originalProfileJson } = useEditProfile();
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  // Photos currently being uploaded + moderated. Keyed by the local photo id
  // that handlePhotoResult assigns. While an id is in this set, we show a
  // "Checking your photo…" overlay on the tile and block back navigation.
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(() => new Set());
  // Photos that just passed moderation — shows a brief green checkmark badge
  // to confirm the photo is verified. Entries auto-expire after 3s.
  const [recentlyApprovedIds, setRecentlyApprovedIds] = useState<Set<string>>(() => new Set());

  const MAX_PHOTOS = 3;

  const clearError = () => setErrorBanner(null);

  const launchCamera = async () => {
    clearError();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrorBanner(
          'Bridge needs camera access to take profile photos. Please enable it in Settings.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      handlePhotoResult(result);
    } catch (error) {
      logger.error('Camera launch failed', error);
      setErrorBanner('Something went wrong opening the camera. Give it another try.');
    }
  };

  const launchLibrary = async () => {
    clearError();
    try {
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        setErrorBanner(
          'Bridge needs photo library access to add profile photos. Please enable it in Settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      handlePhotoResult(result);
    } catch (error) {
      logger.error('Library launch failed', error);
      setErrorBanner('Something went wrong opening your photos. Give it another try.');
    }
  };

  const handleAddPhoto = useCallback(() => {
    if (!profile) return;

    // Guard against photo slot overflow
    if (profile.photos.length >= MAX_PHOTOS) {
      setErrorBanner(`You can only have up to ${MAX_PHOTOS} photos. Remove one to add another.`);
      return;
    }

    clearError();

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

  const handlePhotoResult = async (result: ImagePicker.ImagePickerResult) => {
    // User cancelled the picker -- nothing to do
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      logger.warn('Image picker returned no asset URI');
      setErrorBanner('That photo could not be loaded. Try picking a different one.');
      return;
    }

    if (!profile) return;

    // Double-check overflow (defensive, should not happen given button guard)
    if (profile.photos.length >= MAX_PHOTOS) {
      setErrorBanner(`You can only have up to ${MAX_PHOTOS} photos.`);
      return;
    }

    clearError();

    // Assign a temp id and add the photo to state immediately so the tile
    // renders. We'll upload + moderate in the background and either replace
    // the URL with the storage path (on approval) or remove the photo (on
    // rejection). This mirrors the eager-upload pattern from onboarding so
    // users see the same "Checking your photo…" experience and can't save a
    // photo that hasn't been verified.
    const tempId = `editphoto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isMain = profile.photos.length === 0;
    const order = profile.photos.length;
    const tempPhoto = {
      id: tempId,
      url: asset.uri,
      isMain,
      order,
    };

    setProfile({ ...profile, photos: [...profile.photos, tempPhoto] });
    setUploadingIds((prev) => new Set(prev).add(tempId));

    try {
      const res = await uploadPhoto(asset.uri, order, isMain);

      if (res.ok && res.data) {
        // Approved. Replace the file:// URL with the storage path so
        // SectionScreenWrapper won't try to re-upload this photo on save.
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === tempId
                ? { ...res.data!.photo, isMain, order }
                : p,
            ),
          };
        });
        setUploadingIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        // Show the verified checkmark briefly on the new photo, then fade it out.
        const newId = res.data.photo.id;
        setRecentlyApprovedIds((prev) => new Set(prev).add(newId));
        setTimeout(() => {
          setRecentlyApprovedIds((prev) => {
            const next = new Set(prev);
            next.delete(newId);
            return next;
          });
        }, 3000);
      } else if (
        res.error?.code === 'MODERATION_REJECTED' ||
        res.error?.code === 'UPLOAD_TIMEOUT'
      ) {
        // Rejected or timed out. Remove the photo from state and surface
        // the message via an alert — same UX language as the onboarding flow.
        setProfile((prev) => {
          if (!prev) return prev;
          return { ...prev, photos: prev.photos.filter((p) => p.id !== tempId) };
        });
        setUploadingIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        Alert.alert(
          "Photo couldn't be used",
          res.error?.message ||
            "This photo couldn't be used. Please try a different one.",
        );
      } else {
        // Other upload failure (network, rate limit, etc.) — keep the photo
        // in state and fall back to the existing save-time retry path via
        // SectionScreenWrapper. Surface a non-blocking banner.
        setUploadingIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        setErrorBanner(
          res.error?.message ||
            "Photo upload failed. We'll retry when you save.",
        );
      }
    } catch (err: unknown) {
      logger.error('Eager photo upload threw', err);
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setErrorBanner("Photo upload failed. We'll retry when you save.");
    }
  };

  const handleRemovePhoto = useCallback((photoId: string) => {
    if (!profile) return;

    const doRemove = () => {
      clearError();
      const removed = profile.photos.find(p => p.id === photoId);
      const remaining = profile.photos.filter(p => p.id !== photoId);

      // If we removed the main photo, promote the first remaining one (immutably)
      if (removed?.isMain && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isMain: true };
      }

      // Re-index order values
      const reordered = remaining.map((p, idx) => ({ ...p, order: idx }));
      setProfile({ ...profile, photos: reordered });

      // Also drop any uploading / recently-approved tracking for this photo so
      // the back arrow re-enables and the "Checking…" overlay clears instantly.
      setUploadingIds((prev) => {
        if (!prev.has(photoId)) return prev;
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      setRecentlyApprovedIds((prev) => {
        if (!prev.has(photoId)) return prev;
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      mediumHaptic();
    };

    // If the photo is currently being verified, × acts as a Cancel — no
    // confirmation needed. Otherwise, it's a destructive delete of an
    // already-verified photo, so confirm first.
    if (uploadingIds.has(photoId)) {
      doRemove();
      return;
    }

    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
    ]);
  }, [profile, setProfile, uploadingIds]);

  const handleMovePhotoUp = useCallback((index: number) => {
    if (!profile || index === 0) return;
    mediumHaptic();
    const newPhotos = [...profile.photos];
    [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
    newPhotos.forEach((photo, idx) => { photo.order = idx; });
    setProfile({ ...profile, photos: newPhotos });
  }, [profile, setProfile]);

  const handleMovePhotoDown = useCallback((index: number) => {
    if (!profile || index === profile.photos.length - 1) return;
    mediumHaptic();
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
        <View className="flex-1 justify-center items-center">
          <Body style={{ color: COLORS.text.secondary }}>
            {loading ? 'Loading...' : 'Failed to load profile'}
          </Body>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <SectionScreenWrapper
      title="Photos"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
      // Disable the back arrow while any photo is mid-verification. The user
      // cancels by tapping the × on the tile instead — matches onboarding's
      // Continue-disabled-while-checking pattern, and avoids the
      // "Photo Upload Failed" toast that fired from saveInBackground racing
      // against the still-in-flight eager upload.
      backDisabled={uploadingIds.size > 0}
      validateBeforeSave={() =>
        profile.photos.length === 0
          ? 'Add at least one photo before saving your profile.'
          : null
      }
    >
      <Card className="mb-6" shadow="sm">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <H3>Photos <Body style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</Body></H3>
          </View>
          <Body
            style={{
              ...TEXT_STYLES.labelSm,
              color: profile.photos.length === 0 ? COLORS.error : COLORS.success,
            }}
          >
            {profile.photos.length}/{MAX_PHOTOS}
          </Body>
        </View>

        <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.sm }} className="mb-4">
          {profile.photos.length === 0
            ? 'Add at least one photo.'
            : 'Use the star to set your main photo.'}
        </Body>

        {/* Inline error banner for recoverable errors */}
        {errorBanner && (
          <View
            className="flex-row items-center rounded-lg px-3 py-3 mb-4"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <EvaIcon name="alert-triangle" variant="fill" size={20} color={COLORS.amber} />
            <Body
              style={{ color: COLORS.amber, fontSize: FONT_SIZES.sm, flex: 1, marginLeft: 8 }}
            >
              {errorBanner}
            </Body>
            {errorBanner.includes('Settings') ? (
              <AnimatedPressable
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ minHeight: 44, justifyContent: 'center', marginLeft: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Open device settings"
              >
                <Body style={{ ...TEXT_STYLES.labelSm, color: COLORS.primaryAccent }}>
                  Settings
                </Body>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                onPress={clearError}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ minHeight: 44, justifyContent: 'center', marginLeft: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
              >
                <EvaIcon name="close" variant="outline" size={16} color={COLORS.amber} />
              </AnimatedPressable>
            )}
          </View>
        )}

        <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
          {profile.photos.map((photo, index) => {
            const isUploading = uploadingIds.has(photo.id);
            const isRecentlyApproved = recentlyApprovedIds.has(photo.id);
            return (
            <View key={photo.id} style={{ width: '33.33%', paddingHorizontal: 8, marginBottom: 16 }}>
              <View className="relative rounded-lg overflow-hidden" style={{ aspectRatio: 3 / 4 }}>
                {/* Loading indicator for image */}
                {loadingImages[photo.id] && (
                  <View
                    className="absolute inset-0 items-center justify-center"
                    style={{ backgroundColor: '#E5E7EB', zIndex: 1 }}
                  >
                    <ActivityIndicator size="small" color={COLORS.primaryAccent} />
                  </View>
                )}

                <Image
                  source={{ uri: getOptimizedPhotoUrl(photo.url, 'avatar') }}
                  // Dim the image while Vision is verifying it — mirrors onboarding.
                  style={{ width: '100%', height: '100%', backgroundColor: '#E5E7EB', opacity: isUploading ? 0.45 : 1 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={photo.id}
                  onLoadStart={() => setLoadingImages(prev => ({ ...prev, [photo.id]: true }))}
                  onLoadEnd={() => setLoadingImages(prev => ({ ...prev, [photo.id]: false }))}
                  accessibilityLabel={photo.isMain ? `Main profile photo, position ${index + 1}` : `Profile photo, position ${index + 1}`}
                />

                {/* Moderation-in-flight overlay — same language as onboarding's spinner */}
                {isUploading && (
                  <Animated.View
                    entering={FadeIn.duration(DURATIONS.micro)}
                    exiting={FadeOut.duration(DURATIONS.micro)}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                    accessibilityLabel="Checking your photo"
                    accessibilityRole="progressbar"
                  >
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Body
                      style={{
                        marginTop: 6,
                        fontFamily: FONTS.medium,
                        fontSize: FONT_SIZES.xs,
                        color: COLORS.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      Checking…
                    </Body>
                  </Animated.View>
                )}

                {/* Verified checkmark — brief confirmation the photo passed moderation */}
                {isRecentlyApproved && !isUploading && (
                  <Animated.View
                    entering={FadeIn.duration(DURATIONS.normal)}
                    exiting={FadeOut.duration(DURATIONS.normal)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 36, // to the left of the × remove button
                      backgroundColor: COLORS.success,
                      borderRadius: 999,
                      width: 22,
                      height: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                    accessibilityLabel="Photo verified"
                  >
                    <EvaIcon name="checkmark" variant="outline" size={14} color="white" />
                  </Animated.View>
                )}

                {/* Main photo badge */}
                {photo.isMain && (
                  <View
                    className="absolute rounded px-2 py-1"
                    style={{ top: 8, left: 8, backgroundColor: COLORS.primary }}
                  >
                    <Caption style={{ color: '#FFFFFF', fontFamily: FONTS.semiBold }}>
                      Main
                    </Caption>
                  </View>
                )}

                {/* Remove button -- 44px touch target via hitSlop */}
                <AnimatedPressable
                  onPress={() => handleRemovePhoto(photo.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  className="absolute rounded-full"
                  style={{
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: 4,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <EvaIcon name="close" variant="outline" size={16} color="white" />
                </AnimatedPressable>

                {/* Bottom action bar */}
                <View
                  className="absolute bottom-0 left-0 right-0 flex-row justify-around items-center"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingVertical: 6 }}
                >
                  <AnimatedPressable
                    onPress={() => handleMovePhotoUp(index)}
                    disabled={index === 0}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: index === 0 ? 0.4 : 1,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Move photo ${index + 1} left`}
                    accessibilityState={{ disabled: index === 0 }}
                  >
                    <EvaIcon name="arrow-ios-back" variant="outline" size={20} color="white" />
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={() => handleSetMainPhoto(index)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={photo.isMain ? 'Already set as main photo' : `Set photo ${index + 1} as main`}
                  >
                    <EvaIcon
                      name="star"
                      variant={photo.isMain ? 'fill' : 'outline'}
                      size={20}
                      color={photo.isMain ? COLORS.border : 'white'}
                    />
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={() => handleMovePhotoDown(index)}
                    disabled={index === profile.photos.length - 1}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: index === profile.photos.length - 1 ? 0.4 : 1,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Move photo ${index + 1} right`}
                    accessibilityState={{ disabled: index === profile.photos.length - 1 }}
                  >
                    <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color="white" />
                  </AnimatedPressable>
                </View>
              </View>
            </View>
            );
          })}

          {/* Add photo slot */}
          {profile.photos.length < MAX_PHOTOS && (
            <View style={{ width: '33.33%', paddingHorizontal: 8, marginBottom: 16 }}>
              <AnimatedPressable
                onPress={handleAddPhoto}
                style={{
                  aspectRatio: 3 / 4,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: COLORS.primaryAccent,
                  backgroundColor: COLORS.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel={profile.photos.length === 0 ? 'Add your first photo' : `Add photo, ${MAX_PHOTOS - profile.photos.length} slots remaining`}
              >
                <EvaIcon name="plus-circle" variant="outline" size={32} color={COLORS.primaryAccent} />
                <Body
                  style={{
                    color: COLORS.primaryAccent,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.medium,
                    marginTop: 8,
                    textAlign: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  {profile.photos.length === 0 ? 'Add Photos' : `+ ${MAX_PHOTOS - profile.photos.length} more`}
                </Body>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </Card>
    </SectionScreenWrapper>
  );
};
