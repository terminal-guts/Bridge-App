/**
 * useStaggeredList — Reusable staggered entrance animation for list items.
 *
 * Returns an `itemStyle` function that takes an index and returns an
 * animated style with cascading fadeIn + slideUp.
 *
 * Usage:
 *   const { animatedItemStyle } = useStaggeredList(items.length);
 *   // In render:
 *   <Animated.View style={animatedItemStyle(index)}>{...}</Animated.View>
 *
 * Or use the convenience wrapper:
 *   <StaggerItem index={i} total={items.length}>{...}</StaggerItem>
 */

import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { DURATIONS, STAGGER, EASINGS } from '../constants/animations';

interface UseStaggeredListOptions {
  /** Delay between each item (ms). Default: STAGGER.fast (50ms) */
  staggerDelay?: number;
  /** Duration of each item's animation (ms). Default: DURATIONS.normal (280ms) */
  duration?: number;
  /** Vertical slide distance (px). Default: 12 */
  slideDistance?: number;
  /** Maximum number of items to animate (items beyond this appear instantly). Default: 15 */
  maxAnimated?: number;
}

/**
 * StaggerItem — Convenience wrapper for individual list items.
 * Handles its own animation lifecycle, so it works with FlatList's recycling.
 */
export const StaggerItem: React.FC<{
  index: number;
  children: React.ReactNode;
  staggerDelay?: number;
  duration?: number;
  slideDistance?: number;
  maxAnimated?: number;
  style?: ViewStyle;
}> = React.memo(({
  index,
  children,
  staggerDelay = STAGGER.fast,
  duration = DURATIONS.normal,
  slideDistance = 12,
  maxAnimated = 15,
  style,
}) => {
  const opacity = useSharedValue(index < maxAnimated ? 0 : 1);
  const translateY = useSharedValue(index < maxAnimated ? slideDistance : 0);

  useEffect(() => {
    if (index < maxAnimated) {
      const delay = index * staggerDelay;
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1.0) }),
      );
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1.0) }),
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
});
