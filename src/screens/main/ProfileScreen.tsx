import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, Image, TouchableOpacity, Alert, RefreshControl, Modal, Switch, Animated, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button, ProfileSkeleton } from '../../components/ui';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, UserProfile, Match, DeepQuestionAnswer } from '../../types';
import { requirePhoneVerification } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { getUserMatches, updateMatchExitFeedback } from '../../services/matchService';
import { getFriendCount } from '../../services/friendService';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../components/OfflineBanner';
import { ProfileCompletionBanner } from '../../components/ProfileCompletionBanner';
import {
  BasicInfoSection,
  InterestsSection,
  ValuesSection,
  LifestyleSection,
  PreferencesSection,
  PartnerLifestyleSection,
  MatchCard,
  EmptyState,
  AboutMeSummary,
  MatchPreferencesSummary,
} from './ProfileScreen.components';
import { ProfileStrengthDashboard } from '../../components/ProfileStrengthDashboard';
import { PhotoCarousel } from '../../components/PhotoCarousel';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import { getQuestionTier, TIER_CONFIG, calculateTierStats, countDisplayedByTier } from '../../utils/questionTiers';
import { DEEP_QUESTIONS, getUnansweredQuestions } from '../../utils/deepQuestions';
import { AnswerQuestionModal } from '../../components/AnswerQuestionModal';
import { GuideTarget } from '../../components/guides';
import { useGuide } from '../../hooks/useGuide';
import { profileGuide } from '../../config/guides';

