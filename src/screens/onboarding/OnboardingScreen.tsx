import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, StatusBar, Alert, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { DURATIONS, EASINGS } from '../../constants/animations';
import { COLORS } from '../../theme/colors';
import { RootStackParamList, OnboardingData } from '../../types';
import { createUserProfile, saveOnboardingStep, checkMinimalProfileStatus, updateUserProfile, setCachedRole } from '../../services/profileService';
import { uploadMultiplePhotos } from '../../services/photoService';
import { supabase } from '../../lib/supabase';
import { Body } from '../../components/ui';
import { ONBOARDING_STEP_MAPPING } from '../../config/onboardingMapping';
import { createLogger } from '../../utils/secureLogger';
import { successHaptic } from '../../utils/haptics';
import { FONT_SIZES } from '../../constants/typography';
import { assignNewUserProposals, generateProposalForUser } from '../../services/proposalApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createLogger('OnboardingScreen');
import { resetAllGuides } from '../../services/guideService';

import { EmailSignUpStep } from './steps/EmailSignUpStep';
import { EmailSignUpVerificationStep } from './steps/EmailSignUpVerificationStep';
import { NameStep } from './steps/NameStep';
import { AgeStep } from './steps/AgeStep';
import { GenderStep } from './steps/GenderStep';
import { HeightStep } from './steps/HeightStep';
import { EthnicityStep } from './steps/EthnicityStep';
import { ReligionStep } from './steps/ReligionStep';
import { PoliticalBeliefsStep } from './steps/PoliticalBeliefsStep';
import { LifestyleStep } from './steps/LifestyleStep';
import { ValuesStep } from './steps/ValuesStep';
import { InterestsStep } from './steps/InterestsStep';
import { PhotoUploadStep } from './steps/PhotoUploadStep';
import { AddFriendsStep } from './steps/AddFriendsStep';
import { WelcomeToBridgeStep } from './steps/WelcomeToBridgeStep';
import { MatchmakingModeStep } from './steps/MatchmakingModeStep';
import { MatchmakerProfileStep } from './steps/MatchmakerProfileStep';
import { OnboardingProposalStep } from './steps/OnboardingProposalStep';
import { CelebrationStep } from './steps/CelebrationStep';
import { EmailResendStep } from './steps/EmailResendStep';

interface OnboardingScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Onboarding'>;
  route: RouteProp<RootStackParamList, 'Onboarding'>;
}

interface StepDefinition {
  component: React.FC<any>;
  title: string;
  hasTextInput: boolean;
  mappingKey?: string; // Key into ONBOARDING_STEP_MAPPING; undefined = no data to save
  section?: string; // Section label for progress display (e.g., "The Basics")
  hideFromCounter?: boolean; // Celebration steps: excluded from "Step X of Y" count
}

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);

// Auth steps — Email sends code, Name + Birthday fill while code delivers, Verify enters code.
// Name and Birthday are stored locally (no auth session) — committed to backend after verify.
const AUTH_STEPS: StepDefinition[] = [
  { component: EmailSignUpStep, title: 'Email', hasTextInput: true, section: 'Getting Started' },
  { component: NameStep, title: 'Name', hasTextInput: true, mappingKey: 'name', section: 'Getting Started' },
  { component: AgeStep, title: 'Birthday', hasTextInput: false, mappingKey: 'age', section: 'Getting Started' },
  { component: EmailSignUpVerificationStep, title: 'Verify Email', hasTextInput: true, section: 'Getting Started' },
];

// Celebration step wrappers — auto-advance after 1.125s
const PostVotingCelebration: React.FC<any> = (props) => <CelebrationStep {...props} message="Finish your profile so friends can match you!" />;
const BasicsComplete: React.FC<any> = (props) => <CelebrationStep {...props} message="Basics done — looking good!" />;
const BackgroundComplete: React.FC<any> = (props) => <CelebrationStep {...props} message="Almost there — just the fun stuff left!" />;

