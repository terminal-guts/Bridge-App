/**
 * Inline photo grid for profile edit screens.
 *
 * Hinge-style model: position 0 is automatically the "main" photo. Tap any
 * non-main photo to promote it to position 0 — no separate star button, no
 * bottom action bar. Remove is still an × on each tile.
 *
 * Designed to be embedded inside an existing SectionScreenWrapper (not its
 * own screen). Parent passes profile + setProfile; this component manages
 * its own upload/moderation state locally. An onUploadingChange callback
 * lets the parent know to disable Back while photos are being verified.
 *
 * All uploads go through `photoService.uploadPhoto` unchanged — moderation
 * pipeline and storage layer are untouched.
 */
import React, { useCallback, useState, useEffect } from 'react';
import { View, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { H3, Body, Caption } from '../../../components/ui/Typography';
import { Card, AnimatedPressable } from '../../../components/ui';
import { mediumHaptic, selectionHaptic } from '../../../utils/haptics';
import { FONTS, FONT_SIZES, TEXT_STYLES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { DURATIONS } from '../../../constants/animations';
import { createLogger } from '../../../utils/secureLogger';
import { EvaIcon } from '../../../components/icons';
import { getOptimizedPhotoUrl } from '../../../utils/imageUtils';
import { uploadPhoto, getPhotoSignedUrl } from '../../../services/photoService';
import type { UserProfile } from '../../../types';

const logger = createLogger('PhotosSection');

const MAX_PHOTOS = 3;

interface PhotosSectionProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  /** Fires when the upload/moderation in-flight set transitions between
   *  empty and non-empty, so the parent can disable Back during verify. */
  onUploadingChange?: (uploading: boolean) => void;
}

export const PhotosSection: React.FC<PhotosSectionProps> = ({
  profile,
  setProfile,
  onUploadingChange,
}) => {
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(() => new Set());
  const [recentlyApprovedIds, setRecentlyApprovedIds] = useState<Set<string>>(() => new Set());

  // Notify parent when upload-in-flight status changes (for back-button guard)
  useEffect(() => {
    onUploadingChange?.(uploadingIds.size > 0);
  }, [uploadingIds, onUploadingChange]);

  const clearError = () => setErrorBanner(null);

  const launchCamera = async () => {
    clearError();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrorBanner('Bridge needs camera access to take profile photos. Please enable it in Settings.');
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
        setErrorBanner('Bridge needs photo library access to add profile photos. Please enable it in Settings.');
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
    if (profile.photos.length >= MAX_PHOTOS) {
      setErrorBanner(`You can only have up to ${MAX_PHOTOS} photos. Remove one to add another.`);
      return;
    }
    clearError();
    Alert.alert('Add Photo', 'Choose how to add a photo', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => launchCamera() },
      { text: 'Choose from Library', onPress: () => launchLibrary() },
    ]);
  }, [profile.photos.length]);

  const handlePhotoResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      logger.warn('Image picker returned no asset URI');
      setErrorBanner('That photo could not be loaded. Try picking a different one.');
      return;
    }
    if (profile.photos.length >= MAX_PHOTOS) {
      setErrorBanner(`You can only have up to ${MAX_PHOTOS} photos.`);
      return;
    }

    clearError();

    // Optimistic add — same eager upload + moderation pattern as onboarding
    const tempId = `editphoto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isMain = profile.photos.length === 0;
    const order = profile.photos.length;
    const tempPhoto = { id: tempId, url: asset.uri, isMain, order };

    setProfile((prev) => (prev ? { ...prev, photos: [...prev.photos, tempPhoto] } : prev));
    setUploadingIds((prev) => new Set(prev).add(tempId));

    try {
      const res = await uploadPhoto(asset.uri, order, isMain);
      if (res.ok && res.data) {
        // uploadPhoto returns a raw storage path (e.g. "userId/photo.jpg").
        // <Image> can't render raw paths — we need a signed URL. Sign it
        // here so the tile shows the actual photo post-upload instead of
        // the grey placeholder (the signed URL lasts 24h; on next full
        // profile load the resolver re-signs as needed).
        const signed = await getPhotoSignedUrl(res.data.photo.url, 86400);
        const displayUrl = signed.ok && signed.data ? signed.data : res.data.photo.url;
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === tempId
                ? { ...res.data!.photo, url: displayUrl, isMain, order }
                : p,
            ),
          };
        });
        setUploadingIds((prev) => {
          const next = new Set(prev); next.delete(tempId); return next;
        });
        const newId = res.data.photo.id;
        setRecentlyApprovedIds((prev) => new Set(prev).add(newId));
        setTimeout(() => {
          setRecentlyApprovedIds((prev) => {
            const next = new Set(prev); next.delete(newId); return next;
          });
        }, 3000);
      } else if (res.error?.code === 'MODERATION_REJECTED' || res.error?.code === 'UPLOAD_TIMEOUT') {
        setProfile((prev) => (prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== tempId) } : prev));
        setUploadingIds((prev) => {
          const next = new Set(prev); next.delete(tempId); return next;
        });
        Alert.alert("Photo couldn't be used", res.error?.message || "This photo couldn't be used. Please try a different one.");
      } else {
        setUploadingIds((prev) => {
          const next = new Set(prev); next.delete(tempId); return next;
        });
        setErrorBanner(res.error?.message || "Photo upload failed. We'll retry when you save.");
      }
    } catch (err: unknown) {
      logger.error('Eager photo upload threw', err);
      setUploadingIds((prev) => {
        const next = new Set(prev); next.delete(tempId); return next;
      });
      setErrorBanner("Photo upload failed. We'll retry when you save.");
    }
  };

  const handleRemovePhoto = useCallback((photoId: string) => {
    const doRemove = () => {
      clearError();
      setProfile((prev) => {
        if (!prev) return prev;
        const removed = prev.photos.find(p => p.id === photoId);
        const remaining = prev.photos.filter(p => p.id !== photoId);
        // If we removed the main photo, promote the first remaining one
        if (removed?.isMain && remaining.length > 0) {
          remaining[0] = { ...remaining[0], isMain: true };
        }
        const reordered = remaining.map((p, idx) => ({ ...p, order: idx }));
        return { ...prev, photos: reordered };
      });
      setUploadingIds((prev) => {
        if (!prev.has(photoId)) return prev;
        const next = new Set(prev); next.delete(photoId); return next;
      });
      setRecentlyApprovedIds((prev) => {
        if (!prev.has(photoId)) return prev;
        const next = new Set(prev); next.delete(photoId); return next;
      });
      mediumHaptic();
    };

    // If photo is still uploading, × acts as a Cancel — no confirmation
    if (uploadingIds.has(photoId)) {
      doRemove();
      return;
    }
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
    ]);
  }, [setProfile, uploadingIds]);

  // Hinge-style: tap a non-main photo to promote it to main (position 0).
  // First photo is always the main photo — no separate "star" concept.
  const handlePromoteToMain = useCallback((index: number) => {
    if (index === 0) return; // already main
    setProfile((prev) => {
      if (!prev) return prev;
      const newPhotos = [...prev.photos];
      const [selected] = newPhotos.splice(index, 1);
      newPhotos.unshift(selected);
      const reordered = newPhotos.map((p, idx) => ({
        ...p,
        isMain: idx === 0,
        order: idx,
      }));
      return { ...prev, photos: reordered };
    });
    selectionHaptic();
  }, [setProfile]);

  return (
    <Card className="mb-6" shadow="sm">
      <View className="flex-row items-center justify-between mb-2">
        <H3>Photos <Body style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</Body></H3>
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
          : profile.photos.length < 2
            ? 'Add up to 3. The first is your main photo.'
            : 'Tap a photo to make it your main.'}
      </Body>

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
                if (Platform.OS === 'ios') Linking.openURL('app-settings:');
                else Linking.openSettings();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ minHeight: 44, justifyContent: 'center', marginLeft: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Open device settings"
            >
              <Body style={{ ...TEXT_STYLES.labelSm, color: COLORS.primaryAccent }}>Settings</Body>
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
          const isMain = index === 0;
          const tileLabel = isMain
            ? `Main photo, position ${index + 1}`
            : `Photo ${index + 1}. Tap to set as main.`;
          return (
            <View key={photo.id} style={{ width: '33.33%', paddingHorizontal: 8, marginBottom: 16 }}>
              <AnimatedPressable
                onPress={() => !isUploading && !isMain && handlePromoteToMain(index)}
                disabled={isUploading || isMain}
                accessibilityRole="button"
                accessibilityLabel={tileLabel}
                accessibilityState={{ disabled: isUploading || isMain }}
                style={{ aspectRatio: 3 / 4, borderRadius: 8, overflow: 'hidden' }}
              >
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
                  style={{ width: '100%', height: '100%', backgroundColor: '#E5E7EB', opacity: isUploading ? 0.45 : 1 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={photo.id}
                  onLoadStart={() => setLoadingImages(prev => ({ ...prev, [photo.id]: true }))}
                  onLoadEnd={() => setLoadingImages(prev => ({ ...prev, [photo.id]: false }))}
                />

                {/* Moderation-in-flight overlay */}
                {isUploading && (
                  <Animated.View
                    entering={FadeIn.duration(DURATIONS.micro)}
                    exiting={FadeOut.duration(DURATIONS.micro)}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      alignItems: 'center', justifyContent: 'center', zIndex: 2,
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

                {/* Verified checkmark — bottom-right corner, brief after approval */}
                {isRecentlyApproved && !isUploading && (
                  <Animated.View
                    entering={FadeIn.duration(DURATIONS.normal)}
                    exiting={FadeOut.duration(DURATIONS.normal)}
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      backgroundColor: COLORS.success,
                      borderRadius: 999,
                      width: 22, height: 22,
                      alignItems: 'center', justifyContent: 'center',
                      zIndex: 2,
                    }}
                    accessibilityLabel="Photo verified"
                  >
                    <EvaIcon name="checkmark" variant="outline" size={14} color="white" />
                  </Animated.View>
                )}

                {/* Main photo badge — only on position 0 */}
                {isMain && (
                  <View
                    className="absolute rounded px-2 py-1"
                    style={{ top: 8, left: 8, backgroundColor: COLORS.primary }}
                  >
                    <Caption style={{ color: '#FFFFFF', fontFamily: FONTS.semiBold }}>Main</Caption>
                  </View>
                )}

                {/* Remove × — top-right corner */}
                <AnimatedPressable
                  onPress={() => handleRemovePhoto(photo.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  className="absolute rounded-full"
                  style={{
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: 4,
                    zIndex: 3,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <EvaIcon name="close" variant="outline" size={16} color="white" />
                </AnimatedPressable>
              </AnimatedPressable>
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
                {profile.photos.length === 0 ? 'Add' : `+ ${MAX_PHOTOS - profile.photos.length} more`}
              </Body>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </Card>
  );
};
