import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

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
      setError('Please select Relationship to continue');
      return;
    }

    updateData({
      preferences: {
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
        <H1 className="mb-3">Commitment Level</H1>
        <Body className="text-neutral-600 mb-8">
          Bridge promotes genuine connection.
        </Body>

        {/* Relationship Option */}
        <StyledTouchableOpacity
          onPress={() => {
            // Toggle: if selected, deselect; if deselected, select
            setCommitmentLevel(commitmentLevel === 'relationship' ? '' : 'relationship');
            setError('');
          }}
          className={`p-4 rounded-lg border ${
            commitmentLevel === 'relationship'
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white border-neutral-300'
          }`}
        >
          <Body
            className={`${
              commitmentLevel === 'relationship'
                ? 'text-white font-semibold'
                : 'text-neutral-700'
            }`}
          >
            Relationship
          </Body>
        </StyledTouchableOpacity>

        {error && (
          <Body className="text-error text-sm mt-4">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};