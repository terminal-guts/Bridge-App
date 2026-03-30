import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { IconScoutIcon } from '../icons';

interface SimpleChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  iconName?: string;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

// Ultra-simplified chip with minimal overhead - NO haptics, NO variant logic
export const SimpleChip: React.FC<SimpleChipProps> = ({ label, selected, onPress, disabled = false, accessibilityHint, iconName }) => {
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
        !selected && { borderColor: COLORS.border },
        disabled && { opacity: 0.35 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      accessibilityHint={accessibilityHint}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {iconName && (
          <IconScoutIcon
            name={iconName}
            size={14}
            style={{ marginRight: 6 }}
          />
        )}
        <StyledText
          className="text-sm"
          style={{
            fontFamily: selected ? FONTS.medium : FONTS.regular,
            color: selected ? '#FFFFFF' : COLORS.text.secondary,
          }}
        >
          {label}
        </StyledText>
      </View>
    </StyledTouchableOpacity>
  );
};
