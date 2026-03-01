import React, { useState, useRef } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import { verifyRiceEmailCode, sendRiceEmailVerification } from '../../../services/authService';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('RiceEmailVerificationStep');

interface RiceEmailVerificationStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const RiceEmailVerificationStep: React.FC<RiceEmailVerificationStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const isVerifyingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const handleCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');

    if (digits.length === 6) {
      validateAndContinue(digits);
    }
  };

  const validateAndContinue = async (verificationCode?: string) => {
    if (isVerifyingRef.current) return;
    const fullCode = verificationCode ?? code;

    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    if (!data.email) {
      setError('Email not found. Please go back and re-enter.');
      return;
    }

    isVerifyingRef.current = true;
    const result = await verifyRiceEmailCode(data.email, fullCode);
    isVerifyingRef.current = false;

    if (result.ok) {
      updateData({ email: data.email });
      onNext();
    } else {
      setError(result.error?.message || 'Verification failed');
    }
  };

  const resendCode = async () => {
    if (!data.email || isResending) return;
    setIsResending(true);
    setCode('');
    inputRef.current?.focus();

    const result = await sendRiceEmailVerification(data.email);
    setIsResending(false);

    if (!result.ok) {
      setError(result.error?.message || 'Failed to resend code');
    }
  };

  const digits = code.split('');

  return (
    <OnboardingLayout
      onContinue={() => validateAndContinue()}
      showBackButton={true}
      hasTextInput={true}
      keyboardPersistent={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Verify your Rice email</H1>
        <Body className="text-neutral-600 mb-20">
          We sent a 6-digit code to {data.email}
        </Body>

        <Pressable onPress={() => inputRef.current?.focus()}>
          <StyledView className="flex-row justify-between mb-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <StyledView
                key={index}
                className={`w-12 h-14 border-2 rounded-lg items-center justify-center ${
                  digits[index] !== undefined
                    ? 'border-blue-500'
                    : 'border-neutral-300'
                }`}
              >
                <Body className="text-2xl font-semibold text-center">
                  {digits[index] ?? ''}
                </Body>
              </StyledView>
            ))}
          </StyledView>
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus={true}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />

        {error ? (
          <Body className="text-red-500 text-sm mb-4">{error}</Body>
        ) : null}

        <StyledView className="flex-row justify-center">
          <Body className="text-neutral-600">Didn't receive a code? </Body>
          <Body
            className="text-primary-500 font-semibold"
            onPress={resendCode}
          >
            {isResending ? 'Sending...' : 'Resend'}
          </Body>
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
