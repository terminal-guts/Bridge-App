import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { SHADOWS } from '../../theme/shadows';

/**
 * Elevation levels for visual hierarchy:
 * - 0: No shadow (flat)
 * - 1: Subtle shadow for nested/info cards
 * - 2: Medium shadow for section cards (default)
 * - 3: Strong shadow for hero/important cards
 */
type ElevationLevel = 0 | 1 | 2 | 3;

/**
 * Card variants for different visual styles:
 * - default: Standard card with dual shadows
 * - subtle: Light card for nested content
 * - elevated: Prominent card with strong depth
 * - premium: Elevated card with gradient overlay for extra polish
 */
type CardVariant = 'default' | 'subtle' | 'elevated' | 'premium';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  elevation?: ElevationLevel;
  variant?: CardVariant;
  style?: ViewStyle;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

/** Map Card elevation levels → centralized SHADOWS presets */
const ELEVATION_MAP: Record<ElevationLevel, ViewStyle> = {
  0: SHADOWS.none,
  1: SHADOWS.md,
  2: SHADOWS.lg,
  3: SHADOWS.xl,
};

const getElevationStyle = (elevation: ElevationLevel, _variant: CardVariant): ViewStyle => {
  return ELEVATION_MAP[elevation];
};

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  className = '',
  elevation = 2,
  variant = 'default',
  style,
}) => {
  const baseStyles = 'bg-neutral-50 rounded-lg p-4';
  const elevationStyle = getElevationStyle(elevation, variant);

  const combinedStyle = [elevationStyle, style];

  // Premium variant adds warm gradient overlays for luxurious polish
  const renderContent = () => {
    if (variant === 'premium' && elevation > 0) {
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
      <StyledTouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`${baseStyles} active:scale-[0.99] ${className}`}
        style={combinedStyle}
      >
        {renderContent()}
      </StyledTouchableOpacity>
    );
  }

  return (
    <StyledView className={`${baseStyles} ${className}`} style={combinedStyle}>
      {renderContent()}
    </StyledView>
  );
};