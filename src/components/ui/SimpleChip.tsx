import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';

import { RenderIcon, type IconDef } from '../../utils/emojiMaps';

interface SimpleChipProps {
  iconDef?: IconDef;
  label: string;
  selected: boolean;
  onPress: () => void;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

// Ultra-simplified chip with minimal overhead - NO haptics, NO variant logic
const SimpleChipComponent: React.FC<SimpleChipProps> = ({ label, selected, onPress, iconDef }) => {
  return (
    <StyledTouchableOpacity
      onPress={onPress}
      activeOpacity={1}
      delayPressIn={0}
      className={`px-3 py-2 rounded-full border mr-2 mb-2 ${
        selected
          ? 'bg-primary-500 border-primary-500'
          : 'bg-white border-neutral-300'
      }`}
    >
      <StyledText className={`text-sm ${selected ? 'text-white font-medium' : 'text-neutral-700'}`}>
        {label}
      </StyledText>
    </StyledTouchableOpacity>
  );
};

// Memoize with custom comparison to prevent re-renders
export const SimpleChip = React.memo(SimpleChipComponent, (prev, next) => {
  return prev.selected === next.selected && prev.label === next.label;
});
