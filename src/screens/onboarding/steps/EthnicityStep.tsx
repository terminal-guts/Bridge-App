import React, { useState, useRef } from 'react';
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

const ETHNICITY_OPTIONS = [
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
    Array.isArray(data.ethnicity) ? data.ethnicity : (data.ethnicity ? [data.ethnicity] : [])
  );
  const [preferredEthnicities, setPreferredEthnicities] = useState<string[]>(
    data.preferredEthnicities || []
  );
  const [openToAll, setOpenToAll] = useState(
    !data.preferredEthnicities || data.preferredEthnicities.length === 0
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

  const togglePreferred = (ethnicity: string) => {
    if (openToAll) return;
    if (preferredEthnicities.includes(ethnicity)) {
      setPreferredEthnicities(preferredEthnicities.filter(e => e !== ethnicity));
    } else {
      setPreferredEthnicities([...preferredEthnicities, ethnicity]);
    }
  };

  const handleOpenToAll = () => {
    setOpenToAll(!openToAll);
    if (!openToAll) {
      setPreferredEthnicities([]);
    }
  };

  const validateAndContinue = () => {
    if (myEthnicity.length === 0) {
      setError('Please select your ethnicity');
      return;
    }

    updateData({
      ethnicity: myEthnicity.join(' / '),
      preferredEthnicities: openToAll ? ETHNICITY_OPTIONS : preferredEthnicities,
    });
    onNext();
  };

  const getButtonStyle = (ethnicity: string, selected: boolean) => {
    return selected ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300';
  };

  const getButtonTextColor = (selected: boolean) => {
    return selected ? 'text-white font-medium' : 'text-neutral-700';
  };

  const OptionButton = ({
    label,
    selected,
    onPress,
    disabled,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <StyledTouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`px-4 py-3 rounded-lg border mb-3 ${getButtonStyle(label, selected)}`}
      style={disabled ? { opacity: 0.4 } : undefined}
    >
      <Body className={getButtonTextColor(selected)}>
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
        <H1 className="mb-3">What's your ethnicity?</H1>
        <Body className="text-neutral-600 mb-6">
          Select all that apply. This stays private.
        </Body>

        <StyledView>
          {ETHNICITY_OPTIONS.map((option) => (
            <OptionButton
              key={option}
              label={option}
              selected={myEthnicity.includes(option)}
              onPress={() => toggleEthnicity(option)}
            />
          ))}
        </StyledView>

        {error && (
          <Body className="text-error text-sm mt-2">{error}</Body>
        )}

        {/* Preferred Ethnicities Section */}
        <StyledView className="mt-8">
          <H1 className="mb-3">Ethnicity preferences</H1>
          <Body className="text-neutral-600 mb-6">
            Who are you open to matching with?
          </Body>

          <OptionButton
            label="Open to all"
            selected={openToAll}
            onPress={handleOpenToAll}
          />

          {!openToAll && (
            <StyledView className="mt-2">
              {ETHNICITY_OPTIONS.map((option) => (
                <OptionButton
                  key={`pref-${option}`}
                  label={option}
                  selected={preferredEthnicities.includes(option)}
                  onPress={() => togglePreferred(option)}
                />
              ))}
            </StyledView>
          )}
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
