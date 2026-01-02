import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface CurrentJobStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const CurrentJobStep: React.FC<CurrentJobStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [currentJob, setCurrentJob] = useState(data.currentJob || '');
  const [error, setError] = useState('');

  const validateAndContinue = () => {
    if (!currentJob.trim()) {
      setError('Please enter your occupation or field of study');
      return;
    }

    updateData({ currentJob: currentJob.trim() });
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
      <H1 className="mb-3">What do you do?</H1>
      <Body className="text-neutral-500 text-sm mb-8">
        If you're a student, just enter "Student"
      </Body>

      <Input
        label="Current Role"
        placeholder="e.g., Software Engineer"
        value={currentJob}
        onChangeText={(text) => {
          setCurrentJob(text);
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
