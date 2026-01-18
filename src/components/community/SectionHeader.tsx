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

const StyledView = styled(View);
const StyledText = styled(Text);

interface SectionHeaderProps {
  title: string;
  compatibility?: SectionCompatibility;
}

export function SectionHeader({ title, compatibility }: SectionHeaderProps) {
  // Determine dot color based on compatibility status
  const getDotColor = (): string => {
    if (!compatibility) return '#94A3B8'; // Grey if no compatibility data

    switch (compatibility.status) {
      case 'high':
        return '#10B981'; // Green
      case 'medium':
        return '#F59E0B'; // Yellow
      case 'low':
        return '#EF4444'; // Red
      default:
        return '#94A3B8'; // Grey
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
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        flex: 1,
      }}>
        {title}
      </StyledText>

      {/* Compatibility Count */}
      {compatibility && (
        <StyledText style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#94A3B8',
        }}>
          ({compatibility.compatible}/{compatibility.total})
        </StyledText>
      )}
    </StyledView>
  );
}

export default SectionHeader;
