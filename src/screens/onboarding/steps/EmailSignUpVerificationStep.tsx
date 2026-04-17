import React, { useState, useRef } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { COLORS } from '../../../theme/colors';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { verifyEmailSignUpCode } from '../../../services/authService';
import { fetchAndSetUserProfile } from '../../../services/profileService';
import { useNavigation } from '@react-navigation/native';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('EmailSignUpVerificationStep');

interface EmailSignUpVerificationStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onResendCode?: () => void; // Mini-loop: navigates to email screen for resend/email change
}

const StyledView = styled(View);

export const EmailSignUpVerificationStep: React.FC<EmailSignUpVerificationStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
  onResendCode,
}) => {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
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
    setIsVerifying(true);
    logger.info('[EMAIL] Verifying signup code for:', data.email);

    // This verifies the code AND creates the auth session via native Supabase OTP
    const result = await verifyEmailSignUpCode(data.email, fullCode);
    isVerifyingRef.current = false;
    setIsVerifying(false);

    if (result.ok) {
      logger.info('[EMAIL] Email signup verification successful! User ID:', result.data?.id);

      // Check if this user already has a profile (existing account trying to "sign up")
      if (result.data?.id) {
        const profileResult = await fetchAndSetUserProfile(result.data.id);
        if (profileResult.ok && profileResult.data?.profileCompleted) {
          logger.info('[EMAIL] Existing account detected — routing to MainTabs');
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          return;
        }
      }

      updateData({ email: data.email, emailVerified: true });
      onNext();
    } else {
      const msg = (result.error?.message || '').toLowerCase();
      if (msg.includes('expired') || msg.includes('otp has expired')) {
        setError("That code has expired. Tap 'Resend' below for a new one.");
      } else if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('mismatch')) {
        setError('Wrong code. Double-check and try again.');
      } else if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many attempts. Wait a moment and try again.');
      } else {
        setError('Something went wrong. Check your connection and try again.');
      }
    }
  };

  const digits = code.split('');

  return (
    <OnboardingLayout
      onContinue={() => validateAndContinue()}
      onBack={onBack}
      showBackButton={false}
      continueDisabled={isVerifying}
      hasTextInput={true}
      keyboardPersistent={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Verify your email</H1>
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

        {isVerifying ? (
          <StyledView className="flex-row items-center justify-center mb-4">
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Body className="text-neutral-500 text-sm ml-2">Verifying...</Body>
          </StyledView>
        ) : error ? (
          <Body className="text-red-500 text-sm mb-4">{error}</Body>
        ) : null}

        {onResendCode && (
          <StyledView className="flex-row justify-center">
            <Body className="text-primary-500 font-semibold" onPress={onResendCode}>
              Didn't receive a code?
            </Body>
          </StyledView>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
