import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { ETHNICITY_OPTIONS } from './EthnicityStep';

interface PreferredEthnicitiesStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const PreferredEthnicitiesStep: React.FC<PreferredEthnicitiesStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [preferredEthnicities, setPreferredEthnicities] = useState<string[]>(
    data.preferredEthnicities || []
  );
  // Default to "Open to all" for new users
  const [openToAll, setOpenToAll] = useState(
    !data.preferredEthnicities || data.preferredEthnicities.length === 0
  );

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
    updateData({
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
      <StyledView className="mt-8">
        <H1 className="mb-3">Ethnicity preferences</H1>
        <Body className="text-neutral-600 mb-6">
          Who are you open to matching with?
        </Body>

        <StyledTouchableOpacity
          onPress={handleOpenToAll}
          className={`px-4 py-3 rounded-lg border mb-3 ${openToAll ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300'}`}
        >
          <Body className={openToAll ? 'text-white font-medium' : 'text-neutral-700'}>
            Open to all
          </Body>
        </StyledTouchableOpacity>

        {!openToAll && (
          <StyledView className="mt-2">
            {ETHNICITY_OPTIONS.map((option) => (
              <StyledTouchableOpacity
                key={`pref-${option}`}
                onPress={() => togglePreferred(option)}
                className={`px-4 py-3 rounded-lg border mb-3 ${preferredEthnicities.includes(option) ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-300'}`}
              >
                <Body className={preferredEthnicities.includes(option) ? 'text-white font-medium' : 'text-neutral-700'}>
                  {option}
                </Body>
              </StyledTouchableOpacity>
            ))}
          </StyledView>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
