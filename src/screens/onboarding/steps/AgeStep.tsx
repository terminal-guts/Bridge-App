import React, { useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { COLORS } from '../../../theme/colors';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import DateTimePicker from '@react-native-community/datetimepicker';
import RangeSlider from 'rn-range-slider';

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
const MAX_AGE = 80;

// Stable components for RangeSlider to prevent re-mounting during interaction
const Thumb = () => (
  <StyledView
    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
    style={{ backgroundColor: COLORS.primaryAccent }}
  />
);

const Rail = () => (
  <StyledView className="flex-1 h-1 rounded-full bg-neutral-200" />
);

const RailSelected = () => (
  <StyledView
    className="h-1 rounded-full"
    style={{ backgroundColor: COLORS.primaryAccent }}
  />
);

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
    // Default to 25 years ago
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  });

  const [ageMin, setAgeMin] = useState<number>(data.preferences?.ageMin || MIN_AGE);
  const [ageMax, setAgeMax] = useState<number>(data.preferences?.ageMax || 32);
  const [error, setError] = useState('');

  // Calculate age from birthday
  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = calculateAge(selectedDate);

  // Maximum date is today - 18 years
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  // Minimum date is today - 100 years
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

  const renderThumb = useCallback(() => <Thumb />, []);
  const renderRail = useCallback(() => <Rail />, []);
  const renderRailSelected = useCallback(() => <RailSelected />, []);
  const handleValueChanged = useCallback((low: number, high: number) => {
    setAgeMin(low);
    setAgeMax(high);
    setError('');
  }, []);

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        {/* Page Title */}
        <H1 className="mb-3">What's your birthday?</H1>
        <Body className="text-neutral-600 mb-4 text-sm">
          You must be 18 or older to use Bridge.
        </Body>

        {/* Birthday Picker */}
        <StyledView className="items-center mb-4">
          <StyledView className="bg-neutral-50 rounded-2xl px-4 py-1.5">
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
              style={{ height: 160 }}
            />
          </StyledView>
        </StyledView>

        {/* Subtle Divider */}
        <StyledView className="w-full h-px bg-neutral-200 my-4" />

        {/* Age Range Preference Section */}
        <StyledView>
          <Body className="text-neutral-900 font-semibold mb-3 text-base">
            Preferred Age Range
          </Body>

          {/* Age Range Display */}
          <StyledView className="flex-row justify-center items-center mb-4">
            <StyledView className="bg-primary-500 rounded-xl px-5 py-2.5">
              <Body className="text-white text-2xl font-bold">{ageMin}</Body>
            </StyledView>
            <Body className="text-xl text-neutral-400 mx-4">-</Body>
            <StyledView className="bg-primary-500 rounded-xl px-5 py-2.5">
              <Body className="text-white text-2xl font-bold">{ageMax}</Body>
            </StyledView>
          </StyledView>

          {/* Range Slider */}
          <StyledView className="px-2">
            <RangeSlider
              style={{ width: '100%', height: 40 }}
              min={MIN_AGE}
              max={MAX_AGE}
              step={1}
              low={ageMin}
              high={ageMax}
              minRange={1}
              floatingLabel={false}
              renderThumb={renderThumb}
              renderRail={renderRail}
              renderRailSelected={renderRailSelected}
              onValueChanged={handleValueChanged}
            />
            <Body className="text-neutral-500 text-xs mt-2 text-center">
              Drag the handles to set your preferred age range.
            </Body>
          </StyledView>
        </StyledView>

        {error && (
          <Body className="text-error text-sm mt-4">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};

// Export as AgeStep for backward compatibility
export { BirthdayStep as AgeStep };
