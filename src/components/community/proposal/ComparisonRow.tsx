/**
 * ComparisonRow Component
 *
 * Displays a single attribute comparison between two people with:
 * - Subtle background tinting (teal for left, orange for right)
 * - Match status icon in the center
 * - Attribute label
 */

import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { MatchStatusIcon } from '../match/MatchStatusIcon';
import { MatchResult } from '../../../utils/proposalMatching';

const StyledView = styled(View);
const StyledText = styled(Text);

interface ComparisonRowProps {
  label: string;
  result: MatchResult;
  isLast?: boolean;
}

export function ComparisonRow({ label, result, isLast = false }: ComparisonRowProps) {
  return (
    <StyledView style={{ marginBottom: isLast ? 0 : 12 }}>
      {/* Label */}
      <StyledText style={{
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {label}
      </StyledText>

      {/* Comparison Row */}
      <StyledView style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left Value (Person A - Purple tint) */}
        <StyledView style={{
          flex: 1,
          backgroundColor: 'rgba(139, 92, 246, 0.08)', // Purple tint
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          marginRight: 8,
        }}>
          <StyledText style={{
            fontSize: 14,
            color: '#1E293B',
            fontWeight: '500',
            textAlign: 'center',
          }}>
            {result.leftValue}
          </StyledText>
        </StyledView>

        {/* Status Icon */}
        <MatchStatusIcon status={result.status} size={20} />

        {/* Right Value (Person B - Teal tint) */}
        <StyledView style={{
          flex: 1,
          backgroundColor: 'rgba(20, 184, 166, 0.08)', // Teal tint
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          marginLeft: 8,
        }}>
          <StyledText style={{
            fontSize: 14,
            color: '#1E293B',
            fontWeight: '500',
            textAlign: 'center',
          }}>
            {result.rightValue}
          </StyledText>
        </StyledView>
      </StyledView>

      {/* Optional Details */}
      {result.details && (
        <StyledText style={{
          fontSize: 11,
          color: '#64748B',
          marginTop: 4,
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          {result.details}
        </StyledText>
      )}
    </StyledView>
  );
}

export default ComparisonRow;
