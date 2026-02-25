import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';

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

  const handleMinAgeChange = (value: number) => {
    const newMin = Math.round(value);
    setAgeMin(newMin);
    if (newMin >= ageMax) {
      setAgeMax(Math.min(MAX_AGE, newMin + 1));
    }
    setError('');
  };

  const handleMaxAgeChange = (value: number) => {
    const newMax = Math.round(value);
    setAgeMax(newMax);
    if (newMax <= ageMin) {
      setAgeMin(Math.max(MIN_AGE, newMax - 1));
    }
    setError('');
  };

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
              textColor="#437FFF"
              accentColor="#437FFF"
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

          {/* Range Sliders */}
          <StyledView>
            {/* Min Slider */}
            <StyledView className="mb-4">
              <Body className="text-xs text-neutral-500 mb-1.5">Minimum Age</Body>
              <Slider
                value={ageMin}
                onValueChange={handleMinAgeChange}
                minimumValue={MIN_AGE}
                maximumValue={MAX_AGE}
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#437FFF"
              />
            </StyledView>

            {/* Max Slider */}
            <StyledView>
              <Body className="text-xs text-neutral-500 mb-1.5">Maximum Age</Body>
              <Slider
                value={ageMax}
                onValueChange={handleMaxAgeChange}
                minimumValue={MIN_AGE}
                maximumValue={MAX_AGE}
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#437FFF"
              />
            </StyledView>
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
