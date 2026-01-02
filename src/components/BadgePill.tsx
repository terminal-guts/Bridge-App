import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { styled } from 'nativewind';
import { Body } from './ui/Typography';

interface BadgePillProps {
  icon: string;
  label: string;
  className?: string;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * BadgePill Component
 *
 * Compact circular badge with icon only
 * Long-press to see badge name
 * Used in Friend Cards to display achievements and status
 */
export const BadgePill: React.FC<BadgePillProps> = ({
  icon,
  label,
  className = '',
}) => {
  const handleLongPress = () => {
    Alert.alert('Badge', label);
  };

  return (
    <StyledTouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      className={`items-center ${className}`}
    >
      {/* Circular badge container - smaller */}
      <StyledView className="w-8 h-8 bg-primary-50 rounded-full items-center justify-center border border-primary-100">
        <Body className="text-sm">{icon}</Body>
      </StyledView>
    </StyledTouchableOpacity>
  );
};
