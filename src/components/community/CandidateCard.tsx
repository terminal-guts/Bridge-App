/**
 * CandidateCard Component
 *
 * Compact candidate display for triangle grid layout.
 * Shows: Photo, first initial + age, location, 2-3 key attributes
 *
 * Features:
 * - Press animations with scale effect
 * - Selection state with checkmark
 * - Smooth transitions
 */

import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../types/community';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledPressable = styled(Pressable);
const AnimatedPressable = Animated.createAnimatedComponent(StyledPressable);

interface CandidateCardProps {
  candidate: UserProfile;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function CandidateCard({
  candidate,
  isSelected,
  onPress,
  disabled = false,
}: CandidateCardProps) {
  // Get first initial
  const firstInitial = candidate.firstName.charAt(0).toUpperCase();

  // Get primary photo
  const mainPhoto = candidate.photos.find((p) => p.isMain) || candidate.photos[0];

  // Get 2-3 key attributes (job, education, or top interests)
  const attributes: string[] = [];
  if (candidate.currentJob) {
    attributes.push(candidate.currentJob);
  }
  if (candidate.school && attributes.length < 3) {
    attributes.push(candidate.school);
  }
  if (attributes.length < 2 && candidate.interests.length > 0) {
    attributes.push(candidate.interests[0]);
  }

  // Animation values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  // Handle press in/out for animation
  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    shadowOpacity.value = withTiming(0.2, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    shadowOpacity.value = withTiming(0.1, { duration: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      className="items-center"
      style={[
        {
          width: 100,
        },
        animatedStyle,
      ]}
    >
      {/* Card Container */}
      <StyledView
        className={`
          items-center
          bg-neutral-50
          rounded-xl
          p-3
          ${isSelected ? 'border-2 border-primary-500' : 'border border-neutral-300'}
        `}
        style={{
          shadowColor: '#FF9678',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Photo with checkmark overlay */}
        <StyledView className="relative">
          <StyledImage
            source={{ uri: mainPhoto?.url || 'https://via.placeholder.com/80' }}
            className="rounded-full bg-neutral-200"
            style={{ width: 80, height: 80 }}
            resizeMode="cover"
          />
          {isSelected && (
            <StyledView
              className="absolute top-0 right-0 bg-blue-500 rounded-full items-center justify-center"
              style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                borderColor: '#fff',
              }}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
            </StyledView>
          )}
        </StyledView>

        {/* Name Initial + Age */}
        <StyledText className="text-neutral-900 font-semibold text-base mt-2">
          {firstInitial}, {candidate.age}
        </StyledText>

        {/* Location */}
        <StyledText className="text-neutral-600 text-xs mt-1" numberOfLines={1}>
          {candidate.location}
        </StyledText>

        {/* Key Attributes */}
        <StyledView className="mt-2 w-full">
          {attributes.slice(0, 2).map((attr, index) => (
            <StyledText
              key={index}
              className="text-neutral-500 text-xs text-center"
              numberOfLines={1}
            >
              {attr}
            </StyledText>
          ))}
        </StyledView>
      </StyledView>
    </AnimatedPressable>
  );
}

export default CandidateCard;
