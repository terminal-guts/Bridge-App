import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon } from '../../../components/icons';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData, LifestylePreferences } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface LifestyleStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const LifestyleStep: React.FC<LifestyleStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [lifestyle, setLifestyle] = useState({
    drinking: data.drinkingFrequency || '',
    cannabis: data.cannabisFrequency || data.weedFrequency || '',
    tobacco: data.tobaccoFrequency || '',
    otherDrugs: data.otherDrugsFrequency || '',
  });

  const [error, setError] = useState<string>('');

  const handleSelect = (field: string, value: string) => {
    setLifestyle(prev => {
      // Enable deselection - if clicking the same value, deselect it
      const currentValue = prev[field as keyof typeof lifestyle];
      return {
        ...prev,
        [field]: currentValue === value ? '' : value
      };
    });
    setError('');
  };

  const validateAndContinue = () => {
    if (!lifestyle.drinking && !lifestyle.cannabis && !lifestyle.tobacco && !lifestyle.otherDrugs) {
      setError('Please answer at least one question or tap Skip');
      return;
    }

    updateData({
      drinkingFrequency: lifestyle.drinking,
      cannabisFrequency: lifestyle.cannabis,
      tobaccoFrequency: lifestyle.tobacco,
      otherDrugsFrequency: lifestyle.otherDrugs,
    });
    onNext();
  };

  const handleSkip = () => {
    // Save any answered questions before skipping
    updateData({
      drinkingFrequency: lifestyle.drinking,
      cannabisFrequency: lifestyle.cannabis,
      tobaccoFrequency: lifestyle.tobacco,
      otherDrugsFrequency: lifestyle.otherDrugs,
    });
    onNext();
  };

  const isSelected = (field: string, value: string) => {
    return lifestyle[field as keyof typeof lifestyle] === value;
  };

  const OptionCard = ({
    label,
    field,
    value,
    onPress
  }: {
    label: string;
    field: string;
    value: string;
    onPress: () => void;
  }) => {
    const selected = isSelected(field, value);
    return (
      <StyledTouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`flex-1 min-h-[72px] rounded-xl border-2 ${
          selected
            ? 'bg-primary-50 border-primary-500'
            : 'bg-white border-neutral-200'
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: selected ? 0.12 : 0.06,
          shadowRadius: 4,
          elevation: selected ? 3 : 1,
        }}
      >
        <StyledView className="flex-1 items-center justify-center py-2.5 px-2">
          {selected && (
            <EvaIcon name="checkmark-circle-2"
              size={22}
              color="#437FFF"
              style={{ marginBottom: 4 }}
            />
          )}
          <Body className={`text-center text-sm leading-tight ${selected ? 'text-primary-700 font-semibold' : 'text-neutral-700'}`}>
            {label}
          </Body>
        </StyledView>
      </StyledTouchableOpacity>
    );
  };

  const QuestionSection = ({
    title,
    field,
    icon
  }: {
    title: string;
    field: 'drinking' | 'cannabis' | 'tobacco' | 'otherDrugs';
    icon: any;
  }) => (
    <StyledView className="mb-8">
      <StyledView className="flex-row items-center mb-4">
        <EvaIcon name={icon} size={24} color="#437FFF" style={{ marginRight: 10 }} />
        <H3 className="text-neutral-900">{title}</H3>
      </StyledView>

      {/* 2x2 Grid */}
      <StyledView className="gap-4">
        {/* First Row */}
        <StyledView className="flex-row gap-4">
          <OptionCard
            label="No"
            field={field}
            value="no"
            onPress={() => handleSelect(field, 'no')}
          />
          <OptionCard
            label="Yes"
            field={field}
            value="yes"
            onPress={() => handleSelect(field, 'yes')}
          />
        </StyledView>

        {/* Second Row */}
        <StyledView className="flex-row gap-4">
          <OptionCard
            label="Sometimes"
            field={field}
            value="sometimes"
            onPress={() => handleSelect(field, 'sometimes')}
          />
          <OptionCard
            label="Prefer not to say"
            field={field}
            value="prefer_not_to_say"
            onPress={() => handleSelect(field, 'prefer_not_to_say')}
          />
        </StyledView>
      </StyledView>
    </StyledView>
  );

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={handleSkip}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Lifestyle</H1>
        <Body className="text-neutral-600 mb-8">
          Share your lifestyle habits.
        </Body>

        <QuestionSection
          title="Drinking"
          field="drinking"
          icon="droplet-outline"
        />

        <QuestionSection
          title="Cannabis"
          field="cannabis"
          icon="activity-outline"
        />

        <QuestionSection
          title="Tobacco"
          field="tobacco"
          icon="flame-outline"
        />

        <QuestionSection
          title="Other Drugs"
          field="otherDrugs"
          icon="plus-square-outline"
        />

        {error && (
          <Body className="text-error text-sm mt-4">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
