/**
 * FloatingReward Component
 *
 * "+3 karma" text that floats upward while fading out.
 * Positioned absolute relative to parent container.
 */

import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { DURATIONS } from '../../constants/animations';
import { selectionHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES } from '../../constants/typography';

interface FloatingRewardProps {
  text: string;
  color?: string;
  trigger: boolean;
  onComplete?: () => void;
}

export function FloatingReward({
  text,
  color = '#10B981',
  trigger,
  onComplete,
}: FloatingRewardProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!trigger) return;

    selectionHaptic();
    opacity.value = 1;
    translateY.value = 0;

    if (reducedMotion) {
      // Show briefly then fade
      opacity.value = withTiming(0, { duration: DURATIONS.slow }, (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      });
    } else {
      translateY.value = withTiming(-40, { duration: DURATIONS.slow });
      opacity.value = withTiming(0, { duration: DURATIONS.slow }, (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      });
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!trigger) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -20,
          alignSelf: 'center',
          zIndex: 100,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: FONT_SIZES.base,
          color,
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}
