import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { signInWithPassword, isReviewerBypassEmail, validateReviewerAccess } from '../../../services/authService';
// Phone auth removed — this file is unused (email-only signup)
const sendOtpToPhone = async (_phone: string) => ({ ok: false as const, error: { code: 'REMOVED', message: 'Phone auth removed' } });
const verifyPhone = async (_phone: string, _code: string) => ({ ok: false as const, error: { code: 'REMOVED', message: 'Phone auth removed' }, data: undefined as any });
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('PhoneVerificationStep');

interface PhoneVerificationStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

export const PhoneVerificationStep: React.FC<PhoneVerificationStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isVerifyingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (data.phoneNumber) {
      sendOTP();
    }
  }, []);

  const sendOTP = async () => {
    if (isSending) return;
    setIsSending(true);
    logger.info('[SMS] Automatically sending verification code via Twilio to:', data.phoneNumber);
    const response = await sendOtpToPhone(data.phoneNumber || '');
    setIsSending(false);
    if (response.ok) {
      setError('');
    } else {
      setError(response.error?.message || 'Failed to send code');
    }
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits, max 6
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

    // App Store Reviewer Bypass — validated entirely server-side
    const isTestPhone = data.phoneNumber === '+15555555555' || data.phoneNumber === '5555555555';
    if (isTestPhone) {
      logger.info('[AUTH] App Store Reviewer bypass detected');
      const reviewerResult = await validateReviewerAccess(fullCode);
      if (!reviewerResult.valid || !reviewerResult.authPassword) {
        logger.error('[AUTH] Reviewer access validation failed');
        setError('Reviewer bypass failed. Please check credentials or network.');
        return;
      }
      const bypassResult = await signInWithPassword('reviewer@bridgedate.app', reviewerResult.authPassword);

      if (bypassResult.ok) {
        updateData({
          phoneNumber: data.phoneNumber,
          phoneVerified: true,
        });
        onNext();
        return;
      } else {
        logger.error('[AUTH] Reviewer account login failed');
        setError('Reviewer bypass failed. Please check credentials or network.');
        return;
      }
    }

    isVerifyingRef.current = true;
    const response = await verifyPhone(data.phoneNumber || '', fullCode);
    isVerifyingRef.current = false;

    if (response.ok) {
      updateData({
        phoneNumber: data.phoneNumber,
        phoneVerified: true,
      });
      onNext();
    } else {
      setError(response.error?.message || 'Verification failed');
    }
  };

  const resendCode = async () => {
    setCode('');
    inputRef.current?.focus();
    await sendOTP();
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
        <H1 className="mb-3">Enter verification code</H1>
        <Body className="text-neutral-600 mb-20">
          We sent a 6-digit code to {data.phoneNumber}
        </Body>

        {/* Tapping the boxes focuses the hidden input */}
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

        {/* Single hidden input that captures all keyboard input and iOS autofill */}
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
          <Body className="text-primary-500 font-semibold" onPress={resendCode}>
            Resend
          </Body>
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