// Profile steps — 12 real steps + 2 celebrations (hidden from counter).
// Total with auth: 16 counted steps (4 auth + 12 profile).
const PROFILE_STEPS: StepDefinition[] = [
  { component: MatchmakingModeStep, title: 'Role', hasTextInput: false, mappingKey: 'role', section: 'Getting Started' },
  { component: OnboardingProposalStep, title: 'First Votes', hasTextInput: false, section: 'Getting Started' },
  { component: PostVotingCelebration, title: 'Celebration', hasTextInput: false, section: 'Getting Started', hideFromCounter: true },
  { component: GenderStep, title: 'Gender', hasTextInput: false, mappingKey: 'gender', section: 'The Basics' },
  { component: HeightStep, title: 'Height', hasTextInput: false, mappingKey: 'height', section: 'The Basics' },
  { component: BasicsComplete, title: 'Celebration', hasTextInput: false, section: 'The Basics', hideFromCounter: true },
  { component: EthnicityStep, title: 'Ethnicity', hasTextInput: false, mappingKey: 'ethnicity', section: 'Your Background' },
  { component: ReligionStep, title: 'Religion', hasTextInput: false, mappingKey: 'religion', section: 'Your Background' },
  { component: PoliticalBeliefsStep, title: 'Politics', hasTextInput: false, mappingKey: 'politics', section: 'Your Background' },
  { component: LifestyleStep, title: 'Lifestyle', hasTextInput: false, mappingKey: 'lifestyle', section: 'Your Background' },
  { component: BackgroundComplete, title: 'Celebration', hasTextInput: false, section: 'Your Background', hideFromCounter: true },
  { component: InterestsStep, title: 'Interests', hasTextInput: false, mappingKey: 'interests', section: 'The Fun Stuff' },
  { component: ValuesStep, title: 'Values', hasTextInput: false, mappingKey: 'values', section: 'The Fun Stuff' },
  { component: PhotoUploadStep, title: 'Photos', hasTextInput: false, mappingKey: 'photos', section: 'The Fun Stuff' },
  { component: AddFriendsStep, title: 'Add Friends', hasTextInput: false, section: 'Almost Done' },
];

/** Strip sensitive fields before persisting to AsyncStorage (plaintext on disk) */
const stripSensitiveFields = (data: Partial<OnboardingData>): Partial<OnboardingData> => {
  const safe = { ...data };
  delete (safe as any).password;
  delete (safe as any).verificationCode;
  return safe;
};

/** Persist step progress to AsyncStorage. AsyncStorage.setItem is non-blocking
 *  (native I/O on background thread), so no InteractionManager deferral needed. */
