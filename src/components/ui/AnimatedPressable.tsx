/**
 * AnimatedPressable
 *
 * Drop-in replacement for TouchableOpacity with spring-based press animation.
 * Runs entirely on the UI thread via Reanimated — no JS bridge lag.
 *
 * Usage:
 *   <AnimatedPressable onPress={handlePress} scale="standard">
 *     <Text>Tap me</Text>
 *   </AnimatedPressable>
 */

import React, { useCallback } from 'react';
import { ViewStyle, StyleProp, AccessibilityRole, AccessibilityState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SPRINGS, PRESS_SCALES } from '../../constants/animations';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scale?: keyof typeof PRESS_SCALES;
  style?: StyleProp<ViewStyle>;
  className?: string;
  activeOpacity?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  scale = 'standard',
  style,
  className,
  activeOpacity = 1,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
}) => {
  const pressed = useSharedValue(0);
  const targetScale = PRESS_SCALES[scale];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - targetScale) }],
    opacity: 1 - pressed.value * (1 - activeOpacity),
  }));

  const handlePress = useCallback(() => {
    if (!disabled && onPress) onPress();
  }, [disabled, onPress]);

  const handleLongPress = useCallback(() => {
    if (!disabled && onLongPress) onLongPress();
  }, [disabled, onLongPress]);

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      pressed.value = withSpring(1, SPRINGS.snappy);
    })
    .onFinalize((_event, success) => {
      pressed.value = withSpring(0, SPRINGS.snappy);
      if (success) {
        runOnJS(handlePress)();
      }
    });

  const longPress = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(400)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const composed = Gesture.Race(longPress, tap);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[animatedStyle, style, disabled ? { opacity: 0.5 } : undefined]}
        className={className}
        accessible
        accessibilityRole={accessibilityRole || 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ ...accessibilityState, disabled }}
        hitSlop={hitSlop}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
