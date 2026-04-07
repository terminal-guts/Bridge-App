import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { isAllowedEmailDomain, sendOtpToEmail, signInWithGoogle } from '../../../services/authService';
import { fetchAndSetUserProfile } from '../../../services/profileService';
import { createLogger } from '../../../utils/secureLogger';
import { COLORS } from '../../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { EvaIcon } from '../../../components/icons';
import { showToast } from '../../../utils/toast';
import { lightHaptic } from '../../../utils/haptics';
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
  const [signingInGoogle, setSigningInGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    if (signingInGoogle) return;
    lightHaptic();
    setSigningInGoogle(true);

    const result = await signInWithGoogle();

    if (!result.ok) {
      setSigningInGoogle(false);
      if (result.error?.code === 'CANCELLED') return;
      showToast.error('Sign In Failed', result.error?.message || 'Please try again.');
      return;
    }

    const profileResult = await fetchAndSetUserProfile(result.data!.id);
    setSigningInGoogle(false);

    if (profileResult.ok && profileResult.data?.profileCompleted) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } else {
      // Already authenticated — skip to NameStep (skip remaining auth steps)
      // Navigate fresh to Onboarding with skipAuth so email steps are removed
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding', params: { skipAuth: true } }] });
    }
  };

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

    try {
      const result = await sendOtpToEmail(trimmed);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to send verification code');
        return;
      }

      logger.info('[EMAIL] OTP sent for signup to:', trimmed);
      updateData({ email: trimmed });
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
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <H1 className="mb-3">Sign up with Rice email</H1>
      <Body className="text-neutral-600 mb-8">
        Enter your @rice.edu email to get started.
      </Body>

      <Input
        label="Rice Email"
        placeholder="netid@rice.edu"
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
            : "We'll send a 6-digit code to verify your Rice email."}
        </Body>
      </StyledView>

      {/* Divider */}
      <StyledView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 24,
          marginBottom: 16,
        }}
      >
        <StyledView style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
        <StyledText
          style={{
            fontFamily: FONTS.regular,
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.tertiary,
            marginHorizontal: 12,
          }}
        >
          or
        </StyledText>
        <StyledView style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
      </StyledView>

      {/* Google Sign In */}
      <StyledTouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={signingInGoogle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: COLORS.border,
          backgroundColor: COLORS.card,
          opacity: signingInGoogle ? 0.7 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel="Continue with Rice Google"
      >
        <EvaIcon name="google" variant="outline" size={20} color={COLORS.text.primary} style={{ marginRight: 10 }} />
        <StyledText
          style={{
            fontFamily: FONTS.semiBold,
            fontSize: FONT_SIZES.base,
            lineHeight: LINE_HEIGHTS.base,
            color: COLORS.text.primary,
          }}
        >
          {signingInGoogle ? 'Signing in...' : 'Continue with Rice Google'}
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
          onPress={() => navigation.navigate('Login')}
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
