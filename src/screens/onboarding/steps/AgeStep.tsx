import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { COLORS } from '../../../theme/colors';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AgeRangeStepper } from '../../../components/ui/AgeRangeStepper';

interface BirthdayStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

const MIN_AGE = 18;

export const BirthdayStep: React.FC<BirthdayStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (data.birthday) {
      return new Date(data.birthday);
    }
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  });

  const [ageMin, setAgeMin] = useState<number>(data.preferences?.ageMin || MIN_AGE);
  const [ageMax, setAgeMax] = useState<number>(data.preferences?.ageMax || 24);
  const [error, setError] = useState('');

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  const validateAndContinue = () => {
    const age = calculateAge(selectedDate);

    if (age < MIN_AGE) {
      setError('You must be at least 18 years old');
      return;
    }

    if (ageMin >= ageMax) {
      setError('Maximum age must be greater than minimum age');
      return;
    }

    updateData({
      birthday: selectedDate.toISOString(),
      age: age,
      preferences: {
        gender: data.preferences?.gender ?? 'both',
        lookingFor: data.preferences?.lookingFor ?? 'relationship',
        ...data.preferences,
        ageMin,
        ageMax,
      },
    });
    onNext();
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setError('');
    }
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      showBackButton={false}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-4">
        <H1 className="mb-2">What's your birthday?</H1>
        <Body className="text-neutral-500 mb-3 text-sm">
          You must be 18 or older to use Bridge.
        </Body>

        {/* Birthday Picker */}
        <StyledView className="items-center">
          <StyledView className="bg-neutral-50 rounded-2xl px-4 py-1">
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={maxDate}
              minimumDate={minDate}
              textColor={COLORS.primaryAccent}
              accentColor={COLORS.primaryAccent}
              themeVariant="light"
              style={{ height: 150 }}
            />
          </StyledView>
        </StyledView>

        {/* Divider */}
        <StyledView className="w-full h-px bg-neutral-200 mt-3 mb-4" />

        {/* Age Range Preference */}
        <Body className="text-neutral-900 font-semibold mb-5 text-base">
          Preferred Age Range
        </Body>

        <AgeRangeStepper
          min={ageMin}
          max={ageMax}
          floor={18}
          ceiling={35}
          onMinChange={(v) => { setAgeMin(v); setError(''); }}
          onMaxChange={(v) => { setAgeMax(v); setError(''); }}
        />

        {error && (
          <Body className="text-error text-sm mt-4">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};

export { BirthdayStep as AgeStep };
