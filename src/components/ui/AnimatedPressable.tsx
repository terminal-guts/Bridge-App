/**
 * AnimatedPressable
 *
 * Drop-in replacement for TouchableOpacity with spring-based press animation.
 * Runs entirely on the UI thread via Reanimated — no JS bridge lag.
 *
 * Features:
 * - Scale animation on press (configurable via `scale` prop)
 * - Optional animated depth: shadow sinks on press-in, lifts on release (iOS)
 * - Respects system "Reduce Motion" accessibility setting
 *
 * Usage:
 *   <AnimatedPressable onPress={handlePress} scale="standard">
 *     <Text>Tap me</Text>
 *   </AnimatedPressable>
 *
 *   // With animated depth (card press effect):
 *   <AnimatedPressable onPress={handlePress} animateDepth depthLevel="lg">
 *     <CardContent />
 *   </AnimatedPressable>
 */

import React, { useCallback } from 'react';
import { Platform, ViewStyle, StyleProp, AccessibilityRole, AccessibilityState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SPRINGS, PRESS_SCALES } from '../../constants/animations';
import { DEPTH_PARAMS, DEPTH_PRESS_FACTOR, type ShadowKey } from '../../theme/shadows';

/** Depth levels that support animated shadow transitions (neutral elevations only) */
type DepthLevel = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

function isDepthLevel(key: ShadowKey): key is DepthLevel {
  return key in DEPTH_PARAMS;
}

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scale?: keyof typeof PRESS_SCALES;
  style?: StyleProp<ViewStyle>;
  className?: string;
  activeOpacity?: number;
  /** Animate shadow depth on press (iOS only). Card sinks on press-in, lifts on release. */
  animateDepth?: boolean;
  /** Shadow level for depth animation. Must match a neutral elevation key. */
  depthLevel?: ShadowKey;
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
  animateDepth = false,
  depthLevel,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
}) => {
  const pressed = useSharedValue(0);
  const targetScale = PRESS_SCALES[scale];

  // Determine if depth animation is active (iOS only, valid depth level)
  const canAnimateDepth =
    animateDepth &&
    Platform.OS === 'ios' &&
    depthLevel &&
    isDepthLevel(depthLevel);

  // Pre-compute resting and pressed depth values for the worklet
  const restingOpacity = canAnimateDepth ? DEPTH_PARAMS[depthLevel as DepthLevel].opacity : 0;
  const restingRadius = canAnimateDepth ? DEPTH_PARAMS[depthLevel as DepthLevel].radius : 0;
  const restingOffsetY = canAnimateDepth ? DEPTH_PARAMS[depthLevel as DepthLevel].offsetY : 0;
  const pressedOpacity = restingOpacity * (1 - DEPTH_PRESS_FACTOR);
  const pressedRadius = restingRadius * (1 - DEPTH_PRESS_FACTOR);
  const pressedOffsetY = Math.max(restingOffsetY * (1 - DEPTH_PRESS_FACTOR), 0);

  const animatedStyle = useAnimatedStyle(() => {
    const baseStyle: ViewStyle = {
      transform: [{ scale: 1 - pressed.value * (1 - targetScale) }],
      opacity: 1 - pressed.value * (1 - activeOpacity),
    };

    // Add animated shadow depth on iOS
    if (canAnimateDepth) {
      baseStyle.shadowOpacity = interpolate(
        pressed.value,
        [0, 1],
        [restingOpacity, pressedOpacity],
      );
      baseStyle.shadowRadius = interpolate(
        pressed.value,
        [0, 1],
        [restingRadius, pressedRadius],
      );
      baseStyle.shadowOffset = {
        width: 0,
        height: interpolate(
          pressed.value,
          [0, 1],
          [restingOffsetY, pressedOffsetY],
        ),
      };
    }

    return baseStyle;
  });

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
      pressed.value = withSpring(0, SPRINGS.responsive);
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