const persistProgress = (step: number, dataRef: React.MutableRefObject<Partial<OnboardingData>>) => {
  AsyncStorage.setItem('@bridge/onboarding_progress', JSON.stringify({
    step,
    data: stripSensitiveFields(dataRef.current),
  })).catch(() => {});
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, route }) => {
  const isRoleSwitch = route.params?.isRoleSwitch ?? false;
  const skipAuth = route.params?.skipAuth ?? false;
  const initialData = route.params?.initialData;
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  // "Didn't receive a code?" — shows the email resend screen
  const [showResendScreen, setShowResendScreen] = useState(false);
  // Guard against concurrent goNext invocations (rapid taps / double-submit)
  const isGoingNextRef = useRef(false);
  // Background photo upload: starts after PhotoUploadStep, results used by completeOnboarding
  const photoUploadPromiseRef = useRef<Promise<any> | null>(null);
  const photoUploadResultRef = useRef<Array<{ id: string; url: string }> | null>(null);
  // Ref tracking latest onboardingData for use in stale closures (goNext setTimeout, etc.)
  // Updated synchronously inside setOnboardingData updater, NOT via useEffect,
  // so goNext always sees the latest data even when called in the same tick as updateData.
  const onboardingDataRef = useRef(onboardingData);
  // Guard: prevent orphaned upload promises from writing state after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Restore step position from AsyncStorage on mount (if user was interrupted)
  const [hasRestoredStep, setHasRestoredStep] = useState(false);
  useEffect(() => {
    if (isRoleSwitch || hasRestoredStep) return;
    const restoreProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const saved = await AsyncStorage.getItem('@bridge/onboarding_progress');

        if (!user && saved) {
          // No auth session but have saved data (pre-auth: user entered name/birthday
          // but didn't verify yet). Restore the data but reset to step 0 (email).
          const { data } = JSON.parse(saved);
          if (data) {
            logger.info('[OnboardingScreen] Pre-auth restore: merging name/birthday, resetting to step 0');
            setOnboardingData(prev => ({ ...prev, ...data }));
          }
          setHasRestoredStep(true);
          return;
        }

        if (!user) {
          // No session, no saved data — fresh start
          setHasRestoredStep(true);
          return;
        }

        // Has auth session — full restore
        if (saved) {
          const { step, data } = JSON.parse(saved);
          if (typeof step === 'number' && step > 0) {
            const maxStep = steps.length - 1;
            const safeStep = Math.min(step, maxStep);
            logger.info(`[OnboardingScreen] Restoring onboarding progress to step ${safeStep}`);
            setCurrentStep(safeStep);
            if (data) setOnboardingData(prev => ({ ...prev, ...data }));
          }
        }
      } catch (e) {
        logger.warn('[OnboardingScreen] Failed to restore onboarding progress:', e);
      }
      setHasRestoredStep(true);
    };
    restoreProgress();
  }, [isRoleSwitch]);



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
      ageMin: 18,
      ageMax: 22,
      // NOTE: gender will be derived from interestedInGenders automatically
      lookingFor: 'relationship', // Default — PreferencesStep removed, this is always 'relationship'
      heightMin: 60,
      heightMax: 72,
    } as any,
    photos: [],
    // Merge any pre-filled data (used when switching from matchmaker to dater)
    ...initialData,
  });

  // Start photo upload immediately when a photo is selected (not when step advances).
  // This gives the upload a head start while the user continues through remaining steps.
  // Only runs when authenticated (photos require a JWT for Supabase Storage).
  useEffect(() => {
    if (!authUserId) return; // No auth session yet — skip
    if (!onboardingData.photos || onboardingData.photos.length === 0) return;
    const uris = onboardingData.photos
      .map(p => p.url || (p as any).uri)
      .filter((u: string) => u && u.startsWith('file://'));
    if (uris.length === 0) return;
    // Only start if not already uploading
    if (photoUploadPromiseRef.current) return;
    logger.info('[OnboardingScreen] Starting eager photo upload:', uris.length, 'photos');
    photoUploadPromiseRef.current = uploadMultiplePhotos(uris)
      .then(res => {
        if (!isMountedRef.current) return res;
        if (res.ok && res.data) {
          photoUploadResultRef.current = res.data;
          logger.info('[OnboardingScreen] Eager photo upload complete:', res.data.length);
        } else {
          logger.warn('[OnboardingScreen] Eager photo upload failed — will retry at profile creation');
        }
        return res;
      })
      .catch(err => {
        logger.warn('[OnboardingScreen] Eager photo upload error:', err.message);
        return null;
      });
  }, [onboardingData.photos, authUserId]);

  const MATCHMAKER_STEPS: StepDefinition[] = [
    { component: MatchmakerProfileStep, title: 'Photo', hasTextInput: false },
    { component: AddFriendsStep, title: 'Add Friends', hasTextInput: false },
  ];

  // Build steps array dynamically
  const steps = useMemo((): StepDefinition[] => {
    // Role switch: matchmaker → dater (skip auth, name, role, first votes, add friends, welcome)
    if (isRoleSwitch) {
      const skipComponents = new Set([
        NameStep, MatchmakingModeStep, OnboardingProposalStep,
        AddFriendsStep, WelcomeToBridgeStep,
      ]);
      return PROFILE_STEPS.filter(step => !skipComponents.has(step.component));
    }

    // Auth steps: included unless user already signed in via Google (skipAuth)
    const authPrefix = skipAuth ? [] : AUTH_STEPS;

    if (onboardingData.role === 'matchmaker') {
      // Matchmaker path: [Email → Verify →] Name → Role → First Votes → Photo → Add Friends
      return [
        ...authPrefix,
        // NameStep is now in AUTH_STEPS, so it comes via authPrefix
        ...PROFILE_STEPS.filter(step =>
          step.component === MatchmakingModeStep ||
          step.component === OnboardingProposalStep
        ),
        ...MATCHMAKER_STEPS,
      ];
    }

    // Dater path: [Email → Verify →] all PROFILE_STEPS
    return [...authPrefix, ...PROFILE_STEPS];
  }, [onboardingData.role, isRoleSwitch, skipAuth]);

  const totalSteps = steps.length;

  // Continuous progress bar — animates fill width as a percentage of total steps
  const progressWidth = useSharedValue((currentStep + 1) / totalSteps);

  useEffect(() => {
    progressWidth.value = withTiming((currentStep + 1) / totalSteps, {
      duration: DURATIONS.normal,
      easing: EASINGS.standard,
    });
  }, [currentStep, totalSteps]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
    height: 6,
    backgroundColor: COLORS.primaryAccent,
    borderRadius: 3,
  }));

  // Clamp step inline so we never render null during a steps-array change
  const clampedStep = currentStep < 0 || currentStep >= totalSteps
    ? 0
    : currentStep;

  // Step counter label — excludes celebration steps from the count
  const stepLabel = useMemo(() => {
    const step = steps[clampedStep];
    if (step?.hideFromCounter) return ''; // Hide label during celebrations
    const section = step?.section;
    // Count only non-celebration steps
    const countableSteps = steps.filter(s => !s.hideFromCounter);
    const countableBefore = steps.slice(0, clampedStep).filter(s => !s.hideFromCounter).length;
    const stepNum = countableBefore + 1;
    const total = countableSteps.length;
    if (section) return `Step ${stepNum} of ${total} · ${section}`;
    return `Step ${stepNum} of ${total}`;
  }, [clampedStep, steps]);

  // Sync state back when clamping was needed (e.g. role switch shrinks steps array)
  React.useEffect(() => {
    if (clampedStep !== currentStep) {
      logger.error(`[OnboardingScreen] Clamped currentStep: ${currentStep} → ${clampedStep} (totalSteps: ${totalSteps})`);
      setCurrentStep(clampedStep);
    }
  }, [clampedStep, currentStep, totalSteps]);

  const CurrentStepComponent = steps[clampedStep].component;

  const updateData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => {
      const next = { ...prev, ...data };
      // Sync ref inside updater so goNext always sees latest data,
      // even when called in the same tick (updateData + onNext pattern).
      onboardingDataRef.current = next;
      return next;
    });
    // Cache role immediately so app reloads mid-onboarding route correctly
    if (data.role) {
      setCachedRole(data.role as 'dater' | 'matchmaker');
    }
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
          const saveResult = await saveOnboardingStep(mapping.key, onboardingDataRef.current, authUserId || undefined);

          if (!saveResult.ok) {
            // Intermediate step saves are best-effort — never block the user.
            logger.warn('[OnboardingScreen] Step save failed (non-blocking):', saveResult.error?.message);
          }
        }
      }

      // Photo upload is handled by the useEffect below (starts on photo selection)

      // After email verification completes (step index 1), the user has a JWT.
      // Fire-and-forget: assign existing proposals early so the gate isn't empty.
      if (steps[stepAtCall].title === 'Verify Email') {
        assignNewUserProposals()
          .then((res) => logger.info('Early proposal assignment:', res.assigned))
          .catch((err) => logger.warn('Early proposal assignment failed (non-blocking):', err.message));
      }

      // Advance to next step
      if (stepAtCall < totalSteps - 1) {
        const nextStep = stepAtCall + 1;
        const currentSection = steps[stepAtCall]?.section;
        const nextSection = steps[nextStep]?.section;

        setCurrentStep(prev => {
          if (prev === stepAtCall) return nextStep;
          return prev;
        });
        persistProgress(nextStep, onboardingDataRef);
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
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      persistProgress(prevStep, onboardingDataRef);
    } else {
      navigation.navigate('Welcome');
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

      // Fallback: if name is somehow empty, derive from email (never block the user)
      if (!dataForProfile.firstName?.trim()) {
        const email = dataForProfile.email || '';
        const fallbackName = email.split('@')[0] || 'Bridge User';
        dataForProfile = { ...dataForProfile, firstName: fallbackName };
        logger.warn('[OnboardingScreen] Empty name — using email-derived fallback:', fallbackName);
      }

      // Role switch: update existing profile instead of creating new one
      if (isRoleSwitch) {
        logger.info('Role switch: updating profile from matchmaker to dater');
        const updateResult = await updateUserProfile({
          ...dataForProfile,
          role: 'dater',
        } as any);
        setIsCreatingProfile(false);
        if (!updateResult.ok) {
          // No Cancel option — user must retry to avoid getting stuck
          Alert.alert(
            'Almost There!',
            updateResult.error?.message || 'Something went wrong. Please try again.',
            [{ text: 'Try Again', onPress: () => completeOnboarding() }]
          );
          return;
        }
        await checkMinimalProfileStatus();
        AsyncStorage.removeItem('@bridge/onboarding_progress').catch(() => {});
        successHaptic();
        setTimeout(() => successHaptic(), 300);
        (navigation as any).reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        return;
      }

      // Create user profile with all onboarding data
      const profileResult = await createUserProfile(userId, dataForProfile);

      setIsCreatingProfile(false);

      if (!profileResult.ok) {
        logger.error('Profile creation failed:', profileResult.error);
        const errorCode = profileResult.error?.code || '';

        // Show more specific error message for photo upload failures
        const displayMessage = errorCode === 'PHOTO_UPLOAD_FAILED'
          ? 'Failed to upload your photos. Please check your internet connection and try again.'
          : 'Unable to create your profile. Please check your connection and try again.';

        // No Cancel option — user must retry. Tapping Cancel previously trapped users
        // with no way forward (profile never created, stuck on onboarding).
        Alert.alert(
          'Almost There!',
          displayMessage,
          [{ text: 'Try Again', onPress: () => completeOnboarding() }]
        );
        return;
      }

      logger.info('Profile created successfully');

      // Reset all guides for the new user so they see onboarding guides
      await resetAllGuides();
      logger.info('Guides reset for new user');

      // Skip proposal generation for matchmakers — they don't date
      if (onboardingData.role === 'matchmaker') {
        // Flush the minimal status cache with the correct role so any screen that
        // mounts in MatchmakerTabs immediately knows the user is a matchmaker.
        await checkMinimalProfileStatus();
        AsyncStorage.removeItem('@bridge/onboarding_progress').catch(() => {});
        successHaptic();
        setTimeout(() => successHaptic(), 300);
        (navigation as any).reset({ index: 0, routes: [{ name: 'MatchmakerTabs' }] });
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

      // Cache minimal profile status so the fast startup path works on next launch.
      // (Matchmaker path already does this at line 437 — dater path was missing it.)
      await checkMinimalProfileStatus();

      // Celebration haptics
      successHaptic();
      setTimeout(() => successHaptic(), 300);

      // Clear persisted onboarding progress — user is done
      AsyncStorage.removeItem('@bridge/onboarding_progress').catch(() => {});

      // Navigate to main app after proposals are assigned — reset clears
      // the stack so Onboarding doesn't linger beneath MainTabs.
      (navigation as any).reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error: any) {
      logger.error('Onboarding error:', error);
      setIsCreatingProfile(false);
      // No Cancel option — user must retry to avoid getting stuck
      Alert.alert(
        'Almost There!',
        'Something went wrong. Let\'s try that again.',
        [{ text: 'Try Again', onPress: () => completeOnboarding() }]
      );
    }
  };

  return (
    <StyledView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Loading Overlay */}
      {isCreatingProfile && (
        <StyledView
          className="absolute top-0 left-0 right-0 bottom-0 z-50 flex-1 items-center justify-center"
          style={{ backgroundColor: COLORS.overlay.medium }}
        >
          <StyledView className="bg-white rounded-2xl p-8 items-center mx-6 max-w-sm w-full">
            <ActivityIndicator size="large" color={COLORS.primaryAccent} />
            <Body className="mt-4 text-neutral-900 font-medium text-center">Creating your profile...</Body>
            <Body className="mt-2 text-neutral-500 text-sm text-center">Uploading photos and setting up your account</Body>
          </StyledView>
        </StyledView>
      )}

      {/* Continuous Progress Bar + Step Counter */}
      <StyledSafeAreaView
        edges={['top']}
        className="absolute top-0 left-0 right-0 bg-neutral-50"
        style={{ zIndex: 40 }}
      >
        <StyledView style={{ height: 6, backgroundColor: COLORS.card }}>
          <Animated.View style={progressBarStyle} />
        </StyledView>
        <StyledView className="px-4 py-1">
          <Body style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.tertiary, textAlign: 'center' }} numberOfLines={1}>
            {showResendScreen ? '' : stepLabel}
          </Body>
        </StyledView>
      </StyledSafeAreaView>

      {/* Email Resend Screen — shown when "Didn't receive a code?" is tapped */}
      {showResendScreen ? (
        <Animated.View
          key="resend"
          entering={FadeIn.duration(DURATIONS.normal)}
          style={{ flex: 1 }}
        >
          <EmailResendStep
            data={onboardingData}
            updateData={updateData}
            onNext={() => {
              // Code re-sent — go back to verification
              setShowResendScreen(false);
            }}
            onBack={() => setShowResendScreen(false)}
          />
        </Animated.View>
      ) : (
        /* Step Content — keyed by step index for entrance/exit animations */
        <Animated.View
          key={clampedStep}
          entering={FadeIn.duration(DURATIONS.normal)}
          style={{ flex: 1 }}
        >
          <CurrentStepComponent
            data={onboardingData}
            updateData={updateData}
            onNext={goNext}
            onBack={goBack}
            isFirstStep={clampedStep === 0}
            isLastStep={clampedStep === totalSteps - 1}
            onResendCode={() => setShowResendScreen(true)}
          />
        </Animated.View>
      )}
    </StyledView>
  );
};
