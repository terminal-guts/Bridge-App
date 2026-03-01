/**
 * Photo Completion Banner Component
 *
 * Displays a banner encouraging users to complete their photo uploads (3 photos required).
 * Only shown when About Me section is 100% complete but photos < 3.
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Body } from './ui';
import { UserProfile } from '../types';
import { lightHaptic } from '../utils/haptics';
import { calculateProfileStrengthBreakdown } from '../utils/profileCompleteness';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('PhotoCompletionBanner');

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface PhotoCompletionBannerProps {
  profile: UserProfile | null;
  onPress?: () => void;
}

export const PhotoCompletionBanner: React.FC<PhotoCompletionBannerProps> = ({
  profile,
  onPress,
}) => {
  // Use centralized calculation - SINGLE SOURCE OF TRUTH
  const breakdown = useMemo(() => {
    return calculateProfileStrengthBreakdown(profile);
  }, [profile]);

  const photoCount = breakdown.sections.photos.count;
  const photoPercentage = breakdown.sections.photos.percentage;
  const aboutMePercentage = breakdown.sections.aboutMe.percentage;

  logger.info('PhotoCompletionBanner:', {
    aboutMe: aboutMePercentage + '%',
    photos: `${photoCount}/3 (${photoPercentage}%)`,
  });

  // DISPLAY LOGIC:
  // Only show when About Me section is 100% complete AND photos < 3
  if (aboutMePercentage < 100 || photoCount >= 3) {
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
            {photoCount}/3 Photos ({photoPercentage}%)
          </Body>
          <Body className="text-white/90 text-xs">
            Add {3 - photoCount} more photo{3 - photoCount > 1 ? 's' : ''} for a complete profile
          </Body>
        </StyledView>
        <StyledView className="w-8 h-8 items-center justify-center ml-2">
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </StyledView>
      </StyledTouchableOpacity>
    </LinearGradient>
  );
};
