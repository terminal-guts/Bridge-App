import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface EthnicityStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const ETHNICITY_OPTIONS = [
  'Black',
  'East Asian',
  'Hispanic',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'South Asian',
  'Southeast Asian',
  'White',
  'Other',
];

export const EthnicityStep: React.FC<EthnicityStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [myEthnicity, setMyEthnicity] = useState<string[]>(
    Array.isArray(data.ethnicity)
      ? data.ethnicity
      : (data.ethnicity
          ? data.ethnicity.includes(' / ') ? data.ethnicity.split(' / ') : [data.ethnicity]
          : [])
  );
  const [error, setError] = useState<string>('');

  const toggleEthnicity = (ethnicity: string) => {
    if (myEthnicity.includes(ethnicity)) {
      setMyEthnicity(myEthnicity.filter(e => e !== ethnicity));
    } else {
      setMyEthnicity([...myEthnicity, ethnicity]);
    }
    setError('');
  };

  const validateAndContinue = () => {
    if (myEthnicity.length === 0) {
      setError('Please select your ethnicity');
      return;
    }
    updateData({ ethnicity: myEthnicity.join(' / ') });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-2">What's your ethnicity?</H1>
        <Body className="text-neutral-500 text-sm mb-6">
          Select all that apply. This stays private.
        </Body>

        <StyledView>
          {ETHNICITY_OPTIONS.map((option) => (
            <StyledTouchableOpacity
              key={option}
              onPress={() => toggleEthnicity(option)}
              className={`px-4 py-3 rounded-lg border mb-3 ${myEthnicity.includes(option) ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300'}`}
            >
              <Body className={myEthnicity.includes(option) ? 'text-white font-medium' : 'text-neutral-700'}>
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
