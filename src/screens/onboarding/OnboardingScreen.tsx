import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
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
import { createUserProfile, saveOnboardingStep, checkMinimalProfileStatus, updateUserProfile, setCachedRole, ensureProfileRow } from '../../services/profileService';
import { uploadMultiplePhotos } from '../../services/photoService';
import { supabase } from '../../lib/supabase';
import { Body } from '../../components/ui';
import { ONBOARDING_STEP_MAPPING } from '../../config/onboardingMapping';
import { createLogger } from '../../utils/secureLogger';
import { successHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import { FONT_SIZES } from '../../constants/typography';
import { assignNewUserProposals, generateProposalForUser } from '../../services/proposalApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createLogger('OnboardingScreen');
import { resetAllGuides } from '../../services/guideService';

// EAGER imports: first step the user sees + CelebrationStep (used inline below
// by tiny wrapper components, too small to lazy-load).
import { EmailSignUpStep } from './steps/EmailSignUpStep';
import { CelebrationStep } from './steps/CelebrationStep';

// LAZY imports: every other step. Cuts first-mount parse cost by ~2700 LOC of
// step code + their deep import trees (icons, sliders, reanimated worklets).
// A factory ref lets us preload() upcoming steps while the user fills out the
// current one — by the time they tap Continue, the next step is already parsed.
type LazyStep = React.LazyExoticComponent<React.ComponentType<any>> & { preload: () => Promise<unknown> };
const makeLazyStep = (factory: () => Promise<{ default: React.ComponentType<any> }>): LazyStep => {
  const Lazy = React.lazy(factory) as LazyStep;
  Lazy.preload = factory;
  return Lazy;
};

const EmailSignUpVerificationStep = makeLazyStep(() => import('./steps/EmailSignUpVerificationStep').then(m => ({ default: m.EmailSignUpVerificationStep })));
const NameStep = makeLazyStep(() => import('./steps/NameStep').then(m => ({ default: m.NameStep })));
const AgeStep = makeLazyStep(() => import('./steps/AgeStep').then(m => ({ default: m.AgeStep })));
const GenderStep = makeLazyStep(() => import('./steps/GenderStep').then(m => ({ default: m.GenderStep })));
const HeightStep = makeLazyStep(() => import('./steps/HeightStep').then(m => ({ default: m.HeightStep })));
const EthnicityStep = makeLazyStep(() => import('./steps/EthnicityStep').then(m => ({ default: m.EthnicityStep })));
const ReligionStep = makeLazyStep(() => import('./steps/ReligionStep').then(m => ({ default: m.ReligionStep })));
const PoliticalBeliefsStep = makeLazyStep(() => import('./steps/PoliticalBeliefsStep').then(m => ({ default: m.PoliticalBeliefsStep })));
const LifestyleStep = makeLazyStep(() => import('./steps/LifestyleStep').then(m => ({ default: m.LifestyleStep })));
const ValuesStep = makeLazyStep(() => import('./steps/ValuesStep').then(m => ({ default: m.ValuesStep })));
const InterestsStep = makeLazyStep(() => import('./steps/InterestsStep').then(m => ({ default: m.InterestsStep })));
const PhotoUploadStep = makeLazyStep(() => import('./steps/PhotoUploadStep').then(m => ({ default: m.PhotoUploadStep })));
const AddFriendsStep = makeLazyStep(() => import('./steps/AddFriendsStep').then(m => ({ default: m.AddFriendsStep })));
const MatchmakingModeStep = makeLazyStep(() => import('./steps/MatchmakingModeStep').then(m => ({ default: m.MatchmakingModeStep })));
const MatchmakerProfileStep = makeLazyStep(() => import('./steps/MatchmakerProfileStep').then(m => ({ default: m.MatchmakerProfileStep })));
const OnboardingProposalStep = makeLazyStep(() => import('./steps/OnboardingProposalStep').then(m => ({ default: m.OnboardingProposalStep })));
const EmailResendStep = makeLazyStep(() => import('./steps/EmailResendStep').then(m => ({ default: m.EmailResendStep })));

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

// Suspense fallback while a lazy step module is parsing. Visible spinner so
// users don't think the app froze (blank view felt broken on first tap of
// "Didn't receive a code?").
const StepLoadingFallback: React.FC = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.primaryAccent} />
  </View>
);

// Celebration step wrappers — auto-advance after 1.125s
const PostVotingCelebration: React.FC<any> = (props) => <CelebrationStep {...props} message="Now let's build your profile!" />;
const BasicsComplete: React.FC<any> = (props) => <CelebrationStep {...props} message="Basics done — last stretch!" />;

