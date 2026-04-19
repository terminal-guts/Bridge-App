import React, { useRef, useCallback, useState } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { Body } from '../../../components/ui/Typography';
import { ScreenWrapper } from '../../../components/ui';
import { BackHeader } from '../../../components/ui/BackHeader';
import { OfflineBanner } from '../../../components/ui/OfflineBanner';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { UserProfile } from '../../../types';
import { updateUserProfile } from '../../../services/profileService';
import { uploadPhoto, deletePhoto } from '../../../services/photoService';
import { createLogger } from '../../../utils/secureLogger';
import { showToast } from '../../../utils/toast';

const logger = createLogger('SectionScreenWrapper');

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);

interface SectionScreenWrapperProps {
  title: string;
  children: React.ReactNode;
  profile: UserProfile;
  originalProfileJson: string | null;
  onGoBack: () => void;
  validateBeforeSave?: () => string | null;
}

/**
 * Auto-saves profile changes when navigating back.
 * Optimistic: navigates back immediately, saves in background.
 * Shows alert only if save fails.
 */
export const SectionScreenWrapper: React.FC<SectionScreenWrapperProps> = ({
  title,
  children,
  profile,
  originalProfileJson,
  onGoBack,
  validateBeforeSave,
}) => {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const savingRef = useRef(false);

  const hasChanges = useCallback((): boolean => {
    if (!originalProfileJson) return false;
    try {
      return JSON.stringify(profile) !== originalProfileJson;
    } catch {
      return false;
    }
  }, [profile, originalProfileJson]);

  /** Save profile in background — does not block navigation */
  const saveInBackground = useCallback(async (profileSnapshot: UserProfile) => {
    if (savingRef.current) return;
    savingRef.current = true;

    try {
      // Diff against original to find photos the user removed in this session.
      // We need to drop them from Storage too (otherwise the bucket fills with
      // orphans). Best-effort — failures don't block the save.
      let removedPhotoIds: string[] = [];
      if (originalProfileJson) {
        try {
          const original = JSON.parse(originalProfileJson) as UserProfile;
          const newIds = new Set((profileSnapshot.photos || []).map(p => p.id));
          removedPhotoIds = (original.photos || [])
            .filter(p => !newIds.has(p.id) && !p.url.startsWith('file://'))
            .map(p => p.id);
        } catch (e) {
          logger.warn('Could not diff original photos for cleanup:', e);
        }
      }

      // Upload any new photos (file:// URIs) to Supabase Storage first.
      // If a photo upload fails, skip it rather than aborting — text field
      // changes must always be persisted regardless of photo upload outcome.
      const uploadedPhotos = [];
      let photoUploadFailures = 0;
      const moderationRejections: string[] = [];

      for (const photo of profileSnapshot.photos || []) {
        if (photo.url.startsWith('file://')) {
          const uploadRes = await uploadPhoto(photo.url, photo.order, photo.isMain);
          if (uploadRes.ok && uploadRes.data) {
            uploadedPhotos.push(uploadRes.data.photo);
          } else if (uploadRes.error?.code === 'MODERATION_REJECTED') {
            // Collect moderation rejections and surface them as their own alert —
            // don't count against photoUploadFailures (which triggers a generic retry alert).
            logger.warn('Photo rejected by moderation:', uploadRes.error.message);
            moderationRejections.push(uploadRes.error.message);
          } else {
            logger.error('Background photo upload failed:', uploadRes.error?.message);
            photoUploadFailures++;
            // Do not push failed photo — continue to save all other changes
          }
        } else {
          uploadedPhotos.push(photo);
        }
      }

      const profileToSave = { ...profileSnapshot, photos: uploadedPhotos };
      const result = await updateUserProfile(profileToSave);

      if (!result.ok) {
        logger.error('Background profile save failed:', result.error?.message);
        showToast.error('Couldn\'t save changes', 'Please try again.');
      } else {
        // Storage cleanup — best-effort, after the metadata save succeeds
        for (const id of removedPhotoIds) {
          deletePhoto(id).catch(err => {
            logger.warn('Storage cleanup failed for removed photo (non-blocking):', err?.message);
          });
        }
        if (moderationRejections.length > 0) {
          logger.warn('Moderation rejections:', moderationRejections);
          showToast.error(
            moderationRejections.length === 1 ? 'Photo couldn\'t be used' : `${moderationRejections.length} photos couldn\'t be used`,
            moderationRejections.length === 1
              ? moderationRejections[0]
              : 'Pick different photos and try again.'
          );
        }
        if (photoUploadFailures > 0) {
          showToast.error(
            photoUploadFailures === 1 ? 'Photo upload failed' : `${photoUploadFailures} photo uploads failed`,
            'Your other changes were saved. Try adding the photo again.'
          );
        }
      }
    } catch (error: any) {
      logger.error('Background save exception:', error);
      showToast.error('Couldn\'t save changes', 'Please try again.');
    } finally {
      savingRef.current = false;
    }
  }, [originalProfileJson]);

  const handleSaveAndGoBack = useCallback(() => {
    if (!hasChanges()) {
      onGoBack();
      return;
    }

    if (isOffline) {
      Alert.alert(
        'Offline',
        'Cannot save changes while offline. Please check your connection and try again.',
        [
          { text: 'Discard', style: 'destructive', onPress: onGoBack },
          { text: 'Stay', style: 'cancel' },
        ]
      );
      return;
    }

    // Blocking validation (e.g. "wait for photo verification to finish").
    // Partial-profile cases are still fine — callers only return a message
    // when the state is actually unsafe to persist.
    if (validateBeforeSave) {
      const validationError = validateBeforeSave();
      if (validationError) {
        Alert.alert('One moment', validationError, [{ text: 'OK' }]);
        return;
      }
    }

    // Navigate back immediately — save happens in background.
    const profileSnapshot = { ...profile };
    onGoBack();
    saveInBackground(profileSnapshot);
  }, [profile, isOffline, onGoBack, hasChanges, saveInBackground, validateBeforeSave]);

  return (
    <ScreenWrapper>
      <OfflineBanner />

      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <BackHeader
          title={title}
          onBack={handleSaveAndGoBack}
          right={hasChanges() ? (
            <Body className="text-primary-500 text-xs font-medium">Auto-saves on back</Body>
          ) : undefined}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + headerHeight : 0}
        style={{ flex: 1 }}
      >
        <StyledScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StyledView className="px-4 py-6">
            {children}
          </StyledView>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};
