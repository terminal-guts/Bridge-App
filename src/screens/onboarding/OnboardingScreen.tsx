import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StatusBar, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { DURATIONS } from '../../constants/animations';
import { RootStackParamList, OnboardingData } from '../../types';
import { createUserProfile, saveOnboardingStep } from '../../services/profileService';
import { uploadMultiplePhotos } from '../../services/photoService';
import { supabase } from '../../lib/supabase';
import { Body } from '../../components/ui';
import { ONBOARDING_STEP_MAPPING } from '../../config/onboardingMapping';
import { createLogger } from '../../utils/secureLogger';
import { successHaptic } from '../../utils/haptics';
import { assignNewUserProposals, generateProposalForUser } from '../../services/proposalApiService';

const logger = createLogger('OnboardingScreen');
import { resetAllGuides } from '../../services/guideService';

// Import all onboarding steps
import { EmailSignUpStep } from './steps/EmailSignUpStep';
import { EmailSignUpVerificationStep } from './steps/EmailSignUpVerificationStep';
import { NameStep } from './steps/NameStep';
import { AgeStep } from './steps/AgeStep';
import { GenderStep } from './steps/GenderStep';
import { PronounsStep } from './steps/PronounsStep';
import { HeightStep } from './steps/HeightStep';
import { EthnicityStep } from './steps/EthnicityStep';
import { ChildrenStep } from './steps/ChildrenStep';
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
// DEFERRED: import { MatchmakingModeStep } from './steps/MatchmakingModeStep';
// DEFERRED: import { MatchmakerProfileStep } from './steps/MatchmakerProfileStep';
// DEFERRED: import { MatchmakerInviteStep } from './steps/MatchmakerInviteStep';
import { OnboardingProposalStep } from './steps/OnboardingProposalStep';

interface OnboardingScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Onboarding'>;
}

interface StepDefinition {
  component: React.FC<any>;
  title: string;
  hasTextInput: boolean;
  mappingKey?: string; // Key into ONBOARDING_STEP_MAPPING; undefined = no data to save
}

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);

/** Individual progress bar segment with smooth fill animation */
const AnimatedProgressSegment: React.FC<{ active: boolean }> = ({ active }) => {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: DURATIONS.normal,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    });
  }, [active]);

  const segmentStyle = useAnimatedStyle(() => ({
    flex: 1,
    height: 4,
    backgroundColor: progress.value > 0.5 ? '#437FFF' : '#E5E7EB',
    opacity: 0.3 + progress.value * 0.7,
  }));

  return <Animated.View style={segmentStyle} />;
};

