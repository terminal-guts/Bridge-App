/**
 * SimpleCandidatePhotos Component
 *
 * Bottom half: 3 large, inviting candidate photos in equal columns.
 * NO NAMES - just warm, prominent photos.
 * Fun interactions: Subtle scale-up on press, gentle haptic feedback.
 */

import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, Photo } from '../../types';
import { Body } from '../ui';

const StyledView = styled(View);
const StyledImage = styled(Image);
const StyledPressable = styled(Pressable);
const AnimatedPressable = Animated.createAnimatedComponent(StyledPressable);

interface SimpleCandidatePhotosProps {
  candidates: UserProfile[];
  onCandidatePress: (candidate: UserProfile) => void;
  disabled?: boolean;
  onSkip?: () => void;
  showSkipButton?: boolean;
}

interface CandidatePhotoProps {
  candidate: UserProfile;
  onPress: () => void;
  disabled?: boolean;
}

function CandidatePhoto({ candidate, onPress, disabled = false }: CandidatePhotoProps) {
  // Get primary photo
  const mainPhoto = candidate.photos.find((p) => p.isMain) || candidate.photos[0];

  // Animation values
  const scale = useSharedValue(1);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Handle press in/out for animation + haptic
  const handlePressIn = () => {
    scale.value = withSpring(1.05, { damping: 12, stiffness: 150 }); // Gentle bounce up
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics may not be available
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 150 }); // Gentle bounce back
  };

  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[CandidatePhoto] Press detected!', candidate.id, 'disabled:', disabled);
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8, // More generous spacing between photos
        },
        animatedStyle,
      ]}
    >
      <StyledView style={{
        width: '100%',
        height: '85%', // Fill most of the bottom half height
        borderRadius: 28, // Large, inviting rounded corners
        overflow: 'visible', // Changed to show badge
        backgroundColor: '#FBF9F6', // Warm cream background
        shadowColor: 'rgba(139, 92, 47, 0.18)', // Warm brown shadow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 6,
        borderWidth: 2,
        borderColor: '#F5EFE7', // Subtle warm border (cream/light gold)
      }}>
        <StyledView style={{
          width: '100%',
          height: '100%',
          borderRadius: 28,
          overflow: 'hidden',
        }}>
          <Image
            source={{ uri: mainPhoto?.url || 'https://via.placeholder.com/200' }}
            style={{
              width: '100%',
              height: '100%',
            }}
            resizeMode="cover"
          />
        </StyledView>
      </StyledView>
    </AnimatedPressable>
  );
}

export function SimpleCandidatePhotos({
  candidates,
  onCandidatePress,
  disabled = false,
  onSkip,
  showSkipButton = false,
}: SimpleCandidatePhotosProps) {
  // Ensure we have exactly 3 candidates
  const displayCandidates = candidates.slice(0, 3);
  console.log('[SimpleCandidatePhotos] Rendering with', displayCandidates.length, 'candidates, disabled:', disabled);

  return (
    <StyledView style={{
      flex: 1,
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 8,
      backgroundColor: '#FBF9F6', // Warm cream background
    }}>
      {/* Candidates Row */}
      <StyledView style={{
        flex: 1,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {displayCandidates.map((candidate) => (
          <CandidatePhoto
            key={candidate.id}
            candidate={candidate}
            onPress={() => onCandidatePress(candidate)}
            disabled={disabled}
          />
        ))}
      </StyledView>

      {/* Skip button - only show if enabled and not disabled */}
      {showSkipButton && !disabled && onSkip && (
        <StyledView style={{
          paddingHorizontal: 24,
          paddingVertical: 12,
          alignItems: 'center',
        }}>
          <StyledPressable
            onPress={onSkip}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}
          >
            <Body style={{
              fontSize: 13,
              color: '#A8A29E',
              textDecorationLine: 'underline',
            }}>
              None of these work
            </Body>
          </StyledPressable>
        </StyledView>
      )}
    </StyledView>
  );
}

export default SimpleCandidatePhotos;
