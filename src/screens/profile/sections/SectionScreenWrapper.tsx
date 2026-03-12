import React, { useRef, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body } from '../../../components/ui/Typography';
import { ScreenWrapper } from '../../../components/ui';
import { OfflineBanner } from '../../../components/ui/OfflineBanner';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { UserProfile } from '../../../types';
import { updateUserProfile } from '../../../services/profileService';
import { uploadPhoto } from '../../../services/photoService';
import { createLogger } from '../../../utils/secureLogger';
import { EvaIcon } from '../../../components/icons';

const logger = createLogger('SectionScreenWrapper');

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface SectionScreenWrapperProps {
  title: string;
  children: React.ReactNode;
  profile: UserProfile;
  originalProfileJson: string | null;
  onGoBack: () => void;
}

/**
 * Auto-saves profile changes when navigating back.
 * Used by all section edit screens to provide consistent save behavior.
 */
export const SectionScreenWrapper: React.FC<SectionScreenWrapperProps> = ({
  title,
  children,
  profile,
  originalProfileJson,
  onGoBack,
}) => {
  const { isOffline } = useNetworkStatus();
  const savingRef = useRef(false);

  const hasChanges = useCallback((): boolean => {
    if (!originalProfileJson) return false;
    try {
      return JSON.stringify(profile) !== originalProfileJson;
    } catch {
      return false;
    }
  }, [profile, originalProfileJson]);

  const handleSaveAndGoBack = useCallback(async () => {
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

    if (savingRef.current) return;
    savingRef.current = true;

    try {
      // Upload any new photos (file:// URIs) to Supabase Storage first
      const uploadedPhotos = [];
      for (const photo of profile.photos || []) {
        if (photo.url.startsWith('file://')) {
          const uploadRes = await uploadPhoto(photo.url, photo.order, photo.isMain);
          if (uploadRes.ok && uploadRes.data) {
            uploadedPhotos.push(uploadRes.data.photo);
          } else {
            logger.error('Photo upload failed:', uploadRes.error?.message);
            Alert.alert('Error', `Failed to upload photo: ${uploadRes.error?.message || 'Unknown error'}`);
            savingRef.current = false;
            return;
          }
        } else {
          uploadedPhotos.push(photo);
        }
      }

      const profileToSave = { ...profile, photos: uploadedPhotos };
      const result = await updateUserProfile(profileToSave);

      if (result.ok) {
        onGoBack();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      logger.error('Save exception:', error);
      Alert.alert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      savingRef.current = false;
    }
  }, [profile, originalProfileJson, isOffline, onGoBack, hasChanges]);

  return (
    <ScreenWrapper>
      <OfflineBanner />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3">
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={handleSaveAndGoBack} className="mr-3">
            <EvaIcon name="arrow-ios-back" variant="outline" size={24} color="#101828" />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <H3>{title}</H3>
          </StyledView>
          {hasChanges() && (
            <Body className="text-primary-500 text-xs font-medium">Auto-saves on back</Body>
          )}
        </StyledView>
      </StyledView>

      <StyledScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StyledView className="px-4 py-6">
          {children}
        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};
