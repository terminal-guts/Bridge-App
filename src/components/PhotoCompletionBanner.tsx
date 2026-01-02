/**
 * Photo Completion Banner Component
 *
 * Displays a banner encouraging users to complete their photo uploads (6 photos total).
 * Only shown when About Me section is 100% complete but photos < 6.
 * Can be dismissed by the user and persists dismissal state.
 */

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Body } from './ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { lightHaptic } from '../utils/haptics';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface PhotoCompletionBannerProps {
  profile: UserProfile | null;
  aboutMePercentage: number; // Pass in the About Me completion percentage
  onPress?: () => void;
}

const BANNER_DISMISSED_KEY = '@photo_completion_banner_dismissed';

/**
 * Calculate photo completion metrics
 */
const calculatePhotoCompletion = (profile: UserProfile | null): {
  count: number;
  percentage: number;
} => {
  if (!profile) return { count: 0, percentage: 0 };

  const photoCount = profile.photos?.length || 0;
  const percentage = photoCount >= 6 ? 100 : Math.round((photoCount / 6) * 100);

  return { count: photoCount, percentage };
};

export const PhotoCompletionBanner: React.FC<PhotoCompletionBannerProps> = ({
  profile,
  aboutMePercentage,
  onPress,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load dismissal state on mount
  useEffect(() => {
    const loadDismissalState = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
        setIsDismissed(dismissed === 'true');
      } catch (error) {
        console.error('Error loading photo banner dismissal state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDismissalState();
  }, []);

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      setIsDismissed(true);
      lightHaptic();
    } catch (error) {
      console.error('Error saving photo banner dismissal state:', error);
    }
  };

  // Don't render while loading dismissal state
  if (isLoading) {
    return null;
  }

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  const photoCompletion = calculatePhotoCompletion(profile);

  // DISPLAY LOGIC:
  // Only show when About Me section is 100% complete AND photos < 6
  if (aboutMePercentage < 100 || photoCompletion.count >= 6) {
    return null;
  }

  return (
    <LinearGradient
      colors={['#10B981', '#059669']} // Green gradient: green-500 to green-600
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <StyledTouchableOpacity
        onPress={() => {
          lightHaptic();
          onPress?.();
        }}
        className="flex-1 flex-row items-center"
        activeOpacity={0.8}
      >
        <StyledView
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3"
        >
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </StyledView>
        <StyledView className="flex-1">
          <Body className="text-white font-bold text-sm mb-0.5">
            {photoCompletion.count}/6 Photos ({photoCompletion.percentage}%)
          </Body>
          <Body className="text-white/90 text-xs">
            Add {6 - photoCompletion.count} more photo{6 - photoCompletion.count > 1 ? 's' : ''} for a complete profile
          </Body>
        </StyledView>
      </StyledTouchableOpacity>

      <StyledTouchableOpacity
        onPress={handleDismiss}
        className="w-8 h-8 items-center justify-center ml-2"
        activeOpacity={0.7}
        accessibilityLabel="Dismiss banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={20} color="#FFFFFF" />
      </StyledTouchableOpacity>
    </LinearGradient>
  );
};
