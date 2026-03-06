import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface PreferencesStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const COMMITMENT_OPTIONS = [
  { value: 'relationship', label: 'Relationship' },
];

export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [commitmentLevel, setCommitmentLevel] = useState<string>(
    data.preferences?.lookingFor || ''
  );
  const [error, setError] = useState<string>('');

  const validateAndContinue = () => {
    if (!commitmentLevel) {
      setError('Please select what you\'re looking for');
      return;
    }

    updateData({
      preferences: {
        ageMin: data.preferences?.ageMin ?? 18,
        ageMax: data.preferences?.ageMax ?? 99,
        gender: data.preferences?.gender ?? 'both',
        ...data.preferences,
        lookingFor: commitmentLevel as any,
      },
    });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">What are you looking for?</H1>
        <Body className="text-neutral-600 mb-8">
          Bridge promotes genuine connection. You can change this later.
        </Body>

        {COMMITMENT_OPTIONS.map((option) => (
          <StyledTouchableOpacity
            key={option.value}
            onPress={() => {
              setCommitmentLevel(commitmentLevel === option.value ? '' : option.value);
              setError('');
            }}
            className={`p-4 rounded-lg border mb-3 ${
              commitmentLevel === option.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
          >
            <Body
              className={`font-semibold ${
                commitmentLevel === option.value ? 'text-white' : 'text-neutral-700'
              }`}
            >
              {option.label}
            </Body>
          </StyledTouchableOpacity>
        ))}

        {error && (
          <Body className="text-error text-sm mt-2">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