// Profile steps shared by both signup paths
const PROFILE_STEPS: StepDefinition[] = [
  { component: NameStep, title: 'Name', hasTextInput: true, mappingKey: 'name' },
  { component: OnboardingProposalStep, title: 'First Votes', hasTextInput: false },
  { component: AgeStep, title: 'Birthday', hasTextInput: false, mappingKey: 'age' },
  { component: GenderStep, title: 'Gender', hasTextInput: false, mappingKey: 'gender' },
  { component: PronounsStep, title: 'Pronouns', hasTextInput: false, mappingKey: 'pronouns' },
  { component: HeightStep, title: 'Height', hasTextInput: false, mappingKey: 'height' },
  { component: EthnicityStep, title: 'Ethnicity', hasTextInput: false, mappingKey: 'ethnicity' },
  { component: ChildrenStep, title: 'Children', hasTextInput: false, mappingKey: 'children' },
  { component: CurrentJobStep, title: 'Occupation', hasTextInput: true, mappingKey: 'current_job' },
  { component: ReligionStep, title: 'Religion', hasTextInput: false, mappingKey: 'religion' },
  { component: PoliticalBeliefsStep, title: 'Politics', hasTextInput: false, mappingKey: 'political_beliefs' },
  { component: LifestyleStep, title: 'Lifestyle', hasTextInput: false, mappingKey: 'lifestyle' },
  { component: ValuesStep, title: 'Values', hasTextInput: false, mappingKey: 'values' },
  { component: InterestsStep, title: 'Interests', hasTextInput: false, mappingKey: 'interests' },
  { component: PhotoUploadStep, title: 'Photos', hasTextInput: false, mappingKey: 'photos' },
  { component: PreferencesStep, title: 'Commitment Level', hasTextInput: false, mappingKey: 'preferences' },
  { component: AddFriendsStep, title: 'Add Friends', hasTextInput: false },
  { component: WelcomeToBridgeStep, title: 'Welcome', hasTextInput: false, mappingKey: 'welcome' },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  // Guard against concurrent goNext invocations (rapid taps / double-submit)
  const isGoingNextRef = useRef(false);
  // Background photo upload: starts after PhotoUploadStep, results used by completeOnboarding
  const photoUploadPromiseRef = useRef<Promise<any> | null>(null);
  const photoUploadResultRef = useRef<Array<{ id: string; url: string }> | null>(null);

  // Fetch the authenticated user ID from Supabase session.
  // Re-checks on step changes because the user gets authenticated during
  // verification (phone step 2 or email step 2) — before that, there's no session.
  useEffect(() => {
    if (authUserId) return; // Already have it
    const loadUserId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        // Expected before verification step — session doesn't exist yet
        logger.info('[OnboardingScreen] No auth session yet (pre-verification):', error.message);
        return;
      }
      if (user?.id) {
        setAuthUserId(user.id);
      }
    };
    loadUserId();
  }, [currentStep, authUserId]);

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
    } as any,
    photos: [],
  });

  // Separate Matchmaker steps path
  const MATCHMAKER_STEPS: StepDefinition[] = [
    { component: MatchmakerProfileStep, title: 'Profile', hasTextInput: true, mappingKey: 'bio' },
    { component: MatchmakerInviteStep, title: 'Add Person', hasTextInput: false },
  ];

  // Build steps array dynamically
  const steps = useMemo((): StepDefinition[] => {
    // Both paths share these initial three screens
    const baseSteps = [
      { component: EmailSignUpStep, title: 'Email', hasTextInput: true },
      { component: EmailSignUpVerificationStep, title: 'Verify Email', hasTextInput: true },
      { component: NameStep, title: 'Name', hasTextInput: true, mappingKey: 'name' },
      // DEFERRED: { component: MatchmakingModeStep, title: 'Role', hasTextInput: false, mappingKey: 'role' },
    ];

    if (onboardingData.role === 'matchmaker') {
      return [...baseSteps, ...MATCHMAKER_STEPS];
    } else {
      // Need to filter out NameStep from PROFILE_STEPS if it's there
      return [...baseSteps, ...PROFILE_STEPS.filter(step => step.component !== NameStep)];
    }
  }, [onboardingData.role]);

  const totalSteps = steps.length;

  // Bounds check — reset to step 0 if currentStep is out of range.
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
    // Prevent concurrent invocations from rapid taps
    if (isGoingNextRef.current) return;
    isGoingNextRef.current = true;

    // Snapshot currentStep at call time to avoid stale closure issues
    const stepAtCall = currentStep;

    try {
      // Save current step data before advancing (key-based mapping)
      const stepKey = steps[stepAtCall].mappingKey;
      if (stepKey) {
        const mapping = ONBOARDING_STEP_MAPPING[stepKey];
        if (mapping && mapping.columns.length > 0) {
          const saveResult = await saveOnboardingStep(mapping.key, onboardingData, authUserId || undefined);

          if (!saveResult.ok) {
            // Intermediate step saves are best-effort — never block the user.
            logger.warn('[OnboardingScreen] Step save failed (non-blocking):', saveResult.error?.message);
          }
        }
      }

      // After Photos step: start uploading photos in the background immediately
      // so they're ready by the time completeOnboarding fires
      if (steps[stepAtCall].title === 'Photos' && onboardingData.photos && onboardingData.photos.length > 0) {
        const uris = onboardingData.photos
          .map(p => p.url || (p as any).uri)
          .filter((u: string) => u && u.startsWith('file://'));
        if (uris.length > 0) {
          logger.info('[OnboardingScreen] Starting background photo upload:', uris.length, 'photos');
          photoUploadPromiseRef.current = uploadMultiplePhotos(uris)
            .then(res => {
              if (res.ok && res.data) {
                photoUploadResultRef.current = res.data;
                logger.info('[OnboardingScreen] Background photo upload complete:', res.data.length);
              } else {
                logger.warn('[OnboardingScreen] Background photo upload failed — will retry at profile creation');
              }
              return res;
            })
            .catch(err => {
              logger.warn('[OnboardingScreen] Background photo upload error (will retry):', err.message);
              return null;
            });
        }
      }

      // After email verification completes (step index 1), the user has a JWT.
      // Fire-and-forget: assign existing proposals early so the gate isn't empty.
      if (steps[stepAtCall].title === 'Verify Email') {
        assignNewUserProposals()
          .then((res) => logger.info('Early proposal assignment:', res.assigned))
          .catch((err) => logger.warn('Early proposal assignment failed (non-blocking):', err.message));
      }

      // Advance to next step using functional update to avoid stale closure
      if (stepAtCall < totalSteps - 1) {
        setCurrentStep(prev => {
          // Only advance if we're still on the step we started from
          if (prev === stepAtCall) return prev + 1;
          return prev;
        });
      } else {
        // Complete onboarding (final validation & photo upload)
        completeOnboarding();
      }
    } finally {
      isGoingNextRef.current = false;
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
    // Defensive guard: should only be called from the last step
    if (currentStep !== totalSteps - 1) {
      logger.error(`[OnboardingScreen] completeOnboarding called from wrong step: ${currentStep} (expected ${totalSteps - 1})`);
      return;
    }
    setIsCreatingProfile(true);
    try {
      // Get current user ID from Supabase
      let userId = authUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }

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

      // Wait for background photo upload if it's in progress
      let dataForProfile = onboardingData;
      if (photoUploadPromiseRef.current) {
        logger.info('[OnboardingScreen] Waiting for background photo upload to finish...');
        await photoUploadPromiseRef.current;
      }
      if (photoUploadResultRef.current && photoUploadResultRef.current.length > 0) {
        // Inject pre-uploaded photo URLs so createUserProfile skips re-uploading
        logger.info('[OnboardingScreen] Using pre-uploaded photos:', photoUploadResultRef.current.length);
        dataForProfile = {
          ...onboardingData,
          photos: photoUploadResultRef.current.map((p, i) => ({
            id: p.id || p.url,
            url: p.url,
            isMain: i === 0,
            order: i,
          })),
        };
      }

      // Create user profile with all onboarding data
      const profileResult = await createUserProfile(userId, dataForProfile);

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

      // Skip proposal generation for matchmakers — they don't date
      if (onboardingData.role === 'matchmaker') {
        successHaptic();
        setTimeout(() => successHaptic(), 300);
        (navigation as any).navigate('MatchmakerHome');
        return;
      }

      // Await proposal generation + backfill so proposals are ready before
      // the Community screen loads. Falls back to simple assignment on failure.
      try {
        const res = await generateProposalForUser();
        logger.info('Generate proposal for user:', res);
      } catch (err: any) {
        logger.warn('generateProposalForUser failed, falling back:', err.message);
        try {
          const res = await assignNewUserProposals();
          logger.info('Fallback assignment:', res.assigned);
        } catch (e: any) {
          logger.warn('Fallback assignment also failed (non-blocking):', e.message);
        }
      }

      // Celebration haptics
      successHaptic();
      setTimeout(() => successHaptic(), 300);

      // Navigate to main app after proposals are assigned
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

      {/* Animated Progress Bar - Absolute positioned at top */}
      <StyledSafeAreaView
        edges={['top']}
        className="absolute top-0 left-0 right-0 z-50 bg-neutral-50"
      >
        <StyledView className="flex-row items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <AnimatedProgressSegment
              key={index}
              active={index <= currentStep}
            />
          ))}
        </StyledView>
      </StyledSafeAreaView>

      {/* Step Content — keyed by step index for entrance/exit animations */}
      <Animated.View
        key={currentStep}
        entering={FadeIn.duration(DURATIONS.normal)}
        style={{ flex: 1 }}
      >
        <CurrentStepComponent
          data={onboardingData}
          updateData={updateData}
          onNext={goNext}
          onBack={goBack}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === totalSteps - 1}
        />
      </Animated.View>
    </StyledView>
  );
};
