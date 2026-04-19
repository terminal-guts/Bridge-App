/**
 * Email Verification Screen (LOGIN flow).
 *
 * Layout matches the rest of the onboarding/auth flow: wrapped in OnboardingLayout,
 * H1 + Body hierarchy, single hidden <TextInput> + 6 visual boxes (same pattern as
 * EmailSignUpVerificationStep in the signup flow). Previously used a bespoke
 * BackHeader + ScrollView + KeyboardAvoidingView stack with 6 separate inputs —
 * was visually inconsistent with every other onboarding screen.
 *
 * "Wrong email? Edit it" button intentionally omitted — the OnboardingLayout back
 * button handles this: tap Back → edit email on LoginScreen → tap Continue →
 * lands here again.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { styled } from 'nativewind';
import { COLORS } from '../../theme/colors';
import { H1, Body } from '../../components/ui';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import {
  verifyLoginCode,
  sendLoginCode,
  signInWithPassword,
  isReviewerBypassEmail,
  validateReviewerAccess,
} from '../../services/authService';
import { fetchAndSetUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('EmailVerificationScreen');

interface EmailVerificationScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EmailVerification'>;
  route: RouteProp<RootStackParamList, 'EmailVerification'>;
}

const StyledView = styled(View);
const RESEND_COOLDOWN_SECONDS = 60;

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { email: rawEmail } = route.params;
  const email = rawEmail.trim();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isVerifyingRef = useRef(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleCodeChange = (text: string) => {
    // Generous maxLength on <TextInput> + strip non-digits here — handles
    // pastes from email clients that include whitespace / dashes / zero-width
    // chars that would otherwise truncate an otherwise-valid 6-digit code.
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
    if (digits.length === 6) {
      handleVerify(digits);
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    if (isVerifyingRef.current) return;
    const fullCode = verificationCode ?? code;
    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    isVerifyingRef.current = true;
    setLoading(true);
    Keyboard.dismiss();
    setError('');

    try {
      // App Store Reviewer Bypass — validated entirely server-side
      if (isReviewerBypassEmail(email)) {
        logger.info('[AUTH] App Store Reviewer bypass detected');
        const reviewerResult = await validateReviewerAccess(fullCode);
        if (!reviewerResult.valid || !reviewerResult.authPassword) {
          logger.error('[AUTH] Reviewer access validation failed');
          setLoading(false);
          isVerifyingRef.current = false;
          setError('Reviewer access validation failed.');
          setCode('');
          return;
        }
        const bypassResult = await signInWithPassword(email, reviewerResult.authPassword);
        if (bypassResult.ok) {
          const userId = bypassResult.data!.id;
          const fetchResult = await fetchAndSetUserProfile(userId);
          setLoading(false);
          if (fetchResult.ok && fetchResult.data) {
            (navigation as any).reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          } else {
            (navigation as any).reset({ index: 0, routes: [{ name: 'Onboarding', params: { skipAuth: true } }] });
          }
          return;
        }
        logger.error('[AUTH] Reviewer account login failed');
        setLoading(false);
        isVerifyingRef.current = false;
        setError('Reviewer account login failed.');
        setCode('');
        return;
      }

      const verifyResult = await verifyLoginCode(email, fullCode);
      if (!verifyResult.ok) {
        setLoading(false);
        isVerifyingRef.current = false;
        const msg = verifyResult.error?.message || '';
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token has expired')) {
          setError('That code has expired. Tap Resend for a new one.');
        } else {
          setError(msg || "That code didn't work. Double-check and try again.");
        }
        setCode('');
        return;
      }

      const userId = verifyResult.data!.id;
      logger.info('[AUTH] User authenticated:', userId);

      const fetchResult = await fetchAndSetUserProfile(userId);
      setLoading(false);
      isVerifyingRef.current = false;

      if (fetchResult.ok && fetchResult.data) {
        (navigation as any).reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        (navigation as any).reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      }
    } catch (e: any) {
      logger.error('[AUTH] Verification error:', e);
      setLoading(false);
      isVerifyingRef.current = false;
      setError('Something went wrong. Give it another try.');
      setCode('');
    }
  };

  const handleResendCode = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    try {
      const result = await sendLoginCode(email);
      if (!result.ok) {
        setError("Couldn't resend the code. Try again in a moment.");
        setResending(false);
        return;
      }
      setCanResend(false);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      setCode('');
      inputRef.current?.focus();
    } catch (e: any) {
      logger.error('[AUTH] Resend error:', e);
      setError('Something went wrong. Try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  const digits = code.split('');
  const isCodeComplete = code.length === 6;

  return (
    <OnboardingLayout
      onContinue={() => handleVerify()}
      onBack={() => navigation.goBack()}
      showBackButton={true}
      continueDisabled={!isCodeComplete || loading}
      hasTextInput={true}
      keyboardPersistent={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Verify your email</H1>
        <Body className="text-neutral-600 mb-4">
          We sent a 6-digit code to {email}
        </Body>
        <Body className="text-neutral-500 text-sm mb-12">
          Codes typically take ~30 seconds — sit tight.
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
          maxLength={64}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus={true}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />

        {loading ? (
          <StyledView className="flex-row items-center justify-center mb-4">
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Body className="text-neutral-500 text-sm ml-2">Verifying...</Body>
          </StyledView>
        ) : error ? (
          <Body className="text-red-500 text-sm mb-4 text-center">{error}</Body>
        ) : null}

        {/* Resend code — inline style matching EmailSignUpVerificationStep */}
        <StyledView className="flex-row justify-center items-center">
          <Body className="text-neutral-600">Didn't receive a code? </Body>
          {canResend ? (
            <Body
              className="text-primary-500 font-semibold"
              onPress={handleResendCode}
            >
              {resending ? 'Sending...' : 'Resend'}
            </Body>
          ) : (
            <Body className="text-neutral-500">{resendTimer}s</Body>
          )}
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
