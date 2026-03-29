/**
 * EvaIcon Component
 *
 * Renders Eva Icons with Bridge color scheme integration.
 * The icon registry (256KB) is lazy-loaded on first render to avoid
 * blocking app startup with icon data parsing.
 *
 * Usage:
 * <EvaIcon name="arrow-back" variant="outline" color="primary" size={24} />
 * <EvaIcon name="checkmark" variant="outline" color="#FF7A5C" size={20} />
 */

import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Synchronous import — icons are available immediately on first render.
// The lazy-load approach caused blank placeholders when the async import
// hadn't resolved before components rendered.
import { FILL_ICONS, OUTLINE_ICONS } from './iconRegistry';
import { COLORS } from '../../theme/colors';

// Bridge color scheme mapping
const BRIDGE_COLORS = {
  primary: '#5B8FFF',
  'primary-light': '#7BA8FF',
  'primary-dark': '#3D72E8',
  text: '#2A1F1A',
  'text-secondary': '#5A524A',
  'text-light': '#736B63',
  background: '#FDFAF7',
  'background-cream': '#F8F4F0',
  coral: '#FF7A5C',
  peach: '#FF9966',
  romantic: '#FF8B7C',
  success: '#52C797',
  warning: '#F59E0B',
  error: '#FF7A5C',
  white: '#FFFFFF',
  black: '#000000',
  neutral: '#A8A099',
  'neutral-light': '#E0D7CE',
  'neutral-dark': '#3D362F',
} as const;

type BridgeColor = keyof typeof BRIDGE_COLORS;

interface EvaIconProps {
  name: string;
  variant?: 'fill' | 'outline';
  color?: BridgeColor | string;
  size?: number;
  style?: any;
}

// Module-level cache for colorized SVG strings.
// The same icon+color combo renders hundreds of times across the app,
// so caching avoids running 3 regex replacements on every render.
const colorizedSvgCache = new Map<string, string>();

function getColorizedSvg(cacheKey: string, svgContent: string, resolvedColor: string): string {
  const cached = colorizedSvgCache.get(cacheKey);
  if (cached) return cached;

  const result = svgContent
    .replace(/fill="(?!none)[^"]*"/g, `fill="${resolvedColor}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${resolvedColor}"`)
    .replace(/^<svg /, `<svg fill="${resolvedColor}" `);

  colorizedSvgCache.set(cacheKey, result);
  return result;
}

export function EvaIcon({
  name,
  variant = 'outline',
  color = COLORS.navInactiveIcon,
  size = 24,
  style,
}: EvaIconProps) {
  const resolvedColor = (BRIDGE_COLORS[color as BridgeColor] || color) as string;
  const fileName = variant === 'outline' ? `${name}-outline` : name;
  const registry = variant === 'fill' ? FILL_ICONS : OUTLINE_ICONS;
  const svgContent = (registry as any)[fileName] ?? null;

  if (!svgContent) {
    return null;
  }

  const cacheKey = `${name}-${variant}-${resolvedColor}`;
  const colorizedSvg = getColorizedSvg(cacheKey, svgContent, resolvedColor);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <SvgXml xml={colorizedSvg} width={size} height={size} />
    </View>
  );
}

export default EvaIcon;
