import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * useCountAnimation Hook
 *
 * Animates counting numbers up or down smoothly
 * Used for prospective matches count animation
 *
 * @param targetValue - The target number to animate to
 * @param duration - Animation duration in milliseconds (default: 800ms)
 * @returns Animated value that can be interpolated
 */
export const useCountAnimation = (targetValue: number, duration: number = 800) => {
  const animatedValue = useRef(new Animated.Value(targetValue)).current;
  const previousValue = useRef(targetValue);

  useEffect(() => {
    if (previousValue.current !== targetValue) {
      // Animate from previous value to new value
      Animated.timing(animatedValue, {
        toValue: targetValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Can't use native driver for non-transform animations
      }).start();

      previousValue.current = targetValue;
    }
  }, [targetValue, duration, animatedValue]);

  return animatedValue;
};
