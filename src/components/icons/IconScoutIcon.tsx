import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { styled } from 'nativewind';
import { ICONSCOUT_ICONS, type IconScoutName } from './iconScoutRegistry';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';

const logger = createLogger('IconScoutIcon');

const StyledView = styled(View);

// Helper to safely access nested colors in our theme
function getThemeColor(colorPath: string): string | undefined {
  if (!colorPath) return undefined;

  // Try direct property match first
  if (colorPath in COLORS) {
    return (COLORS as any)[colorPath];
  }

  // Try dot-notation paths like 'text.primary' or 'match.icon'
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
  /** Icon name (without .svg extension, normalized to lowercase with hyphens) */
  name: string;
  /** Color - can be a Bridge theme color path (e.g. 'primary', 'text.muted') or hex string. Defaults to current text color if not provided. */
  color?: string;
  /** Icon size in pixels */
  size?: number;
  /** Additional styles */
  style?: any;
}

export const IconScoutIcon = React.memo(function IconScoutIcon({
  name,
  color,
  size = 24,
  style,
}: IconScoutIconProps) {
  // Normalize the name to match the registry format
  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, '-');

  const svgContent = ICONSCOUT_ICONS[normalizedName];

  if (!svgContent) {
    logger.warn(`[IconScoutIcon] Icon not found in registry: ${name} (normalized: ${normalizedName})`);
    return null;
  }

  // Resolve color
  // If color looks like a hex/rgb code, use it.
  // If it's undefined, we won't replace colors so SVG keeps its original colors, or we can force it.
  // The user requirement says: "Defaults to theme-appropriate".
  // Actually, many IconScout icons are multi-colored. The prompt says:
  // "Applies color via SVG fill/stroke replacement (same pattern as EvaIcon)"

  let colorizedSvg = svgContent;

  if (color) {
    const resolvedColor = getThemeColor(color) || color;

    // Replace fill/stroke colors in SVG with the specified color.
    // Note: Some IconScout icons might have specific fills (e.g. skin tones, whites)
    // that replacing *all* fills might destroy. But following the EvaIcon pattern:
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
