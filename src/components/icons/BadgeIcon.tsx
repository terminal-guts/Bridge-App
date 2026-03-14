/**
 * BadgeIcon Component
 *
 * Renders badge SVG icons with optional color override.
 *
 * Usage:
 * <BadgeIcon name="meditation-8926645" size={24} />
 * <BadgeIcon name="basketball-5303247" size={20} color="#437FFF" />
 */

import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BADGE_ICONS } from './badgeIconRegistry';

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
  const svgContent = BADGE_ICONS[name];

  if (!svgContent) {
    if (__DEV__) {
      console.warn(`[BadgeIcon] Icon not found: "${name}"`);
    }
    return <View style={[{ width: size, height: size }, style]} />;
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
