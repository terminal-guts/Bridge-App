/**
 * Profile Completeness Card
 *
 * Displays profile completion status with progress bar and suggestions.
 * Helps users understand what information is missing.
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { H3, Body, Card } from './ui';
import { ProfileCompleteness } from '../utils/profileCompleteness';

interface ProfileCompletenessCardProps {
  completeness: ProfileCompleteness;
  onPress?: () => void;
  onFieldPress?: (fieldName: string) => void;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const ProfileCompletenessCard: React.FC<ProfileCompletenessCardProps> = ({
  completeness,
  onPress,
  onFieldPress,
}) => {
  const { percentage, suggestions, missingFields } = completeness;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 90) return '#10B981'; // Green
    if (percentage >= 60) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const getBackgroundColor = () => {
    if (percentage >= 90) return '#D1FAE5'; // Light green
    if (percentage >= 60) return '#FEF3C7'; // Light orange
    return '#FEE2E2'; // Light red
  };

  const getIcon = () => {
    if (percentage >= 90) return 'checkmark-circle';
    if (percentage >= 60) return 'time';
    return 'alert-circle';
  };

  const color = getColor();
  const backgroundColor = getBackgroundColor();
  const icon = getIcon();

  // Only show card if profile is not 100% complete
  if (percentage >= 100) {
    return null;
  }

  return (
    <StyledTouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Card elevation={3} variant="elevated" className="mb-4" style={{ backgroundColor }}>
        <StyledView className="flex-row items-center mb-3">
          <StyledView
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              shadowColor: color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Ionicons name={icon as any} size={24} color={color} />
          </StyledView>
          <StyledView className="flex-1 ml-3">
            <H3 style={{ color }}>Profile {percentage}% Complete</H3>
          </StyledView>
          {onPress && (
            <Ionicons name="chevron-forward" size={20} color={color} />
          )}
        </StyledView>

        {/* Progress Bar */}
        <StyledView
          className="bg-white rounded-full h-2 mb-2 overflow-hidden"
          style={{
            shadowColor: color,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <StyledView
            className="h-full rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </StyledView>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <StyledView className="mb-3">
            <Body style={{ color: color + 'DD' }} className="font-medium mb-2">
              {suggestions[0]}
            </Body>
            {missingFields.length > 0 && (
              <StyledView className="space-y-1">
                {missingFields.slice(0, 3).map((field, index) => (
                  <StyledTouchableOpacity
                    key={field.field}
                    className="flex-row items-center py-1"
                    onPress={() => onFieldPress?.(field.field)}
                    activeOpacity={onFieldPress ? 0.6 : 1}
                  >
                    <StyledView
                      className="w-1.5 h-1.5 rounded-full mr-2"
                      style={{ backgroundColor: color + '99' }}
                    />
                    <Body style={{ color: color + 'BB' }} className="text-sm flex-1">
                      {field.label}
                    </Body>
                    {onFieldPress && (
                      <Ionicons name="chevron-forward" size={14} color={color + 'AA'} />
                    )}
                  </StyledTouchableOpacity>
                ))}
                {missingFields.length > 3 && (
                  <StyledTouchableOpacity
                    onPress={onPress}
                    activeOpacity={onPress ? 0.6 : 1}
                    className="mt-1"
                  >
                    <Body style={{ color: color + '99' }} className="text-xs">
                      +{missingFields.length - 3} more →
                    </Body>
                  </StyledTouchableOpacity>
                )}
              </StyledView>
            )}
          </StyledView>
        )}

        {/* Requirement Notice - Prominent callout */}
        <StyledView
          className="bg-white/80 rounded-lg p-3 border-l-4"
          style={{ borderLeftColor: color }}
        >
          <StyledView className="flex-row items-start">
            <Ionicons name="lock-closed" size={16} color={color} style={{ marginTop: 2, marginRight: 8 }} />
            <StyledView className="flex-1">
              <Body className="text-neutral-700 text-xs font-semibold mb-1">
                100% Required to Enter Matching Pool
              </Body>
              <Body className="text-neutral-600 text-xs leading-relaxed">
                Complete all mandatory fields (marked with <Body className="text-red-500">*</Body>) to unlock the matching pool and start connecting with potential matches.
              </Body>
            </StyledView>
          </StyledView>
        </StyledView>
      </Card>
    </StyledTouchableOpacity>
  );
};
