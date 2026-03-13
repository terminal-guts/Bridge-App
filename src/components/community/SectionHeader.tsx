/**
 * SectionHeader Component
 *
 * Displays a section header with:
 * - Colored dot indicator (green/yellow/red)
 * - Section title
 * - Compatibility count (e.g., "2/3")
 */

import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { SectionCompatibility } from '../../utils/proposalMatching';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

const StyledView = styled(View);
const StyledText = styled(Text);

interface SectionHeaderProps {
  title: string;
  compatibility?: SectionCompatibility;
}

export function SectionHeader({ title, compatibility }: SectionHeaderProps) {
  // Determine dot color based on compatibility status
  const getDotColor = (): string => {
    if (!compatibility) return COLORS.text.light; // Grey if no compatibility data

    switch (compatibility.status) {
      case 'high':
        return COLORS.emerald; // Green
      case 'medium':
        return COLORS.warning.icon; // Yellow
      case 'low':
        return COLORS.error; // Red
      default:
        return COLORS.text.light; // Grey
    }
  };

  const dotColor = getDotColor();

  return (
    <StyledView style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    }}>
      {/* Colored Dot */}
      <StyledView style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: dotColor,
        marginRight: 8,
      }} />

      {/* Section Title */}
      <StyledText style={{
        fontSize: FONT_SIZES.base,
        fontWeight: '700',
        fontFamily: FONTS.bold,
        color: COLORS.text.muted,
        flex: 1,
      }}>
        {title}
      </StyledText>

      {/* Compatibility Count */}
      {compatibility && (
        <StyledText style={{
          fontSize: FONT_SIZES.md,
          fontWeight: '600',
          fontFamily: FONTS.semiBold,
          color: COLORS.text.light,
        }}>
          ({compatibility.compatible}/{compatibility.total})
        </StyledText>
      )}
    </StyledView>
  );
}

export default SectionHeader;
