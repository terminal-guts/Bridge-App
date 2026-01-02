import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface WhereFromStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const WhereFromStep: React.FC<WhereFromStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [hometown, setHometown] = useState(data.hometown || '');
  const [error, setError] = useState('');

  const validateAndContinue = () => {
    if (!hometown.trim()) {
      setError('Please enter where you\'re from');
      return;
    }

    updateData({ hometown: hometown.trim() });
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
      <H1 className="mb-3">Where are you from?</H1>
      <Body className="text-neutral-600 mb-8">
        Please enter your hometown and state.
      </Body>

      <Input
        label="Hometown"
        placeholder="e.g., New York, NY"
        value={hometown}
        onChangeText={(text) => {
          setHometown(text);
          if (error) setError('');
        }}
        error={error}
        containerClassName="mb-4"
        autoFocus={true}
      />

      <Body className="text-neutral-500 text-sm mt-4">
        This helps us connect you with people from similar backgrounds.
      </Body>
      </StyledView>
    </OnboardingLayout>
  );
};
