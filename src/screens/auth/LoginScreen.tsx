import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { OnboardingLayout } from '../../components/OnboardingLayout';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface LoginScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Login'>;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
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
    // Basic phone validation - at least 10 digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (digitsOnly.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: In production, this will verify the phone number and send OTP
      // For now, create anonymous session for existing user login
      const { data, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        console.error('Anonymous auth error:', authError);
        Alert.alert(
          'Authentication Error',
          'Unable to sign in. Please try again or check your internet connection.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        console.error('No user returned from anonymous auth');
        Alert.alert(
          'Authentication Error',
          'Failed to sign in. Please try again.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // User session created successfully
      console.log('User signed in:', data.user.id);

      // Navigate to home screen
      navigation.navigate('MainTabs');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Unexpected error during authentication:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
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
        <Body className="text-neutral-600 mb-8">
          Enter your phone number to sign in
        </Body>

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

        <Body className="text-neutral-500 text-sm mt-4">
          We'll send you a code to verify your phone number.
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
