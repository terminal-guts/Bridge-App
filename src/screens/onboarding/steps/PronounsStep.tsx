import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface PronounsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const PRONOUN_OPTIONS = [
  'He',
  'Him',
  'His',
  'She',
  'Her',
  'Hers',
  'They',
  'Them',
  'Theirs',
  'Ze',
  'Zir',
];

const MAX_PRONOUNS = 4;

export const PronounsStep: React.FC<PronounsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedPronouns, setSelectedPronouns] = useState<string[]>(
    data.pronounsList || []
  );
  const [error, setError] = useState<string>('');

  const togglePronoun = (pronoun: string) => {
    if (selectedPronouns.includes(pronoun)) {
      setSelectedPronouns(selectedPronouns.filter(p => p !== pronoun));
      setError('');
    } else {
      if (selectedPronouns.length >= MAX_PRONOUNS) {
        setError(`You can select up to ${MAX_PRONOUNS} pronouns`);
        return;
      }
      setSelectedPronouns([...selectedPronouns, pronoun]);
      setError('');
    }
  };

  const validateAndContinue = () => {
    if (selectedPronouns.length === 0) {
      setError('Please select at least one pronoun');
      return;
    }

    updateData({
      pronounsList: selectedPronouns,
    });
    onNext();
  };

  const OptionButton = ({
    label,
    selected,
    onPress
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <StyledTouchableOpacity
      onPress={onPress}
      className={`px-4 py-3 rounded-lg border mr-2 mb-2 ${
        selected
          ? 'bg-primary-500 border-primary-500'
          : 'bg-white border-neutral-300'
      }`}
    >
      <Body className={selected ? 'text-white font-medium' : 'text-neutral-700'}>
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
        <H1 className="mb-3">Your Pronouns</H1>
      <Body className="text-neutral-600 mb-2">
        Select up to {MAX_PRONOUNS} pronouns that you use.
      </Body>
      <Body className="text-primary-500 font-semibold mb-6">
        {selectedPronouns.length}/{MAX_PRONOUNS} selected
      </Body>

      <Card className="mb-5 p-5">
        <H3 className="mb-3">Choose your pronouns</H3>
        <StyledView className="flex-row flex-wrap">
          {PRONOUN_OPTIONS.map((pronoun) => (
            <OptionButton
              key={pronoun}
              label={pronoun}
              selected={selectedPronouns.includes(pronoun)}
              onPress={() => togglePronoun(pronoun)}
            />
          ))}
        </StyledView>
      </Card>

      {error && (
        <Body className="text-error text-sm mt-2">{error}</Body>
      )}

      <Body className="text-neutral-500 text-sm mt-4">
        Your selected pronouns will be displayed on your profile to help others address you correctly.
      </Body>
      </StyledView>
    </OnboardingLayout>
  );
};
