import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { lightHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';

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

// Move constant style objects outside component to prevent recreation
const SIZE_STYLES = {
  sm: 'px-2.5 py-1',
  md: 'px-3 py-1.5',
} as const;

const TEXT_SIZE_STYLES = {
  sm: 'text-xs',
  md: 'text-sm',
} as const;

const ChipComponent: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  size = 'md',
  className = '',
  variant = 'none',
}) => {

  // Memoize style calculations
  const baseStyles = useMemo(() => `rounded-full border ${SIZE_STYLES[size]}`, [size]);

  const variantStyles = useMemo(() => {
    if (variant === 'both') return 'bg-green-500 border-green-500';
    if (variant === 'mine') return 'bg-primary-500 border-primary-500';
    if (variant === 'partner') return 'bg-purple-500 border-purple-500';
    if (variant === 'interest') return 'bg-amber-100 border-amber-300';
    if (variant === 'value') return 'bg-emerald-100 border-emerald-300';
    if (variant === 'location') return 'bg-rose-100 border-rose-300';
    if (variant === 'hometown') return 'bg-violet-100 border-violet-300';
    if (selected) return 'bg-primary-500 border-primary-500';
    return 'bg-white border-neutral-300';
  }, [variant, selected]);

  const textStyles = useMemo(() => {
    if (variant === 'interest') return 'text-amber-700 font-medium';
    if (variant === 'value') return 'text-emerald-700 font-medium';
    if (variant === 'location') return 'text-rose-700 font-medium';
    if (variant === 'hometown') return 'text-violet-700 font-medium';
    if (selected || variant !== 'none') {
      return 'text-white font-medium';
    }
    return 'text-neutral-700';
  }, [variant, selected]);

  const textFontFamily = useMemo(() => {
    // All styled variants use font-medium; default (no variant, not selected) uses regular
    if (variant !== 'none' || selected) return FONTS.medium;
    return FONTS.regular;
  }, [variant, selected]);

  const handlePress = useCallback(() => {
    lightHaptic();
    onPress?.();
  }, [onPress]);

  if (!onPress) {
    return (
      <StyledTouchableOpacity
        disabled
        className={`${baseStyles} ${variantStyles} ${className}`}
        accessibilityRole="text"
        accessibilityLabel={label}
      >
        <StyledText className={`${TEXT_SIZE_STYLES[size]} ${textStyles}`} style={{ fontFamily: textFontFamily }}>
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <StyledText className={`${TEXT_SIZE_STYLES[size]} ${textStyles}`} style={{ fontFamily: textFontFamily }}>
        {label}
      </StyledText>
    </StyledTouchableOpacity>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export const Chip = React.memo(ChipComponent);