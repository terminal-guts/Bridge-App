/**
 * TriangleGrid Component
 *
 * Triangle layout with 3 candidates positioned around 1 anchor.
 * Visual layout:
 *         [Anchor]
 *        /    |    \
 *    [C1]   [C2]   [C3]
 *
 * Features:
 * - Staggered entrance animations
 * - Haptic feedback on selection
 * - Smooth press animations
 * - Responsive layout
 */

import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { UserProfile, KarmaScore } from '../../types/community';
import { AnchorCard } from './AnchorCard';
import { CandidateCard } from './CandidateCard';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('TriangleGrid');

const StyledView = styled(View);
const AnimatedView = Animated.createAnimatedComponent(StyledView);

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 20;
const GRID_SIZE = SCREEN_WIDTH - GRID_PADDING * 2;
const CARD_WIDTH = 100;
const ANCHOR_CARD_WIDTH = 120;

interface TriangleGridProps {
  anchor: UserProfile;
  candidates: UserProfile[];
  selectedCandidateId: string | null;
  onCandidateSelect: (candidateId: string) => void;
  disabled?: boolean;
  karma?: KarmaScore;
  isRandomMatcher?: boolean;
}

export function TriangleGrid({
  anchor,
  candidates,
  selectedCandidateId,
  onCandidateSelect,
  disabled = false,
  karma,
  isRandomMatcher = false,
}: TriangleGridProps) {
  // Ensure we have exactly 3 candidates
  const displayCandidates = candidates.slice(0, 3);

  // Animation values for staggered entrance
  const anchorOpacity = useSharedValue(0);
  const anchorScale = useSharedValue(0.8);
  const candidate1Opacity = useSharedValue(0);
  const candidate1Scale = useSharedValue(0.8);
  const candidate2Opacity = useSharedValue(0);
  const candidate2Scale = useSharedValue(0.8);
  const candidate3Opacity = useSharedValue(0);
  const candidate3Scale = useSharedValue(0.8);

  // Staggered entrance animation on mount
  useEffect(() => {
    // Anchor appears first
    anchorOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    anchorScale.value = withSpring(1, { damping: 15, stiffness: 150 });

    // Candidates appear in sequence
    candidate1Opacity.value = withDelay(
      100,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
    );
    candidate1Scale.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 150 }));

    candidate2Opacity.value = withDelay(
      200,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
    );
    candidate2Scale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 150 }));

    candidate3Opacity.value = withDelay(
      300,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
    );
    candidate3Scale.value = withDelay(300, withSpring(1, { damping: 15, stiffness: 150 }));
  }, []);

  // Handle candidate selection with haptic feedback
  const handleCandidatePress = async (candidateId: string) => {
    if (disabled) return;

    // Haptic feedback
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics may not be available on all devices
      logger.info('Haptics not available');
    }

    // Toggle selection: if already selected, deselect it
    if (selectedCandidateId === candidateId) {
      onCandidateSelect('');
    } else {
      onCandidateSelect(candidateId);
    }
  };

  // Animated styles
  const anchorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: anchorOpacity.value,
    transform: [{ scale: anchorScale.value }],
  }));

  const candidate1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: candidate1Opacity.value,
    transform: [{ scale: candidate1Scale.value }],
  }));

  const candidate2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: candidate2Opacity.value,
    transform: [{ scale: candidate2Scale.value }],
  }));

  const candidate3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: candidate3Opacity.value,
    transform: [{ scale: candidate3Scale.value }],
  }));

  // Calculate positions
  const positions = {
    anchor: {
      top: 0,
      left: GRID_SIZE / 2 - ANCHOR_CARD_WIDTH / 2,
    },
    candidate1: {
      top: GRID_SIZE * 0.5,
      left: 0,
    },
    candidate2: {
      top: GRID_SIZE * 0.5,
      right: 0,
    },
    candidate3: {
      top: GRID_SIZE * 0.8,
      left: GRID_SIZE / 2 - CARD_WIDTH / 2,
    },
  };

  return (
    <StyledView
      className="items-center justify-center py-8"
      style={{ width: SCREEN_WIDTH }}
    >
      {/* Grid Container - Square aspect ratio with absolute positioning */}
      <StyledView
        className="relative"
        style={{
          width: GRID_SIZE,
          height: GRID_SIZE,
        }}
      >
        {/* Optional: Connection Lines (subtle visual effect) */}
        {/* Uncomment to add connection lines from anchor to candidates */}
        {/* <StyledView
          className="absolute bg-neutral-200"
          style={{
            top: positions.anchor.top + ANCHOR_CARD_WIDTH / 2,
            left: positions.anchor.left + ANCHOR_CARD_WIDTH / 2,
            width: 1,
            height: positions.candidate1.top - positions.anchor.top - ANCHOR_CARD_WIDTH / 2,
            transform: [{ rotate: '-30deg' }],
          }}
        /> */}

        {/* Anchor Card - Top Center */}
        <AnimatedView
          className="absolute"
          style={[
            {
              top: positions.anchor.top,
              left: positions.anchor.left,
            },
            anchorAnimatedStyle,
          ]}
        >
          <AnchorCard
            anchor={anchor}
            karma={karma}
            isRandomMatcher={isRandomMatcher}
          />
        </AnimatedView>

        {/* Candidate 1 - Bottom Left */}
        {displayCandidates[0] && (
          <AnimatedView
            className="absolute"
            style={[
              {
                top: positions.candidate1.top,
                left: positions.candidate1.left,
              },
              candidate1AnimatedStyle,
            ]}
          >
            <CandidateCard
              candidate={displayCandidates[0]}
              isSelected={selectedCandidateId === displayCandidates[0].id}
              onPress={() => handleCandidatePress(displayCandidates[0].id)}
              disabled={disabled}
            />
          </AnimatedView>
        )}

        {/* Candidate 2 - Bottom Right */}
        {displayCandidates[1] && (
          <AnimatedView
            className="absolute"
            style={[
              {
                top: positions.candidate2.top,
                right: 0,
              },
              candidate2AnimatedStyle,
            ]}
          >
            <CandidateCard
              candidate={displayCandidates[1]}
              isSelected={selectedCandidateId === displayCandidates[1].id}
              onPress={() => handleCandidatePress(displayCandidates[1].id)}
              disabled={disabled}
            />
          </AnimatedView>
        )}

        {/* Candidate 3 - Bottom Center */}
        {displayCandidates[2] && (
          <AnimatedView
            className="absolute"
            style={[
              {
                top: positions.candidate3.top,
                left: positions.candidate3.left,
              },
              candidate3AnimatedStyle,
            ]}
          >
            <CandidateCard
              candidate={displayCandidates[2]}
              isSelected={selectedCandidateId === displayCandidates[2].id}
              onPress={() => handleCandidatePress(displayCandidates[2].id)}
              disabled={disabled}
            />
          </AnimatedView>
        )}
      </StyledView>
    </StyledView>
  );
}

export default TriangleGrid;
