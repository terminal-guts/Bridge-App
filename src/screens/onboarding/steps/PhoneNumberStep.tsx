import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface PhoneNumberStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const PhoneNumberStep: React.FC<PhoneNumberStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  isFirstStep,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || '');
  const [error, setError] = useState('');

  const validateAndContinue = () => {
    // Basic phone validation - at least 10 digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (digitsOnly.length < 10) {
      setError('Please enter a valid US phone number');
      return;
    }

    updateData({
      phoneNumber: digitsOnly,
    });
    onNext();
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  return (
    <OnboardingLayout
      onContinue={validateAndContinue}
      showBackButton={!isFirstStep}
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <H1 className="mb-3">Sign up</H1>
      <Body className="text-neutral-600 mb-8">
        Enter your phone number to get started.
      </Body>

      <Input
        label="Phone Number"
        placeholder="(555) 555-5555"
        value={phoneNumber}
        onChangeText={(text) => {
          // Reject non-numeric input gracefully by only keeping digits for formatting
          const formatted = formatPhoneNumber(text);
          setPhoneNumber(formatted);
          if (error) setError('');
        }}
        keyboardType="phone-pad"
        error={error}
        containerClassName="mb-4"
        autoFocus={true}
      />

      <Body className="text-neutral-500 text-sm mt-4">
        We'll use this to verify your account and keep it secure.
      </Body>
    </OnboardingLayout>
  );
};
