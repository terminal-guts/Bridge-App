import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * useStaggeredFade Hook
 *
 * Creates staggered fade-in and slide-up animation for multiple items
 * Used for entrance animations of dashboard cards
 *
 * @param delay - Delay before animation starts in milliseconds
 * @param duration - Animation duration in milliseconds (default: 400ms)
 * @returns Object with opacity and translateY animated values
 */
export const useStaggeredFade = (delay: number = 0, duration: number = 400) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, fadeAnim, slideAnim]);

  return {
    opacity: fadeAnim,
    translateY: slideAnim,
  };
};
