/**
 * Profile Completion Banner Component
 *
 * Displays a persistent banner encouraging users to complete their profile to 100%
 * to start matching. Can be dismissed by the user and persists dismissal state.
 */

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Body } from './ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { lightHaptic } from '../utils/haptics';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface ProfileCompletionBannerProps {
  profile: UserProfile | null;
  onPress?: () => void;
}

const BANNER_DISMISSED_KEY = '@profile_completion_banner_dismissed';

/**
 * Calculate profile completion percentage
 */
const calculateProfileCompletion = (profile: UserProfile | null): number => {
  if (!profile) return 0;

  let totalScore = 0;
  let maxTotal = 0;

  // About Me (max 23)
  let aboutScore = 0;
  if (profile.age) aboutScore += 2;
  if (profile.height) aboutScore += 1;
  if (profile.ethnicity) aboutScore += 1;
  if (profile.location) aboutScore += 2;
  if (profile.currentJob) aboutScore += 3;
  if ((profile.interests?.length || 0) >= 3) aboutScore += 4;
  if ((profile.values?.length || 0) >= 3) aboutScore += 4;
  if (profile.drinkingFrequency) aboutScore += 2;
  if (profile.hasChildren) aboutScore += 2;
  if (profile.familyPlans) aboutScore += 2;
  totalScore += aboutScore;
  maxTotal += 23;

  // Match Preferences (max 25)
  let preferencesScore = 0;
  const hasAgeMin = profile.preferences?.ageMin !== undefined && profile.preferences?.ageMin !== null;
  const hasAgeMax = profile.preferences?.ageMax !== undefined && profile.preferences?.ageMax !== null;
  if (hasAgeMin && hasAgeMax) preferencesScore += 8;
  if ((profile.interestedInGenders && profile.interestedInGenders.length > 0) || profile.preferences?.gender) {
    preferencesScore += 8;
  }
  preferencesScore += 9; // Looking for is auto-granted
  totalScore += preferencesScore;
  maxTotal += 25;

  // Photos (max 25)
  const photoCount = profile.photos?.length || 0;
  const photosScore = photoCount >= 6 ? 25 : Math.round((photoCount / 6) * 25);
  totalScore += photosScore;
  maxTotal += 25;

  // Deep Questions (max 25)
  const displayedCount = profile.displayedQuestions?.length || 0;
  const answeredCount = profile.deepQuestions?.length || 0;
  let questionsScore = 0;
  if (displayedCount >= 3) {
    questionsScore = 25;
  } else if (displayedCount > 0) {
    questionsScore = Math.round((displayedCount / 3) * 25);
  } else if (answeredCount > 0) {
    questionsScore = Math.min(Math.round((answeredCount / 3) * 10), 10);
  }
  totalScore += questionsScore;
  maxTotal += 25;

  return Math.round((totalScore / maxTotal) * 100);
};

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  profile,
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

  const completion = calculateProfileCompletion(profile);

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
            Reach 100% to start matching
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
