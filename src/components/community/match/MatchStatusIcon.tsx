/**
 * MatchStatusIcon Component
 *
 * Displays compatibility status between two people using a 4-state system:
 * 1. Both Happy (Green checkmark)
 * 2. One Happy (Yellow warning with gradient toward happy person)
 * 3. Neither Happy (Red X)
 * 4. Unknown/Hidden (Grey circle)
 */

import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { MatchStatus } from '../../../utils/proposalMatching';
import { EvaIcon } from '../../icons';

const StyledView = styled(View);

interface MatchStatusIconProps {
  status: MatchStatus;
  size?: number;
}

export function MatchStatusIcon({ status, size = 20 }: MatchStatusIconProps) {
  switch (status) {
    case 'both_happy':
      return (
        <StyledView style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#10B981',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <EvaIcon name="checkmark" variant="outline" size={size} color="#FFFFFF" />
        </StyledView>
      );

    case 'left_happy':
      // Yellow warning with gradient toward left (purple side)
      return (
        <StyledView style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}>
          <LinearGradient
            colors={['#8B5CF6', '#F59E0B']} // Purple to yellow
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EvaIcon name="alert-triangle" variant="outline" size={size} color="#FFFFFF" />
          </LinearGradient>
        </StyledView>
      );

    case 'right_happy':
      // Yellow warning with gradient toward right (teal side)
      return (
        <StyledView style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}>
          <LinearGradient
            colors={['#F59E0B', '#14B8A6']} // Yellow to teal
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EvaIcon name="alert-triangle" variant="outline" size={size} color="#FFFFFF" />
          </LinearGradient>
        </StyledView>
      );

    case 'neither_happy':
      return (
        <StyledView style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#EF4444',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <EvaIcon name="close" variant="outline" size={size} color="#FFFFFF" />
        </StyledView>
      );

    case 'unknown':
    default:
      return (
        <StyledView style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#94A3B8',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <EvaIcon name="minus" variant="outline" size={size} color="#FFFFFF" />
        </StyledView>
      );
  }
}

export default MatchStatusIcon;
