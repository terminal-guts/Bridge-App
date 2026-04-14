import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body } from '../../../components/ui';
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
const StyledScrollView = styled(ScrollView);

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

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledScrollView className="mt-8" showsVerticalScrollIndicator={false}>
        <H1 className="mb-3">Ethnicity</H1>
        <Body className="text-neutral-600 mb-4">
          Select all that apply. This stays private.
        </Body>

        <StyledView className="mb-6">
          {ETHNICITY_OPTIONS.map((option) => (
            <StyledTouchableOpacity
              key={option}
              onPress={() => toggleEthnicity(option)}
              className={`px-4 py-3 rounded-lg border mb-2 ${myEthnicity.includes(option) ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300'}`}
            >
              <Body className={myEthnicity.includes(option) ? 'text-white font-medium' : 'text-neutral-700'}>
                {option}
              </Body>
            </StyledTouchableOpacity>
          ))}
        </StyledView>

        {error && (
          <Body className="text-error text-sm mb-4">{error}</Body>
        )}

        {/* Divider */}
        <StyledView className="w-full h-px bg-neutral-200 mb-5" />

        {/* Preferences section */}
        <H3 className="mb-2">Who are you open to matching with?</H3>
        <Body className="text-neutral-600 mb-4 text-sm">
          This helps us find better matches for you.
        </Body>

        <StyledTouchableOpacity
          onPress={handleOpenToAll}
          className={`px-4 py-3 rounded-lg border mb-2 ${openToAll ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300'}`}
        >
          <Body className={openToAll ? 'text-white font-medium' : 'text-neutral-700'}>
            Open to all
          </Body>
        </StyledTouchableOpacity>

        {!openToAll && (
          <StyledView className="mt-1">
            {ETHNICITY_OPTIONS.map((option) => (
              <StyledTouchableOpacity
                key={`pref-${option}`}
                onPress={() => togglePreferred(option)}
                className={`px-4 py-3 rounded-lg border mb-2 ${preferredEthnicities.includes(option) ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300'}`}
              >
                <Body className={preferredEthnicities.includes(option) ? 'text-white font-medium' : 'text-neutral-700'}>
                  {option}
                </Body>
              </StyledTouchableOpacity>
            ))}
          </StyledView>
        )}

        {/* Bottom padding for scroll */}
        <StyledView style={{ height: 20 }} />
      </StyledScrollView>
    </OnboardingLayout>
  );
};
