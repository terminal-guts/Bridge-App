import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { Card } from '../../../components/ui/Card';
import { H3, Body } from '../../../components/ui/Typography';
import { SimpleChip } from '../../../components/ui/SimpleChip';
import { lightHaptic } from '../../../utils/haptics';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);
const StyledText = styled(Text);

const MIN_VALUES = 3;
const MAX_VALUES = 8;

const AVAILABLE_VALUES = [
  // Personal Values
  'Honesty', 'Integrity', 'Loyalty', 'Trust', 'Respect', 'Authenticity',
  'Kindness', 'Compassion', 'Empathy', 'Generosity',

  // Relationship Values
  'Communication', 'Commitment', 'Partnership', 'Independence', 'Interdependence',
  'Romance', 'Intimacy', 'Friendship First',

  // Life Values
  'Family', 'Career', 'Ambition', 'Success', 'Work-Life Balance',
  'Adventure', 'Stability', 'Growth Mindset', 'Learning', 'Creativity',

  // Social Values
  'Community', 'Social Justice', 'Environmentalism', 'Equality', 'Diversity',
  'Tradition', 'Innovation', 'Service', 'Leadership',

  // Personal Growth
  'Self-Improvement', 'Mindfulness', 'Spirituality', 'Health', 'Fitness',
  'Mental Health', 'Emotional Intelligence',
];

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
      <H3 className="mb-4">Values <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
      <Body className="text-neutral-600 text-sm mb-4">
        What matters most to you? (Select {MIN_VALUES}-{MAX_VALUES})
      </Body>

      {/* Available Values Grid */}
      <StyledView className="flex-row flex-wrap gap-2 mb-4">
        {AVAILABLE_VALUES.map((value) => (
          <SimpleChip
            key={value}
            label={value}
            selected={valuesSet.has(value)}
            onPress={() => handleToggleValue(value)}
          />
        ))}

        {/* Custom values (not in predefined list) */}
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

        {/* "Other" Button */}
        <StyledTouchableOpacity
          onPress={() => {
            lightHaptic();
            onShowCustomValueModal();
          }}
          className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50"
        >
          <Body className="text-sm text-neutral-600">+ Other</Body>
        </StyledTouchableOpacity>
      </StyledView>
    </Card>
  );
});

ValuesSection.displayName = 'ValuesSection';
