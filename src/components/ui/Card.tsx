import React from 'react';
import { View, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';

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

/**
 * Get shadow styles based on elevation level and variant
 * Implements sophisticated multi-layered shadow system with warm tones:
 * - Primary layer: Warm brown shadow for natural depth
 * - Secondary layer: Subtle colored glow based on variant
 * - Creates depth, warmth, and visual excitement
 */
const getElevationStyle = (elevation: ElevationLevel, variant: CardVariant): ViewStyle => {
  if (elevation === 0) return {};

  // Warm shadow colors for natural, inviting depth
  const warmShadows = {
    subtle: '#4A3428',     // Warm taupe-brown
    default: '#3D2817',    // Rich warm brown
    elevated: '#2E1810',   // Deep chocolate brown
    premium: '#1F0E08',    // Luxurious dark espresso
  };

  const baseShadowColor = warmShadows[variant] || warmShadows.default;

  const shadows = {
    1: {
      // Subtle - soft ambient shadow with gentle warmth
      ...Platform.select({
        ios: {
          shadowColor: baseShadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    2: {
      // Standard - balanced depth with noticeable presence
      ...Platform.select({
        ios: {
          shadowColor: baseShadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    3: {
      // Elevated - dramatic depth with rich shadow spread
      ...Platform.select({
        ios: {
          shadowColor: baseShadowColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.24,
          shadowRadius: 16,
        },
        android: {
          elevation: 10,
        },
      }),
    },
  };

  return shadows[elevation];
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