interface ProfileScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Profile'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledAnimatedView = styled(Animated.View);
const StyledTextInput = styled(TextInput);
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);

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

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'about' | 'questions' | 'matches'>('about');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  // Preview modal removed - now using ProfilePreviewScreen for standardized view
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [photoCarouselIndex] = useState(0);
  // Only these 4 sections have visibility controls
  const [sectionVisibility, setSectionVisibility] = useState({
    religion: true,
    politics: true,
    family: true,
    lifestyle: true,
  });
  const [showEditAnswerModal, setShowEditAnswerModal] = useState(false);
  const [selectedQuestionForEdit, setSelectedQuestionForEdit] = useState<DeepQuestionAnswer | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
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

  // Animation refs for spring effects
  const verificationModalAnim = useRef(new Animated.Value(0)).current;
  const unmatchModalAnim = useRef(new Animated.Value(0)).current;
  const visibilityModalAnim = useRef(new Animated.Value(0)).current;

  // Performance: Cache timing ref to avoid redundant API calls
  const lastFetchRef = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds - only refetch if data is stale

  // Performance: Wrap data loading functions in useCallback
  const loadProfile = useCallback(async () => {
    try {
      // Ensure user is authenticated, create anonymous session if needed
      const userResult = await requirePhoneVerification();
      if (!userResult.ok || !userResult.data) {
        Alert.alert('Error', 'Failed to authenticate');
        setLoading(false);
        return;
      }

      // SECURITY FIX: getUserProfile() now gets userId from auth session automatically
      const profileResult = await getUserProfile();
      if (!profileResult.ok || !profileResult.data) {
        // Don't show error if offline - keep existing data
        if (!isOffline) {
          Alert.alert('Error', 'Failed to load profile');
        }
        setLoading(false);
        return;
      }

      const loadedProfile = profileResult.data;
      setProfile(loadedProfile);

      // Load section visibility from profile if it exists
      if (loadedProfile.sectionVisibility) {
        setSectionVisibility(prev => ({
          ...prev,
          ...loadedProfile.sectionVisibility,
        }));
      }
    } catch (error: any) {
      // Don't show error if offline - keep existing data
      if (!isOffline) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  const loadMatches = useCallback(async () => {
    try {
      const userResult = await requirePhoneVerification();
      if (!userResult.ok || !userResult.data) return;

      const matchesResult = await getUserMatches();
      if (matchesResult.ok && matchesResult.data) {
        const pastMatches = matchesResult.data.filter(m => m.status === 'accepted');
        setMatches(pastMatches);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }, []);

  const loadFriendCount = useCallback(async () => {
    try {
      const result = await getFriendCount();
      if (result.ok && result.data !== undefined) {
        setFriendCount(result.data);
      }
    } catch (error) {
      console.error('Failed to load friend count:', error);
    }
  }, []);

  // Reload profile data when screen comes into focus (e.g., after editing profile)
  // Always reload profile when returning to screen to ensure fresh data after edits
  useFocusEffect(
    useCallback(() => {
      // Always reload profile data on focus to show latest changes after edit
      loadProfile();
      loadMatches();
      loadFriendCount();
    }, [loadProfile, loadMatches, loadFriendCount])
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
    setRefreshing(true);
    // Force refresh bypasses cache
    lastFetchRef.current = 0;
    await Promise.all([
      loadProfile(),
      loadMatches(),
      loadFriendCount(),
    ]);
    lastFetchRef.current = Date.now();
    setRefreshing(false);
  }, [loadProfile, loadMatches, loadFriendCount]);

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
      console.error('Cannot save: no question selected or empty answer');
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
        // Update local state immediately
        setProfile({
          ...profile,
          deepQuestions: updatedQuestions,
        });
        showToast.success('Answer updated!');
        return true;  // ✅ Success
      } else {
        console.error('Save failed:', result.error);
        Alert.alert('Error', result.error?.message || 'Failed to update answer');
        return false;  // ❌ Failed
      }
    } catch (error: any) {
      console.error('Error saving edited answer:', error);
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
        setProfile({
          ...profile,
          displayedQuestions: updatedDisplayed,
        });
        setShowChangeQuestionModal(false);
        setCurrentEditingQuestion(null);
        setSelectedSlotIndex(null);
        showToast.success('Question changed!');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to change question');
      }
    } catch (error: any) {
      console.error('Error changing question:', error);
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
        // Update local state
        setProfile({
          ...profile,
          deepQuestions: updatedQuestions,
          displayedQuestions: updatedDisplayed,
        });
        showToast.success('Answer saved!');
        return true;
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to save answer');
        return false;
      }
    } catch (error: any) {
      console.error('Error saving new answer:', error);
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

  // Spring animations for modals - with cleanup to prevent memory leaks
  useEffect(() => {
    const animation = Animated.spring(verificationModalAnim, {
      toValue: showVerificationModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    });
    animation.start();
    return () => animation.stop(); // Cleanup on unmount
  }, [showVerificationModal, verificationModalAnim]);


  useEffect(() => {
    const animation = Animated.spring(visibilityModalAnim, {
      toValue: showVisibilityModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    });
    animation.start();
    return () => animation.stop(); // Cleanup on unmount
  }, [showVisibilityModal, visibilityModalAnim]);

  useEffect(() => {
    const animation = Animated.spring(unmatchModalAnim, {
      toValue: showUnmatchModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    });
    animation.start();
    return () => animation.stop(); // Cleanup on unmount
  }, [showUnmatchModal, unmatchModalAnim]);


  const renderAboutTab = () => {
    const photoCount = profile?.photos?.length || 0;

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
                    case 'Deep Questions':
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

          {/* Verification Encouragement Card - Show if not verified */}
          {!profile?.isVerified && (
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                navigation.navigate('ProfileVerification');
              }}
              className="mb-4"
              activeOpacity={0.7}
            >
              <Card
                elevation={2}
                variant="default"
                className="bg-gradient-to-r from-blue-50 to-primary-50 border border-primary-200/60"
                style={{
                  shadowColor: '#2952CC',  // Deep blue shadow to match theme
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.16,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <StyledView className="flex-row items-center">
                  <StyledView
                    className="w-14 h-14 bg-primary-500 rounded-xl items-center justify-center mr-3"
                    style={{
                      shadowColor: '#1E40AF',  // Rich blue shadow for icon
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 5,
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={28} color="white" />
                  </StyledView>
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-bold text-base mb-1">
                      Get Verified
                    </Body>
                    <Body className="text-neutral-600 text-sm leading-5">
                      Stand out with a verified badge.{'\n'}
                      <Body className="font-bold text-neutral-900">3x</Body> more engagement!
                    </Body>
                  </StyledView>
                  <Ionicons name="chevron-forward" size={20} color="#437FFF" />
                </StyledView>
              </Card>
            </StyledTouchableOpacity>
          )}

          {/* Photo Upload Encouragement Card - Show if < 6 photos */}
          {photoCount < 6 && (
            <GuideTarget id="photos-section">
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  navigation.navigate('ProfileEdit');
                }}
                className="mb-4"
                activeOpacity={0.7}
              >
                <Card
                  elevation={2}
                  variant="default"
                  className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/60"
                  style={{
                    shadowColor: '#7C3AED',  // Rich purple shadow to match theme
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.16,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <StyledView className="flex-row items-center">
                    <StyledView
                      className="w-14 h-14 bg-purple-500 rounded-xl items-center justify-center mr-3"
                      style={{
                        shadowColor: '#6D28D9',  // Deep purple shadow for icon
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 5,
                      }}
                    >
                      <Ionicons name="images" size={28} color="white" />
                    </StyledView>
                    <StyledView className="flex-1">
                      <Body className="text-neutral-900 font-bold text-base mb-1">
                        {photoCount === 0 ? 'Add Photos' : 'Complete Your Photos'}
                      </Body>
                      <Body className="text-neutral-600 text-sm leading-5">
                        {photoCount === 0
                          ? 'Upload 6 photos for a complete profile'
                          : `Add ${6 - photoCount} more photo${6 - photoCount > 1 ? 's' : ''} for a complete profile (${photoCount}/6)`}
                      </Body>
                    </StyledView>
                    <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
                  </StyledView>
                </Card>
              </StyledTouchableOpacity>
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
              dealbreakersCount={profile.dealbreakers?.length || 0}
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
                      <Ionicons name="close" size={20} color="#6B7280" />
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
                      <Ionicons name="add" size={24} color="#437FFF" />
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

              {/* PHASE 4: Answer More Questions Section */}
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
                          setProfile({
                            ...profile,
                            deepQuestions: updatedQuestions,
                          });
                          showToast.success('Answer saved!');
                          return true;
                        } else {
                          Alert.alert('Error', result.error?.message || 'Failed to save answer');
                          return false;
                        }
                      } catch (error: any) {
                        console.error('Error saving answer:', error);
                        Alert.alert('Error', error.message || 'An unexpected error occurred');
                        return false;
                      }
                    };

                    return (
                      <>
                        {/* Unanswered Questions */}
                        {unansweredQuestions.length > 0 && (
                          <>
                            <Body className="text-neutral-700 font-semibold text-sm mb-3">
                              Unanswered ({unansweredQuestions.length})
                            </Body>
                            {unansweredQuestions.map((q) => (
                              <StyledTouchableOpacity
                                key={q.id}
                                onPress={() => {
                                  mediumHaptic();
                                  handleAnswerMoreQuestion(q.id, q.question);
                                }}
                                activeOpacity={0.7}
                                className="mb-3"
                              >
                                <Card className="bg-neutral-50 border-2 border-dashed border-neutral-300">
                                  <StyledView className="flex-row items-center justify-between">
                                    <StyledView className="flex-1 pr-3">
                                      <Body className="text-neutral-900 font-medium text-sm">{q.question}</Body>
                                    </StyledView>
                                    <StyledView className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center">
                                      <Ionicons name="add" size={20} color="#437FFF" />
                                    </StyledView>
                                  </StyledView>
                                </Card>
                              </StyledTouchableOpacity>
                            ))}
                          </>
                        )}

                        {/* Previously Answered (Not Displayed) */}
                        {nonDisplayedAnswers.length > 0 && (
                          <>
                            <Body className="text-neutral-700 font-semibold text-sm mb-3 mt-4">
                              Answered but Not Displayed ({nonDisplayedAnswers.length})
                            </Body>
                            {nonDisplayedAnswers.map((qa) => (
                              <StyledTouchableOpacity
                                key={qa.questionId}
                                onPress={() => {
                                  lightHaptic();
                                  setCurrentEditingQuestion(qa);
                                  setShowEditAnswerModal(true);
                                }}
                                activeOpacity={0.7}
                                className="mb-3"
                              >
                                <Card className="bg-white border border-neutral-200">
                                  <Body className="text-neutral-900 font-semibold text-base mb-2">{qa.question}</Body>
                                  <Body className="text-neutral-600 text-sm" numberOfLines={2}>{qa.answer}</Body>
                                </Card>
                              </StyledTouchableOpacity>
                            ))}
                          </>
                        )}

                        {/* All Questions Answered */}
                        {unansweredQuestions.length === 0 && (
                          <Card className="bg-green-50 border border-green-200">
                            <StyledView className="items-center py-8">
                              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
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
              )}
            </>
          );
        })()}
        </StyledView>
    );
  };

  const handleMatchPress = (match: Match) => {
    setSelectedMatch(match);
    setEditedFeedback(match.unmatchSurveyResponse || '');
    setIsEditingFeedback(false);
    setShowUnmatchModal(true);
    lightHaptic();
  };

  const handleSaveFeedback = async () => {
    if (!selectedMatch) return;

    setSavingFeedback(true);
    mediumHaptic();

    try {
      const result = await updateMatchExitFeedback(selectedMatch.id, editedFeedback);

      if (result.ok) {
        // Update local state immutably
        if (selectedMatch) {
          setSelectedMatch({
            ...selectedMatch,
            unmatchSurveyResponse: editedFeedback,
          });
        }
        setIsEditingFeedback(false);
        showToast.success('Feedback updated successfully');
      } else {
        showToast.error(result.error?.message || 'Failed to update feedback');
      }
    } catch (error: any) {
      showToast.error('An unexpected error occurred');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedFeedback(selectedMatch?.unmatchSurveyResponse || '');
    setIsEditingFeedback(false);
    lightHaptic();
  };

  const handleStartEdit = () => {
    setIsEditingFeedback(true);
    mediumHaptic();
  };

  const renderMatchesTab = () => {
    // Calculate profile completion to show appropriate empty state message
    const calculateProfileCompletion = (): number => {
      if (!profile) return 0;

      let totalScore = 0;
      let maxTotal = 0;

      // About Me (max 23)
      let aboutScore = 0;
      if (profile.age) aboutScore += 2;
      if (profile.height) aboutScore += 1;
      if (profile.ethnicity) aboutScore += 1;
      if (profile.location) aboutScore += 2;
      if (profile.currentJob) aboutScore += 3;
      if ((profile.interests?.length || 0) >= 3) aboutScore += 4;
      if ((profile.values?.length || 0) >= 3) aboutScore += 4;
      if (profile.drinkingFrequency) aboutScore += 2;
      if (profile.hasChildren) aboutScore += 2;
      if (profile.familyPlans) aboutScore += 2;
      totalScore += aboutScore;
      maxTotal += 23;

      // Match Preferences (max 25)
      let preferencesScore = 0;
      const hasAgeMin = profile.preferences?.ageMin !== undefined && profile.preferences?.ageMin !== null;
      const hasAgeMax = profile.preferences?.ageMax !== undefined && profile.preferences?.ageMax !== null;
      if (hasAgeMin && hasAgeMax) preferencesScore += 8;
      if ((profile.interestedInGenders && profile.interestedInGenders.length > 0) || profile.preferences?.gender) {
        preferencesScore += 8;
      }
      preferencesScore += 9; // Looking for is auto-granted
      totalScore += preferencesScore;
      maxTotal += 25;

      // Photos (max 25)
      const photoCount = profile.photos?.length || 0;
      const photosScore = photoCount >= 6 ? 25 : Math.round((photoCount / 6) * 25);
      totalScore += photosScore;
      maxTotal += 25;

      // Deep Questions (max 25)
      const displayedCount = profile.displayedQuestions?.length || 0;
      const answeredCount = profile.deepQuestions?.length || 0;
      let questionsScore = 0;
      if (displayedCount >= 3) {
        questionsScore = 25;
      } else if (displayedCount > 0) {
        questionsScore = Math.round((displayedCount / 3) * 25);
      } else if (answeredCount > 0) {
        questionsScore = Math.min(Math.round((answeredCount / 3) * 10), 10);
      }
      totalScore += questionsScore;
      maxTotal += 25;

      return Math.round((totalScore / maxTotal) * 100);
    };

    const profileCompletion = calculateProfileCompletion();
    const isProfileComplete = profileCompletion === 100;

    return (
      <StyledView className="px-4 py-6">
        <StyledView className="mb-4">
          <H3>Past Matches</H3>
          <Body className="text-neutral-600 text-sm mt-1">Only Visible to You</Body>
        </StyledView>

        {matches.length > 0 ? (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} onMatchPress={handleMatchPress} />
          ))
        ) : (
          <EmptyState
            icon="heart-outline"
            title="No matches yet"
            message={
              isProfileComplete
                ? "Invite friends to help you get your first match!"
                : "Complete your profile to start getting matches"
            }
          />
        )}
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
              <Ionicons name="eye-outline" size={24} color="#7C3AED" />
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                navigation.navigate('ProfileEdit');
              }}
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={24} color="#437FFF" />
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                navigation.navigate('Settings');
              }}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={24} color="#475467" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Profile Photo and Name */}
        <StyledView className="px-4 pb-4">
          {/* Circular Profile Photo Layout */}
          <StyledView className="items-center">
            {/* Profile Photo Circle */}
            {profile.photos && profile.photos.length > 0 && profile.photos[0]?.url ? (
              <StyledImage
                source={{ uri: profile.photos[0].url }}
                className="w-24 h-24 rounded-full mb-3 bg-neutral-200 border-2 border-neutral-100"
                style={{
                  shadowColor: '#2E1810',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.22,
                  shadowRadius: 10,
                  elevation: 6,
                }}
                onError={(e) => {
                  console.warn('Failed to load profile photo:', e.nativeEvent.error);
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
                <Ionicons name="person-outline" size={40} color="#98A2B3" />
              </StyledView>
            )}

            {/* Name with Verification Badge */}
            <StyledView className="flex-row items-center mb-4">
              <H2 className="text-xl">{profile.firstName}</H2>
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  if (profile.isVerified) {
                    // Show verification modal for already verified users
                    setShowVerificationModal(true);
                  } else {
                    // Navigate to verification screen for unverified users
                    navigation.navigate('ProfileVerification');
                  }
                }}
                className="ml-2"
                accessibilityLabel={profile.isVerified ? "Verified profile" : "Get verified"}
                accessibilityRole="button"
              >
                {profile.isVerified ? (
                  <Ionicons name="checkmark-circle" size={22} color="#437FFF" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={22} color="#D0D5DD" />
                )}
              </StyledTouchableOpacity>
            </StyledView>

            {/* Friends Section */}
            <StyledView className="flex-row items-center space-x-3">
              <StyledTouchableOpacity
                onPress={() => navigation.navigate('FriendList')}
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
                <Ionicons name="people" size={16} color="#475467" />
                <Body className="text-neutral-700 text-sm font-medium ml-1.5">
                  {friendCount} {friendCount === 1 ? 'Friend' : 'Friends'}
                </Body>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                onPress={() => navigation.navigate('FriendCode')}
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
                <Ionicons name="person-add" size={16} color="white" />
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
            className="flex-1 py-3 items-center relative"
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
          <GuideTarget id="questions-tab">
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                setActiveTab('questions');
              }}
              className="flex-1 py-3 items-center relative"
              accessibilityLabel={`Questions tab, ${profile?.deepQuestions?.length || 0} answered`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'questions' }}
            >
              <StyledView className="flex-row items-center">
                <Body
                  className={`font-medium ${
                    activeTab === 'questions' ? 'text-primary-500' : 'text-neutral-600'
                  }`}
                >
                  Questions
                </Body>
              </StyledView>
              {activeTab === 'questions' && (
                <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </StyledTouchableOpacity>
          </GuideTarget>
          <StyledTouchableOpacity
            onPress={() => {
              lightHaptic();
              setActiveTab('matches');
            }}
            className="flex-1 py-3 items-center relative"
            accessibilityLabel={`Matches tab, ${matches.length} matches`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'matches' }}
          >
            <Body
              className={`font-medium ${
                activeTab === 'matches' ? 'text-primary-500' : 'text-neutral-600'
              }`}
            >
              Matches
            </Body>
            {activeTab === 'matches' && (
              <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

        {/* Tab Content */}
        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'questions' && renderQuestionsTab()}
        {activeTab === 'matches' && renderMatchesTab()}
      </StyledScrollView>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-end"
          style={{
            opacity: verificationModalAnim,
          }}
        >
          <StyledAnimatedView
            className="bg-white rounded-t-3xl px-4 py-6"
            style={{
              transform: [{
                translateY: verificationModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            }}
          >
            <StyledView className="flex-row items-center justify-between mb-4">
              <StyledView className="flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={profile?.isVerified ? "#437FFF" : "#98A2B3"}
                />
                <H3 className="ml-3">
                  {profile?.isVerified ? 'Verified Profile' : 'Get Verified'}
                </H3>
              </StyledView>
              <StyledTouchableOpacity
                onPress={() => setShowVerificationModal(false)}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#101828" />
              </StyledTouchableOpacity>
            </StyledView>

            {profile?.isVerified ? (
              <>
                <StyledView className="bg-success/10 rounded-xl p-4 mb-4">
                  <StyledView className="flex-row items-start">
                    <Ionicons name="shield-checkmark" size={24} color="#12B981" />
                    <StyledView className="flex-1 ml-3">
                      <Body className="text-success font-semibold mb-1">
                        Your profile is verified
                      </Body>
                      <Body className="text-neutral-600 text-sm">
                        You've completed the verification process, which helps build trust with potential matches.
                      </Body>
                    </StyledView>
                  </StyledView>
                </StyledView>

                <Body className="text-neutral-900 font-semibold mb-3">Verification Benefits:</Body>
                <StyledView className="space-y-3 mb-5">
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Increased trust from potential matches
                    </Body>
                  </StyledView>
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Higher visibility in match suggestions
                    </Body>
                  </StyledView>
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Stands out with verified badge
                    </Body>
                  </StyledView>
                </StyledView>
              </>
            ) : (
              <>
                <Body className="text-neutral-700 text-sm mb-4 leading-5">
                  Verify your profile to increase trust and improve your chances of making meaningful connections.
                  Verified profiles get 3x more engagement.
                </Body>

                <Body className="text-neutral-900 font-semibold mb-3">Verification Benefits:</Body>
                <StyledView className="space-y-3 mb-5">
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Increased trust from potential matches
                    </Body>
                  </StyledView>
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Higher visibility in match suggestions
                    </Body>
                  </StyledView>
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Stand out with verified badge
                    </Body>
                  </StyledView>
                  <StyledView className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-neutral-700 text-sm ml-3">
                      Access to premium matching features
                    </Body>
                  </StyledView>
                </StyledView>

                <StyledView className="bg-primary-50 rounded-xl p-4 mb-5 border border-primary-200">
                  <Body className="text-neutral-900 font-semibold mb-2">How to get verified:</Body>
                  <Body className="text-neutral-700 text-sm leading-5">
                    1. Complete your profile (100%){'\n'}
                    2. Add at least 3 clear photos{'\n'}
                    3. Verify your phone number{'\n'}
                    4. Submit verification request in Settings
                  </Body>
                </StyledView>

                <Button
                  onPress={() => {
                    setShowVerificationModal(false);
                    navigation.navigate('Settings');
                  }}
                  variant="primary"
                  fullWidth
                >
                  Start Verification
                </Button>
              </>
            )}
          </StyledAnimatedView>
        </StyledAnimatedView>
      </Modal>

      {/* Profile Visibility Settings Modal */}
      <Modal
        visible={showVisibilityModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-end"
          style={{
            opacity: visibilityModalAnim,
          }}
        >
          <StyledAnimatedView
            className="bg-white rounded-t-3xl"
            style={{
              maxHeight: '85%',
              transform: [{
                translateY: visibilityModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-4 py-4 border-b border-neutral-200">
              <StyledView className="flex-row items-center justify-between mb-2">
                <StyledView className="flex-row items-center">
                  <Ionicons name="eye-off" size={24} color="#A855F7" />
                  <H3 className="ml-2">Profile Visibility</H3>
                </StyledView>
                <StyledTouchableOpacity
                  onPress={() => setShowVisibilityModal(false)}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={24} color="#101828" />
                </StyledTouchableOpacity>
              </StyledView>
              <Body className="text-neutral-600 text-sm">
                Choose which sections of your profile are visible to potential matches
              </Body>
            </StyledView>

            {/* Visibility Controls */}
            <StyledScrollView className="flex-1 px-4 py-4">
              {/* Info Card */}
              <Card className="bg-blue-50 border-2 border-blue-200 mb-5">
                <StyledView className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#437FFF" />
                  <Body className="flex-1 text-blue-900 text-sm ml-2">
                    Hidden sections won't be visible to others, but you can still edit them and they may affect matching.
                  </Body>
                </StyledView>
              </Card>

              {/* Section Toggles - Only sensitive sections */}
              <StyledView className="space-y-3">
                {/* Religion */}
                <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-semibold mb-1">Religion</Body>
                    <Body className="text-neutral-600 text-sm">Your religious beliefs</Body>
                  </StyledView>
                  <Switch
                    value={sectionVisibility.religion}
                    onValueChange={(value) => {
                      mediumHaptic();
                      setSectionVisibility({...sectionVisibility, religion: value});
                    }}
                    trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                    thumbColor={sectionVisibility.religion ? '#437FFF' : '#F4F4F5'}
                  />
                </StyledView>

                {/* Politics */}
                <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-semibold mb-1">Politics</Body>
                    <Body className="text-neutral-600 text-sm">Your political views</Body>
                  </StyledView>
                  <Switch
                    value={sectionVisibility.politics}
                    onValueChange={(value) => {
                      mediumHaptic();
                      setSectionVisibility({...sectionVisibility, politics: value});
                    }}
                    trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                    thumbColor={sectionVisibility.politics ? '#437FFF' : '#F4F4F5'}
                  />
                </StyledView>

                {/* Family & Relationships */}
                <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-semibold mb-1">Family & Relationships</Body>
                    <Body className="text-neutral-600 text-sm">Children status, family plans</Body>
                  </StyledView>
                  <Switch
                    value={sectionVisibility.family}
                    onValueChange={(value) => {
                      mediumHaptic();
                      setSectionVisibility({...sectionVisibility, family: value});
                    }}
                    trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                    thumbColor={sectionVisibility.family ? '#437FFF' : '#F4F4F5'}
                  />
                </StyledView>

                {/* Lifestyle & Habits */}
                <StyledView className="flex-row items-center justify-between py-3">
                  <StyledView className="flex-1">
                    <Body className="text-neutral-900 font-semibold mb-1">Lifestyle & Habits</Body>
                    <Body className="text-neutral-600 text-sm">Drinking, cannabis, tobacco use</Body>
                  </StyledView>
                  <Switch
                    value={sectionVisibility.lifestyle}
                    onValueChange={(value) => {
                      mediumHaptic();
                      setSectionVisibility({...sectionVisibility, lifestyle: value});
                    }}
                    trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                    thumbColor={sectionVisibility.lifestyle ? '#437FFF' : '#F4F4F5'}
                  />
                </StyledView>
              </StyledView>
            </StyledScrollView>

            {/* Footer */}
            <StyledView className="px-4 py-4 border-t border-neutral-200">
              <Button
                onPress={async () => {
                  try {
                    // Save visibility settings to database
                    const result = await updateUserProfile({ sectionVisibility });
                    if (result.ok) {
                      // Update local profile state to keep in sync
                      if (profile) {
                        setProfile({ ...profile, sectionVisibility });
                      }
                      setShowVisibilityModal(false);
                      Alert.alert('Saved', 'Your visibility settings have been updated');
                    } else {
                      Alert.alert('Error', result.error?.message || 'Failed to save settings');
                    }
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to save settings');
                  }
                }}
                variant="primary"
                fullWidth
              >
                Save Settings
              </Button>
            </StyledView>
          </StyledAnimatedView>
        </StyledAnimatedView>
      </Modal>

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

      {/* Unmatch Survey Modal */}
      <Modal
        visible={showUnmatchModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowUnmatchModal(false)}
      >
        <StyledKeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <StyledAnimatedView
            className="flex-1 bg-black/50 justify-start pt-20 px-6"
            style={{
              opacity: unmatchModalAnim,
            }}
          >
            <StyledAnimatedView
              className="bg-white rounded-2xl p-6"
              style={{
                transform: [{
                  scale: unmatchModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                }],
              }}
            >
            {/* Header */}
            <StyledView className="flex-row items-center justify-between mb-4">
              <H3>Match Details</H3>
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowUnmatchModal(false);
                }}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#101828" />
              </StyledTouchableOpacity>
            </StyledView>

            {/* Match Name and Dates */}
            {selectedMatch && (
              <>
                <StyledView className="mb-4 pb-4 border-b border-neutral-100">
                  <Body className="text-neutral-900 font-bold text-lg mb-2">
                    {(selectedMatch.user2Profile || selectedMatch.user1Profile)?.firstName}
                  </Body>
                  <StyledView className="flex-row items-center mb-1">
                    <Ionicons name="heart" size={16} color="#10B981" />
                    <Body className="text-neutral-600 text-sm ml-2">
                      Matched: {selectedMatch.acceptedAt
                        ? new Date(selectedMatch.acceptedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'Unknown'}
                    </Body>
                  </StyledView>
                  {selectedMatch.unmatchedAt && (
                    <StyledView className="flex-row items-center">
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Body className="text-neutral-600 text-sm ml-2">
                        Unmatched: {new Date(selectedMatch.unmatchedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </Body>
                    </StyledView>
                  )}
                </StyledView>

                {/* Survey Response */}
                <StyledView className="mb-4">
                  <Body className="text-neutral-900 font-semibold mb-2">Your Feedback:</Body>
                  {isEditingFeedback ? (
                    <StyledTextInput
                      value={editedFeedback}
                      onChangeText={setEditedFeedback}
                      placeholder="Share your thoughts about this match..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      className="bg-neutral-50 rounded-lg p-4 text-neutral-900 min-h-[120px] border border-neutral-200"
                      style={{ fontSize: 16, lineHeight: 24 }}
                      maxLength={500}
                    />
                  ) : selectedMatch.unmatchSurveyResponse ? (
                    <StyledView className="bg-neutral-50 rounded-lg p-4">
                      <Body className="text-neutral-700 leading-6">
                        {selectedMatch.unmatchSurveyResponse}
                      </Body>
                    </StyledView>
                  ) : (
                    <StyledView className="bg-neutral-50 rounded-lg p-4">
                      <Body className="text-neutral-500 italic">
                        No feedback provided
                      </Body>
                    </StyledView>
                  )}
                  {isEditingFeedback && (
                    <Body className="text-neutral-500 text-xs mt-2 text-right">
                      {editedFeedback.length}/500
                    </Body>
                  )}
                </StyledView>

                {/* Action Buttons */}
                {isEditingFeedback ? (
                  <StyledView className="flex-row gap-3">
                    <StyledTouchableOpacity
                      onPress={handleCancelEdit}
                      className="flex-1 bg-neutral-100 py-3 rounded-lg items-center"
                      activeOpacity={0.7}
                      disabled={savingFeedback}
                    >
                      <Body className="text-neutral-700 font-semibold">Cancel</Body>
                    </StyledTouchableOpacity>
                    <StyledTouchableOpacity
                      onPress={handleSaveFeedback}
                      className="flex-1 bg-primary-500 py-3 rounded-lg items-center"
                      activeOpacity={0.7}
                      disabled={savingFeedback}
                    >
                      <Body className="text-white font-semibold">
                        {savingFeedback ? 'Saving...' : 'Save'}
                      </Body>
                    </StyledTouchableOpacity>
                  </StyledView>
                ) : (
                  <StyledTouchableOpacity
                    onPress={handleStartEdit}
                    className="bg-primary-500 py-3 rounded-lg items-center"
                    activeOpacity={0.7}
                  >
                    <Body className="text-white font-semibold">Edit Response</Body>
                  </StyledTouchableOpacity>
                )}
              </>
            )}
          </StyledAnimatedView>
        </StyledAnimatedView>
        </StyledKeyboardAvoidingView>
      </Modal>

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
              <Ionicons name="close" size={28} color="#101828" />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Question List */}
          <StyledScrollView className="flex-1 px-4 py-4">
            <Body className="text-neutral-600 text-sm mb-4">
              Choose from 21 questions. You can answer as many as you want, but only 3 will display on your profile.
            </Body>

            {(() => {
              const answeredIds = profile?.deepQuestions?.map(q => q.questionId) || [];
              const unanswered = getUnansweredQuestions(answeredIds);

              return (
                <>
                  {unanswered.map((q, index) => (
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

                  {unanswered.length === 0 && (
                    <Card className="bg-blue-50 border border-blue-200">
                      <StyledView className="items-center py-8">
                        <Ionicons name="checkmark-circle" size={48} color="#437FFF" />
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

      {/* PHASE 2: Answer Modal (reusing existing AnswerQuestionModal) */}
      {selectedQuestionToAnswer && (
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
              <Ionicons name="close" size={28} color="#101828" />
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
                        <Ionicons name="information-circle" size={48} color="#437FFF" />
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
    </StyledSafeAreaView>
  );
};
