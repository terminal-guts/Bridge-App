import React from 'react';
import { TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Body } from './Typography';

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const StyledTouchableOpacity = styled(TouchableOpacity);

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected,
  onPress,
}) => (
  <StyledTouchableOpacity
    onPress={onPress}
    className={`px-4 py-3 rounded-lg border mr-2 mb-2 ${
      selected
        ? 'bg-primary-500 border-primary-500'
        : 'bg-white border-neutral-300'
    }`}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
  >
    <Body className={selected ? 'text-white font-medium' : 'text-neutral-700'}>
      {label}
    </Body>
  </StyledTouchableOpacity>
);
