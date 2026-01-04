import React, { useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import { sendOtpToPhone, verifyPhone } from '../../../services/authService';

interface PhoneVerificationStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTextInput = styled(TextInput);

export const PhoneVerificationStep: React.FC<PhoneVerificationStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRefs = React.useRef<Array<TextInput | null>>([]);

  // Auto-send code on mount
  useEffect(() => {
    if (data.phoneNumber) {
      sendOTP();
    }
  }, []);

  const sendOTP = async () => {
    if (isSending) return;
    setIsSending(true);
    console.log('[SMS] Automaticaly sending verification code via Twilio to:', data.phoneNumber);
    const response = await sendOtpToPhone(data.phoneNumber || '');
    setIsSending(false);

    if (response.ok) {
      setError('');
      // Optional: Add a toast success message here
    } else {
      setError(response.error?.message || 'Failed to send code');
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    // Handle autofill/paste (multiple characters)
    if (text.length > 1) {
      const pasteData = text.slice(0, 6).split('');
      const newCode = [...code];
      pasteData.forEach((char, i) => {
        if (index + i < 6) newCode[index + i] = char;
      });
      setCode(newCode);

      // Auto-submit if we have a full code
      if (newCode.join('').length === 6) {
        validateAndContinue(newCode.join(''));
      } else {
        // Focus the next empty one
        const nextIndex = Math.min(index + pasteData.length, 5);
        inputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    // Only allow single numbers for manual entry
    if (text && !/^\d$/.test(text)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && text) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        validateAndContinue(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateAndContinue = async (verificationCode?: string) => {
    const fullCode = verificationCode || code.join('');

    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    // Verify code with real backend
    const response = await verifyPhone(data.phoneNumber || '', fullCode);

    if (response.ok) {
      updateData({
        phoneNumber: data.phoneNumber,
        phoneVerified: true, // Added phoneVerified as per instruction
        // Removed verificationCode from updateData as it's not typically stored in OnboardingData
      });
      onNext();
    } else {
      setError(response.error?.message || 'Verification failed');
    }
  };

  const resendCode = async () => {
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    await sendOTP();
  };

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

        <StyledView className="flex-row justify-between mb-8">
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              // NativeWind className works on standard components
              className="w-12 h-14 border-2 border-neutral-300 rounded-lg text-center text-2xl font-semibold"
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 1} // Allow first box to receive autofill
              autoFocus={index === 0}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          ))}
        </StyledView>

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