// Profile steps — 11 real steps + 2 celebrations (hidden from counter).
// Sections: Getting Started (6), The Basics (6 — gender → lifestyle),
// Almost Done (4 — interests → add friends).
const PROFILE_STEPS: StepDefinition[] = [
  { component: MatchmakingModeStep, title: 'Role', hasTextInput: false, mappingKey: 'role', section: 'Getting Started' },
  { component: OnboardingProposalStep, title: 'First Votes', hasTextInput: false, section: 'Getting Started' },
  { component: PostVotingCelebration, title: 'Celebration', hasTextInput: false, section: 'Getting Started', hideFromCounter: true },
  { component: GenderStep, title: 'Gender', hasTextInput: false, mappingKey: 'gender', section: 'The Basics' },
  { component: HeightStep, title: 'Height', hasTextInput: false, mappingKey: 'height', section: 'The Basics' },
  { component: EthnicityStep, title: 'Ethnicity', hasTextInput: false, mappingKey: 'ethnicity', section: 'The Basics' },
  { component: ReligionStep, title: 'Religion', hasTextInput: false, mappingKey: 'religion', section: 'The Basics' },
  { component: PoliticalBeliefsStep, title: 'Politics', hasTextInput: false, mappingKey: 'politics', section: 'The Basics' },
  { component: LifestyleStep, title: 'Lifestyle', hasTextInput: false, mappingKey: 'lifestyle', section: 'The Basics' },
  { component: BasicsComplete, title: 'Celebration', hasTextInput: false, section: 'The Basics', hideFromCounter: true },
  { component: InterestsStep, title: 'Interests', hasTextInput: false, mappingKey: 'interests', section: 'Almost Done' },
  { component: ValuesStep, title: 'Values', hasTextInput: false, mappingKey: 'values', section: 'Almost Done' },
  { component: PhotoUploadStep, title: 'Photos', hasTextInput: false, mappingKey: 'photos', section: 'Almost Done' },
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
  // Set when the eager photo upload is rejected by moderation. Surfaced in PhotoUploadStep
  // so the user sees why the photo was removed and can pick a different one.
  const [photoModerationError, setPhotoModerationError] = useState<string | null>(null);
  // Guard against concurrent goNext invocations (rapid taps / double-submit)
  const isGoingNextRef = useRef(false);
  // Background photo upload: starts after PhotoUploadStep, results used by completeOnboarding
  const photoUploadPromiseRef = useRef<Promise<any> | null>(null);
  const photoUploadResultRef = useRef<Array<{ id: string; url: string }> | null>(null);
  // Ref tracking latest onboardingData — initialized after useState below.
  // Updated synchronously inside setOnboardingData updater, NOT via useEffect.
  const onboardingDataRef = useRef<Partial<OnboardingData>>({});
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
            setOnboardingData(prev => {
              const next = { ...prev, ...data };
              onboardingDataRef.current = next; // keep ref in sync
              return next;
            });
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
            if (data) setOnboardingData(prev => {
              const next = { ...prev, ...data };
              onboardingDataRef.current = next;
              return next;
            });
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
        // Ensure a minimal profile row exists so we can track abandonment
        await ensureProfileRow(user.id, user.email || '');

        // Backfill name + age/age-range that were collected BEFORE the auth
        // session existed (stored only in AsyncStorage until now). Without this,
        // a user who abandons between OTP verify and end-of-onboarding loses
        // their name and birthday — only user_id + email + profile_completed
        // land in the row via ensureProfileRow.
        // Non-blocking: failures are logged but never halt onboarding.
        const snapshot = onboardingDataRef.current;
        if (snapshot.firstName && snapshot.lastName) {
          saveOnboardingStep('name', snapshot, user.id).catch(err =>
            logger.warn('[OnboardingScreen] Retroactive name save failed (non-blocking):', err),
          );
        }
        if (snapshot.age) {
          // The 'age' mapping writes both user_profiles.age AND
          // user_preferences.age_min/age_max (preferred age range).
          saveOnboardingStep('age', snapshot, user.id).catch(err =>
            logger.warn('[OnboardingScreen] Retroactive age save failed (non-blocking):', err),
          );
        }
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

  // Initialize the ref with the actual state (useRef above was initialized empty)
  if (Object.keys(onboardingDataRef.current).length === 0) {
    onboardingDataRef.current = onboardingData;
  }

  // Start photo upload immediately when a photo is selected (not when step advances).
  // This gives the upload a head start while the user continues through remaining steps.
  // Only runs when authenticated (photos require a JWT for Supabase Storage).
  useEffect(() => {
    if (!authUserId) return;
    if (!onboardingData.photos || onboardingData.photos.length === 0) {
      // Photos removed — clear upload refs so stale uploads don't persist
      photoUploadPromiseRef.current = null;
      photoUploadResultRef.current = null;
      return;
    }
    const uris = onboardingData.photos
      .map(p => p.url || (p as any).uri)
      .filter((u: string) => u && u.startsWith('file://'));
    if (uris.length === 0) return;
    // Only start if not already uploading the same set
    if (photoUploadPromiseRef.current) return;
    logger.info('[OnboardingScreen] Starting eager photo upload:', uris.length, 'photos');
    photoUploadPromiseRef.current = uploadMultiplePhotos(uris)
      .then(res => {
        if (!isMountedRef.current) return res;
        if (res.ok && res.data) {
          photoUploadResultRef.current = res.data;
          logger.info('[OnboardingScreen] Eager photo upload complete:', res.data.length);
        } else if (res.error?.code === 'MODERATION_REJECTED') {
          // Moderation rejected the photo. Clear the upload refs, drop the photo
          // from local state, and surface the rejection reason via PhotoUploadStep
          // so the user can pick a different photo.
          logger.warn('[OnboardingScreen] Eager photo upload rejected by moderation:', res.error.message);
          photoUploadPromiseRef.current = null;
          photoUploadResultRef.current = null;
          setPhotoModerationError(res.error.message);
          updateData({ photos: [] });
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
    // Role switch: matchmaker → dater (skip role, first votes, add friends)
    if (isRoleSwitch) {
      const skipComponents = new Set<React.ComponentType<any>>([
        MatchmakingModeStep, OnboardingProposalStep, AddFriendsStep,
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

  // Preload the NEXT step's module in the background so the user doesn't feel
  // the lazy-load stall when they tap Continue. Also preload EmailResendStep
  // when they land on Verify Email — that's the only screen with "Didn't
  // receive a code?" and we don't want a stall when they tap it.
  useEffect(() => {
    const next = steps[clampedStep + 1]?.component as { preload?: () => Promise<unknown> } | undefined;
    if (next?.preload) next.preload().catch(() => {});

    if (steps[clampedStep]?.title === 'Verify Email') {
      (EmailResendStep as any).preload?.().catch(() => {});
    }
  }, [clampedStep, steps]);

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
            // Logged at error level so monitoring catches recurring failures.
            // The final createUserProfile re-upserts the same data, so transient
            // failures here usually self-heal at the end of onboarding.
            logger.error(
              `[OnboardingScreen] Step save failed (step=${mapping.key}, non-blocking):`,
              saveResult.error?.message,
            );
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
      let dataForProfile = onboardingDataRef.current;
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
        // No Cancel option — user must retry. Tapping Cancel previously trapped users
        // with no way forward (profile never created, stuck on onboarding).
        Alert.alert(
          'Almost There!',
          'Unable to create your profile. Please check your connection and try again.',
          [{ text: 'Try Again', onPress: () => completeOnboarding() }]
        );
        return;
      }

      logger.info('Profile created successfully');

      // Photo upload failed — profile exists but profile_completed=false.
      // Let the user enter the app; the matches gate will prompt them to add
      // a photo from EditPhotos. Toast is delayed so it lands AFTER navigation.
      if (profileResult.data?.photoUploadFailed) {
        setTimeout(() => {
          showToast.error(
            'Photo upload failed',
            'Add a photo from your profile to start matching.',
          );
        }, 600);
      }

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
          <Suspense fallback={<StepLoadingFallback />}>
            <EmailResendStep
              data={onboardingData}
              updateData={updateData}
              onNext={() => {
                // Code re-sent — go back to verification
                setShowResendScreen(false);
              }}
              onBack={() => setShowResendScreen(false)}
            />
          </Suspense>
        </Animated.View>
      ) : (
        /* Step Content — keyed by step index for entrance/exit animations */
        <Animated.View
          key={clampedStep}
          entering={FadeIn.duration(DURATIONS.normal)}
          style={{ flex: 1 }}
        >
          <Suspense fallback={<StepLoadingFallback />}>
            <CurrentStepComponent
              data={onboardingData}
              updateData={updateData}
              onNext={goNext}
              onBack={goBack}
              isFirstStep={clampedStep === 0}
              isLastStep={clampedStep === totalSteps - 1}
              onResendCode={() => setShowResendScreen(true)}
              photoModerationError={photoModerationError}
              onClearPhotoModerationError={() => setPhotoModerationError(null)}
            />
          </Suspense>
        </Animated.View>
      )}
    </StyledView>
  );
};
