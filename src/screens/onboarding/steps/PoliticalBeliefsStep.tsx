import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface PoliticalBeliefsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const POLITICAL_OPTIONS = [
  { value: 'very_liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very_conservative', label: 'Very Conservative' },
  { value: 'not_political', label: 'Not Political' },
];

export const PoliticalBeliefsStep: React.FC<PoliticalBeliefsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedPolitics, setSelectedPolitics] = useState<string>(data.politicalLeaning || '');
  const [error, setError] = useState<string>('');

  const validateAndContinue = () => {
    if (!selectedPolitics) {
      setError('Please select a political belief');
      return;
    }

    updateData({
      politicalLeaning: selectedPolitics as any,
    });
    onNext();
  };

  const handleSelect = (value: string) => {
    setSelectedPolitics(value);
    setError('');
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">What are your politics?</H1>
      <Body className="text-neutral-600 mb-8">
        Helps us find someone on your wavelength.
      </Body>

      <StyledView className="space-y-3">
        {POLITICAL_OPTIONS.map((option) => (
          <StyledTouchableOpacity
            key={option.value}
            onPress={() => handleSelect(option.value)}
            className={`p-4 rounded-lg border ${
              selectedPolitics === option.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
          >
            <Body
              className={`${
                selectedPolitics === option.value
                  ? 'text-white font-semibold'
                  : 'text-neutral-700'
              }`}
            >
              {option.label}
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
