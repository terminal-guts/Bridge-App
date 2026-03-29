import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { FONTS } from '../../constants/typography';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Resolves the correct PlusJakartaSans font file AND weight from NativeWind weight classes.
 * React Native on iOS requires BOTH fontFamily and fontWeight to render the correct variant.
 */
function resolveFontStyle(className: string, defaultFont: string, defaultWeight: string): { fontFamily: string; fontWeight: TextStyle['fontWeight'] } {
  if (className.includes('font-extrabold') || className.includes('font-black'))
    return { fontFamily: FONTS.extraBold, fontWeight: '800' };
  if (className.includes('font-bold'))
    return { fontFamily: FONTS.bold, fontWeight: '700' };
  if (className.includes('font-semibold'))
    return { fontFamily: FONTS.semiBold, fontWeight: '600' };
  if (className.includes('font-medium'))
    return { fontFamily: FONTS.medium, fontWeight: '500' };
  if (className.includes('font-normal') || className.includes('font-light'))
    return { fontFamily: FONTS.regular, fontWeight: '400' };
  return { fontFamily: defaultFont, fontWeight: defaultWeight as TextStyle['fontWeight'] };
}

export const H1: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-2xl text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.semiBold, '600'), style]} {...props}>
    {children}
  </Text>
);

export const H2: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-xl text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.semiBold, '600'), style]} {...props}>
    {children}
  </Text>
);

export const H3: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-lg text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.semiBold, '600'), style]} {...props}>
    {children}
  </Text>
);

export const Body: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-base text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.regular, '400'), style]} {...props}>
    {children}
  </Text>
);

export const BodySmall: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-sm text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.regular, '400'), style]} {...props}>
    {children}
  </Text>
);

export const Label: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-xs text-neutral-700 ${className}`} style={[resolveFontStyle(className, FONTS.medium, '500'), style]} {...props}>
    {children}
  </Text>
);

export const Caption: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-xs text-neutral-600 ${className}`} style={[resolveFontStyle(className, FONTS.regular, '400'), style]} {...props}>
    {children}
  </Text>
);

export const Display: React.FC<TypographyProps> = ({ children, className = '', style, ...props }) => (
  <Text className={`text-3xl text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.bold, '700'), style]} {...props}>
    {children}
  </Text>
);
