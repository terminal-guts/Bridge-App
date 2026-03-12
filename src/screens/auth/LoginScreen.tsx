import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { EvaIcon  } from '../../components/icons';
import { sendOtpToEmail, isAllowedEmailDomain } from '../../services/authService';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('LoginScreen');

interface LoginScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Login'>;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateAndContinue = async () => {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isAllowedEmailDomain(email)) {
      setError('Only Rice University emails (@rice.edu) are allowed.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendOtpToEmail(email);

      if (result.ok) {
        navigation.navigate('PhoneVerification', {
          phoneNumber: email,
          isEmail: true,
        });
      } else {
        setError(result.error?.message || 'Failed to send verification code');
      }
      setIsLoading(false);
    } catch (error: any) {
      logger.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      onContinue={validateAndContinue}
      hasTextInput={true}
      keyboardPersistent={true}
      topPadding={20}
    >
      {/* Back Button */}
      <StyledTouchableOpacity
        onPress={() => navigation.goBack()}
        className="mb-8 flex-row items-center"
      >
        <EvaIcon name="arrow-back" size={24} color="#3B82F6" />
        <Body className="text-primary-500 ml-2 font-medium">Back</Body>
      </StyledTouchableOpacity>

      <StyledView>
        <H1 className="mb-3">Welcome back</H1>
        <Body className="text-neutral-600 mb-6">
          Sign in with your Rice email
        </Body>

        <Input
          label="Email Address"
          placeholder="netid@rice.edu"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={error}
          containerClassName="mb-4"
          autoFocus={true}
        />

        <Body className="text-neutral-500 text-sm mt-4">
          {isLoading ? 'Sending verification code...' : "We'll send you a code to verify your email."}
        </Body>

        <StyledView className="flex-row justify-center mt-6">
          <Body className="text-neutral-600">Don't have an account? </Body>
          <StyledTouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
            <Body className="text-primary-500">Sign Up</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
