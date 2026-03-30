import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { Card } from '../../../components/ui/Card';
import { H3, Body } from '../../../components/ui/Typography';
import { SimpleChip } from '../../../components/ui/SimpleChip';
import { valueIconName } from '../../../utils/emojiMaps';
import { lightHaptic } from '../../../utils/haptics';
import { COLORS } from '../../../theme/colors';
import { FONTS } from '../../../constants/typography';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);
const StyledText = styled(Text);

const MIN_VALUES = 3;
const MAX_VALUES = 5;
const CHIP_GAP = 8;

const VALUE_GROUPS = [
  { label: 'Personal', items: ['Honesty', 'Integrity', 'Trust', 'Respect', 'Authenticity', 'Kindness', 'Empathy'] },
  { label: 'Relationship', items: ['Communication', 'Commitment', 'Independence', 'Romance'] },
  { label: 'Life', items: ['Family', 'Career', 'Ambition', 'Work-Life Balance', 'Adventure', 'Stability', 'Growth Mindset', 'Creativity'] },
  { label: 'Social', items: ['Community', 'Social Justice', 'Environmentalism', 'Diversity'] },
  { label: 'Wellbeing', items: ['Spirituality', 'Health'] },
];

const AVAILABLE_VALUES = VALUE_GROUPS.flatMap(g => g.items);

// Convert to Set for O(1) lookup instead of O(n)
const AVAILABLE_VALUES_SET = new Set(AVAILABLE_VALUES);

interface ValuesSectionProps {
  values: string[];
  onToggleValue: (value: string) => void;
  onShowCustomValueModal: () => void;
  atLimit: boolean;
}

export const ValuesSection: React.FC<ValuesSectionProps> = ({
  values,
  onToggleValue,
  onShowCustomValueModal,
  atLimit,
}) => {
  const valuesSet = new Set(values);
  const customValues = values.filter(v => !AVAILABLE_VALUES_SET.has(v));

  const handleToggleValue = (value: string) => {
    lightHaptic();
    onToggleValue(value);
  };

  const count = values.length;

  return (
    <Card className="mb-6">
      <StyledView className="flex-row items-center justify-between mb-1">
        <H3>Values <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
        <Body
          className="text-xs font-medium"
          style={{ color: atLimit ? COLORS.amber : COLORS.text.tertiary }}
          accessibilityLabel={`${count} of ${MAX_VALUES} values selected`}
        >
          {count}/{MAX_VALUES}
        </Body>
      </StyledView>
      <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
        What matters most to you? (Select {MIN_VALUES}-{MAX_VALUES})
      </Body>

      {/* Empty state */}
      {count === 0 && (
        <Body className="text-sm italic mb-4" style={{ color: COLORS.text.tertiary }}>
          Tap any chip below to get started.
        </Body>
      )}

      {/* At-limit hint */}
      {atLimit && (
        <Body className="text-xs mb-3" style={{ color: COLORS.amber }}>
          Maximum reached. Remove one to add a different value.
        </Body>
      )}

      {/* Grouped Values */}
      {VALUE_GROUPS.map((group) => (
        <StyledView key={group.label} className="mb-5">
          <Body style={{ color: COLORS.text.tertiary }} className="text-xs font-semibold tracking-wider mb-2.5">{group.label}</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: CHIP_GAP }}>
            {group.items.map((value) => {
              const isSelected = valuesSet.has(value);
              const isDisabled = atLimit && !isSelected;
              return (
                <SimpleChip
                  key={value}
                  label={value}
                  selected={isSelected}
                  disabled={isDisabled}
                  onPress={() => handleToggleValue(value)}
                  iconName={valueIconName(value)}
                />
              );
            })}
          </StyledView>
        </StyledView>
      ))}

      {/* Custom values */}
      {customValues.length > 0 && (
        <StyledView className="mb-5">
          <Body style={{ color: COLORS.text.tertiary }} className="text-xs font-semibold tracking-wider mb-2.5">Custom</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: CHIP_GAP }}>
            {customValues.map((customValue) => (
              <SimpleChip
                key={customValue}
                label={customValue}
                selected
                onPress={() => handleToggleValue(customValue)}
                accessibilityHint="Double tap to remove"
              />
            ))}
          </StyledView>
        </StyledView>
      )}

      {/* "Other" Button */}
      <StyledTouchableOpacity
        onPress={() => {
          lightHaptic();
          onShowCustomValueModal();
        }}
        disabled={atLimit}
        accessibilityRole="button"
        accessibilityLabel="Add custom value"
        accessibilityState={{ disabled: atLimit }}
        className="px-4 rounded-full border border-dashed self-start"
        style={{
          minHeight: 44,
          justifyContent: 'center',
          borderColor: atLimit ? COLORS.borderLight : COLORS.border,
          backgroundColor: atLimit ? COLORS.borderLight : COLORS.card,
          opacity: atLimit ? 0.5 : 1,
        }}
      >
        <Body style={{ color: atLimit ? COLORS.text.tertiary : COLORS.text.secondary }} className="text-sm">+ Other</Body>
      </StyledTouchableOpacity>
    </Card>
  );
};
