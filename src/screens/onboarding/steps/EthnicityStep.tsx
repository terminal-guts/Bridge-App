import React, { useState, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

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

const ETHNICITY_OPTIONS = [
  'Asian',
  'Black',
  'Caribbean',
  'Central Asian',
  'East Asian',
  'Hispanic',
  'Middle Eastern',
  'Native American',
  'North African',
  'Pacific Islander',
  'South Asian',
  'Southeast Asian',
  'Sub-Saharan African',
  'White',
];

export const EthnicityStep: React.FC<EthnicityStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [myEthnicity, setMyEthnicity] = useState<string[]>(
    Array.isArray(data.ethnicity) ? data.ethnicity : (data.ethnicity ? [data.ethnicity] : [])
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

    updateData({
      ethnicity: myEthnicity.length > 0 ? myEthnicity.join(' / ') : '',
    });
    onNext();
  };

  const getButtonStyle = (ethnicity: string) => {
    const isSelected = myEthnicity.includes(ethnicity);

    if (isSelected) {
      return 'bg-primary-500 border-primary-500';
    } else {
      // Not selected
      return 'bg-white border-neutral-300';
    }
  };

  const getButtonTextColor = (ethnicity: string) => {
    const isSelected = myEthnicity.includes(ethnicity);
    return isSelected ? 'text-white font-medium' : 'text-neutral-700';
  };

  const OptionButton = ({
    label,
    onPress
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <StyledTouchableOpacity
      onPress={onPress}
      className={`px-4 py-3 rounded-lg border mb-3 ${getButtonStyle(label)}`}
    >
      <Body className={getButtonTextColor(label)}>
        {label}
      </Body>
    </StyledTouchableOpacity>
  );

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Ethnicity</H1>
        <Body className="text-neutral-600 mb-6">
          Select all that apply.
        </Body>

        <StyledView>
          {ETHNICITY_OPTIONS.map((option) => (
            <OptionButton
              key={option}
              label={option}
              onPress={() => toggleEthnicity(option)}
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
