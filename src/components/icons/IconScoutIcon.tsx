/**
 * IconScoutIcon Component
 *
 * Renders premium IconScout SVG icons with optional color override.
 * When no color is provided, preserves the original multi-color SVG.
 *
 * Usage:
 * <IconScoutIcon name="tennis" size={24} />                    // original colors
 * <IconScoutIcon name="hiking" size={20} color="#437FFF" />    // monochrome override
 */

import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICONSCOUT_ICONS } from './iconScoutRegistry';

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
  const svgContent = ICONSCOUT_ICONS[name];

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
