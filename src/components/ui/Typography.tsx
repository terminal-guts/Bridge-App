import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

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

export const H1: React.FC<TypographyProps> = ({ children, className = '', style, maxFontSizeMultiplier = 1.6, ...props }) => (
  // maxFontSizeMultiplier cap at 1.6: at AX3+ Dynamic Type, unrestricted scaling
  // pushes hero/page headlines off-screen. 1.6 still respects accessibility.
  <Text className={`text-2xl text-neutral-900 ${className}`} style={[resolveFontStyle(className, FONTS.semiBold, '600'), style]} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props}>
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

/**
 * ScreenTitle — locked style for main tab screen headers (Community, Match, Your Profile).
 * DO NOT override fontFamily, fontWeight, fontSize, or lineHeight. This is the single source
 * of truth for tab headers to prevent drift between screens.
 */
export const SCREEN_TITLE_STYLE: TextStyle = {
  fontFamily: FONTS.bold,
  fontWeight: '700',
  fontSize: FONT_SIZES['5xl'],
  lineHeight: LINE_HEIGHTS['5xl'],
  color: COLORS.text.primary,
  letterSpacing: -0.5,
} as const;

export const ScreenTitle: React.FC<TypographyProps> = ({ children, style, maxFontSizeMultiplier = 1.6, ...props }) => (
  // maxFontSizeMultiplier cap at 1.6: at AX3+ Dynamic Type, unrestricted scaling
  // pushes tab screen titles off-screen. 1.6 still respects accessibility.
  <Text style={[SCREEN_TITLE_STYLE, style]} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier} {...props}>
    {children}
  </Text>
);
