import React from 'react';
import { Text, TextProps } from 'react-native';
import { FONTS } from '../../constants/typography';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Resolves the correct PlusJakartaSans font file from NativeWind weight classes.
 * NativeWind's font-bold/font-semibold set fontWeight but not fontFamily,
 * so we need to map className → fontFamily explicitly.
 */
function resolveFontFamily(className: string, defaultFont: string): string {
  if (className.includes('font-extrabold') || className.includes('font-black')) return FONTS.extraBold;
  if (className.includes('font-bold')) return FONTS.bold;
  if (className.includes('font-semibold')) return FONTS.semiBold;
  if (className.includes('font-medium')) return FONTS.medium;
  if (className.includes('font-normal') || className.includes('font-light')) return FONTS.regular;
  return defaultFont;
}

export const H1: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-2xl text-neutral-900 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.semiBold) }, style]} {...props}>
    {children}
  </Text>
);

export const H2: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-xl text-neutral-900 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.semiBold) }, style]} {...props}>
    {children}
  </Text>
);

export const H3: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-lg text-neutral-900 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.semiBold) }, style]} {...props}>
    {children}
  </Text>
);

export const Body: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-base text-neutral-900 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.regular) }, style]} {...props}>
    {children}
  </Text>
);

export const BodySmall: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-sm text-neutral-900 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.regular) }, style]} {...props}>
    {children}
  </Text>
);

export const Label: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-xs text-neutral-700 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.medium) }, style]} {...props}>
    {children}
  </Text>
);

export const Caption: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-xs text-neutral-600 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.regular) }, style]} {...props}>
    {children}
  </Text>
);

export const Display: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-3xl text-neutral-900 ${className}`} style={[{ fontFamily: resolveFontFamily(className, FONTS.bold) }, style]} {...props}>
    {children}
  </Text>
);
