/**
 * Tooltip Component
 *
 * Displays guide step message with smart positioning and arrow pointing to target.
 * Auto-adjusts position based on available screen space.
 */

import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { styled } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H3, Body } from '../ui/Typography';
import { Button } from '../ui/Button';
import { TooltipPosition, TooltipDimensions } from '../../types/guides';
import { lightHaptic } from '../../utils/haptics';
import { COLORS } from '../../theme/colors';

interface TooltipProps {
  /** Optional title */
  title?: string;

  /** Message to display */
  message: string;

  /** Primary button text */
  primaryButtonText: string;

  /** Optional secondary button text */
  secondaryButtonText?: string;

  /** Callback when primary button pressed */
  onPrimary: () => void;

  /** Optional callback when secondary button pressed */
  onSecondary?: () => void;

  /** Target element dimensions for positioning */
  targetDimensions?: { x: number; y: number; width: number; height: number };

  /** Preferred tooltip position */
  preferredPosition: TooltipPosition;

  /** Optional image to display between message and button */
  image?: ImageSourcePropType;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Use dynamic screen dimensions instead of static module-level capture
const getScreenDimensions = () => Dimensions.get('window');

// iPhone 13 baseline: 390 x 844
const BASE_WIDTH = 390;
const ARROW_SIZE = 12;
const PADDING_FROM_EDGE = 20;

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  message,
  primaryButtonText,
  secondaryButtonText,
  onPrimary,
  onSecondary,
  targetDimensions,
  preferredPosition,
  image,
}) => {
  const insets = useSafeAreaInsets();

  // Animated values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  /**
   * Calculate tooltip position
   */
  const tooltipPosition = useMemo((): TooltipDimensions => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    const TOOLTIP_MAX_WIDTH = Math.round(280 * scale);
    const ESTIMATED_TOOLTIP_HEIGHT = Math.round(220 * scale);

    // Center modal if no target
    if (!targetDimensions || preferredPosition === 'center') {
      return {
        x: 0,
        y: 0,
        position: 'center',
        width: TOOLTIP_MAX_WIDTH,
      };
    }

    const { x, y, width, height } = targetDimensions;

    // Calculate available space in each direction
    const spaceTop = y - insets.top;
    const spaceBottom = SCREEN_HEIGHT - (y + height) - insets.bottom;
    const spaceLeft = x;
    const spaceRight = SCREEN_WIDTH - (x + width);

    // Determine final position based on available space
    let finalPosition: TooltipPosition = preferredPosition;
    let tooltipX = 0;
    let tooltipY = 0;

    const minSpace = Math.round(200 * scale);

    // Auto-adjust if not enough space in preferred direction
    if (preferredPosition === 'top' && spaceTop < minSpace) {
      finalPosition = 'bottom';
    } else if (preferredPosition === 'bottom' && spaceBottom < minSpace) {
      finalPosition = 'top';
    } else if (preferredPosition === 'left' && spaceLeft < TOOLTIP_MAX_WIDTH + PADDING_FROM_EDGE) {
      finalPosition = 'right';
    } else if (preferredPosition === 'right' && spaceRight < TOOLTIP_MAX_WIDTH + PADDING_FROM_EDGE) {
      finalPosition = 'left';
    }

    // Calculate position based on final direction
    switch (finalPosition) {
      case 'top':
        tooltipX = Math.max(
          PADDING_FROM_EDGE,
          Math.min(x + width / 2 - TOOLTIP_MAX_WIDTH / 2, SCREEN_WIDTH - TOOLTIP_MAX_WIDTH - PADDING_FROM_EDGE)
        );
        tooltipY = y - ESTIMATED_TOOLTIP_HEIGHT - ARROW_SIZE - 8;
        break;

      case 'bottom':
        tooltipX = Math.max(
          PADDING_FROM_EDGE,
          Math.min(x + width / 2 - TOOLTIP_MAX_WIDTH / 2, SCREEN_WIDTH - TOOLTIP_MAX_WIDTH - PADDING_FROM_EDGE)
        );
        tooltipY = y + height + ARROW_SIZE + 8;
        break;

      case 'left':
        tooltipX = x - TOOLTIP_MAX_WIDTH - ARROW_SIZE - 8;
        tooltipY = Math.max(
          insets.top + PADDING_FROM_EDGE,
          Math.min(y + height / 2 - Math.round(100 * scale), SCREEN_HEIGHT - minSpace - insets.bottom)
        );
        break;

      case 'right':
        tooltipX = x + width + ARROW_SIZE + 8;
        tooltipY = Math.max(
          insets.top + PADDING_FROM_EDGE,
          Math.min(y + height / 2 - Math.round(100 * scale), SCREEN_HEIGHT - minSpace - insets.bottom)
        );
        break;

      default:
        // Fallback to bottom
        tooltipX = Math.max(
          PADDING_FROM_EDGE,
          Math.min(x + width / 2 - TOOLTIP_MAX_WIDTH / 2, SCREEN_WIDTH - TOOLTIP_MAX_WIDTH - PADDING_FROM_EDGE)
        );
        tooltipY = y + height + ARROW_SIZE + 8;
        finalPosition = 'bottom';
    }

    // Ensure tooltip stays within safe area
    tooltipY = Math.max(
      insets.top + PADDING_FROM_EDGE,
      Math.min(tooltipY, SCREEN_HEIGHT - Math.round(250 * scale) - insets.bottom)
    );

    return {
      x: tooltipX,
      y: tooltipY,
      position: finalPosition,
      width: TOOLTIP_MAX_WIDTH,
    };
  }, [targetDimensions, preferredPosition, insets]);

  /**
   * Animate in on mount
   */
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
  }, []);

  /**
   * Animated style
   */
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handlePrimary = () => {
    lightHaptic();
    onPrimary();
  };

  const handleSecondary = () => {
    lightHaptic();
    onSecondary?.();
  };

  return (
    <Animated.View
      style={[
        tooltipPosition.position === 'center'
          ? [styles.container, {
              top: 0,
              bottom: 0,
              left: (getScreenDimensions().width - tooltipPosition.width) / 2,
              width: tooltipPosition.width,
              justifyContent: 'center' as const,
            }]
          : [styles.container, { left: tooltipPosition.x, top: tooltipPosition.y, width: tooltipPosition.width }],
        animatedStyle,
      ]}
    >
      {/* Tooltip card */}
      <StyledView className="bg-neutral-900 rounded-2xl p-4 shadow-2xl">
        {/* Title */}
        {title && <H3 className="text-white font-bold mb-2">{title}</H3>}

        {/* Message */}
        <Body className="text-white/90 leading-6 mb-4">{message}</Body>

        {/* Optional image */}
        {image && (
          <Image
            source={image}
            style={{ width: '100%', height: 240, borderRadius: 12, marginBottom: 16 }}
            resizeMode="cover"
          />
        )}

        {/* Buttons */}
        <StyledView className="flex-row gap-2">
          {secondaryButtonText && (
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={handleSecondary}
                className="py-3 px-4 bg-white/20 rounded-xl items-center"
                activeOpacity={0.7}
              >
                <Body className="text-white font-semibold">{secondaryButtonText}</Body>
              </StyledTouchableOpacity>
            </StyledView>
          )}

          <StyledView className="flex-1">
            <StyledTouchableOpacity
              onPress={handlePrimary}
              className="py-3 px-4 bg-primary-500 rounded-xl items-center"
              activeOpacity={0.8}
            >
              <Body className="text-white font-semibold">{primaryButtonText}</Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Arrow (CSS border triangle) — points toward target center */}
      {tooltipPosition.position === 'bottom' && targetDimensions && (
        <View
          style={[
            styles.arrow,
            {
              top: -ARROW_SIZE + 2,
              left: Math.max(16, Math.min(targetDimensions.x + targetDimensions.width / 2 - tooltipPosition.x - ARROW_SIZE, tooltipPosition.width - ARROW_SIZE * 2 - 16)),
              borderLeftWidth: ARROW_SIZE,
              borderRightWidth: ARROW_SIZE,
              borderBottomWidth: ARROW_SIZE,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: COLORS.primaryAccent,
            },
          ]}
        />
      )}

      {tooltipPosition.position === 'top' && targetDimensions && (
        <View
          style={[
            styles.arrow,
            {
              bottom: -ARROW_SIZE + 2,
              left: Math.max(16, Math.min(targetDimensions.x + targetDimensions.width / 2 - tooltipPosition.x - ARROW_SIZE, tooltipPosition.width - ARROW_SIZE * 2 - 16)),
              borderLeftWidth: ARROW_SIZE,
              borderRightWidth: ARROW_SIZE,
              borderTopWidth: ARROW_SIZE,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: COLORS.primaryAccent,
            },
          ]}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});
