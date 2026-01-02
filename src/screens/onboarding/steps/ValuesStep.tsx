import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Chip } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface ValuesStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

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

export const ValuesStep: React.FC<ValuesStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const initialValues = data.values || [];
  const predefinedSelected = initialValues.filter(v => AVAILABLE_VALUES.includes(v));

  const [myValues, setMyValues] = useState<string[]>(predefinedSelected);
  const [error, setError] = useState('');

  const totalMyValues = myValues.length;

  const handlePress = (value: string) => {
    if (myValues.includes(value)) {
      setMyValues(myValues.filter(v => v !== value));
    } else {
      if (totalMyValues >= 8) {
        setError('You can select up to 8 values');
        return;
      }
      setMyValues([...myValues, value]);
    }
    setError('');
  };

  const validateAndContinue = () => {
    if (totalMyValues < 3) {
      setError('Please select at least 3 values');
      return;
    }

    if (totalMyValues > 8) {
      setError('You can select up to 8 values');
      return;
    }

    updateData({
      values: myValues,
    });
    onNext();
  };

  const isSelected = (value: string) => myValues.includes(value);

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={onNext}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Values</H1>
      <Body className="text-neutral-500 text-sm mb-2">
        Select at least 3 - add custom values later.
      </Body>
      <Body className="text-primary-500 font-semibold mb-6">
        {totalMyValues} of 8 selected
      </Body>

      {/* Values Grid */}
      <StyledView className="flex-row flex-wrap -mx-1 mb-4">
        {AVAILABLE_VALUES.map((value) => (
          <StyledView key={value} className="px-1 mb-2">
            <Chip
              label={value}
              selected={isSelected(value)}
              onPress={() => handlePress(value)}
            />
          </StyledView>
        ))}
      </StyledView>

      {error && (
        <Body className="text-error text-sm mt-4">{error}</Body>
      )}
      </StyledView>
    </OnboardingLayout>
  );
};
