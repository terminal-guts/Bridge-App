import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { FONTS } from '../../constants/typography';
import { IconScoutIcon } from '../icons';

interface SimpleChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  iconName?: string;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);
const StyledView = styled(View);

// Ultra-simplified chip with minimal overhead - NO haptics, NO variant logic
const SimpleChipComponent: React.FC<SimpleChipProps> = ({ label, selected, onPress, iconName }) => {
  return (
    <StyledTouchableOpacity
      onPress={onPress}
      activeOpacity={1}
      delayPressIn={0}
      className={`px-3 py-2 rounded-full border ${
        selected
          ? 'bg-primary-500 border-primary-500'
          : 'bg-white border-neutral-300'
      }`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <StyledView className="flex-row items-center">
        {iconName && (
          <IconScoutIcon
            name={iconName}
            size={14}
            style={{ marginRight: 6 }}
            color={selected ? '#FFF' : undefined}
          />
        )}
        <StyledText
          className={`text-sm ${selected ? 'text-white font-medium' : 'text-neutral-700'}`}
          style={{ fontFamily: selected ? FONTS.medium : FONTS.regular }}
        >
          {label}
        </StyledText>
      </StyledView>
    </StyledTouchableOpacity>
  );
};

// Memoize with custom comparison to prevent re-renders
export const SimpleChip = React.memo(SimpleChipComponent, (prev, next) => {
  return prev.selected === next.selected && prev.label === next.label;
});
