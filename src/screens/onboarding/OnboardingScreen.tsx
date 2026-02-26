import React, { useState, useEffect } from 'react';
import { View, StatusBar, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, OnboardingData } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserProfile, saveOnboardingStep } from '../../services/profileService';
import { Body } from '../../components/ui';
import { getStepMappingByIndex } from '../../config/onboardingMapping';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('OnboardingScreen');
import { resetAllGuides } from '../../services/guideService';

// Import all onboarding steps
import { PhoneNumberStep } from './steps/PhoneNumberStep';
import { PhoneVerificationStep } from './steps/PhoneVerificationStep';
import { NameStep } from './steps/NameStep';
import { AgeStep } from './steps/AgeStep';
import { GenderStep } from './steps/GenderStep';
import { PronounsStep } from './steps/PronounsStep';
import { HeightStep } from './steps/HeightStep';
import { EthnicityStep } from './steps/EthnicityStep';
import { DatingDistanceStep } from './steps/DatingDistanceStep';
import { ChildrenStep } from './steps/ChildrenStep';
import { WhereLiveNowStep } from './steps/WhereLiveNowStep';
import { CurrentJobStep } from './steps/CurrentJobStep';
import { ReligionStep } from './steps/ReligionStep';
import { PoliticalBeliefsStep } from './steps/PoliticalBeliefsStep';
import { LifestyleStep } from './steps/LifestyleStep';
import { ValuesStep } from './steps/ValuesStep';
import { InterestsStep } from './steps/InterestsStep';
import { PhotoUploadStep } from './steps/PhotoUploadStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { AddFriendsStep } from './steps/AddFriendsStep';
import { WelcomeToBridgeStep } from './steps/WelcomeToBridgeStep';

