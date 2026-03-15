/**
 * useCountUp Hook
 *
 * Animates a number from `start` to `end` on the UI thread using Reanimated.
 * Uses the TextInput trick to avoid React re-renders during animation.
 *
 * Usage:
 *   const { animatedProps } = useCountUp({ start: 0, end: 100 });
 *   <AnimatedTextInput animatedProps={animatedProps} editable={false} />
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { DURATIONS, EASINGS } from '../constants/animations';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
  enabled?: boolean;
}

export function useCountUp({
  start = 0,
  end,
  duration = DURATIONS.slow,
  decimals = 0,
  enabled = true,
}: UseCountUpOptions) {
  const reducedMotion = useReducedMotion();
  const value = useSharedValue(start);

  useEffect(() => {
    if (!enabled) {
      value.value = start;
      return;
    }

    if (reducedMotion) {
      value.value = end;
    } else {
      value.value = start;
      value.value = withTiming(end, {
        duration,
        easing: EASINGS.standard,
      });
    }

    return () => {
      cancelAnimation(value);
    };
  }, [end, start, duration, enabled, reducedMotion]);

  const text = useDerivedValue(() => {
    return value.value.toFixed(decimals);
  });

  // Animated props for TextInput (avoids re-renders)
  const animatedProps = useAnimatedProps(() => {
    return {
      text: text.value,
      defaultValue: text.value,
    } as { text: string; defaultValue: string };
  });

  return { value, text, animatedProps };
}
