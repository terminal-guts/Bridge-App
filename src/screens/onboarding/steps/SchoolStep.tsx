import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface SchoolStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const SchoolStep: React.FC<SchoolStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [school, setSchool] = useState(data.school || '');
  const [error, setError] = useState('');

  const validateAndContinue = () => {
    // Optional - allow skipping if no school entered
    updateData({ school: school.trim() });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Where did you study?</H1>
      <Body className="text-neutral-600 mb-8">
        If you're an undergraduate student, just hit continue.
      </Body>

      <Input
        label="School (Optional)"
        placeholder="e.g., Stanford University"
        value={school}
        onChangeText={(text) => {
          setSchool(text);
          if (error) setError('');
        }}
        error={error}
        containerClassName="mb-4"
        autoFocus={true}
      />
      </StyledView>
    </OnboardingLayout>
  );
};
