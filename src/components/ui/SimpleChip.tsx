import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

interface SimpleChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

// Ultra-simplified chip with minimal overhead - NO haptics, NO variant logic
export const SimpleChip: React.FC<SimpleChipProps> = ({ label, selected, onPress, disabled = false, accessibilityHint }) => {
  return (
    <StyledTouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      delayPressIn={0}
      disabled={disabled}
      className={`px-4 rounded-full border ${
        selected
          ? 'bg-primary-500 border-primary-500'
          : 'bg-white'
      }`}
      style={[
        { minHeight: 44, justifyContent: 'center' },
        !selected && { borderColor: COLORS.borderGray },
        disabled && { opacity: 0.35 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      accessibilityHint={accessibilityHint}
    >
      <StyledText
        className={`text-sm ${selected ? 'text-white' : ''}`}
        style={{
          fontFamily: selected ? FONTS.medium : FONTS.regular,
          color: selected ? undefined : COLORS.text.muted,
        }}
      >
        {label}
      </StyledText>
    </StyledTouchableOpacity>
  );
};
