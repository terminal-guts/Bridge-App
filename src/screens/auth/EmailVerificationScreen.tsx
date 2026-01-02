import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Button, H1, H2, Body } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';

interface EmailVerificationScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EmailVerification'>;
  route: RouteProp<RootStackParamList, 'EmailVerification'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  navigation,
  route
}) => {
  const { email } = route.params;
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

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

  const handleResendEmail = () => {
    if (!canResend) return;
    // Simulate resending email
    setCanResend(false);
    setResendTimer(60);
  };

  const handleContinue = () => {
    // Navigate to onboarding
    navigation.navigate('Onboarding');
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />
      <StyledView className="flex-1 px-6">
        {/* Icon */}
        <StyledView className="flex-1 items-center justify-center">
          <StyledView className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center mb-6">
            <H1 className="text-primary-500 text-3xl">✉️</H1>
          </StyledView>

          {/* Title */}
          <H2 className="text-center mb-3">Verify your email</H2>

          {/* Description */}
          <Body className="text-neutral-600 text-center mb-2 px-6">
            We've sent a verification email to:
          </Body>
          <Body className="text-neutral-900 font-semibold text-center mb-6">
            {email}
          </Body>

          <Body className="text-neutral-600 text-center mb-8 px-6">
            Please check your inbox and click the verification link to continue.
          </Body>

          {/* Resend Section */}
          <StyledView className="items-center mb-8">
            <Body className="text-neutral-600 mb-2">Didn't receive the email?</Body>
            {canResend ? (
              <StyledTouchableOpacity onPress={handleResendEmail}>
                <Body className="text-primary-500 font-semibold">Resend Email</Body>
              </StyledTouchableOpacity>
            ) : (
              <Body className="text-neutral-500">
                Resend in {resendTimer}s
              </Body>
            )}
          </StyledView>
        </StyledView>

        {/* Bottom Actions */}
        <StyledView className="pb-8">
          <Button
            onPress={handleContinue}
            variant="primary"
            size="lg"
            fullWidth
            className="mb-3"
          >
            I've Verified My Email
          </Button>
          <Button
            onPress={() => navigation.navigate('Onboarding')}
            variant="ghost"
            size="lg"
            fullWidth
          >
            Use Different Email
          </Button>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  );
};