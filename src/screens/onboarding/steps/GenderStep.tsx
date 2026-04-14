import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { OnboardingResumePrompt } from '../../../components/onboarding/OnboardingResumePrompt';
import { lightHaptic } from '../../../utils/haptics';

interface GenderStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

export const GenderStep: React.FC<GenderStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [myGender, setMyGender] = useState<string[]>(
    data.gender ? (Array.isArray(data.gender) ? data.gender : [data.gender]) : []
  );
  const [interestedIn, setInterestedIn] = useState<string[]>(
    data.interestedInGenders || []
  );
  const [errors, setErrors] = useState<{ myGender?: string; interestedIn?: string }>({});

  const toggleMyGender = (gender: string) => {
    if (myGender.includes(gender)) {
      setMyGender(myGender.filter(g => g !== gender));
    } else {
      setMyGender([...myGender, gender]);
    }
    setErrors({ ...errors, myGender: undefined });
  };

  const toggleInterestedIn = (gender: string) => {
    if (interestedIn.includes(gender)) {
      setInterestedIn(interestedIn.filter(g => g !== gender));
    } else {
      setInterestedIn([...interestedIn, gender]);
    }
    setErrors({ ...errors, interestedIn: undefined });
  };

  const validateAndContinue = () => {
    const newErrors: { myGender?: string; interestedIn?: string } = {};

    if (myGender.length === 0) {
      newErrors.myGender = 'Pick at least one that fits you';
    }

    if (interestedIn.length === 0) {
      newErrors.interestedIn = 'Let us know who you want to meet';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Derive preferences.gender from interestedIn selection
    // This is required for the user_preferences table
    let preferredGender: 'male' | 'female' | 'both' = 'both';

    if (interestedIn.length === 1) {
      if (interestedIn[0] === 'male') {
        preferredGender = 'male';
      } else if (interestedIn[0] === 'female') {
        preferredGender = 'female';
      } else {
        preferredGender = 'both';
      }
    } else if (interestedIn.length > 1) {
      preferredGender = 'both';
    }

    updateData({
      gender: myGender,
      interestedInGenders: interestedIn,
      preferences: {
        ageMin: data.preferences?.ageMin ?? 18,
        ageMax: data.preferences?.ageMax ?? 99,
        lookingFor: data.preferences?.lookingFor ?? 'relationship',
        ...data.preferences,
        gender: preferredGender,
      },
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
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
    >
      <Body className={selected ? 'text-white font-medium' : 'text-neutral-700'}>
        {label}
      </Body>
    </StyledTouchableOpacity>
  );

  return (
    <>
    <OnboardingResumePrompt />
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Tell us about yourself</H1>
        <Body className="text-neutral-600 mb-8">
          This helps your friends match you with the right people.
        </Body>

        {/* My Gender */}
        <Card className="mb-5 p-5">
        <H3 className="mb-3">My gender</H3>
        <Body className="text-neutral-600 text-sm mb-3">
          Select all that apply.
        </Body>
        <StyledView className="flex-row flex-wrap">
          {GENDER_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={myGender.includes(option.value)}
              onPress={() => toggleMyGender(option.value)}
            />
          ))}
        </StyledView>
        {errors.myGender && (
          <Body className="text-error text-sm mt-2">{errors.myGender}</Body>
        )}
      </Card>

      {/* Interested In */}
      <Card className="mb-5 p-5">
        <H3 className="mb-3">I want to match with</H3>
        <Body className="text-neutral-600 text-sm mb-3">
          Select all that apply.
        </Body>
        <StyledView className="flex-row flex-wrap">
          {GENDER_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={interestedIn.includes(option.value)}
              onPress={() => toggleInterestedIn(option.value)}
            />
          ))}
        </StyledView>
        {errors.interestedIn && (
          <Body className="text-error text-sm mt-2">{errors.interestedIn}</Body>
        )}
      </Card>
      </StyledView>

    </OnboardingLayout>
    </>
  );
};
