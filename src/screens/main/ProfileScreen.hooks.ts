/**
 * ProfileScreen Hooks
 *
 * Custom hooks and handler logic extracted from ProfileScreen.
 * Contains all state management, data fetching, and event handlers.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { UserProfile, DeepQuestionAnswer } from '../../types';
import { FriendBadgeWithGiver } from '../../types/badges';
import { signOut } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { getFriendCount } from '../../services/friendService';
import { getUserFriendCode } from '../../services/friendService.codes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getReceivedBadges, toggleFeatured, toggleHidden } from '../../services/badgeService';
import { fetchLeaderboard } from '../../services/leaderboardService';
import { useGuide } from '../../hooks/useGuide';
import { profileGuide } from '../../config/guides';
import { lightHaptic, mediumHaptic, successHaptic, heavyHaptic } from '../../utils/haptics';
import { calculateOverallProfileStrength } from '../../utils/profileCompleteness';
import { showToast } from '../../utils/toast';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ProfileScreen');
const PROFILE_COMPLETE_CELEBRATION_KEY = '@profile_complete_celebration_shown';

export function useProfileScreen(navigation: any) {
  const route = useRoute<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'about' | 'badges' | 'questions'>('about');
  const [badges, setBadges] = useState<FriendBadgeWithGiver[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [showKarmaInfoModal, setShowKarmaInfoModal] = useState(false);
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [photoCarouselIndex] = useState(0);
  const [communityRank, setCommunityRank] = useState<number | null>(null);
  const [rankChange, setRankChange] = useState<number>(0);
  const [showEditAnswerModal, setShowEditAnswerModal] = useState(false);
  const [selectedQuestionForEdit, setSelectedQuestionForEdit] = useState<DeepQuestionAnswer | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const { isOffline } = useNetworkStatus();

  // Loading states for star/unstar operations
  const [starringQuestions, setStarringQuestions] = useState<Set<number>>(new Set());

  // State for slot-based question display
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showQuestionSelectionModal, setShowQuestionSelectionModal] = useState(false);
  const [selectedQuestionToAnswer, setSelectedQuestionToAnswer] = useState<{ id: number; question: string } | null>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showChangeQuestionModal, setShowChangeQuestionModal] = useState(false);
  const [currentEditingQuestion, setCurrentEditingQuestion] = useState<DeepQuestionAnswer | null>(null);

  // Inline editing state
  const [inlineEditSlot, setInlineEditSlot] = useState<number | null>(null);
  const [inlineEditText, setInlineEditText] = useState('');
  const [inlineEditSaving, setInlineEditSaving] = useState(false);
  const [answerMoreExpanded, setAnswerMoreExpanded] = useState(false);

  // Guide system
  const { startGuideIfNeeded } = useGuide();
  const [hasTriggeredGuide, setHasTriggeredGuide] = useState(false);

  // Profile complete celebration (confetti)
  const [celebrationActive, setCelebrationActive] = useState(false);
  const confettiRef = useRef<LottieView>(null);
  const celebrationFiredRef = useRef(false);

  // Performance: Cache timing ref
  const lastFetchRef = useRef<number>(0);

  // Track component mount status
  const isMountedRef = useRef(true);

  // Cleanup: Mark component as unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      logger.info('[ProfileScreen] loadProfile called');
      const profileResult = await getUserProfile();
      if (!profileResult.ok || !profileResult.data) {
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

      if (isMountedRef.current) {
        setProfile(loadedProfile);
      }
    } catch (error: any) {
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

  const loadFriendCode = useCallback(async () => {
    try {
      const result = await getUserFriendCode();
      if (result.ok && result.data?.code && isMountedRef.current) {
        setFriendCode(result.data.code);
      }
    } catch (error) {
      logger.error('Failed to load friend code:', error);
    }
  }, []);

  const loadRank = useCallback(async () => {
    try {
      const result = await fetchLeaderboard(50);
      if (result.ok && result.data.currentUser && isMountedRef.current) {
        setCommunityRank(result.data.currentUser.rank);
        setRankChange(result.data.currentUser.rankChange);
      }
    } catch (error) {
      logger.error('Failed to load rank:', error);
    }
  }, []);

  const loadBadges = useCallback(async () => {
    setBadgesLoading(true);
    const result = await getReceivedBadges();
    if (result.ok && result.data) {
      setBadges(result.data);
    }
    setBadgesLoading(false);
  }, []);

  // Reload profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchRef.current < 10_000) {
        return;
      }
      logger.info('[ProfileScreen] useFocusEffect triggered - reloading profile data');

      Promise.all([
        loadProfile(),
        loadFriendCount(),
        loadBadges(),
        loadFriendCode(),
        loadRank(),
      ]).then(() => {
        lastFetchRef.current = Date.now();
      }).catch(error => {
        logger.error('Failed to load profile data:', error);
        showToast.error(
          'Failed to load profile',
          'Please pull down to refresh or try again later.'
        );
      });
    }, [loadProfile, loadFriendCount, loadBadges, loadFriendCode, loadRank])
  );

  // Deep-link: switch to a specific tab
  useFocusEffect(
    useCallback(() => {
      const tab = route.params?.initialTab;
      if (tab && (tab === 'about' || tab === 'badges' || tab === 'questions')) {
        setActiveTab(tab);
        navigation.setParams({ initialTab: undefined });
      }
    }, [route.params?.initialTab])
  );

  // Start profile guide once per session — skip for matchmakers (guide references dater-only UI)
  useEffect(() => {
    if (!loading && profile && !hasTriggeredGuide && profile.role !== 'matchmaker') {
      setHasTriggeredGuide(true);
      const timer = setTimeout(() => {
        startGuideIfNeeded(profileGuide);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, profile, hasTriggeredGuide, startGuideIfNeeded]);

  // Profile complete celebration
  useEffect(() => {
    if (!loading && profile) {
      const strength = calculateOverallProfileStrength(profile);
      if (strength >= 100) {
        AsyncStorage.getItem(PROFILE_COMPLETE_CELEBRATION_KEY).then(seen => {
          if (!seen && isMountedRef.current && !celebrationFiredRef.current) {
            celebrationFiredRef.current = true;
            AsyncStorage.setItem(PROFILE_COMPLETE_CELEBRATION_KEY, '1');
            setCelebrationActive(true);
            successHaptic();
            setTimeout(() => heavyHaptic(), 150);
            setTimeout(() => heavyHaptic(), 300);
            setTimeout(() => {
              if (isMountedRef.current) setCelebrationActive(false);
            }, 2800);
          }
        });
      }
    }
  }, [loading, profile]);

  const handleRefresh = useCallback(async () => {
    if (isMountedRef.current) {
      setRefreshing(true);
      setPhotoLoadFailed(false);
    }
    lastFetchRef.current = 0;
    await Promise.all([
      loadProfile(),
      loadFriendCount(),
      loadBadges(),
    ]);
    lastFetchRef.current = Date.now();
    if (isMountedRef.current) {
      setRefreshing(false);
    }
  }, [loadProfile, loadFriendCount, loadBadges]);

  const handleEditAnswer = useCallback((question: DeepQuestionAnswer) => {
    setSelectedQuestionForEdit(question);
    setEditingAnswer(question.answer);
    setShowEditAnswerModal(true);
    lightHaptic();
  }, []);

  const handleSaveEditedAnswer = async (newAnswer: string): Promise<boolean> => {
    const questionToEdit = selectedQuestionForEdit || currentEditingQuestion;

    if (!questionToEdit || !newAnswer.trim()) {
      logger.error('Cannot save: no question selected or empty answer');
      return false;
    }

    if (!profile || !profile.deepQuestions) {
      Alert.alert('Error', 'Profile data not loaded. Please try again.');
      return false;
    }

    try {
      const updatedQuestions = profile.deepQuestions.map(q =>
        q.questionId === questionToEdit.questionId
          ? { ...q, answer: newAnswer.trim(), updatedAt: new Date().toISOString() }
          : q
      );

      const result = await updateUserProfile({
        ...profile,
        deepQuestions: updatedQuestions,
      });

      if (result.ok) {
        if (isMountedRef.current) {
          setProfile({
            ...profile,
            deepQuestions: updatedQuestions,
          });
        }
        showToast.success('Answer updated!');
        return true;
      } else {
        logger.error('Save failed:', result.error);
        Alert.alert('Error', result.error?.message || 'Failed to update answer');
        return false;
      }
    } catch (error: any) {
      logger.error('Error saving edited answer:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      return false;
    }
  };

  const handleQuestionSelected = (questionId: number, questionText: string) => {
    setSelectedQuestionToAnswer({ id: questionId, question: questionText });
    setShowQuestionSelectionModal(false);
    setShowAnswerModal(true);
  };

  const handleChangeQuestion = () => {
    setShowEditAnswerModal(false);
    setShowChangeQuestionModal(true);
  };

  const handleInlineSave = async (slotIndex: number, question: DeepQuestionAnswer) => {
    const trimmed = inlineEditText.trim();
    if (!trimmed || !profile) return;
    if (trimmed === question.answer) {
      setInlineEditSlot(null);
      return;
    }
    setInlineEditSaving(true);
    try {
      const updatedQuestions = (profile.deepQuestions || []).map(q =>
        q.questionId === question.questionId
          ? { ...q, answer: trimmed, updatedAt: new Date().toISOString() }
          : q
      );
      const result = await updateUserProfile({ ...profile, deepQuestions: updatedQuestions });
      if (result.ok) {
        if (isMountedRef.current) {
          setProfile({ ...profile, deepQuestions: updatedQuestions });
        }
        showToast.success('Answer updated!');
        setInlineEditSlot(null);
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to save');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setInlineEditSaving(false);
    }
  };

  const showSlotActions = (slotIndex: number, question: DeepQuestionAnswer) => {
    lightHaptic();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Answer', 'Switch Question', 'Remove', 'Cancel'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            setInlineEditText(question.answer);
            setInlineEditSlot(slotIndex);
          } else if (buttonIndex === 1) {
            setSelectedSlotIndex(slotIndex);
            setCurrentEditingQuestion(question);
            setShowChangeQuestionModal(true);
          } else if (buttonIndex === 2) {
            Alert.alert('Remove Question?', 'This will remove it from your displayed profile.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => handleRemoveFromSlot(slotIndex) },
            ]);
          }
        }
      );
    } else {
      Alert.alert('Question Options', undefined, [
        { text: 'Edit Answer', onPress: () => { setInlineEditText(question.answer); setInlineEditSlot(slotIndex); } },
        { text: 'Switch Question', onPress: () => { setSelectedSlotIndex(slotIndex); setCurrentEditingQuestion(question); setShowChangeQuestionModal(true); } },
        { text: 'Remove', style: 'destructive', onPress: () => handleRemoveFromSlot(slotIndex) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleRemoveFromSlot = async (slotIndex: number) => {
    if (!profile) return;
    const updatedDisplayed = [...(profile.displayedQuestions || [])];
    updatedDisplayed.splice(slotIndex, 1);
    const result = await updateUserProfile({ displayedQuestions: updatedDisplayed });
    if (result.ok) {
      await loadProfile();
      showToast.success('Question removed');
    } else {
      Alert.alert('Error', result.error?.message || 'Failed to remove question');
    }
  };

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

  const handleSaveNewAnswer = async (answer: string): Promise<boolean> => {
    if (!selectedQuestionToAnswer || selectedSlotIndex === null || !profile) {
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

      const existingAnswerIndex = profile.deepQuestions?.findIndex(q => q.questionId === selectedQuestionToAnswer.id) ?? -1;
      let updatedQuestions: DeepQuestionAnswer[];

      if (existingAnswerIndex >= 0) {
        updatedQuestions = profile.deepQuestions!.map((q, i) => i === existingAnswerIndex ? newAnswer : q);
      } else {
        updatedQuestions = [...(profile.deepQuestions || []), newAnswer];
      }

      const updatedDisplayed = [...(profile.displayedQuestions || [])];
      updatedDisplayed[selectedSlotIndex] = selectedQuestionToAnswer.id;

      const result = await updateUserProfile({
        ...profile,
        deepQuestions: updatedQuestions,
        displayedQuestions: updatedDisplayed,
      });

      if (result.ok) {
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

  // Load badges when switching to the badges tab
  useEffect(() => {
    if (activeTab === 'badges') {
      loadBadges();
    }
  }, [activeTab, loadBadges]);

  const handleToggleFeaturedBadge = async (badge: FriendBadgeWithGiver) => {
    lightHaptic();
    const result = await toggleFeatured(badge.id, !badge.isFeatured);
    if (result.ok) {
      successHaptic();
      loadBadges();
    } else {
      showToast.error(result.error?.message || 'Failed to update');
    }
  };

  const handleToggleHiddenBadge = async (badge: FriendBadgeWithGiver) => {
    lightHaptic();
    const result = await toggleHidden(badge.id, !badge.isHidden);
    if (result.ok) {
      loadBadges();
    } else {
      showToast.error(result.error?.message || 'Failed to update');
    }
  };

  return {
    // State
    profile,
    setProfile,
    loading,
    refreshing,
    friendCount,
    activeTab,
    setActiveTab,
    badges,
    badgesLoading,
    showKarmaInfoModal,
    setShowKarmaInfoModal,
    showPhotoCarousel,
    setShowPhotoCarousel,
    photoLoadFailed,
    setPhotoLoadFailed,
    photoCarouselIndex,
    showEditAnswerModal,
    setShowEditAnswerModal,
    selectedQuestionForEdit,
    setSelectedQuestionForEdit,
    editingAnswer,
    isOffline,
    friendCode,
    starringQuestions,
    selectedSlotIndex,
    setSelectedSlotIndex,
    showQuestionSelectionModal,
    setShowQuestionSelectionModal,
    selectedQuestionToAnswer,
    setSelectedQuestionToAnswer,
    showAnswerModal,
    setShowAnswerModal,
    showChangeQuestionModal,
    setShowChangeQuestionModal,
    currentEditingQuestion,
    setCurrentEditingQuestion,
    inlineEditSlot,
    setInlineEditSlot,
    inlineEditText,
    setInlineEditText,
    inlineEditSaving,
    answerMoreExpanded,
    setAnswerMoreExpanded,
    celebrationActive,
    confettiRef,
    isMountedRef,
    communityRank,
    rankChange,

    // Handlers
    loadProfile,
    handleRefresh,
    handleEditAnswer,
    handleSaveEditedAnswer,
    handleQuestionSelected,
    handleChangeQuestion,
    handleInlineSave,
    showSlotActions,
    handleRemoveFromSlot,
    handleChangeToAnsweredQuestion,
    handleSaveNewAnswer,
    handleToggleFeaturedBadge,
    handleToggleHiddenBadge,
  };
}
