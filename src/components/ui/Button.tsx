import React from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { lightHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { AnimatedPressable } from './AnimatedPressable';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

const StyledText = styled(Text);

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  accessibilityLabel,
}) => {
  const label = accessibilityLabel || (typeof children === 'string' ? children : undefined);

  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3.5',
  };

  const variantStyles = {
    primary: '', // Color applied via inline style for exact brand match
    secondary: 'bg-transparent border border-neutral-300',
    ghost: 'bg-transparent',
    destructive: 'bg-coral-500',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-base',
  };

  const textVariantStyles = {
    primary: 'text-white font-bold',
    secondary: 'text-neutral-900 font-semibold',
    ghost: 'text-neutral-700 font-medium',
    destructive: 'text-white font-semibold',
  };

  const textFontFamily = {
    primary: FONTS.bold,
    secondary: FONTS.semiBold,
    ghost: FONTS.medium,
    destructive: FONTS.semiBold,
  };

  const handlePress = () => {
    lightHaptic();
    onPress();
  };

  const primaryBgStyle = variant === 'primary'
    ? { backgroundColor: disabled ? COLORS.primaryButtonDisabled : COLORS.primaryButton }
    : undefined;

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled || loading}
      scale="standard"
      className={`rounded-xl items-center justify-center ${fullWidth ? 'w-full' : ''} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      style={[{ minHeight: 44 }, primaryBgStyle]}
      accessibilityRole="button"
      accessibilityLabel={loading ? 'Loading' : label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? 'white' : COLORS.navInactiveIcon}
          size="small"
        />
      ) : (
        <StyledText className={`${textSizeStyles[size]} ${textVariantStyles[variant]}`} style={{ fontFamily: textFontFamily[variant] }}>
          {children}
        </StyledText>
      )}
    </AnimatedPressable>
  );
};
