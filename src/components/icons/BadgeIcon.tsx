/**
 * BadgeIcon Component
 *
 * Renders badge SVG icons with optional color override.
 * Uses lazy-loaded registry to avoid blocking app startup.
 *
 * Usage:
 * <BadgeIcon name="meditation-8926645" size={24} />
 * <BadgeIcon name="basketball-5303247" size={20} color="#437FFF" />
 */

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

let cachedRegistry: Record<string, string> | null = null;
let registryPromise: Promise<Record<string, string>> | null = null;

function loadRegistry(): Promise<Record<string, string>> {
  if (cachedRegistry) return Promise.resolve(cachedRegistry);
  if (!registryPromise) {
    registryPromise = import('./badgeIconRegistry').then(m => {
      cachedRegistry = m.BADGE_ICONS;
      return cachedRegistry;
    });
  }
  return registryPromise;
}

interface BadgeIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const BadgeIcon: React.FC<BadgeIconProps> = React.memo(function BadgeIcon({
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
    return <View style={[{ width: size, height: size }, style]} />;
  }

  const svgContent = registry[name];

  if (!svgContent) {
    if (__DEV__) {
      console.warn(`[BadgeIcon] Icon not found: "${name}"`);
    }
    return null;
  }

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

export default BadgeIcon;
