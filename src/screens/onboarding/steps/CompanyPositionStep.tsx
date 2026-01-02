import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface CompanyPositionStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const CompanyPositionStep: React.FC<CompanyPositionStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [companyPosition, setCompanyPosition] = useState(data.companyPosition || '');
  const [error, setError] = useState('');

  const validateAndContinue = () => {
    if (!companyPosition.trim()) {
      setError('Please enter your company or school name');
      return;
    }

    updateData({ companyPosition: companyPosition.trim() });
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
      <H1 className="mb-3">Where do you work or study?</H1>
      <Body className="text-neutral-600 mb-8">
        Enter your company or school name
      </Body>

      <Input
        label="Company or School"
        placeholder="e.g., Google"
        value={companyPosition}
        onChangeText={(text) => {
          setCompanyPosition(text);
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
