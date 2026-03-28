import React, { useState, useEffect, useRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { styled } from 'nativewind';
import { FONTS } from '../../constants/typography';

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

  const borderColor = error
    ? 'border-error'
    : success
    ? 'border-success'
    : isFocused
    ? 'border-primary-400'
    : 'border-neutral-300';

  return (
    <StyledView className={`${containerClassName}`}>
      {label && (
        <StyledText className="text-xs font-medium text-neutral-700 mb-1" style={{ fontFamily: FONTS.medium }}>
          {label}
          {required && <StyledText className="text-red-500"> *</StyledText>}
          {optional && <StyledText className="text-neutral-400"> (optional)</StyledText>}
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
        className={`border rounded-md px-3 py-3 text-base text-neutral-900 ${borderColor} ${className}`}
        placeholderTextColor="#98A2B3"
        style={{
          fontFamily: FONTS.regular,
          lineHeight: 20,
          paddingVertical: 12,
        }}
      />
      {(error || helperText) && (
        <StyledText
          className={`text-xs mt-1 ${error ? 'text-error' : 'text-neutral-600'}`}
        >
          {error || helperText}
        </StyledText>
      )}
    </StyledView>
  );
};