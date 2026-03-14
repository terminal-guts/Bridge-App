/**
 * Spotlight Component
 *
 * Creates a spotlight effect by masking an overlay to highlight a specific element.
 * Uses MaskedView to create a cutout effect with smooth animations.
 */

import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { SpotlightShape, SpotlightDimensions } from '../../types/guides';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('Spotlight');

interface SpotlightProps {
  /** Dimensions for the spotlight cutout */
  dimensions: SpotlightDimensions;

  /** Shape of the spotlight */
  shape: SpotlightShape;

  /** Whether to animate the change */
  animated?: boolean;
}

const getScreenDimensions = () => Dimensions.get('window');

export const Spotlight: React.FC<SpotlightProps> = ({
  dimensions,
  shape = 'rounded-rect',
  animated = true,
}) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();

  logger.info('[Spotlight] Rendering with dimensions:', dimensions, 'shape:', shape);
  logger.info('[Spotlight] Screen dimensions:', SCREEN_WIDTH, 'x', SCREEN_HEIGHT);
  logger.info('[Spotlight] Spotlight will create cutout from:', {
    x: dimensions.x,
    y: dimensions.y,
    to_x: dimensions.x + dimensions.width,
    to_y: dimensions.y + dimensions.height,
  });

  // Animated values for spotlight position and size
  const spotlightX = useSharedValue(dimensions.x);
  const spotlightY = useSharedValue(dimensions.y);
  const spotlightWidth = useSharedValue(dimensions.width);
  const spotlightHeight = useSharedValue(dimensions.height);
  const spotlightBorderRadius = useSharedValue(dimensions.borderRadius);
  const overlayOpacity = useSharedValue(0);

  /**
   * Animate spotlight when dimensions change
   */
  useEffect(() => {
    if (animated) {
      spotlightX.value = withTiming(dimensions.x, { duration: 400 });
      spotlightY.value = withTiming(dimensions.y, { duration: 400 });
      spotlightWidth.value = withTiming(dimensions.width, { duration: 400 });
      spotlightHeight.value = withTiming(dimensions.height, { duration: 400 });
      spotlightBorderRadius.value = withTiming(dimensions.borderRadius, { duration: 400 });
    } else {
      spotlightX.value = dimensions.x;
      spotlightY.value = dimensions.y;
      spotlightWidth.value = dimensions.width;
      spotlightHeight.value = dimensions.height;
      spotlightBorderRadius.value = dimensions.borderRadius;
    }
  }, [dimensions, animated]);

  /**
   * Fade in overlay on mount
   */
  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  /**
   * Animated styles for each overlay section
   * Clamps values to prevent negative dimensions
   */
  const topOverlayStyle = useAnimatedStyle(() => {
    const height = Math.max(0, spotlightY.value);
    return {
      opacity: overlayOpacity.value,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => {
    const width = Math.max(0, spotlightX.value);
    const top = Math.max(0, spotlightY.value);
    return {
      opacity: overlayOpacity.value,
      position: 'absolute',
      top,
      left: 0,
      width,
      height: spotlightHeight.value,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const left = Math.max(0, spotlightX.value + spotlightWidth.value);
    const top = Math.max(0, spotlightY.value);
    return {
      opacity: overlayOpacity.value,
      position: 'absolute',
      top,
      left,
      right: 0,
      height: spotlightHeight.value,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    };
  });

  const bottomOverlayStyle = useAnimatedStyle(() => {
    const top = spotlightY.value + spotlightHeight.value;
    return {
      opacity: overlayOpacity.value,
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    };
  });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} pointerEvents="none">
      {/* Top overlay */}
      <Animated.View style={topOverlayStyle} />

      {/* Left overlay */}
      <Animated.View style={leftOverlayStyle} />

      {/* Right overlay */}
      <Animated.View style={rightOverlayStyle} />

      {/* Bottom overlay */}
      <Animated.View style={bottomOverlayStyle} />
    </View>
  );
};

// styles.maskBackground and styles.overlay kept for potential future use
const styles = StyleSheet.create({});
