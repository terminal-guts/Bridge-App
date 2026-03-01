import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import { isAllowedEmailDomain, sendEmailSignUpCode } from '../../../services/authService';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('EmailSignUpStep');

interface EmailSignUpStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const EmailSignUpStep: React.FC<EmailSignUpStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [email, setEmail] = useState(data.email || '');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const validateAndContinue = async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('Rice email is required');
      return;
    }

    if (!trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isAllowedEmailDomain(trimmed)) {
      setError('Please use your @rice.edu email address');
      return;
    }

    setIsSending(true);
    const result = await sendEmailSignUpCode(trimmed);
    setIsSending(false);

    if (!result.ok) {
      setError(result.error?.message || 'Failed to send verification code');
      return;
    }

    logger.info('[EMAIL] OTP sent for signup to:', trimmed);
    updateData({ email: trimmed });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <H1 className="mb-3">Sign up with Rice email</H1>
      <Body className="text-neutral-600 mb-8">
        Bridge is exclusively for Rice University students. Enter your @rice.edu email to get started.
      </Body>

      <Input
        label="Rice Email"
        placeholder="netid@rice.edu"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        containerClassName="mb-4"
        autoFocus={true}
      />

      <StyledView className="mt-4">
        <Body className="text-neutral-500 text-sm">
          {isSending
            ? 'Sending verification code...'
            : "We'll send a 6-digit code to verify your Rice email."}
        </Body>
      </StyledView>
    </OnboardingLayout>
  );
};
