import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { lightHaptic } from '../../utils/haptics';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  className?: string;
  variant?: 'none' | 'mine' | 'partner' | 'both' | 'interest' | 'value' | 'location' | 'hometown';
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  size = 'md',
  className = '',
  variant = 'none',
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-1',
    md: 'px-3 py-1.5',
  };

  const textSizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  const baseStyles = `rounded-full border ${sizeStyles[size]}`;

  // Color variants for double-click functionality
  const getVariantStyles = () => {
    if (variant === 'both') {
      return 'bg-green-500 border-green-500';
    } else if (variant === 'mine') {
      return 'bg-primary-500 border-primary-500';
    } else if (variant === 'partner') {
      return 'bg-purple-500 border-purple-500';
    } else if (variant === 'interest') {
      return 'bg-amber-100 border-amber-300';
    } else if (variant === 'value') {
      return 'bg-emerald-100 border-emerald-300';
    } else if (variant === 'location') {
      return 'bg-rose-100 border-rose-300';
    } else if (variant === 'hometown') {
      return 'bg-violet-100 border-violet-300';
    } else if (selected) {
      return 'bg-primary-500 border-primary-500';
    } else {
      return 'bg-white border-neutral-300';
    }
  };

  const variantStyles = getVariantStyles();

  const getTextStyles = () => {
    // Light background variants need dark text
    if (variant === 'interest') return 'text-amber-700 font-medium';
    if (variant === 'value') return 'text-emerald-700 font-medium';
    if (variant === 'location') return 'text-rose-700 font-medium';
    if (variant === 'hometown') return 'text-violet-700 font-medium';
    // Solid color variants need white text
    if (selected || (variant !== 'none' && variant !== 'interest' && variant !== 'value' && variant !== 'location' && variant !== 'hometown')) {
      return 'text-white font-medium';
    }
    return 'text-neutral-700';
  };

  const textStyles = getTextStyles();

  const handlePress = () => {
    lightHaptic();
    onPress?.();
  };

  if (!onPress) {
    return (
      <StyledTouchableOpacity
        disabled
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        <StyledText className={`${textSizeStyles[size]} ${textStyles}`}>
          {label}
        </StyledText>
      </StyledTouchableOpacity>
    );
  }

  return (
    <StyledTouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      delayPressIn={0}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      <StyledText className={`${textSizeStyles[size]} ${textStyles}`}>
        {label}
      </StyledText>
    </StyledTouchableOpacity>
  );
};