import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

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
  'Agnostic',
  'Atheist',
  'Buddhist',
  'Catholic',
  'Christian',
  'Hindu',
  'Jewish',
  'Mormon',
  'Muslim',
  'Sikh',
  'Spiritual',
  'Orthodox',
  'Protestant',
  'Evangelical',
  'Baha\'i',
  'Jain',
  'Shinto',
  'Taoist',
  'Pagan',
  'Unitarian',
  'Non-religious',
];

export const ReligionStep: React.FC<ReligionStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedReligion, setSelectedReligion] = useState<string>(data.religion || '');
  const [error, setError] = useState<string>('');

  const handleSelectReligion = (religion: string) => {
    setSelectedReligion(religion);
    setError('');
  };

  const validateAndContinue = () => {
    if (!selectedReligion) {
      setError('Please select a religious belief');
      return;
    }

    updateData({
      religion: selectedReligion,
    });
    onNext();
  };

  const OptionButton = ({
    label,
    selected,
    onPress
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <StyledTouchableOpacity
      onPress={onPress}
      className={`px-4 py-3 rounded-lg border mr-2 mb-2 ${
        selected
          ? 'bg-primary-500 border-primary-500'
          : 'bg-white border-neutral-300'
      }`}
    >
      <Body className={selected ? 'text-white font-medium' : 'text-neutral-700'}>
        {label}
      </Body>
    </StyledTouchableOpacity>
  );

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={onNext}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Religious Beliefs</H1>
      <Body className="text-neutral-600 mb-8">
        Share your religious or spiritual beliefs.
      </Body>

      <StyledView className="flex-row flex-wrap">
        {RELIGION_OPTIONS.map((option) => (
          <OptionButton
            key={option}
            label={option}
            selected={selectedReligion === option}
            onPress={() => handleSelectReligion(option)}
          />
        ))}
      </StyledView>

      {error && (
        <Body className="text-error text-sm mt-2">{error}</Body>
      )}
      </StyledView>
    </OnboardingLayout>
  );
};
