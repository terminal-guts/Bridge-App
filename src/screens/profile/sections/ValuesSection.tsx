import React, { useMemo, useCallback } from 'react';
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
}

export const ValuesSection = React.memo<ValuesSectionProps>(({
  values,
  onToggleValue,
  onShowCustomValueModal,
}) => {
  // Memoize Set conversion for O(1) lookup - CRITICAL for performance
  const valuesSet = useMemo(() => new Set(values), [values]);

  // Filter custom values using Set for O(1) lookup
  const customValues = useMemo(() =>
    values.filter(v => !AVAILABLE_VALUES_SET.has(v)),
    [values]
  );

  const handleToggleValue = useCallback((value: string) => {
    lightHaptic();
    onToggleValue(value);
  }, [onToggleValue]);

  const handleRemoveCustomValue = useCallback((customValue: string) => {
    lightHaptic();
    onToggleValue(customValue);
  }, [onToggleValue]);

  return (
    <Card className="mb-6">
      <H3 className="mb-4">Values <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
      <Body className="text-neutral-600 text-sm mb-4">
        What matters most to you? (Select {MIN_VALUES}-{MAX_VALUES})
      </Body>

      {/* Grouped Values */}
      {VALUE_GROUPS.map((group) => (
        <StyledView key={group.label} className="mb-5">
          <Body className="text-neutral-400 text-xs font-semibold tracking-wider mb-2.5">{group.label}</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: 10 }}>
            {group.items.map((value) => (
              <SimpleChip
                key={value}
                label={value}
                selected={valuesSet.has(value)}
                onPress={() => handleToggleValue(value)}
                iconName={valueIconName(value)}
              />
            ))}
          </StyledView>
        </StyledView>
      ))}

      {/* Custom values */}
      {customValues.length > 0 && (
        <StyledView className="mb-5">
          <Body className="text-neutral-400 text-xs font-semibold tracking-wider mb-2.5">Custom</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: 10 }}>
            {customValues.map((customValue) => (
              <StyledTouchableOpacity
                key={customValue}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => handleRemoveCustomValue(customValue)}
                className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
              >
                <Body className="text-sm text-white font-medium">{customValue}</Body>
              </StyledTouchableOpacity>
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
        className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50 self-start"
      >
        <Body className="text-sm text-neutral-600">+ Other</Body>
      </StyledTouchableOpacity>
    </Card>
  );
});

ValuesSection.displayName = 'ValuesSection';
