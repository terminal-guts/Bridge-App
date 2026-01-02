import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * usePulseAnimation Hook
 *
 * Creates a looping pulse/glow animation
 * Used for glowing prospective matches card when count reaches 1
 *
 * @param isActive - Whether the pulse animation should be active
 * @param minScale - Minimum scale value (default: 1.0)
 * @param maxScale - Maximum scale value (default: 1.02)
 * @param duration - Duration of one pulse cycle in milliseconds (default: 2000ms)
 * @returns Animated value for scale transform
 */
export const usePulseAnimation = (
  isActive: boolean,
  minScale: number = 1.0,
  maxScale: number = 1.02,
  duration: number = 2000
) => {
  const pulseAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    if (isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: maxScale,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: minScale,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      // Reset to default scale when not active
      pulseAnim.setValue(minScale);
    }
  }, [isActive, pulseAnim, minScale, maxScale, duration]);

  return pulseAnim;
};
