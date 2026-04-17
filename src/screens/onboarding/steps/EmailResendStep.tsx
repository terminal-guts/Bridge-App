/**
 * Email Re-entry Step — used in the "Didn't receive a code?" mini-loop.
 * Uses OnboardingLayout for consistent styling with all other onboarding screens.
 * Re-validates @rice.edu domain and checks for existing accounts.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { isAllowedEmailDomain, sendEmailSignUpCode } from '../../../services/authService';
import { COLORS } from '../../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('EmailResendStep');

const StyledView = styled(View);

interface EmailResendStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const EmailResendStep: React.FC<EmailResendStepProps> = ({
  data,
  updateData,
  onNext,
}) => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState(data.email || '');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendAgain = async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('Please enter your email');
      return;
    }

    if (!isAllowedEmailDomain(trimmed)) {
      setError('Please use your @rice.edu email address');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const result = await sendEmailSignUpCode(trimmed);

      if (!result.ok) {
        const code = result.error?.code;
        if (code === 'ACCOUNT_EXISTS') {
          setError('This account already exists. Tap Sign In below.');
        } else {
          setError(result.error?.message || 'Failed to send code. Try again.');
        }
        return;
      }

      logger.info('[EMAIL_RESEND] Code re-sent to:', trimmed);
      updateData({ email: trimmed });
      onNext();
    } catch (err: any) {
      logger.error('[EMAIL_RESEND] Error:', err);
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <OnboardingLayout
      onContinue={handleSendAgain}
      continueLabel={isSending ? 'Sending...' : 'Send Again'}
      continueDisabled={isSending}
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <H1 className="mb-2">Resend Code</H1>
      <Body className="text-neutral-500 text-sm mb-6">
        Confirm or update your email.
      </Body>

      <Input
        label="Rice Email"
        placeholder="netid@rice.edu"
        value={email}
        onChangeText={(text) => {
          setEmail(text.toLowerCase());
          setError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={true}
        error={error}
      />

      <StyledView className="flex-row justify-center mt-6">
        <Body className="text-neutral-600">Already have an account? </Body>
        <Body
          className="text-primary-500 font-semibold"
          onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Welcome' as any }, { name: 'Login' as any }] })}
        >
          Sign In
        </Body>
      </StyledView>
    </OnboardingLayout>
  );
};
