import React, { useState } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface ProfileVerificationScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export const ProfileVerificationScreen: React.FC<ProfileVerificationScreenProps> = ({ navigation }) => {
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSendVerificationEmail = async () => {
    setEmailSent(true);
    // In a real app, this would send a verification email
    Alert.alert(
      'Email Sent',
      'We\'ve sent a verification link to your email address. Please check your inbox.',
      [{ text: 'OK' }]
    );

    // Simulate email verification after 3 seconds for demo
    setTimeout(() => {
      setEmailVerified(true);
      Alert.alert('Success', 'Your email has been verified!');
    }, 3000);
  };

  const handleTakeSelfie = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to verify your identity');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0]) {
      setSelfieUri(result.assets[0].uri);
      setSelfieUploaded(true);
    }
  };

  const handleCompleteVerification = async () => {
    if (!emailVerified || !selfieUploaded) {
      Alert.alert(
        'Incomplete Verification',
        'Please complete both email and selfie verification to continue.'
      );
      return;
    }

    setVerifying(true);

    // Simulate verification process
    setTimeout(() => {
      setVerifying(false);
      Alert.alert(
        'Verification Complete!',
        'Your profile has been successfully verified. You now have a verified badge on your profile.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 2000);
  };

  const isComplete = emailVerified && selfieUploaded;

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <StyledView className="flex-1">
          <H3>Profile Verification</H3>
        </StyledView>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Verification Overview Card - Combines Status + Why Verify */}
          <Card className="mb-4">
            <StyledView className="flex-row items-center mb-4">
              <StyledView
                className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  isComplete ? 'bg-success' : 'bg-primary-500'
                }`}
              >
                <Ionicons
                  name={isComplete ? 'checkmark-circle' : 'shield-checkmark'}
                  size={24}
                  color="white"
                />
              </StyledView>
              <StyledView className="flex-1">
                <H3 className="text-neutral-900 mb-1">
                  {isComplete ? 'Verification Complete' : 'Get Verified'}
                </H3>
                <Body className="text-neutral-600 text-sm">
                  {isComplete
                    ? 'Your profile is verified'
                    : '3x more engagement with verified badge'}
                </Body>
              </StyledView>
            </StyledView>

            {/* Benefits List */}
            {!isComplete && (
              <StyledView className="bg-neutral-50 rounded-lg p-3 space-y-2">
                <StyledView className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#12B981" />
                  <Body className="text-neutral-700 text-sm ml-2 flex-1">
                    Build trust with verified badge
                  </Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#12B981" />
                  <Body className="text-neutral-700 text-sm ml-2 flex-1">
                    Priority visibility in matches
                  </Body>
                </StyledView>
              </StyledView>
            )}
          </Card>

          {/* Combined Verification Steps Card */}
          <Card className="mb-4">
            <H3 className="mb-4">Verification Steps</H3>

            {/* Email Verification Step */}
            <StyledView className="mb-4 pb-4 border-b border-neutral-100">
              <StyledView className="flex-row items-center justify-between mb-3">
                <StyledView className="flex-row items-center flex-1">
                  <StyledView
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      emailVerified ? 'bg-success' : 'bg-primary-100'
                    }`}
                  >
                    <Ionicons
                      name={emailVerified ? 'checkmark' : 'mail-outline'}
                      size={20}
                      color={emailVerified ? 'white' : '#437FFF'}
                    />
                  </StyledView>
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-semibold mb-1">Email Verification</Body>
                    <Body className="text-neutral-600 text-sm">
                      {emailVerified
                        ? 'Email verified successfully'
                        : emailSent
                        ? 'Check your inbox for verification link'
                        : 'Verify your email address'}
                    </Body>
                  </StyledView>
                </StyledView>
                {emailVerified && (
                  <Ionicons name="checkmark-circle" size={24} color="#12B981" />
                )}
              </StyledView>

              {!emailVerified && (
                <Button
                  onPress={handleSendVerificationEmail}
                  variant={emailSent ? 'secondary' : 'primary'}
                  fullWidth
                  disabled={emailVerified}
                >
                  {emailSent ? 'Resend Email' : 'Send Verification Email'}
                </Button>
              )}
            </StyledView>

            {/* Selfie Verification Step */}
            <StyledView>
              <StyledView className="flex-row items-center justify-between mb-3">
                <StyledView className="flex-row items-center flex-1">
                  <StyledView
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      selfieUploaded ? 'bg-success' : 'bg-primary-100'
                    }`}
                  >
                    <Ionicons
                      name={selfieUploaded ? 'checkmark' : 'camera-outline'}
                      size={20}
                      color={selfieUploaded ? 'white' : '#437FFF'}
                    />
                  </StyledView>
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-semibold mb-1">Selfie Verification</Body>
                    <Body className="text-neutral-600 text-sm">
                      {selfieUploaded
                        ? 'Selfie uploaded successfully'
                        : 'Take a selfie to verify your identity'}
                    </Body>
                  </StyledView>
                </StyledView>
                {selfieUploaded && (
                  <Ionicons name="checkmark-circle" size={24} color="#12B981" />
                )}
              </StyledView>

              {selfieUri && (
                <StyledView className="mb-3">
                  <StyledImage
                    source={{ uri: selfieUri }}
                    className="w-full h-48 rounded-lg"
                    resizeMode="cover"
                  />
                </StyledView>
              )}

              {/* Selfie Guidelines - Inline */}
              {!selfieUploaded && (
                <StyledView className="bg-blue-50 rounded-lg p-3 mb-3">
                  <StyledView className="flex-row items-start mb-2">
                    <Ionicons name="information-circle" size={16} color="#437FFF" />
                    <Body className="text-neutral-700 font-medium text-xs ml-2">
                      Guidelines
                    </Body>
                  </StyledView>
                  <Body className="text-neutral-600 text-xs leading-relaxed">
                    Face camera directly • Good lighting • No sunglasses
                  </Body>
                </StyledView>
              )}

              {!selfieUploaded && (
                <Button onPress={handleTakeSelfie} variant="primary" fullWidth>
                  Take Selfie
                </Button>
              )}

              {selfieUploaded && selfieUri && (
                <Button onPress={handleTakeSelfie} variant="secondary" fullWidth>
                  Retake Selfie
                </Button>
              )}
            </StyledView>
          </Card>

          {/* Complete Verification Button */}
          <Button
            onPress={handleCompleteVerification}
            variant={isComplete ? 'primary' : 'secondary'}
            fullWidth
            disabled={!isComplete || verifying}
          >
            {verifying
              ? 'Verifying...'
              : isComplete
              ? 'Complete Verification'
              : `Complete ${!emailVerified ? 'Email' : ''} ${
                  !emailVerified && !selfieUploaded ? 'and ' : ''
                }${!selfieUploaded ? 'Selfie' : ''} Verification`}
          </Button>
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};