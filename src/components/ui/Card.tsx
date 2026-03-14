import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { SHADOWS, resolveShadow, type ShadowKey } from '../../theme/shadows';
import { AnimatedPressable } from './AnimatedPressable';

/**
 * Elevation levels for visual hierarchy (backward-compatible):
 * - 0: No shadow (flat)
 * - 1: Subtle shadow for nested/info cards
 * - 2: Medium shadow for section cards (default)
 * - 3: Strong shadow for hero/important cards
 */
type ElevationLevel = 0 | 1 | 2 | 3;

/**
 * Card variants for different visual styles:
 * - default: Standard card with elevation shadow
 * - subtle: Light card for nested content
 * - elevated: Prominent card with strong depth
 * - premium: Elevated card with gradient overlay for extra polish
 */
type CardVariant = 'default' | 'subtle' | 'elevated' | 'premium';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  /** Direct shadow level — takes precedence over elevation when provided */
  shadow?: ShadowKey;
  /** @deprecated Prefer `shadow` prop. Numeric elevation (0-3) mapped to shadow presets. */
  elevation?: ElevationLevel;
  variant?: CardVariant;
  style?: ViewStyle;
  /** Enable animated depth on press (shadow sinks on press-in, lifts on release) */
  animateDepth?: boolean;
}

const StyledView = styled(View);

/** Map Card elevation levels → centralized SHADOWS presets */
const ELEVATION_MAP: Record<ElevationLevel, ViewStyle> = {
  0: SHADOWS.none,
  1: SHADOWS.md,
  2: SHADOWS.lg,
  3: SHADOWS.xl,
};

/** Map elevation levels → ShadowKey for depth animation */
const ELEVATION_TO_SHADOW: Record<ElevationLevel, ShadowKey> = {
  0: 'none',
  1: 'md',
  2: 'lg',
  3: 'xl',
};

const getShadowStyle = (shadow?: ShadowKey, elevation: ElevationLevel = 2): ViewStyle => {
  if (shadow) return resolveShadow(shadow);
  return ELEVATION_MAP[elevation];
};

const getShadowKey = (shadow?: ShadowKey, elevation: ElevationLevel = 2): ShadowKey => {
  if (shadow) return shadow;
  return ELEVATION_TO_SHADOW[elevation];
};

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  className = '',
  shadow,
  elevation = 2,
  variant = 'default',
  style,
  animateDepth = false,
}) => {
  const baseStyles = 'bg-neutral-50 rounded-lg p-4';
  const shadowStyle = getShadowStyle(shadow, elevation);
  const shadowKey = getShadowKey(shadow, elevation);

  const combinedStyle = [shadowStyle, style];

  // Premium variant adds warm gradient overlays for luxurious polish
  const renderContent = () => {
    if (variant === 'premium' && (shadow ? shadow !== 'none' : elevation > 0)) {
      return (
        <StyledView className="relative overflow-hidden rounded-lg">
          {/* Top highlight - warm glass effect */}
          <LinearGradient
            colors={[
              'rgba(255, 250, 245, 0.65)',  // Warm white
              'rgba(255, 245, 235, 0.35)',  // Soft cream
              'rgba(255, 240, 220, 0)',     // Fade to transparent
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.35 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '40%',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
          {/* Subtle bottom glow for depth */}
          <LinearGradient
            colors={[
              'rgba(67, 127, 255, 0)',      // Transparent
              'rgba(67, 127, 255, 0.03)',   // Subtle blue glow
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '30%',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
          {children}
        </StyledView>
      );
    }
    return children;
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        scale="subtle"
        animateDepth={animateDepth}
        depthLevel={shadowKey}
        className={`${baseStyles} ${className}`}
        style={combinedStyle as unknown as ViewStyle}
      >
        {renderContent()}
      </AnimatedPressable>
    );
  }

  return (
    <StyledView className={`${baseStyles} ${className}`} style={combinedStyle}>
      {renderContent()}
    </StyledView>
  );
};
