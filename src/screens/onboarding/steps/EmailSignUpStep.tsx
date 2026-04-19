import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { isAllowedEmailDomain, sendEmailSignUpCode } from '../../../services/authService';
import { createLogger } from '../../../utils/secureLogger';
import { COLORS } from '../../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { useNavigation } from '@react-navigation/native';

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
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const EmailSignUpStep: React.FC<EmailSignUpStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState(data.email || '');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(data.termsAgreed ?? false);

  const validateAndContinue = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service to continue');
      return;
    }
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
      setError('Please use your rice.edu email address');
      return;
    }

    setIsSending(true);

    try {
      const result = await sendEmailSignUpCode(trimmed);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to send verification code');
        return;
      }

      logger.info('[EMAIL] OTP sent for signup to:', trimmed);
      updateData({ email: trimmed, termsAgreed: true });
      onNext();
    } catch (err: any) {
      logger.error('[EMAIL] OTP send error:', err);
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      showBackButton={true}
      hasTextInput={true}
      keyboardPersistent={true}
      continueDisabled={isSending}
    >
      <H1 className="mb-3">Sign up with .edu email</H1>
      <Body className="text-neutral-600 mb-8">
        Enter your .edu email to get started.
      </Body>

      <Input
        label="School Email"
        placeholder="you@school.edu"
        value={email}
        onChangeText={(text) => {
          setEmail(text.toLowerCase());
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
            : "We'll send a 6-digit code to verify your school email."}
        </Body>
      </StyledView>

      {/* Terms of Service checkbox */}
      <StyledTouchableOpacity
        onPress={() => {
          setAgreedToTerms(!agreedToTerms);
          if (error) setError('');
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: 20,
          minHeight: 44,
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreedToTerms }}
        accessibilityLabel="Agree to Terms of Service"
      >
        <StyledView
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: agreedToTerms ? COLORS.primary : COLORS.border,
            backgroundColor: agreedToTerms ? COLORS.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            marginTop: 2,
          }}
        >
          {agreedToTerms && (
            <StyledText style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>✓</StyledText>
          )}
        </StyledView>
        <StyledText style={{ flex: 1, fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, lineHeight: 20 }}>
          I agree to the{' '}
          <StyledText
            onPress={() => navigation.navigate('TermsOfService')}
            style={{ color: COLORS.primary, fontFamily: FONTS.semiBold }}
          >
            Terms of Service
          </StyledText>
        </StyledText>
      </StyledTouchableOpacity>

      {/* Sign In link */}
      <StyledView
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 20,
        }}
      >
        <StyledText
          style={{
            fontFamily: FONTS.regular,
            fontSize: FONT_SIZES.base,
            lineHeight: LINE_HEIGHTS.base,
            color: COLORS.text.secondary,
          }}
        >
          Already have an account?{' '}
        </StyledText>
        <StyledTouchableOpacity
          onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Welcome' as any }, { name: 'Login' as any }] })}
          style={{ minHeight: 44, justifyContent: 'center' }}
          accessibilityLabel="Sign In"
          accessibilityRole="button"
        >
          <StyledText
            style={{
              fontFamily: FONTS.semiBold,
              fontSize: FONT_SIZES.base,
              lineHeight: LINE_HEIGHTS.base,
              color: COLORS.primary,
            }}
          >
            Sign In
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </OnboardingLayout>
  );
};
