import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface EducationLevelStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const EDUCATION_LEVELS = [
  { value: 'no_high_school', label: 'No High School Degree' },
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'trade_school', label: 'Trade School' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
  { value: 'professional', label: 'Professional Degree (MD, JD, etc.)' },
];

export const EducationLevelStep: React.FC<EducationLevelStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>(data.educationLevel || '');
  const [error, setError] = useState('');

  const validateAndContinue = () => {
    if (!selectedLevel) {
      setError('Please select your education level');
      return;
    }

    updateData({ educationLevel: selectedLevel as OnboardingData['educationLevel'] });
    onNext();
  };

  const handleSelect = (value: string) => {
    setSelectedLevel(value);
    setError('');
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Education</H1>
      <Body className="text-neutral-600 mb-8">
        What's your highest level of education?
      </Body>

      <StyledView className="space-y-3">
        {EDUCATION_LEVELS.map((level) => (
          <StyledTouchableOpacity
            key={level.value}
            onPress={() => handleSelect(level.value)}
            className={`p-4 rounded-lg border ${
              selectedLevel === level.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
          >
            <Body
              className={`${
                selectedLevel === level.value
                  ? 'text-white font-semibold'
                  : 'text-neutral-700'
              }`}
            >
              {level.label}
            </Body>
          </StyledTouchableOpacity>
        ))}
      </StyledView>

      {error && (
        <Body className="text-error text-sm mt-4">{error}</Body>
      )}
      </StyledView>
    </OnboardingLayout>
  );
};
