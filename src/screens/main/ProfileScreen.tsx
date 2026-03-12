import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, Switch, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROFILE_CACHE_DURATION, NAVIGATION_DELAY, AVATAR_SIZE_XL } from '../../constants';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button, ProfileSkeleton } from '../../components/ui';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, UserProfile, DeepQuestionAnswer } from '../../types';
import { signOut } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { getFriendCount } from '../../services/friendService';
import { EvaIcon } from '../../components/icons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import {
  BasicInfoSection,
  InterestsSection,
  ValuesSection,
  LifestyleSection,
  PreferencesSection,
  PartnerLifestyleSection,
  AboutMeSummary,
  MatchPreferencesSummary,
} from './ProfileScreen.components';
import { ProfileStrengthDashboard } from '../../components/profile/ProfileStrengthDashboard';
import { PhotoCarousel } from '../../components/profile/PhotoCarousel';
import { KarmaInfoModal } from '../../components/community/karma/KarmaInfoModal';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import { DEEP_QUESTIONS, getUnansweredQuestions } from '../../utils/deepQuestions';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ProfileScreen');
import { AnswerQuestionModal } from '../../components/profile/AnswerQuestionModal';
import { GuideTarget } from '../../components/guides';
import { useGuide } from '../../hooks/useGuide';
import { profileGuide } from '../../config/guides';

interface ProfileScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Profile'>;
}

const StyledSafeAreaView = styled(SafeAreaView) as typeof SafeAreaView;
const StyledView = styled(View) as typeof View;
const StyledScrollView = styled(ScrollView) as typeof ScrollView;
const StyledFlatList = styled(FlatList) as typeof FlatList;
const StyledImage = styled(Image) as typeof Image;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;

// Loading Skeleton for Questions Tab - with animation cleanup
const QuestionsSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop(); // Cleanup on unmount
  }, [pulseAnim]);

  return (
    <StyledView className="px-4 py-6 bg-neutral-50">
      {/* Hero Card Skeleton */}
      <Animated.View style={{ opacity: pulseAnim }}>
        <Card className="mb-6" style={{ backgroundColor: '#E5E7EB' }}>
          <StyledView className="flex-row items-center p-4">
            <StyledView className="w-20 h-20 rounded-full bg-neutral-300 mr-5" />
            <StyledView className="flex-1">
              <StyledView className="h-3 bg-neutral-300 rounded mb-2 w-24" />
              <StyledView className="h-5 bg-neutral-300 rounded mb-2 w-32" />
              <StyledView className="h-3 bg-neutral-300 rounded w-40" />
            </StyledView>
          </StyledView>
        </Card>
      </Animated.View>

      {/* Tier Stepper Skeleton */}
      <Animated.View style={{ opacity: pulseAnim }}>
        <Card className="mb-6" style={{ backgroundColor: '#E5E7EB' }}>
          <StyledView className="p-4">
            <StyledView className="h-4 bg-neutral-300 rounded mb-4 w-32 mx-auto" />
            <StyledView className="flex-row items-center justify-between">
              {[1, 2, 3].map((i) => (
                <StyledView key={i} className="flex-1 items-center">
                  <StyledView className="w-14 h-14 rounded-2xl bg-neutral-300 mb-2" />
                  <StyledView className="h-3 bg-neutral-300 rounded w-12 mb-1" />
                  <StyledView className="h-3 bg-neutral-300 rounded w-8" />
                </StyledView>
              ))}
            </StyledView>
          </StyledView>
        </Card>
      </Animated.View>

      {/* CTA Skeleton */}
      <Animated.View style={{ opacity: pulseAnim }}>
        <Card className="mb-6" style={{ backgroundColor: '#E5E7EB' }}>
          <StyledView className="p-4 flex-row items-center">
            <StyledView className="w-14 h-14 rounded-xl bg-neutral-300 mr-4" />
            <StyledView className="flex-1">
              <StyledView className="h-4 bg-neutral-300 rounded mb-2 w-32" />
              <StyledView className="h-3 bg-neutral-300 rounded w-48" />
            </StyledView>
          </StyledView>
        </Card>
      </Animated.View>

      {/* Question Cards Skeleton */}
      <Animated.View style={{ opacity: pulseAnim }}>
        <StyledView className="mb-4">
          <StyledView className="h-5 bg-neutral-300 rounded mb-2 w-40" />
          <StyledView className="h-3 bg-neutral-300 rounded w-56" />
        </StyledView>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4" style={{ backgroundColor: '#E5E7EB' }}>
            <StyledView className="p-4">
              <StyledView className="flex-row justify-between mb-3">
                <StyledView className="h-4 bg-neutral-300 rounded w-24" />
                <StyledView className="h-4 bg-neutral-300 rounded w-16" />
              </StyledView>
              <StyledView className="h-12 bg-neutral-300 rounded mb-3" />
              <StyledView className="h-20 bg-neutral-300 rounded" />
            </StyledView>
          </Card>
        ))}
      </Animated.View>
    </StyledView>
  );
};

// Memoized question card for unanswered questions (performance optimization)
const UnansweredQuestionCard = React.memo<{
  question: { id: number; question: string };
  onPress: () => void;
}>(({ question, onPress }) => (
  <StyledTouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="mb-3"
  >
    <Card className="bg-neutral-50 border-2 border-dashed border-neutral-300">
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-1 pr-3">
          <Body className="text-neutral-900 font-medium text-sm">{question.question}</Body>
        </StyledView>
        <StyledView className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center">
          <EvaIcon name="plus" size={20} color="#437FFF" />
        </StyledView>
      </StyledView>
    </Card>
  </StyledTouchableOpacity>
));