interface OnboardingScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Onboarding'>;
}

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Fetch the authenticated user ID from AsyncStorage on mount
  useEffect(() => {
    const loadUserId = async () => {
      const savedUserStr = await AsyncStorage.getItem('bridge_auth_user');
      if (savedUserStr) {
        const saved = JSON.parse(savedUserStr);
        if (saved?.id) setAuthUserId(saved.id);
      }
    };
    loadUserId();
  }, []);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    interests: [],
    values: [],
    // Initialize array fields to prevent undefined issues
    gender: [],
    interestedInGenders: [],
    pronounsList: [],
    preferredEthnicities: [],
    // Lifestyle data now stored in separate frequency fields (not in lifestyle object)
    drinkingFrequency: '',
    cannabisFrequency: '',
    tobaccoFrequency: '',
    otherDrugsFrequency: '',
    lifestyle: {}, // Deprecated: kept for backward compatibility
    nonNegotiables: [],
    preferences: {
      ageMin: 24,
      ageMax: 32,
      // NOTE: gender will be derived from interestedInGenders automatically
      // NOTE: lookingFor is required and collected in PreferencesStep
      heightMin: 60,
      heightMax: 84,
      // All other fields removed - they are deprecated or not collected in onboarding
    } as any, // Cast to any to avoid TS errors for missing required fields (they'll be filled in during onboarding)
    photos: [],
  });

  const steps = [
    { component: PhoneNumberStep, title: 'Phone Number', hasTextInput: true },
    { component: PhoneVerificationStep, title: 'Verification', hasTextInput: true },
    { component: NameStep, title: 'Name', hasTextInput: true },
    { component: AgeStep, title: 'Birthday', hasTextInput: false }, // Will be converted to birthday picker
    { component: GenderStep, title: 'Gender', hasTextInput: false },
    { component: PronounsStep, title: 'Pronouns', hasTextInput: false },
    { component: HeightStep, title: 'Height', hasTextInput: false },
    { component: EthnicityStep, title: 'Ethnicity', hasTextInput: false },
    { component: DatingDistanceStep, title: 'Distance', hasTextInput: false },
    { component: ChildrenStep, title: 'Children', hasTextInput: false }, // Future plans removed, skip button added
    { component: WhereLiveNowStep, title: 'Location', hasTextInput: true },
    { component: CurrentJobStep, title: 'Occupation', hasTextInput: true },
    // REMOVED FROM ONBOARDING (still in profile edit): WhereFromStep, CompanyPositionStep, EducationLevelStep, SchoolStep
    { component: ReligionStep, title: 'Religion', hasTextInput: false },
    { component: PoliticalBeliefsStep, title: 'Politics', hasTextInput: false },
    { component: LifestyleStep, title: 'Lifestyle', hasTextInput: false },
    { component: ValuesStep, title: 'Values', hasTextInput: false },
    { component: InterestsStep, title: 'Interests', hasTextInput: false },
    { component: PhotoUploadStep, title: 'Photos', hasTextInput: false }, // Changed to 1 photo
    // REMOVED FROM ONBOARDING (still in profile edit): DeepQuestionsStep, NonNegotiablesStep
    { component: PreferencesStep, title: 'Commitment Level', hasTextInput: false },
    { component: AddFriendsStep, title: 'Add Friends', hasTextInput: false },
    { component: WelcomeToBridgeStep, title: 'Welcome', hasTextInput: false },
  ];

  const totalSteps = steps.length;

  // Bounds check — reset to step 0 if currentStep is out of range.
  // The effect MUST be declared unconditionally (Rules of Hooks); early return is below.
  React.useEffect(() => {
    if (currentStep < 0 || currentStep >= totalSteps) {
      logger.error(`[OnboardingScreen] Invalid currentStep: ${currentStep} (totalSteps: ${totalSteps})`);
      setCurrentStep(0);
    }
  }, [currentStep, totalSteps]);

  if (currentStep < 0 || currentStep >= totalSteps) {
    return null;
  }

  const CurrentStepComponent = steps[currentStep].component;

  const updateData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const goNext = async () => {
    // Save current step data before advancing
    const mapping = getStepMappingByIndex(currentStep);
    if (mapping && mapping.columns.length > 0) {
      const saveResult = await saveOnboardingStep(mapping.key, onboardingData, authUserId || undefined);

      if (!saveResult.ok) {
        // Intermediate step saves are best-effort — never block the user.
        // The full profile is committed at the end via createUserProfile.
        logger.warn('[OnboardingScreen] Step save failed (non-blocking):', saveResult.error?.message);
      }
    }

    // Advance to next step
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding (final validation & photo upload)
      completeOnboarding();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // On first step, go back to previous screen (Welcome)
      navigation.goBack();
    }
  };

  const completeOnboarding = async () => {
    setIsCreatingProfile(true);
    try {
      // Get current user ID from AsyncStorage
      const savedUserStr = await AsyncStorage.getItem('bridge_auth_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      const userId = authUserId || savedUser?.id;

      if (!userId) {
        logger.error('No authenticated user found during onboarding completion');
        setIsCreatingProfile(false);
        Alert.alert(
          'Authentication Required',
          'You must be signed in to complete onboarding. Please restart the process.',
          [{ text: 'Go Back', onPress: () => navigation.navigate('Welcome') }]
        );
        return;
      }

      logger.info('Creating profile for user:', userId);
      logger.info('Photos to upload:', onboardingData.photos?.length || 0);

      // Create user profile with all onboarding data
      const profileResult = await createUserProfile(userId, onboardingData);

      setIsCreatingProfile(false);

      if (!profileResult.ok) {
        logger.error('Profile creation failed:', profileResult.error);
        const errorMessage = profileResult.error?.message || 'Unable to create your profile. Please try again.';
        const errorCode = profileResult.error?.code || '';

        // Show more specific error message for photo upload failures
        const displayMessage = errorCode === 'PHOTO_UPLOAD_FAILED'
          ? 'Failed to upload your photos. Please check your internet connection and try again.'
          : errorMessage;

        Alert.alert(
          'Profile Creation Failed',
          displayMessage,
          [
            {
              text: 'Try Again',
              onPress: () => completeOnboarding(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      logger.info('Profile created successfully');

      // Reset all guides for the new user so they see onboarding guides
      await resetAllGuides();
      logger.info('Guides reset for new user');

      // Navigate to main app after successful profile creation
      (navigation as any).navigate('MainTabs');
    } catch (error: any) {
      logger.error('Onboarding error:', error);
      setIsCreatingProfile(false);
      Alert.alert(
        'Error',
        'An unexpected error occurred while creating your profile. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => completeOnboarding(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  return (
    <StyledView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Loading Overlay */}
      {isCreatingProfile && (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 z-50 flex-1 items-center justify-center">
          <StyledView className="bg-white rounded-2xl p-8 items-center mx-6 max-w-sm w-full">
            <ActivityIndicator size="large" color="#437FFF" />
            <Body className="mt-4 text-neutral-900 font-medium text-center">Creating your profile...</Body>
            <Body className="mt-2 text-neutral-500 text-sm text-center">Uploading photos and setting up your account</Body>
          </StyledView>
        </StyledView>
      )}

      {/* Progress Bar - Absolute positioned at top */}
      <StyledSafeAreaView
        edges={['top']}
        className="absolute top-0 left-0 right-0 z-50 bg-neutral-50"
      >
        <StyledView className="flex-row items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <StyledView
              key={index}
              className={`flex-1 h-1 ${
                index <= currentStep ? 'bg-primary-500' : 'bg-neutral-200'
              }`}
            />
          ))}
        </StyledView>
      </StyledSafeAreaView>

      {/* Step Content */}
      <CurrentStepComponent
        data={onboardingData}
        updateData={updateData}
        onNext={goNext}
        onBack={goBack}
        isFirstStep={currentStep === 0}
        isLastStep={currentStep === totalSteps - 1}
      />
    </StyledView>
  );
};