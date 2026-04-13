import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { Button, H2, Body, ScreenWrapper, BackHeader } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { verifyEmail, sendLoginOtpToEmail, signInWithPassword, isReviewerBypassEmail, validateReviewerAccess } from '../../services/authService';
import { fetchAndSetUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

const logger = createLogger('EmailVerificationScreen');

interface EmailVerificationScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EmailVerification'>;
  route: RouteProp<RootStackParamList, 'EmailVerification'>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

const EMPTY_CODE = ['', '', '', '', '', ''];
const RESEND_COOLDOWN_SECONDS = 60;

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  navigation,
  route
}) => {
  const { email: rawEmail } = route.params;
  const email = rawEmail.trim();
  const [code, setCode] = useState(EMPTY_CODE);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Small delay lets the screen transition finish before stealing focus
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  const clearCodeAndFocus = () => {
    setCode([...EMPTY_CODE]);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const handleCodeChange = (index: number, value: string) => {
    // Clear error on any new input
    if (error) setError('');

    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];

    if (value.length > 1) {
      // Paste / autofill: if a full 6-digit paste arrives, fill from index 0
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const startIndex = digits.length === 6 ? 0 : index;
      digits.forEach((digit, i) => {
        if (startIndex + i < 6) {
          newCode[startIndex + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(startIndex + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Empty cell backspace: move back and clear previous cell
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
      if (error) setError('');
    }
  };

  const handleVerify = async () => {
    const otpCode = code.join('');
    if (otpCode.length !== 6) return;

    Keyboard.dismiss();
    setError('');
    setLoading(true);

    try {
      // App Store Reviewer Bypass — validated entirely server-side
      if (isReviewerBypassEmail(email)) {
        logger.info('[AUTH] App Store Reviewer bypass detected');
        const reviewerResult = await validateReviewerAccess(otpCode);
        if (!reviewerResult.valid || !reviewerResult.authPassword) {
          logger.error('[AUTH] Reviewer access validation failed');
          setLoading(false);
          setError('Reviewer access validation failed.');
          clearCodeAndFocus();
          return;
        }
        const bypassResult = await signInWithPassword(email, reviewerResult.authPassword);

        if (bypassResult.ok) {
          const userId = bypassResult.data!.id;
          const fetchResult = await fetchAndSetUserProfile(userId);
          setLoading(false);
          if (fetchResult.ok && fetchResult.data) {
            navigation.navigate('MainTabs');
          } else {
            navigation.navigate('Onboarding', { skipAuth: true });
          }
          return;
        } else {
          logger.error('[AUTH] Reviewer account login failed');
          setLoading(false);
          setError('Reviewer account login failed.');
          clearCodeAndFocus();
          return;
        }
      }

      const verifyResult = await verifyEmail(email, otpCode);

      if (!verifyResult.ok) {
        setLoading(false);
        const msg = verifyResult.error?.message || '';
        // Detect expired code errors and give a helpful nudge
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token has expired')) {
          setError('That code has expired. Tap "Resend Code" to get a new one.');
        } else {
          setError(msg || 'That code didn\'t work. Double-check and try again.');
        }
        clearCodeAndFocus();
        return;
      }

      const userId = verifyResult.data!.id;
      logger.info('[AUTH] User authenticated:', userId);

      const fetchResult = await fetchAndSetUserProfile(userId);
      setLoading(false);

      if (fetchResult.ok && fetchResult.data) {
        logger.info('[AUTH] Profile found, navigating to MainTabs');
        navigation.navigate('MainTabs');
      } else {
        logger.info('[AUTH] No profile found, navigating to Onboarding');
        navigation.navigate('Onboarding');
      }
    } catch (e: any) {
      logger.error('[AUTH] Verification error:', e);
      setLoading(false);
      setError('Something went wrong. Give it another try.');
      clearCodeAndFocus();
    }
  };

  const isCodeComplete = code.every(digit => digit !== '');

  const handleResendCode = async () => {
    if (!canResend || resending) return;

    setResending(true);
    setError('');

    try {
      const result = await sendLoginOtpToEmail(email);

      if (!result.ok) {
        setError('Couldn\'t resend the code. Try again in a moment.');
        setResending(false);
        return;
      }

      setCanResend(false);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      clearCodeAndFocus();
    } catch (e: any) {
      logger.error('[AUTH] Resend error:', e);
      setError('Something went wrong. Try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <StyledView className="flex-1 px-6 pt-2">
            <BackHeader title="Verify Email" showBorder={false} />

            {/* Header */}
            <StyledView className="items-center mb-4">
              <Body className="text-neutral-600 text-center px-6">
                Enter the 6-digit code sent to {email}
              </Body>
            </StyledView>

            {/* OTP Input Boxes */}
            <StyledView
              className="flex-row justify-center mb-2"
              accessibilityLabel="Verification code input"
              accessibilityHint="Enter the 6-digit verification code"
            >
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => { inputRefs.current[index] = ref; }}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  accessibilityLabel={`Digit ${index + 1} of 6`}
                  accessibilityHint={digit ? `Current value: ${digit}` : 'Empty'}
                  editable={!loading}
                  style={[
                    styles.otpInput,
                    focusedIndex === index && styles.otpInputFocused,
                    error ? styles.otpInputError : null,
                  ]}
                  selectionColor={COLORS.primaryAccent}
                />
              ))}
            </StyledView>

            {/* Inline Error Message */}
            {error ? (
              <StyledView className="items-center mb-4 px-4">
                <Body style={styles.errorText}>{error}</Body>
              </StyledView>
            ) : (
              <StyledView className="mb-4" />
            )}

            {/* Resend Section */}
            <StyledView className="items-center mb-3">
              <Body className="text-neutral-600 mb-2">Didn't receive the code?</Body>
              {canResend ? (
                <StyledTouchableOpacity
                  onPress={handleResendCode}
                  disabled={resending}
                  style={styles.resendButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Resend verification code"
                >
                  <Body className="text-primary-500 font-semibold">
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Body>
                </StyledTouchableOpacity>
              ) : (
                <Body className="text-neutral-500">
                  Resend in {resendTimer}s
                </Body>
              )}
            </StyledView>

            {/* Verify Button */}
            <StyledView className="mb-8">
              <Button
                onPress={handleVerify}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!isCodeComplete || loading}
                loading={loading}
                accessibilityLabel="Verify code"
                accessibilityHint={isCodeComplete ? 'Tap to verify your code' : 'Enter all 6 digits first'}
              >
                Verify Code
              </Button>
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  resendButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    width: 48,
    height: 56,
    marginHorizontal: 4,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: FONT_SIZES['3xl'],
    lineHeight: LINE_HEIGHTS['3xl'],
    fontFamily: FONTS.semiBold,
    color: COLORS.text.primary,
    ...SHADOWS.sm,
  },
  otpInputFocused: {
    borderColor: COLORS.primaryAccent,
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
});
