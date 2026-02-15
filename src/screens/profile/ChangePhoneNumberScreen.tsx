import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ChangePhoneNumberScreen');

interface ChangePhoneNumberScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

export const ChangePhoneNumberScreen: React.FC<ChangePhoneNumberScreenProps> = ({ navigation }) => {
  const [currentPhone, setCurrentPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user and phone number
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadCurrentPhone();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        Alert.alert('Error', 'You must be logged in');
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadCurrentPhone = async () => {
    setLoading(true);
    try {
      // Get phone from Supabase auth user
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        logger.error('Failed to load user:', error);
        Alert.alert('Error', 'Failed to load phone number');
        setLoading(false);
        return;
      }

      // Get phone from user metadata or phone field
      const phone = user.phone || user.user_metadata?.phone || user.user_metadata?.phoneNumber;

      if (phone) {
        // Format the phone number for display
        setCurrentPhone(formatPhoneNumber(phone));
      } else {
        // Fallback if no phone found
        setCurrentPhone('No phone number on file');
      }
    } catch (error) {
      logger.error('Failed to load phone:', error);
      Alert.alert('Error', 'Failed to load phone number');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setNewPhone(formatted);
  };

  const handleSendCode = () => {
    if (!newPhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    // Validate phone number format (should be 10 digits)
    const cleaned = newPhone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Check if it's the same as current
    const currentCleaned = currentPhone.replace(/\D/g, '');
    if (cleaned === currentCleaned) {
      Alert.alert('Error', 'This is already your current phone number');
      return;
    }

    setSending(true);

    // Mock sending verification code
    setTimeout(() => {
      setSending(false);
      setCodeSent(true);
      Alert.alert(
        'Code Sent',
        `A verification code has been sent to ${newPhone}`,
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    // For now, any code works (mock verification)
    setVerifying(true);

    setTimeout(async () => {
      try {
        // Mock successful verification
        // In a real app, you would verify the code with your backend first

        // Update the phone number in Supabase auth user metadata
        const { error: updateError } = await supabase.auth.updateUser({
          phone: newPhone.replace(/\D/g, ''), // Store without formatting
          data: {
            phoneNumber: newPhone.replace(/\D/g, ''),
          }
        });

        if (updateError) {
          logger.error('Failed to update phone:', updateError);
          setVerifying(false);
          Alert.alert('Error', 'Failed to update phone number. Please try again.');
          return;
        }

        setVerifying(false);
        Alert.alert(
          'Success',
          'Your phone number has been updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Update current phone to the new one
                setCurrentPhone(newPhone);
                setNewPhone('');
                setVerificationCode('');
                setCodeSent(false);
                navigation.goBack();
              },
            },
          ]
        );
      } catch (error) {
        setVerifying(false);
        Alert.alert('Error', 'Failed to verify code. Please try again.');
      }
    }, 1000);
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Change Phone Number</H3>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Loading State */}
          {loading ? (
            <StyledView className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#437FFF" />
              <Body className="text-neutral-500 mt-4">Loading...</Body>
            </StyledView>
          ) : (
            <>
              {/* Current Phone */}
              <Card className="mb-6">
                <H3 className="mb-2">Current Phone Number</H3>
                <Body className="text-neutral-600 text-lg">{currentPhone}</Body>
              </Card>

              {/* New Phone Input or Verification Code */}
              <Card className="mb-6">
                {!codeSent ? (
                  <>
                    <H3 className="mb-3">New Phone Number</H3>
                    <Body className="text-neutral-600 text-sm mb-4">
                      Enter your new phone number below. We'll send you a verification code.
                    </Body>
                    <StyledTextInput
                      value={newPhone}
                      onChangeText={handlePhoneChange}
                      placeholder="(555) 123-4567"
                      keyboardType="phone-pad"
                      maxLength={14}
                      className="bg-white border border-neutral-300 rounded-lg px-4 py-3 text-neutral-900 mb-4"
                    />
                    <Button
                      onPress={handleSendCode}
                      variant="primary"
                      fullWidth
                      loading={sending}
                    >
                      Send Verification Code
                    </Button>
                  </>
                ) : (
                  <>
                    <H3 className="mb-3">Verification Code</H3>
                    <Body className="text-neutral-600 text-sm mb-4">
                      Enter the 6-digit code sent to {newPhone}
                    </Body>
                    <StyledTextInput
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="123456"
                      keyboardType="number-pad"
                      maxLength={6}
                      className="bg-white border border-neutral-300 rounded-lg px-4 py-3 text-neutral-900 mb-4 text-center text-lg tracking-wider"
                    />
                    <Button
                      onPress={handleVerifyCode}
                      variant="primary"
                      fullWidth
                      loading={verifying}
                    >
                      Verify & Update
                    </Button>

                    <StyledTouchableOpacity
                      onPress={() => {
                        setCodeSent(false);
                        setVerificationCode('');
                      }}
                      className="mt-4"
                    >
                      <Body className="text-primary text-sm text-center">
                        Change Number
                      </Body>
                    </StyledTouchableOpacity>
                  </>
                )}
              </Card>

              {/* Info Card */}
              <Card className="bg-primary-50 border border-primary-200">
                <StyledView className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#437FFF" />
                  <StyledView className="flex-1 ml-3">
                    <Body className="text-primary-900 font-semibold text-sm mb-1">
                      Important
                    </Body>
                    <Body className="text-primary-700 text-sm">
                      Your phone number is used for security and login. Make sure you have access to the new number before changing it.
                    </Body>
                  </StyledView>
                </StyledView>
              </Card>
            </>
          )}
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};
