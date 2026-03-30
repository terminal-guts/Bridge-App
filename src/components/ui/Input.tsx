import React, { useState, useEffect, useRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { styled } from 'nativewind';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  className?: string;
  containerClassName?: string;
}

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledTextInput = styled(TextInput) as typeof TextInput;

export const Input: React.FC<InputProps> = ({
  label,
  required,
  optional,
  error,
  success,
  helperText,
  className = '',
  containerClassName = '',
  onFocus,
  onBlur,
  autoFocus,
  autoCapitalize,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      // Focus immediately to show keyboard right when page loads
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RN event type varies across versions
  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RN event type varies across versions
  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColorValue = error
    ? COLORS.error
    : success
    ? COLORS.success
    : isFocused
    ? COLORS.primaryAccent
    : COLORS.border;

  return (
    <StyledView className={`${containerClassName}`}>
      {label && (
        <StyledText
          style={{
            fontFamily: FONTS.medium,
            fontSize: FONT_SIZES.base,
            lineHeight: LINE_HEIGHTS.base,
            color: COLORS.text.primary,
            marginBottom: 6,
          }}
        >
          {label}
          {required && <StyledText style={{ color: COLORS.error }}> *</StyledText>}
          {optional && <StyledText style={{ color: COLORS.text.tertiary }}> (optional)</StyledText>}
        </StyledText>
      )}
      <StyledTextInput
        ref={inputRef}
        accessibilityLabel={props.accessibilityLabel || label || props.placeholder}
        accessibilityRole="text"
        {...props}
        autoFocus={false}
        autoCapitalize={autoCapitalize ?? 'none'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`rounded-lg px-3 py-3 ${className}`}
        placeholderTextColor={COLORS.text.tertiary}
        style={{
          fontFamily: FONTS.regular,
          fontSize: FONT_SIZES.lg,
          lineHeight: LINE_HEIGHTS.lg,
          paddingVertical: 12,
          color: COLORS.text.primary,
          borderWidth: 1.5,
          borderColor: borderColorValue,
          borderRadius: 12,
          backgroundColor: COLORS.card,
        }}
      />
      {(error || helperText) && (
        <StyledText
          style={{
            fontFamily: FONTS.regular,
            fontSize: FONT_SIZES.sm,
            lineHeight: LINE_HEIGHTS.sm,
            color: error ? COLORS.error : COLORS.text.secondary,
            marginTop: 4,
          }}
        >
          {error || helperText}
        </StyledText>
      )}
    </StyledView>
  );
};