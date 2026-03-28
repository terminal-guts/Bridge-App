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

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Lazy-loaded registries — null until registry loads
let cachedFill: Record<string, string> | null = null;
let cachedOutline: Record<string, string> | null = null;
let registryPromise: Promise<void> | null = null;

function loadRegistry(): Promise<void> {
  if (cachedFill && cachedOutline) return Promise.resolve();
  if (!registryPromise) {
    registryPromise = import('./iconRegistry').then(m => {
      cachedFill = m.FILL_ICONS as any;
      cachedOutline = m.OUTLINE_ICONS as any;
    });
  }
  return registryPromise;
}

// Pre-warm registry at module import time — prevents the placeholder→SVG two-step
// render transition that crashes React 19 + NativeWind v2 styled() HOC reconciliation
loadRegistry();

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

export function EvaIcon({
  name,
  variant = 'outline',
  color = '#667085',
  size = 24,
  style,
}: EvaIconProps) {
  const [ready, setReady] = useState(cachedFill !== null);

  useEffect(() => {
    if (!cachedFill) {
      loadRegistry().then(() => setReady(true));
    }
  }, []);

  if (!ready) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  const resolvedColor = (BRIDGE_COLORS[color as BridgeColor] || color) as string;
  const fileName = variant === 'outline' ? `${name}-outline` : name;
  const registry = variant === 'fill' ? cachedFill : cachedOutline;
  const svgContent = registry ? (registry as any)[fileName] : null;

  if (!svgContent) {
    return null;
  }

  const colorizedSvg = svgContent
    .replace(/fill="(?!none)[^"]*"/g, `fill="${resolvedColor}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${resolvedColor}"`)
    .replace(/^<svg /, `<svg fill="${resolvedColor}" `);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <SvgXml xml={colorizedSvg} width={size} height={size} />
    </View>
  );
}

export default EvaIcon;
