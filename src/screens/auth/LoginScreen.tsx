import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { sendLoginCode, isAllowedEmailDomain } from '../../services/authService';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';

const logger = createLogger('LoginScreen');

interface LoginScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Login'>;
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateAndContinue = async () => {
    if (isLoading) return;
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isAllowedEmailDomain(email)) {
      setError('Please use your @rice.edu email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendLoginCode(email.trim().toLowerCase());

      if (result.ok) {
        navigation.navigate('EmailVerification', {
          email: email.trim().toLowerCase(),
        });
      } else {
        setError(result.error?.message || 'Failed to send code. Try again.');
      }
      setIsLoading(false);
    } catch (error: any) {
      logger.error('Login error:', error);
      setError('Something went wrong. Check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      onBack={() => navigation.goBack()}
      showBackButton={true}
      onContinue={validateAndContinue}
      continueDisabled={isLoading}
      hasTextInput={true}
      keyboardPersistent={true}
    >
      <H1 className="mb-2">Welcome Back</H1>
      <Body className="text-neutral-500 text-sm mb-6">
        Enter your .edu email to sign in.
      </Body>

      <Input
        label="School Email"
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
        autoFocus={true}
      />

      <Body className="text-neutral-400 text-xs mt-2 mb-6">
        {isLoading ? 'Looking up your account...' : "We'll send a quick code to your inbox."}
      </Body>

      {/* Sign Up link */}
      <StyledView className="flex-row justify-center items-center">
        <Body className="text-neutral-600">Don't have an account? </Body>
        <StyledTouchableOpacity
          onPress={() => (navigation as any).reset({ index: 1, routes: [{ name: 'Welcome' }, { name: 'Onboarding', params: { skipAuth: false } }] })}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Body style={{ fontFamily: FONTS.semiBold, color: COLORS.primary }}>
            Sign Up
          </Body>
        </StyledTouchableOpacity>
      </StyledView>
    </OnboardingLayout>
  );
};
