import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { OnboardingLayout } from '../../components/OnboardingLayout';
import { Ionicons } from '@expo/vector-icons';
import { sendOtpToPhone, sendOtpToEmail } from '../../services/authService';
import { showToast } from '../../utils/toast';

interface LoginScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Login'>;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const validateAndContinue = async () => {
    setError('');

    if (loginMethod === 'phone') {
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      if (!phoneNumber.trim()) {
        setError('Phone number is required');
        return;
      }
      if (digitsOnly.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }
    } else {
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setIsLoading(true);

    try {
      let result;
      if (loginMethod === 'phone') {
        result = await sendOtpToPhone(phoneNumber);
      } else {
        result = await sendOtpToEmail(email);
      }

      if (result.ok) {
        // Navigate to verification screen (assuming it exists, otherwise we'll check)
        // RootStackParamList needs to support PhoneVerification
        // For this task, we'll navigate to PhoneVerification as it likely handles OTP
        navigation.navigate('PhoneVerification', {
          phoneNumber: loginMethod === 'phone' ? phoneNumber : email,
          isEmail: loginMethod === 'email'
        });
      } else {
        setError(result.error?.message || 'Failed to send verification code');
      }
      setIsLoading(false);
    } catch (error: any) {
      console.error('Login error:', error);
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
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        <Body className="text-primary-500 ml-2 font-medium">Back</Body>
      </StyledTouchableOpacity>

      <StyledView>
        <H1 className="mb-3">Welcome back</H1>
        <Body className="text-neutral-600 mb-6">
          Sign in to your account
        </Body>

        {/* Login Method Toggle */}
        <StyledView className="flex-row bg-neutral-100 p-1 rounded-xl mb-8">
          <StyledTouchableOpacity
            onPress={() => setLoginMethod('phone')}
            className={`flex-1 py-3 rounded-lg flex-row items-center justify-center ${loginMethod === 'phone' ? 'bg-white shadow-sm' : ''}`}
          >
            <Ionicons name="call-outline" size={18} color={loginMethod === 'phone' ? '#3B82F6' : '#6B7280'} />
            <Body className={`ml-2 font-medium ${loginMethod === 'phone' ? 'text-primary-500' : 'text-neutral-500'}`}>Phone</Body>
          </StyledTouchableOpacity>
          <StyledTouchableOpacity
            onPress={() => setLoginMethod('email')}
            className={`flex-1 py-3 rounded-lg flex-row items-center justify-center ${loginMethod === 'email' ? 'bg-white shadow-sm' : ''}`}
          >
            <Ionicons name="mail-outline" size={18} color={loginMethod === 'email' ? '#3B82F6' : '#6B7280'} />
            <Body className={`ml-2 font-medium ${loginMethod === 'email' ? 'text-primary-500' : 'text-neutral-500'}`}>Email</Body>
          </StyledTouchableOpacity>
        </StyledView>

        {loginMethod === 'phone' ? (
          <Input
            label="Phone Number"
            placeholder="(555) 555-5555"
            value={phoneNumber}
            onChangeText={(text) => {
              const formatted = formatPhoneNumber(text);
              setPhoneNumber(formatted);
              if (error) setError('');
            }}
            keyboardType="phone-pad"
            error={error}
            containerClassName="mb-4"
            autoFocus={true}
          />
        ) : (
          <Input
            label="Email Address"
            placeholder="email@example.com"
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
        )}

        <Body className="text-neutral-500 text-sm mt-4">
          We'll send you a code to verify your {loginMethod === 'phone' ? 'phone number' : 'email'}.
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
