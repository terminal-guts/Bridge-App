/**
 * IconScoutIcon Component
 *
 * Renders premium IconScout SVG icons with optional color override.
 * When no color is provided, preserves the original multi-color SVG.
 *
 * The icon registry (412KB) is lazy-loaded on first render to avoid
 * blocking app startup with icon data parsing.
 *
 * Usage:
 * <IconScoutIcon name="tennis" size={24} />                    // original colors
 * <IconScoutIcon name="hiking" size={20} color="#437FFF" />    // monochrome override
 */

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Lazy-loaded registry — null until first IconScoutIcon renders
let cachedRegistry: Record<string, string> | null = null;
let registryPromise: Promise<Record<string, string>> | null = null;

function loadRegistry(): Promise<Record<string, string>> {
  if (cachedRegistry) return Promise.resolve(cachedRegistry);
  if (!registryPromise) {
    registryPromise = import('./iconScoutRegistry').then(m => {
      cachedRegistry = m.ICONSCOUT_ICONS;
      return cachedRegistry;
    });
  }
  return registryPromise;
}

interface IconScoutIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const IconScoutIcon: React.FC<IconScoutIconProps> = React.memo(function IconScoutIcon({
  name,
  size = 24,
  color,
  style,
}) {
  const [registry, setRegistry] = useState<Record<string, string> | null>(cachedRegistry);

  useEffect(() => {
    if (!cachedRegistry) {
      loadRegistry().then(setRegistry);
    }
  }, []);

  if (!registry) {
    // Return empty placeholder while registry loads (typically <50ms)
    return <View style={[{ width: size, height: size }, style]} />;
  }

  const svgContent = registry[name];

  if (!svgContent) {
    if (__DEV__) {
      console.warn(`[IconScoutIcon] Icon not found: "${name}"`);
    }
    return null;
  }

  // Only apply color override when explicitly provided
  let xml = svgContent;
  if (color) {
    xml = xml
      .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
      .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`);
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
});

export default IconScoutIcon;
