import React, { useState, useEffect, useRef } from 'react';
import { View, SafeAreaView, StatusBar, TouchableOpacity, TextInput, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { Button, H1, H2, Body } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { verifyPhone, sendOtpToPhone, verifyEmail, sendOtpToEmail, signInWithPassword } from '../../services/authService';
import { fetchAndSetUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('PhoneVerificationScreen');

interface PhoneVerificationScreenProps {
  navigation: NavigationProp<RootStackParamList, 'PhoneVerification'>;
  route: RouteProp<RootStackParamList, 'PhoneVerification'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const PhoneVerificationScreen: React.FC<PhoneVerificationScreenProps> = ({
  navigation,
  route
}) => {
  const { phoneNumber, fromOnboarding, onboardingData, isEmail } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Create refs for each input
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Auto-focus first input on mount
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
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];

    // Handle paste or single character input
    if (value.length > 1) {
      // Handle paste - split and fill boxes
      const digits = value.slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      // Focus the last filled input or the next empty one
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Handle single character
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    // Handle backspace
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    setLoading(true);

    // Join the code array into a single string
    const otpCode = code.join('');

    // App Store Reviewer Bypass
    const isTestPhone = phoneNumber === '+15555555555' || phoneNumber === '5555555555';
    if (!isEmail && isTestPhone && otpCode === '123456' && (__DEV__ || process.env.EXPO_PUBLIC_ENABLE_REVIEWER_BYPASS === 'true')) {
      logger.info('[AUTH] App Store Reviewer bypass detected');
      const bypassResult = await signInWithPassword('reviewer@bridgedate.app', 'AppReview2024!');

      if (bypassResult.ok) {
        // Continue to profile fetch as if verified
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
        Alert.alert('Bypass Failed', 'Reviewer account login failed. Please check credentials or network.');
        return;
      }
    }

    // Verify OTP with Backend (which checks Supabase)
    let verifyResult;
    if (isEmail) {
      verifyResult = await verifyEmail(phoneNumber, otpCode);
    } else {
      verifyResult = await verifyPhone(phoneNumber, otpCode);
    }

    if (!verifyResult.ok) {
      setLoading(false);
      Alert.alert('Verification Failed', verifyResult.error?.message || 'Invalid code. Please try again.');
      // Clear the code inputs
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    // User is now authenticated via Supabase! Session is persisted automatically.
    // verifyResult.data contains the authenticated user.
    const userId = verifyResult.data!.id;
    logger.info('[AUTH] User authenticated:', userId);

    // Try to fetch existing profile to determine where to navigate
    const fetchResult = await fetchAndSetUserProfile(userId);

    setLoading(false);

    if (fetchResult.ok && fetchResult.data) {
      // User has a profile — go to main app
      logger.info('[AUTH] Profile found, navigating to MainTabs');
      navigation.navigate('MainTabs');
    } else {
      // No profile yet — send to onboarding to complete signup
      logger.info('[AUTH] No profile found, navigating to Onboarding');
      navigation.navigate('Onboarding');
    }
  };

  const isCodeComplete = code.every(digit => digit !== '');

  const handleResendCode = async () => {
    if (!canResend) return;

    // Resend OTP code
    let result;
    if (isEmail) {
      result = await sendOtpToEmail(phoneNumber);
    } else {
      result = await sendOtpToPhone(phoneNumber);
    }

    if (!result.ok) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
      return;
    }

    // Reset UI
    setCanResend(false);
    setResendTimer(60);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />
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
                <H1 className="text-primary-500 text-2xl">📱</H1>
              </StyledView>

              {/* Title */}
              <H2 className="text-center mb-2">Verify your {isEmail ? 'email' : 'phone'}</H2>

              {/* Description */}
              <Body className="text-neutral-600 text-center mb-6 px-6">
                Enter the 6-digit code sent to {phoneNumber}
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
                  selectionColor="#FF6B6B"
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
    </StyledSafeAreaView>
  );
};

const styles = StyleSheet.create({
  otpInput: {
    width: 48,
    height: 56,
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#101828',
  },
  otpInputFocused: {
    borderColor: '#437FFF',
  },
});
