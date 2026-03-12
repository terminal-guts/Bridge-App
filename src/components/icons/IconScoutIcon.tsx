import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { styled } from 'nativewind';
import { ICONSCOUT_ICONS, type IconScoutName } from './iconScoutRegistry';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';

const logger = createLogger('IconScoutIcon');
const StyledView = styled(View);

function getThemeColor(colorPath: string): string | undefined {
  if (!colorPath) return undefined;
  if (colorPath in COLORS) return (COLORS as any)[colorPath];
  const parts = colorPath.split('.');
  if (parts.length === 2 && parts[0] in COLORS) {
    const parent = (COLORS as any)[parts[0]];
    if (typeof parent === 'object' && parent !== null && parts[1] in parent) {
      return parent[parts[1]];
    }
  }
  return undefined;
}

interface IconScoutIconProps {
  name: string;
  color?: string;
  size?: number;
  style?: any;
}

export const IconScoutIcon = React.memo(function IconScoutIcon({
  name,
  color,
  size = 24,
  style,
}: IconScoutIconProps) {
  const normalizedName = name.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
  const svgContent = ICONSCOUT_ICONS[normalizedName] || ICONSCOUT_ICONS[normalizedName.replace('comminity', 'community')];

  if (!svgContent) {
    logger.warn(`[IconScoutIcon] Icon not found in registry: ${name} (normalized: ${normalizedName})`);
    return null;
  }

  let colorizedSvg = svgContent;

  // PR Comment: "IconScoutIcon preserves multi-color SVGs when no color passed"
  if (color) {
    const resolvedColor = getThemeColor(color) || color;
    colorizedSvg = svgContent
      .replace(/fill="[^"]*"/gi, (match) => {
        if (match.toLowerCase() === 'fill="none"') return match;
        return `fill="${resolvedColor}"`;
      })
      .replace(/stroke="[^"]*"/gi, (match) => {
        if (match.toLowerCase() === 'stroke="none"') return match;
        return `stroke="${resolvedColor}"`;
      });
  }

  return (
    <StyledView style={[{ width: size, height: size }, style]}>
      <SvgXml xml={colorizedSvg} width={size} height={size} />
    </StyledView>
  );
});

export default IconScoutIcon;
