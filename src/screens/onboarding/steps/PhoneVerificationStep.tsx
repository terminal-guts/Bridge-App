import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

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
  const inputRefs = React.useRef<Array<TextInput | null>>([]);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
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

  const validateAndContinue = (verificationCode?: string) => {
    const fullCode = verificationCode || code.join('');

    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    // MOCK: In production, verify code with backend
    // For now, accept any 6-digit code
    updateData({
      phoneVerified: true,
      verificationCode: fullCode,
    });
    onNext();
  };

  const resendCode = () => {
    // MOCK: In production, call API to resend code
    console.log('[MOCK] Resending verification code to:', data.phoneNumber);
    setCode(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
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
            <StyledTextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              className="w-12 h-14 border-2 border-neutral-300 rounded-lg text-center text-2xl font-semibold"
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={index === 0}
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
