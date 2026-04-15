import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface ReligionStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const RELIGION_OPTIONS = [
  'Buddhist',
  'Catholic',
  'Christian',
  'Hindu',
  'Jewish',
  'Muslim',
  'Spiritual',
  'Agnostic',
  'Atheist',
  'Other',
];

export const ReligionStep: React.FC<ReligionStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selected, setSelected] = useState<string[]>(
    data.religion ? data.religion.split(' / ').map(s => s.trim()).filter(Boolean) : []
  );
  const [error, setError] = useState<string>('');

  const toggleReligion = (religion: string) => {
    if (selected.includes(religion)) {
      setSelected(selected.filter(r => r !== religion));
    } else {
      setSelected([...selected, religion]);
    }
    setError('');
  };

  const validateAndContinue = () => {
    if (selected.length === 0) {
      setError('Please select at least one');
      return;
    }

    updateData({
      religion: selected.join(' / '),
    });
    onNext();
  };

  const isSelected = (r: string) => selected.includes(r);

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-2">What's your religion?</H1>
      <Body className="text-neutral-500 text-sm mb-6">
        Helps us match you with someone who shares what matters to you.
      </Body>

      <StyledView className="flex-row flex-wrap">
        {RELIGION_OPTIONS.map((option) => (
          <StyledTouchableOpacity
            key={option}
            onPress={() => toggleReligion(option)}
            className={`px-4 py-3 rounded-lg border mr-2 mb-2 ${
              isSelected(option)
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
          >
            <Body className={isSelected(option) ? 'text-white font-medium' : 'text-neutral-700'}>
              {option}
            </Body>
          </StyledTouchableOpacity>
        ))}
      </StyledView>

      {error && (
        <Body className="text-error text-sm mt-2">{error}</Body>
      )}
      </StyledView>
    </OnboardingLayout>
  );
};
