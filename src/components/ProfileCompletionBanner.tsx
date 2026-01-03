/**
 * Profile Completion Banner Component
 *
 * Displays a persistent banner encouraging users to complete their profile to 100%
 * to start matching. Can be dismissed by the user and persists dismissal state.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Body } from './ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { lightHaptic } from '../utils/haptics';
import { calculateProfileCompleteness } from '../utils/profileCompleteness';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface ProfileCompletionBannerProps {
  profile: UserProfile | null;
  onPress?: () => void;
}

const BANNER_DISMISSED_KEY = '@profile_completion_banner_dismissed';

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  profile,
  onPress,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize profile completion calculation for performance - MUST be before early returns
  const completion = useMemo(() => {
    return calculateProfileCompleteness(profile).percentage;
  }, [profile]);

  // Load dismissal state on mount
  useEffect(() => {
    const loadDismissalState = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
        setIsDismissed(dismissed === 'true');
      } catch (error) {
        console.error('Error loading banner dismissal state:', error);
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
      console.error('Error saving banner dismissal state:', error);
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

  // Don't render if profile is 100% complete
  if (completion >= 100) {
    return null;
  }

  return (
    <LinearGradient
      colors={['#3B82F6', '#2563EB']} // Blue gradient: blue-500 to blue-600
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#2563EB',
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
          <Ionicons name="star" size={20} color="#FFFFFF" />
        </StyledView>
        <StyledView className="flex-1">
          <Body className="text-white font-bold text-sm mb-0.5">
            {completion}% Complete
          </Body>
          <Body className="text-white/90 text-xs">
            Reach 100% profile strength to start matching
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
