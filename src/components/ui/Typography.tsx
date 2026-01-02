import React from 'react';
import { Text, TextProps } from 'react-native';
import { styled } from 'nativewind';

const StyledText = styled(Text);

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  className?: string;
}

export const H1: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-2xl font-semibold text-neutral-900 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const H2: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-xl font-semibold text-neutral-900 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const H3: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-lg font-semibold text-neutral-900 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const Body: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-base text-neutral-900 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const BodySmall: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-sm text-neutral-900 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const Label: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-xs font-medium text-neutral-700 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const Caption: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-xs text-neutral-600 ${className}`} {...props}>
    {children}
  </StyledText>
);

export const Display: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
  <StyledText className={`text-3xl font-bold text-neutral-900 ${className}`} {...props}>
    {children}
  </StyledText>
);