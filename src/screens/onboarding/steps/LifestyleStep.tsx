import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData, LifestylePreferences } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { WineGlassIcon, CigaretteIcon, PillIcon } from '../../../components/icons/Icons';
import { COLORS } from '../../../theme/colors';
import { SHADOWS } from '../../../theme/shadows';

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
    if (!lifestyle.drinking || !lifestyle.cannabis || !lifestyle.tobacco || !lifestyle.otherDrugs) {
      setError('Please answer all four questions to continue');
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
        style={selected ? SHADOWS.md : SHADOWS.sm}
      >
        <StyledView className="flex-1 items-center justify-center py-2.5 px-2">
          {selected && (
            <EvaIcon name="checkmark-circle-2" variant="outline" size={22} color={COLORS.primaryAccent} style={{ marginBottom: 4 }} />
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
    icon,
    customIcon
  }: {
    title: string;
    field: 'drinking' | 'cannabis' | 'tobacco' | 'otherDrugs';
    icon?: string;
    customIcon?: React.ReactNode;
  }) => (
    <StyledView className="mb-8">
      <StyledView className="flex-row items-center mb-4">
        {customIcon || <EvaIcon name={icon!} variant="outline" size={24} color={COLORS.primaryAccent} style={{ marginRight: 10 }} />}
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
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-2">How do you unwind?</H1>
        <Body className="text-neutral-500 text-sm mb-6">
          No judgment here -- this helps us match you with someone compatible.
        </Body>

        <QuestionSection
          title="Drinking"
          field="drinking"
          customIcon={<WineGlassIcon size={24} color={COLORS.primaryAccent} style={{ marginRight: 10 }} />}
        />

        {/* Scroll hint — signals there's more below the fold */}
        <StyledView className="items-center py-1 mb-4 opacity-50">
          <Body className="text-neutral-400 text-xs">↓ More below</Body>
        </StyledView>

        <QuestionSection
          title="Cannabis"
          field="cannabis"
          icon="smiling-face"
        />

        <QuestionSection
          title="Tobacco"
          field="tobacco"
          customIcon={<CigaretteIcon size={24} color={COLORS.primaryAccent} style={{ marginRight: 10 }} />}
        />

        <QuestionSection
          title="Other Drugs"
          field="otherDrugs"
          customIcon={<PillIcon size={24} color={COLORS.primaryAccent} style={{ marginRight: 10 }} />}
        />

        {error && (
          <Body className="text-error text-sm mt-4">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
