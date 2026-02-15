/**
 * SuccessAnimation Component
 *
 * Celebratory animation when user submits a proposal.
 * Features:
 * - Checkmark with scale animation
 * - Success message
 * - Smooth fade in/out
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('SuccessAnimation');

const StyledView = styled(View);
const StyledText = styled(Text);
const AnimatedView = Animated.createAnimatedComponent(StyledView);

interface SuccessAnimationProps {
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export function SuccessAnimation({
  message = 'Proposal Submitted!',
  onComplete,
  duration = 2000,
}: SuccessAnimationProps) {
  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkRotate = useSharedValue(-180);

  useEffect(() => {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      logger.info('Haptics not available');
    });

    // Container fade in
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });

    // Background circle scale
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );

    // Checkmark animation (delayed)
    checkmarkScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    checkmarkRotate.value = withDelay(
      200,
      withSpring(0, { damping: 12, stiffness: 150 })
    );

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        if (onComplete) {
          onComplete();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkmarkScale.value },
      { rotate: `${checkmarkRotate.value}deg` },
    ],
  }));

  return (
    <AnimatedView
      className="absolute inset-0 items-center justify-center z-50"
      style={[
        {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
        containerStyle,
      ]}
      pointerEvents="none"
    >
      <AnimatedView
        className="items-center justify-center bg-white rounded-2xl p-8"
        style={circleStyle}
      >
        {/* Success Circle with Checkmark */}
        <AnimatedView
          className="bg-green-500 rounded-full items-center justify-center mb-4"
          style={[
            {
              width: 80,
              height: 80,
            },
            checkmarkStyle,
          ]}
        >
          <Ionicons name="checkmark" size={48} color="#fff" />
        </AnimatedView>

        {/* Success Message */}
        <StyledText className="text-xl font-semibold text-neutral-900 text-center">
          {message}
        </StyledText>
      </AnimatedView>
    </AnimatedView>
  );
}

export default SuccessAnimation;
