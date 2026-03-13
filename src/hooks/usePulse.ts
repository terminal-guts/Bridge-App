/**
 * usePulse Hook
 *
 * Returns an animated style with a repeating scale pulse (breathing effect).
 * Auto-pauses when `enabled` is false. Respects reduced motion.
 *
 * Usage:
 *   const pulseStyle = usePulse({ enabled: isActive });
 *   <Animated.View style={pulseStyle}>...</Animated.View>
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { EASINGS } from '../constants/animations';

interface UsePulseOptions {
  amplitude?: number;
  duration?: number;
  enabled?: boolean;
}

export function usePulse({
  amplitude = 0.05,
  duration = 1600,
  enabled = true,
}: UsePulseOptions = {}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1 + amplitude, {
          duration: duration / 2,
          easing: EASINGS.standard,
        }),
        withTiming(1, {
          duration: duration / 2,
          easing: EASINGS.standard,
        }),
      ),
      -1, // infinite
      false,
    );

    return () => {
      cancelAnimation(scale);
    };
  }, [enabled, reducedMotion, amplitude, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}