// Memoized question card for answered questions (performance optimization)
const AnsweredQuestionCard = React.memo<{
  question: DeepQuestionAnswer;
  onPress: () => void;
}>(({ question, onPress }) => (
  <StyledTouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="mb-3"
  >
    <Card className="bg-white border border-neutral-200">
      <Body className="text-neutral-900 font-semibold text-base mb-2">{question.question}</Body>
      <Body className="text-neutral-600 text-sm" numberOfLines={2}>{question.answer}</Body>
    </Card>
  </StyledTouchableOpacity>
));

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation: _navigation }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = _navigation as any;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'about' | 'questions'>('about');
  // Preview modal removed - now using ProfilePreviewScreen for standardized view
  const [showKarmaInfoModal, setShowKarmaInfoModal] = useState(false);
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [photoCarouselIndex] = useState(0);
  const [showEditAnswerModal, setShowEditAnswerModal] = useState(false);
  const [selectedQuestionForEdit, setSelectedQuestionForEdit] = useState<DeepQuestionAnswer | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const { isOffline} = useNetworkStatus();

  // NEW: Loading states for star/unstar operations (prevents race conditions)
  const [starringQuestions, setStarringQuestions] = useState<Set<number>>(new Set());

  // NEW: State for slot-based question display (Phase 1, 2 & 3)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showQuestionSelectionModal, setShowQuestionSelectionModal] = useState(false);
  const [selectedQuestionToAnswer, setSelectedQuestionToAnswer] = useState<{id: number, question: string} | null>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showChangeQuestionModal, setShowChangeQuestionModal] = useState(false);
  const [currentEditingQuestion, setCurrentEditingQuestion] = useState<DeepQuestionAnswer | null>(null);

  // Guide system
  const { startGuideIfNeeded } = useGuide();
  const [hasTriggeredGuide, setHasTriggeredGuide] = useState(false);

  // Performance: Cache timing ref to avoid redundant API calls
  const lastFetchRef = useRef<number>(0);

  // Track component mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Cleanup: Mark component as unmounted to prevent state updates
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Performance: Wrap data loading functions in useCallback
  const loadProfile = useCallback(async () => {
    try {
      logger.info('[ProfileScreen] loadProfile called');

      // getUserProfile() gets userId from auth session automatically
      const profileResult = await getUserProfile();
      if (!profileResult.ok || !profileResult.data) {
        // Don't show error if offline - keep existing data
        if (!isOffline) {
          Alert.alert('Error', 'Failed to load profile', [
            { text: 'Retry', onPress: () => loadProfile() },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                await signOut();
                navigation.navigate('Welcome');
              },
            },
          ]);
        }
        if (isMountedRef.current) {
          setLoading(false);
        }
        return;
      }

      const loadedProfile = profileResult.data;
      if (!isMountedRef.current) return;

      logger.info('[ProfileScreen] Profile loaded successfully:', {
        preferredPolitics: loadedProfile.preferredPolitics,
        matchPrefsCompleteness: loadedProfile.preferences ? 'exists' : 'missing'
      });

      // Wrap all state updates in mount guard
      if (isMountedRef.current) {
        setProfile(loadedProfile);

        // Load section visibility from profile if it exists
      }
    } catch (error: any) {
      // Don't show error if offline - keep existing data
      if (!isOffline) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isOffline]);

  const loadFriendCount = useCallback(async () => {
    try {
      const result = await getFriendCount();
      if (result.ok && result.data !== undefined) {
        if (isMountedRef.current) {
          setFriendCount(result.data);
        }
      }
    } catch (error) {
      logger.error('Failed to load friend count:', error);
    }
  }, []);

  // Reload profile data when screen comes into focus (e.g., after editing profile)
  // Always reload profile when returning to screen to ensure fresh data after edits
  useFocusEffect(
    useCallback(() => {
      logger.info('[ProfileScreen] useFocusEffect triggered - reloading profile data');

      // Load all data in parallel for better performance
      Promise.all([
        loadProfile(),
        loadFriendCount()
      ]).catch(error => {
        logger.error('Failed to load profile data:', error);
        // Show user-visible error notification
        showToast.error(
          'Failed to load profile',
          'Please pull down to refresh or try again later.'
        );
      });

    }, [loadProfile, loadFriendCount])
  );

  // Start profile guide ONLY once per session when profile loads
  useEffect(() => {
    if (!loading && profile && !hasTriggeredGuide) {
      setHasTriggeredGuide(true);
      const timer = setTimeout(() => {
        startGuideIfNeeded(profileGuide);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, profile, hasTriggeredGuide, startGuideIfNeeded]);

  const handleRefresh = useCallback(async () => {
    if (isMountedRef.current) {
      setRefreshing(true);
    }
    // Force refresh bypasses cache
    lastFetchRef.current = 0;
    await Promise.all([
      loadProfile(),
      loadFriendCount(),
    ]);
    lastFetchRef.current = Date.now();
    if (isMountedRef.current) {
      setRefreshing(false);
    }
  }, [loadProfile, loadFriendCount]);

  // IMPROVED: Handle inline answer editing using AnswerQuestionModal
  const handleEditAnswer = useCallback((question: DeepQuestionAnswer) => {
    setSelectedQuestionForEdit(question);
    setEditingAnswer(question.answer); // Keep for compatibility
    setShowEditAnswerModal(true);
    lightHaptic();
  }, []);

  // IMPROVED: Save edited answer with better error handling
  const handleSaveEditedAnswer = async (newAnswer: string): Promise<boolean> => {
    const questionToEdit = selectedQuestionForEdit || currentEditingQuestion;

    if (!questionToEdit || !newAnswer.trim()) {
      logger.error('Cannot save: no question selected or empty answer');
      return false;
    }

    // FIX: Check if profile and deepQuestions exist
    if (!profile || !profile.deepQuestions) {
      Alert.alert('Error', 'Profile data not loaded. Please try again.');
      return false;
    }

    try {
      // Update the deep questions array with the edited answer and timestamp
      const updatedQuestions = profile.deepQuestions.map(q =>
        q.questionId === questionToEdit.questionId
          ? { ...q, answer: newAnswer.trim(), updatedAt: new Date().toISOString() }
          : q
      );

      // CRITICAL FIX: Send entire profile object like DeepQuestionsScreen does
      const result = await updateUserProfile({
        ...profile,  // ✅ Include all profile fields
        deepQuestions: updatedQuestions,
      });

      if (result.ok) {
        // Update local state immediately (only if still mounted)
        if (isMountedRef.current) {
          setProfile({
            ...profile,
            deepQuestions: updatedQuestions,
          });
        }
        showToast.success('Answer updated!');
        return true;  // ✅ Success
      } else {
        logger.error('Save failed:', result.error);
        Alert.alert('Error', result.error?.message || 'Failed to update answer');
        return false;  // ❌ Failed
      }
    } catch (error: any) {
      logger.error('Error saving edited answer:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      return false;  // ❌ Failed
    }
  };

  // PHASE 2: Handle question selection from modal
  const handleQuestionSelected = (questionId: number, questionText: string) => {
    setSelectedQuestionToAnswer({ id: questionId, question: questionText });
    setShowQuestionSelectionModal(false);
    setShowAnswerModal(true);
  };

  // PHASE 3: Handle changing question in a filled slot
  const handleChangeQuestion = () => {
    setShowEditAnswerModal(false);
    setShowChangeQuestionModal(true);
  };

  // PHASE 3: Handle selecting a different answered question for a slot
  const handleChangeToAnsweredQuestion = async (questionId: number) => {
    if (selectedSlotIndex === null || !profile) return;

    try {
      const updatedDisplayed = [...(profile.displayedQuestions || [])];
      updatedDisplayed[selectedSlotIndex] = questionId;

      const result = await updateUserProfile({
        displayedQuestions: updatedDisplayed,
      });

      if (result.ok) {
        if (isMountedRef.current) {
          setProfile({
            ...profile,
            displayedQuestions: updatedDisplayed,
          });
          setShowChangeQuestionModal(false);
          setCurrentEditingQuestion(null);
          setSelectedSlotIndex(null);
        }
        showToast.success('Question changed!');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to change question');
      }
    } catch (error: any) {
      logger.error('Error changing question:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };

  // PHASE 2: Save new answer to a slot
  const handleSaveNewAnswer = async (answer: string): Promise<boolean> => {
    if (!selectedQuestionToAnswer || selectedSlotIndex === null || !profile) {
      Alert.alert('Error', 'Invalid state. Please try again.');
      return false;
    }

    try {
      // Create new answer
      const newAnswer: DeepQuestionAnswer = {
        questionId: selectedQuestionToAnswer.id,
        tier: 1, // No longer using tiers, but keeping for compatibility
        question: selectedQuestionToAnswer.question,
        answer: answer.trim(),
        updatedAt: new Date().toISOString(),
      };

      // Add to deepQuestions array
      const existingAnswerIndex = profile.deepQuestions?.findIndex(q => q.questionId === selectedQuestionToAnswer.id) ?? -1;
      let updatedQuestions: DeepQuestionAnswer[];

      if (existingAnswerIndex >= 0) {
        // Update existing answer
        updatedQuestions = profile.deepQuestions!.map((q, i) => i === existingAnswerIndex ? newAnswer : q);
      } else {
        // Add new answer
        updatedQuestions = [...(profile.deepQuestions || []), newAnswer];
      }

      // Update displayedQuestions array to include this question at the selected slot
      const updatedDisplayed = [...(profile.displayedQuestions || [])];
      updatedDisplayed[selectedSlotIndex] = selectedQuestionToAnswer.id;

      // Save to backend
      const result = await updateUserProfile({
        ...profile,
        deepQuestions: updatedQuestions,
        displayedQuestions: updatedDisplayed,
      });

      if (result.ok) {
        // Update local state (only if still mounted)
        if (isMountedRef.current) {
          setProfile({
            ...profile,
            deepQuestions: updatedQuestions,
            displayedQuestions: updatedDisplayed,
          });
        }
        showToast.success('Answer saved!');
        return true;
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to save answer');
        return false;
      }
    } catch (error: any) {
      logger.error('Error saving new answer:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      return false;
    }
  };

  // Format relative time for timestamps
  const getRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return 'Recently';

    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffMonths / 12)}y ago`;
  };

  const renderAboutTab = () => {


    return (
      <StyledView className="px-4 py-6">
          {/* Profile Strength Dashboard - Always visible for gamification */}
          {profile && (
            <GuideTarget id="profile-strength-card">
              <ProfileStrengthDashboard
                profile={profile}
                onSectionPress={(section) => {
                  lightHaptic();

                  // Handle different section presses
                  switch (section) {
                    case 'Match Preferences':
                      navigation.navigate('MatchPreferences');
                      break;
                    case 'Questions':
                      setActiveTab('questions');
                      break;
                    case 'About Me':
                    case 'Photos':
                    default:
                      navigation.navigate('ProfileEdit');
                      break;
                  }
                }}
              />
            </GuideTarget>
          )}

          {/* About Me Summary Card */}
          {profile && <AboutMeSummary
            profile={profile}
            onEdit={() => navigation.navigate('ProfileEdit')}
          />}

          {/* Match Preferences Summary Card */}
          {profile?.preferences && (
            <MatchPreferencesSummary
              preferences={profile.preferences}
              preferredPolitics={profile.preferredPolitics}
              preferredEthnicitiesCount={profile.preferredEthnicities?.length || 0}
              interestsCount={profile.interests?.length || 0}
              valuesCount={profile.values?.length || 0}
              onEdit={() => navigation.navigate('MatchPreferences')}
            />
          )}
        </StyledView>
    );
  };

  const renderQuestionsTab = () => {
    // Show skeleton while loading
    if (loading || !profile) {
      return <QuestionsSkeleton />;
    }

    const answeredQuestions = profile?.deepQuestions || [];
    const displayedQuestionIds = profile?.displayedQuestions || [];
    const answeredCount = answeredQuestions.length;

    // Get the displayed questions sorted by tier (1, 2, 3)
    const displayedAnswers = displayedQuestionIds
      .map(id => answeredQuestions.find(q => q.questionId === id))
      .filter(q => q !== undefined)
      .sort((a, b) => (a?.tier || 0) - (b?.tier || 0)) as DeepQuestionAnswer[];

    // Get non-starred answers
    const nonStarredAnswers = answeredQuestions.filter(q => !displayedQuestionIds.includes(q.questionId));

    return (
      <StyledView className="px-4 py-6 bg-neutral-50">
        {/* Warm Progress Header with Gradient - Only show if not complete */}
        {displayedQuestionIds.length < 3 && (
          <Card
            className="mb-6 overflow-hidden"
            style={{
              backgroundColor: 'transparent',
              padding: 0,
            }}
          >
            <LinearGradient
              colors={['#F0F9FF', '#E0F2FE', '#DBEAFE']}  // Warm sky blue gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 12,
                shadowColor: '#0284C7',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <StyledView className="p-4">
                <StyledView className="mb-3">
                  <Body className="text-sky-800 text-xs uppercase tracking-wider font-semibold opacity-80">Required to Match</Body>
                  <Body className="text-sky-900 font-bold text-2xl mb-1">{displayedQuestionIds.length}/3</Body>
                </StyledView>
                <StyledView className="mb-3">
                  <Body className="text-sky-700 text-xs opacity-90 leading-5">
                    Only 3 display on your profile
                  </Body>
                  <Body className="text-sky-700 text-xs opacity-90 leading-5">
                    Answer more to receive more intentional matches
                  </Body>
                </StyledView>
                <StyledView
                  className="rounded-full h-2 overflow-hidden"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <LinearGradient
                    colors={['#38BDF8', '#0EA5E9']}  // Bright sky blue gradient for progress
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: '100%',
                      width: `${(displayedQuestionIds.length / 3) * 100}%`,
                      borderRadius: 9999,
                    }}
                  />
                </StyledView>
              </StyledView>
            </LinearGradient>
          </Card>
        )}

        {/* PHASE 1: Three Question Slots - NO TIERS */}
        {(() => {
          // Get the 3 displayed questions (in order)
          const slot1Question = displayedQuestionIds[0] ? answeredQuestions.find(q => q.questionId === displayedQuestionIds[0]) : null;
          const slot2Question = displayedQuestionIds[1] ? answeredQuestions.find(q => q.questionId === displayedQuestionIds[1]) : null;
          const slot3Question = displayedQuestionIds[2] ? answeredQuestions.find(q => q.questionId === displayedQuestionIds[2]) : null;

          const handleSlotClick = (slotIndex: number, currentQuestion: DeepQuestionAnswer | null | undefined) => {
            lightHaptic();
            setSelectedSlotIndex(slotIndex);

            if (currentQuestion) {
              // Slot is filled - show edit modal
              setCurrentEditingQuestion(currentQuestion);
              setShowEditAnswerModal(true);
            } else {
              // Slot is empty - show question selection modal
              setShowQuestionSelectionModal(true);
            }
          };

          const handleRemoveQuestion = async (slotIndex: number) => {
            lightHaptic();
            // Remove the question from this slot
            const updatedDisplayed = [...displayedQuestionIds];
            updatedDisplayed.splice(slotIndex, 1);

            // Update backend
            const result = await updateUserProfile({
              displayedQuestions: updatedDisplayed,
            });

            if (result.ok) {
              // Reload profile to reflect changes
              await loadProfile();
              showToast.success('Question removed');
            } else {
              Alert.alert('Error', result.error?.message || 'Failed to remove question');
            }
          };

          const renderQuestionSlot = (slotIndex: number, question: DeepQuestionAnswer | null | undefined) => (
            <StyledTouchableOpacity
              key={slotIndex}
              onPress={() => handleSlotClick(slotIndex, question)}
              activeOpacity={0.7}
              className="mb-3"
            >
              {question ? (
                // Filled state
                <Card className="bg-white border border-neutral-200">
                  <StyledView className="flex-row items-start justify-between mb-2">
                    <Body className="text-xs font-bold text-primary-600 uppercase">Question {slotIndex + 1}</Body>
                    <StyledTouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveQuestion(slotIndex);
                      }}
                      className="w-6 h-6 items-center justify-center"
                    >
                      <EvaIcon name="close" size={20} color="#6B7280" />
                    </StyledTouchableOpacity>
                  </StyledView>
                  <Body className="text-neutral-900 font-semibold text-base mb-2">{question.question}</Body>
                  <Body className="text-neutral-600 text-sm" numberOfLines={2}>{question.answer}</Body>
                </Card>
              ) : (
                // Empty state (dashed border)
                <Card className="bg-neutral-50 border-2 border-dashed border-neutral-300">
                  <StyledView className="items-center py-8">
                    <Body className="text-neutral-500 font-medium mb-3">Select a question</Body>
                    <StyledView className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
                      <EvaIcon name="plus" size={24} color="#437FFF" />
                    </StyledView>
                  </StyledView>
                </Card>
              )}
            </StyledTouchableOpacity>
          );

          return (
            <>
              <StyledView className="mb-4">
                <H3 className="mb-2">Visible to Matches</H3>
                <Body className="text-neutral-600 text-xs mb-4">Select 3 questions to display on your profile</Body>
              </StyledView>

              {/* Three Question Slots */}
              {renderQuestionSlot(0, slot1Question)}
              {renderQuestionSlot(1, slot2Question)}
              {renderQuestionSlot(2, slot3Question)}

              {/* PHASE 4: Answer More Questions Section - Always available */}
              {(() => {
                const answeredIds = answeredQuestions.map(q => q.questionId);
                const unansweredQuestions = getUnansweredQuestions(answeredIds);
                const nonDisplayedAnswers = answeredQuestions.filter(q => !displayedQuestionIds.includes(q.questionId));

                const handleAnswerMoreQuestion = (questionId: number, questionText: string) => {
                  setSelectedQuestionToAnswer({ id: questionId, question: questionText });
                  setSelectedSlotIndex(null); // Not for a specific slot
                  setShowAnswerModal(true);
                };

                const handleSaveMoreAnswer = async (answer: string): Promise<boolean> => {
                  if (!selectedQuestionToAnswer || !profile) {
                    Alert.alert('Error', 'Invalid state. Please try again.');
                    return false;
                  }

                  try {
                    const newAnswer: DeepQuestionAnswer = {
                      questionId: selectedQuestionToAnswer.id,
                      tier: 1,
                      question: selectedQuestionToAnswer.question,
                      answer: answer.trim(),
                      updatedAt: new Date().toISOString(),
                    };

                    const existingIndex = profile.deepQuestions?.findIndex(q => q.questionId === selectedQuestionToAnswer.id) ?? -1;
                    let updatedQuestions: DeepQuestionAnswer[];

                    if (existingIndex >= 0) {
                      updatedQuestions = profile.deepQuestions!.map((q, i) => i === existingIndex ? newAnswer : q);
                    } else {
                      updatedQuestions = [...(profile.deepQuestions || []), newAnswer];
                    }

                    const result = await updateUserProfile({
                      ...profile,
                      deepQuestions: updatedQuestions,
                    });

                    if (result.ok) {
                      if (isMountedRef.current) {
                        setProfile(prev => prev ? {
                          ...prev,
                          deepQuestions: updatedQuestions,
                        } : prev);
                      }
                      showToast.success('Answer saved!');
                      return true;
                    } else {
                      Alert.alert('Error', result.error?.message || 'Failed to save answer');
                      return false;
                    }
                  } catch (error: any) {
                    logger.error('Error saving answer:', error);
                    Alert.alert('Error', error.message || 'An unexpected error occurred');
                    return false;
                  }
                };

                return (
                  <>
                    {/* Show separator only when 3 questions are displayed */}
                    {displayedQuestionIds.length === 3 && (
                      <>
                        {/* Separator */}
                        <StyledView className="flex-row items-center my-6">
                          <StyledView className="flex-1 h-px bg-neutral-200" />
                          <Body className="text-neutral-400 text-xs mx-3 uppercase tracking-wide">Answer More</Body>
                          <StyledView className="flex-1 h-px bg-neutral-200" />
                        </StyledView>

                        <StyledView className="mb-4">
                          <H3 className="mb-2">Improve Your Matches</H3>
                          <Body className="text-neutral-600 text-xs mb-4">
                            Answer more questions to help our algorithm find better matches. These won't display on your profile.
                          </Body>
                        </StyledView>
                      </>
                    )}

                    {/* Question lists and modal - Always available */}
                        {/* Unanswered Questions - Virtualized with FlatList */}
                        {unansweredQuestions.length > 0 && (
                          <>
                            <Body className="text-neutral-700 font-semibold text-sm mb-3">
                              Unanswered ({unansweredQuestions.length})
                            </Body>
                            <FlatList
                              data={unansweredQuestions}
                              keyExtractor={(item) => `unanswered-${item.id}`}
                              renderItem={({ item }) => (
                                <UnansweredQuestionCard
                                  question={item}
                                  onPress={() => {
                                    mediumHaptic();
                                    handleAnswerMoreQuestion(item.id, item.question);
                                  }}
                                />
                              )}
                              scrollEnabled={false}
                              removeClippedSubviews={true}
                              maxToRenderPerBatch={10}
                              updateCellsBatchingPeriod={50}
                              initialNumToRender={10}
                              windowSize={5}
                            />
                          </>
                        )}

                        {/* Previously Answered (Not Displayed) - Virtualized with FlatList */}
                        {nonDisplayedAnswers.length > 0 && (
                          <>
                            <Body className="text-neutral-700 font-semibold text-sm mb-3 mt-4">
                              Answered but Not Displayed ({nonDisplayedAnswers.length})
                            </Body>
                            <FlatList
                              data={nonDisplayedAnswers}
                              keyExtractor={(item) => `answered-${item.questionId}`}
                              renderItem={({ item }) => (
                                <AnsweredQuestionCard
                                  question={item}
                                  onPress={() => {
                                    lightHaptic();
                                    setCurrentEditingQuestion(item);
                                    setShowEditAnswerModal(true);
                                  }}
                                />
                              )}
                              scrollEnabled={false}
                              removeClippedSubviews={true}
                              maxToRenderPerBatch={10}
                              updateCellsBatchingPeriod={50}
                              initialNumToRender={10}
                              windowSize={5}
                            />
                          </>
                        )}

                        {/* All Questions Answered */}
                        {unansweredQuestions.length === 0 && (
                          <Card className="bg-green-50 border border-green-200">
                            <StyledView className="items-center py-8">
                              <EvaIcon name="checkmark-circle-2" size={48} color="#10B981" />
                              <Body className="text-green-900 font-bold text-lg mt-3 mb-2">All Done!</Body>
                              <Body className="text-green-700 text-sm text-center">
                                You've answered all 21 questions. Our algorithm has everything it needs to find great matches for you!
                              </Body>
                            </StyledView>
                          </Card>
                        )}

                        {/* Modal for answering more questions */}
                        {selectedQuestionToAnswer && selectedSlotIndex === null && (
                          <AnswerQuestionModal
                            visible={showAnswerModal}
                            question={selectedQuestionToAnswer.question}
                            tier={1 as 1 | 2 | 3}
                            initialAnswer=""
                            onSave={async (answer) => {
                              const success = await handleSaveMoreAnswer(answer);
                              if (success) {
                                setShowAnswerModal(false);
                                setSelectedQuestionToAnswer(null);
                              }
                            }}
                            onClose={() => {
                              setShowAnswerModal(false);
                              setSelectedQuestionToAnswer(null);
                            }}
                          />
                        )}
                  </>
                );
              })()}
            </>
          );
        })()}
        </StyledView>
    );
  };

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50">
        <StatusBar barStyle="dark-content" />
        <ProfileSkeleton />
      </StyledSafeAreaView>
    );
  }

  if (!profile) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 justify-center items-center px-6">
          <Body className="text-neutral-600">Failed to load profile</Body>
          <Button onPress={loadProfile} variant="primary" className="mt-4">
            Retry
          </Button>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />
      <OfflineBanner />
      <ProfileCompletionBanner
        profile={profile}
        onPress={() => {
          // Navigate to Profile edit to complete profile
          navigation.navigate('ProfileEdit');
        }}
      />

      <StyledScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#437FFF"
          />
        }
      >
        {/* Header with Preview, Edit and Settings */}
        <StyledView className="bg-white border-b border-neutral-200">
        <StyledView className="px-4 py-3 flex-row justify-between items-center">
          <H2 className="text-xl">Your Profile</H2>
          <StyledView className="flex-row items-center space-x-3">
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                navigation.navigate('ProfilePreview');
              }}
              accessibilityLabel="Preview profile"
              accessibilityRole="button"
            >
              <EvaIcon name="eye-outline" size={24} color="#7C3AED" />
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                navigation.navigate('ProfileEdit');
              }}
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
            >
              <EvaIcon name="create-outline" size={24} color="#437FFF" />
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                navigation.navigate('Settings');
              }}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <EvaIcon name="settings-2-outline" size={24} color="#475467" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Profile Photo and Name */}
        <StyledView className="px-4 pb-4">
          {/* Circular Profile Photo Layout */}
          <StyledView className="items-center">
            {/* Profile Photo Circle */}
            {profile.photos && profile.photos.length > 0 && (profile.photos.find(p => p.isMain) || profile.photos[0])?.url ? (
              <StyledImage
                source={{ uri: (profile.photos.find(p => p.isMain) || profile.photos[0]).url }}
                className="rounded-full mb-3 bg-neutral-200 border-2 border-neutral-100"
                style={{
                  width: AVATAR_SIZE_XL,
                  height: AVATAR_SIZE_XL,
                  shadowColor: '#2E1810',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.22,
                  shadowRadius: 10,
                  elevation: 6,
                } as any}
                contentFit="cover"
                transition={200}
                cachePolicy="disk"
                onError={(e) => {
                  logger.warn('Failed to load profile photo:', e.error);
                }}
              />
            ) : (
              <StyledView
                className="w-24 h-24 rounded-full mb-3 bg-neutral-200 items-center justify-center border-2 border-neutral-100"
                style={{
                  shadowColor: '#3D2817',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <EvaIcon name="person-outline" size={40} color="#98A2B3" />
              </StyledView>
            )}

            {/* Name & Karma Badge */}
            <StyledView className="flex-row items-center mb-4" style={{ gap: 8 }}>
              <H2 className="text-xl">{profile.firstName}</H2>
              <StyledTouchableOpacity
                onPress={() => setShowKarmaInfoModal(true)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 9, paddingVertical: 4,
                  backgroundColor: 'rgba(52, 199, 89, 0.1)',
                  borderWidth: 1, borderColor: '#34C759',
                  borderRadius: 999, gap: 4,
                }}>
                <EvaIcon name="star-outline" size={12} color="#34C759" />
                <H2 className="text-xs" style={{ color: '#34C759', fontWeight: '600' }}>
                  {profile.karma?.karma_points ?? 0} pts
                </H2>
              </StyledTouchableOpacity>
            </StyledView>

            {/* Friends Section */}
            <StyledView className="flex-row items-center space-x-3">
              <StyledTouchableOpacity
                onPress={() => navigation.navigate('Community')}
                className="bg-neutral-100 px-4 py-2 rounded-full flex-row items-center"
                style={{
                  shadowColor: '#3D2817',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.14,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                accessibilityLabel={`View ${friendCount} friend${friendCount !== 1 ? 's' : ''}`}
                accessibilityRole="button"
              >
                <EvaIcon name="people" size={16} color="#475467" />
                <Body className="text-neutral-700 text-sm font-medium ml-1.5">
                  {friendCount} {friendCount === 1 ? 'Friend' : 'Friends'}
                </Body>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                onPress={() => navigation.navigate('ContactInvite')}
                className="bg-primary-500 px-4 py-2 rounded-full flex-row items-center"
                style={{
                  shadowColor: '#2952CC',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                }}
                accessibilityLabel="Add friends"
                accessibilityRole="button"
              >
                <EvaIcon name="person-add" size={16} color="white" />
                <Body className="text-white text-sm font-medium ml-1.5">Add Friends</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Tab Bar */}
        <StyledView className="flex-row border-t border-neutral-100">
          <StyledTouchableOpacity
            onPress={() => {
              lightHaptic();
              setActiveTab('about');
            }}
            style={{ width: '50%' }}
            className="py-3 items-center relative"
            accessibilityLabel="About tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'about' }}
          >
            <Body
              className={`font-medium ${
                activeTab === 'about' ? 'text-primary-500' : 'text-neutral-600'
              }`}
            >
              About
            </Body>
            {activeTab === 'about' && (
              <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </StyledTouchableOpacity>
          <GuideTarget id="questions-tab" style={{ width: '50%' }}>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                setActiveTab('questions');
              }}
              className="py-3 items-center relative"
              accessibilityLabel={`Questions tab, ${profile?.deepQuestions?.length || 0} answered`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'questions' }}
            >
              <Body
                className={`font-medium ${
                  activeTab === 'questions' ? 'text-primary-500' : 'text-neutral-600'
                }`}
              >
                Questions
              </Body>
              {activeTab === 'questions' && (
                <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </StyledTouchableOpacity>
          </GuideTarget>
        </StyledView>
      </StyledView>

        {/* Tab Content */}
        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'questions' && renderQuestionsTab()}
      </StyledScrollView>


      {/* IMPROVED: Use AnswerQuestionModal (same as DeepQuestionsScreen) */}
      <AnswerQuestionModal
        visible={showEditAnswerModal}
        question={selectedQuestionForEdit?.question || currentEditingQuestion?.question || ''}
        tier={(selectedQuestionForEdit?.tier || currentEditingQuestion?.tier || 1) as 1 | 2 | 3}
        initialAnswer={selectedQuestionForEdit?.answer || currentEditingQuestion?.answer || ''}
        onSave={async (answer) => {
          // CRITICAL FIX: Await save and only close modal if successful
          const success = await handleSaveEditedAnswer(answer);
          if (success) {
            setShowEditAnswerModal(false);
            setSelectedQuestionForEdit(null);
            setCurrentEditingQuestion(null);
            setSelectedSlotIndex(null);
          }
          // If save failed, modal stays open so user can retry
        }}
        onClose={() => {
          setShowEditAnswerModal(false);
          setSelectedQuestionForEdit(null);
          setCurrentEditingQuestion(null);
          setSelectedSlotIndex(null);
        }}
        onChangeQuestion={currentEditingQuestion ? handleChangeQuestion : undefined}
      />

      {/* PHASE 2: Question Selection Modal */}
      <Modal
        visible={showQuestionSelectionModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowQuestionSelectionModal(false)}
      >
        <StyledSafeAreaView className="flex-1 bg-neutral-50">
          <StatusBar barStyle="dark-content" />

          {/* Header */}
          <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center justify-between">
            <H2 className="text-lg">Select a Question</H2>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                setShowQuestionSelectionModal(false);
              }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <EvaIcon name="close" size={28} color="#101828" />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Question List */}
          <StyledScrollView className="flex-1 px-4 py-4">
            <Body className="text-neutral-600 text-sm mb-4">
              Choose from 21 questions. You can answer as many as you want, but only 3 will display on your profile.
            </Body>

            {(() => {
              const answeredIds = profile?.deepQuestions?.map(q => q.questionId) || [];
              const displayedIds = profile?.displayedQuestions || [];
              const unanswered = getUnansweredQuestions(answeredIds);
              // Already answered but not currently displayed on profile
              const answeredNotDisplayed = (profile?.deepQuestions || [])
                .filter(q => !displayedIds.includes(q.questionId));

              return (
                <>
                  {answeredNotDisplayed.length > 0 && (
                    <>
                      <Body className="text-neutral-700 font-semibold text-sm mb-3">
                        Already Answered ({answeredNotDisplayed.length})
                      </Body>
                      {answeredNotDisplayed.map((q) => {
                        const questionText = DEEP_QUESTIONS.find(dq => dq.id === q.questionId)?.question || q.question;
                        return (
                          <StyledTouchableOpacity
                            key={`answered-${q.questionId}`}
                            onPress={() => {
                              mediumHaptic();
                              setShowQuestionSelectionModal(false);
                              handleChangeToAnsweredQuestion(q.questionId);
                            }}
                            activeOpacity={0.7}
                            className="mb-3"
                          >
                            <Card className="bg-blue-50 border border-blue-200">
                              <Body className="text-neutral-900 font-medium text-base leading-6">{questionText}</Body>
                              <Body className="text-neutral-500 text-sm mt-1" numberOfLines={2}>{q.answer}</Body>
                            </Card>
                          </StyledTouchableOpacity>
                        );
                      })}
                    </>
                  )}

                  {unanswered.length > 0 && (
                    <Body className="text-neutral-700 font-semibold text-sm mb-3 mt-2">
                      Unanswered ({unanswered.length})
                    </Body>
                  )}
                  {unanswered.map((q) => (
                    <StyledTouchableOpacity
                      key={q.id}
                      onPress={() => {
                        mediumHaptic();
                        handleQuestionSelected(q.id, q.question);
                      }}
                      activeOpacity={0.7}
                      className="mb-3"
                    >
                      <Card className="bg-white border border-neutral-200">
                        <Body className="text-neutral-900 font-medium text-base leading-6">{q.question}</Body>
                      </Card>
                    </StyledTouchableOpacity>
                  ))}

                  {unanswered.length === 0 && answeredNotDisplayed.length === 0 && (
                    <Card className="bg-blue-50 border border-blue-200">
                      <StyledView className="items-center py-8">
                        <EvaIcon name="checkmark-circle-2" size={48} color="#437FFF" />
                        <Body className="text-blue-900 font-bold text-lg mt-3 mb-2">All Questions Answered!</Body>
                        <Body className="text-blue-700 text-sm text-center">
                          You've answered all 21 questions. You can edit your answers anytime.
                        </Body>
                      </StyledView>
                    </Card>
                  )}
                </>
              );
            })()}
          </StyledScrollView>
        </StyledSafeAreaView>
      </Modal>

      {/* PHASE 2: Answer Modal (reusing existing AnswerQuestionModal) - Only for displayed slots (not "more questions") */}
      {selectedQuestionToAnswer && selectedSlotIndex !== null && (
        <AnswerQuestionModal
          visible={showAnswerModal}
          question={selectedQuestionToAnswer.question}
          tier={1 as 1 | 2 | 3} // No tiers anymore, but component requires it
          initialAnswer=""
          onSave={async (answer) => {
            const success = await handleSaveNewAnswer(answer);
            if (success) {
              setShowAnswerModal(false);
              setSelectedQuestionToAnswer(null);
              setSelectedSlotIndex(null);
            }
          }}
          onClose={() => {
            setShowAnswerModal(false);
            setSelectedQuestionToAnswer(null);
            setSelectedSlotIndex(null);
          }}
        />
      )}

      {/* PHASE 3: Change Question Modal - Shows other answered questions */}
      <Modal
        visible={showChangeQuestionModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChangeQuestionModal(false)}
      >
        <StyledSafeAreaView className="flex-1 bg-neutral-50">
          <StatusBar barStyle="dark-content" />

          {/* Header */}
          <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center justify-between">
            <H2 className="text-lg">Change Question</H2>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                setShowChangeQuestionModal(false);
              }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <EvaIcon name="close" size={28} color="#101828" />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Question List */}
          <StyledScrollView className="flex-1 px-4 py-4">
            <Body className="text-neutral-600 text-sm mb-4">
              Select a different question you've already answered to display in this slot.
            </Body>

            {(() => {
              const answeredQuestions = profile?.deepQuestions || [];
              const displayedIds = profile?.displayedQuestions || [];

              // Show answered questions that aren't currently displayed
              const availableQuestions = answeredQuestions.filter(q => !displayedIds.includes(q.questionId));

              return (
                <>
                  {availableQuestions.map((q) => (
                    <StyledTouchableOpacity
                      key={q.questionId}
                      onPress={() => {
                        mediumHaptic();
                        handleChangeToAnsweredQuestion(q.questionId);
                      }}
                      activeOpacity={0.7}
                      className="mb-3"
                    >
                      <Card className="bg-white border border-neutral-200">
                        <Body className="text-neutral-900 font-semibold text-base mb-2">{q.question}</Body>
                        <Body className="text-neutral-600 text-sm" numberOfLines={2}>{q.answer}</Body>
                      </Card>
                    </StyledTouchableOpacity>
                  ))}

                  {availableQuestions.length === 0 && (
                    <Card className="bg-blue-50 border border-blue-200">
                      <StyledView className="items-center py-8">
                        <EvaIcon name="info" size={48} color="#437FFF" />
                        <Body className="text-blue-900 font-bold text-lg mt-3 mb-2">No Other Questions</Body>
                        <Body className="text-blue-700 text-sm text-center">
                          All your answered questions are already displayed. Answer more questions to have more options!
                        </Body>
                      </StyledView>
                    </Card>
                  )}
                </>
              );
            })()}
          </StyledScrollView>
        </StyledSafeAreaView>
      </Modal>

      {/* Photo Carousel */}
      {profile?.photos && profile.photos.length > 0 && (
        <PhotoCarousel
          photos={profile.photos}
          initialIndex={photoCarouselIndex}
          visible={showPhotoCarousel}
          onClose={() => setShowPhotoCarousel(false)}
        />
      )}

      <KarmaInfoModal visible={showKarmaInfoModal} onClose={() => setShowKarmaInfoModal(false)} />
    </StyledSafeAreaView>
  );
};
