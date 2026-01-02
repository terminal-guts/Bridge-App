/**
 * EvaIcon Component
 *
 * Renders Eva Icons with Bridge color scheme integration.
 * Uses SVG files from assets/eva-icons folder.
 *
 * Usage:
 * <EvaIcon name="arrow-back" variant="outline" color="primary" size={24} />
 * <EvaIcon name="checkmark" variant="fill" color="#FF7A5C" size={20} />
 */

import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { styled } from 'nativewind';
import { FILL_ICONS, OUTLINE_ICONS } from './iconRegistry';

const StyledView = styled(View);

// Bridge color scheme mapping
const BRIDGE_COLORS = {
  // Primary
  primary: '#5B8FFF',
  'primary-light': '#7BA8FF',
  'primary-dark': '#3D72E8',

  // Neutral text colors
  text: '#2A1F1A',
  'text-secondary': '#5A524A',
  'text-light': '#736B63',

  // Backgrounds
  background: '#FDFAF7',
  'background-cream': '#F8F4F0',

  // Accent colors
  coral: '#FF7A5C',
  peach: '#FF9966',
  romantic: '#FF8B7C',

  // Semantic
  success: '#52C797',
  warning: '#F59E0B',
  error: '#FF7A5C',

  // Common UI colors
  white: '#FFFFFF',
  black: '#000000',
  neutral: '#A8A099',
  'neutral-light': '#E0D7CE',
  'neutral-dark': '#3D362F',
} as const;

type BridgeColor = keyof typeof BRIDGE_COLORS;

interface EvaIconProps {
  /** Icon name (without file extension, e.g., "arrow-back" or "checkmark") */
  name: string;
  /** Icon variant - fill or outline */
  variant?: 'fill' | 'outline';
  /** Color - can be a Bridge color name or hex color */
  color?: BridgeColor | string;
  /** Icon size in pixels */
  size?: number;
  /** Additional styles */
  style?: any;
}

export function EvaIcon({
  name,
  variant = 'outline',
  color = 'text',
  size = 24,
  style,
}: EvaIconProps) {
  // Resolve color - check if it's a Bridge color name first
  const resolvedColor = (BRIDGE_COLORS[color as BridgeColor] || color) as string;

  // Construct the icon filename
  const fileName = variant === 'outline' ? `${name}-outline` : name;

  // For React Native, we'll need to use require to load SVG content
  // Since we can't dynamically require files, we'll need to create an icon registry
  // For now, let's create a placeholder that shows the approach

  // Load SVG from assets (this will be implemented via icon registry)
  const svgContent = getIconSvg(fileName, variant);

  if (!svgContent) {
    console.warn(`[EvaIcon] Icon not found: ${name} (${variant})`);
    return null;
  }

  // Replace fill/stroke colors in SVG with the specified color
  const colorizedSvg = svgContent
    .replace(/fill="[^"]*"/g, `fill="${resolvedColor}"`)
    .replace(/stroke="[^"]*"/g, `stroke="${resolvedColor}"`);

  return (
    <StyledView style={[{ width: size, height: size }, style]}>
      <SvgXml xml={colorizedSvg} width={size} height={size} />
    </StyledView>
  );
}

// Get icon SVG from registry
function getIconSvg(fileName: string, variant: 'fill' | 'outline'): string | null {
  const registry = variant === 'fill' ? FILL_ICONS : OUTLINE_ICONS;
  return (registry as any)[fileName] || null;
}

export default EvaIcon;
