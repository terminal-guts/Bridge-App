import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface NameStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const NameStep: React.FC<NameStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});

  const validateAndContinue = () => {
    const newErrors: { firstName?: string; lastName?: string } = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateData({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      showBackButton={false}
      onContinue={validateAndContinue}
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <H1 className="mb-3">What's your name?</H1>
      <Body className="text-neutral-600 mb-8">
        Let's get to know you better.
      </Body>

      <StyledView className="flex-row gap-3 mb-4">
        <StyledView className="flex-1">
          <Input
            label="First Name"
            placeholder="First name"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              if (errors.firstName) setErrors({ ...errors, firstName: undefined });
            }}
            error={errors.firstName}
            autoFocus={true}
          />
        </StyledView>

        <StyledView className="flex-1">
          <Input
            label="Last Name"
            placeholder="Last name"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              if (errors.lastName) setErrors({ ...errors, lastName: undefined });
            }}
            error={errors.lastName}
          />
        </StyledView>
      </StyledView>


    </OnboardingLayout>
  );
};
