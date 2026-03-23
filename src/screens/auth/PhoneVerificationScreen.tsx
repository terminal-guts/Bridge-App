import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { Button, H2, Body, ScreenWrapper } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { verifyEmail, sendOtpToEmail, signInWithPassword, isReviewerBypassEmail, validateReviewerAccess } from '../../services/authService';
import { fetchAndSetUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';
import { EvaIcon } from '../../components/icons';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

const logger = createLogger('PhoneVerificationScreen');

interface PhoneVerificationScreenProps {
  navigation: NavigationProp<RootStackParamList, 'PhoneVerification'>;
  route: RouteProp<RootStackParamList, 'PhoneVerification'>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const PhoneVerificationScreen: React.FC<PhoneVerificationScreenProps> = ({
  navigation,
  route
}) => {
  const { phoneNumber } = route.params;
  const email = phoneNumber; // Route param is named phoneNumber for compat, but it's always email now
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];

    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
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
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    setLoading(true);

    const otpCode = code.join('');

    // App Store Reviewer Bypass — validated entirely server-side
    if (isReviewerBypassEmail(email)) {
      logger.info('[AUTH] App Store Reviewer bypass detected');
      const reviewerResult = await validateReviewerAccess(otpCode);
      if (!reviewerResult.valid || !reviewerResult.authPassword) {
        logger.error('[AUTH] Reviewer access validation failed');
        setLoading(false);
        Alert.alert('Bypass Failed', 'Reviewer access validation failed.');
        return;
      }
      const bypassResult = await signInWithPassword('reviewer@bridgedate.app', reviewerResult.authPassword);

      if (bypassResult.ok) {
        const userId = bypassResult.data!.id;
        const fetchResult = await fetchAndSetUserProfile(userId);
        setLoading(false);
        if (fetchResult.ok && fetchResult.data) {
          navigation.navigate('MainTabs');
        } else {
          navigation.navigate('Onboarding');
        }
        return;
      } else {
        logger.error('[AUTH] Reviewer account login failed');
        setLoading(false);
        Alert.alert('Bypass Failed', 'Reviewer account login failed.');
        return;
      }
    }

    const verifyResult = await verifyEmail(email, otpCode);

    if (!verifyResult.ok) {
      setLoading(false);
      Alert.alert('Verification Failed', verifyResult.error?.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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
  };

  const isCodeComplete = code.every(digit => digit !== '');

  const handleResendCode = async () => {
    if (!canResend) return;

    const result = await sendOtpToEmail(email);

    if (!result.ok) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
      return;
    }

    setCanResend(false);
    setResendTimer(60);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StyledView className="flex-1 px-6 pt-16">
            {/* Icon */}
            <StyledView className="items-center mb-6">
              <StyledView className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-4">
                <EvaIcon name="email" variant="outline" size={28} color="#437FFF" />
              </StyledView>

              <H2 className="text-center mb-2">Verify your email</H2>

              <Body className="text-neutral-600 text-center mb-6 px-6">
                Enter the 6-digit code sent to {email}
              </Body>
            </StyledView>

            {/* OTP Input Boxes */}
            <StyledView className="flex-row justify-center mb-6">
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
                  style={[
                    styles.otpInput,
                    focusedIndex === index && styles.otpInputFocused
                  ]}
                  selectionColor={COLORS.primaryAccent}
                />
              ))}
            </StyledView>

            {/* Resend Section */}
            <StyledView className="items-center mb-6">
              <Body className="text-neutral-600 mb-2">Didn't receive the code?</Body>
              {canResend ? (
                <StyledTouchableOpacity onPress={handleResendCode}>
                  <Body className="text-primary-500 font-semibold">Resend Code</Body>
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
  otpInput: {
    width: 48,
    height: 56,
    marginHorizontal: 4,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: FONT_SIZES['3xl'],
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
    color: '#101828',
  },
  otpInputFocused: {
    borderColor: COLORS.primaryAccent,
  },
});
