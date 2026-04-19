/**
 * ProfileScreen Hooks
 *
 * Custom hooks and handler logic extracted from ProfileScreen.
 * Contains all state management, data fetching, and event handlers.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { UserProfile, DeepQuestionAnswer } from '../../types';
import { FriendBadgeWithGiver } from '../../types/badges';
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
const CACHED_MAIN_PHOTO_KEY = '@profile_main_photo_cache';

/** Persisted main photo URL + blurhash so the avatar renders instantly from expo-image disk cache */
type CachedPhoto = { id: string; url: string; blurhash?: string };

export function useProfileScreen(navigation: any) {
  const route = useRoute<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Instant photo: loaded from AsyncStorage before the API call finishes
  const [cachedMainPhoto, setCachedMainPhoto] = useState<CachedPhoto | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'about' | 'badges' | 'questions'>('about');
  const [badges, setBadges] = useState<FriendBadgeWithGiver[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [showKarmaInfoModal, setShowKarmaInfoModal] = useState(false);
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  // Stabilize photo URLs: keep the first signed URL per photo ID so expo-image's
  // disk cache isn't busted by rotating tokens on every getUserProfile() refresh.
  const stablePhotoUrlsRef = useRef<Map<string, string>>(new Map());
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [photoCarouselIndex] = useState(0);
  const [communityRank, setCommunityRank] = useState<number | null>(null);
  const [rankChange, setRankChange] = useState<number>(0);
  const [showEditAnswerModal, setShowEditAnswerModal] = useState(false);
  const [selectedQuestionForEdit, setSelectedQuestionForEdit] = useState<DeepQuestionAnswer | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  // Auto-refresh profile data when connectivity is restored after being offline
  const reconnectHandlerRef = useRef<(() => void) | null>(null);
  const { isOffline } = useNetworkStatus(useCallback(() => {
    setTimeout(() => {
      reconnectHandlerRef.current?.();
    }, 1500);
  }, []));

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

  // Load cached photo URL on mount: seed stablePhotoUrlsRef so loadProfile reuses
  // the same URL expo-image already has on disk, and prefetch into memory cache.
  useEffect(() => {
    AsyncStorage.getItem(CACHED_MAIN_PHOTO_KEY).then(raw => {
      if (raw && isMountedRef.current) {
        try {
          const cached: CachedPhoto = JSON.parse(raw);
          setCachedMainPhoto(cached);
          // Seed the stable ref so loadProfile won't replace this URL with a fresh signed one
          if (cached.id && cached.url?.startsWith('http')) {
            stablePhotoUrlsRef.current.set(cached.id, cached.url);
            // Warm expo-image's memory cache (no-op if already in memory, fast disk read otherwise)
            Image.prefetch(cached.url).catch(() => {});
          }
        } catch {}
      }
    });
  }, []);

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
          logger.error('loadProfile failed:', profileResult.error);
          showToast.error('Failed to load profile', 'Pull down to refresh or try again.');
        }
        if (isMountedRef.current) {
          setLoading(false);
        }
        return;
      }

      const loadedProfile = profileResult.data;
      if (!isMountedRef.current) return;

      // Stabilize photo URLs: reuse the first signed URL we see per photo ID so
      // expo-image's disk cache doesn't bust when tokens rotate on every refresh.
      if (loadedProfile.photos) {
        loadedProfile.photos = loadedProfile.photos.map(p => {
          const existing = stablePhotoUrlsRef.current.get(p.id);
          if (existing && existing.startsWith('http')) return { ...p, url: existing };
          if (p.url?.startsWith('http')) stablePhotoUrlsRef.current.set(p.id, p.url);
          return p;
        });
      }

      if (isMountedRef.current) {
        setProfile(loadedProfile);

        // Persist main photo URL so next mount can seed stablePhotoUrlsRef + prefetch
        const mainPhoto = loadedProfile.photos?.find(p => p.isMain) || loadedProfile.photos?.[0];
        if (mainPhoto?.id && mainPhoto?.url?.startsWith('http')) {
          const cached: CachedPhoto = { id: mainPhoto.id, url: mainPhoto.url, blurhash: mainPhoto.blurhash };
          AsyncStorage.setItem(CACHED_MAIN_PHOTO_KEY, JSON.stringify(cached)).catch(() => {});
        }
      }
    } catch (error: any) {
      logger.error('loadProfile exception:', error);
      if (!isOffline) {
        showToast.error('Something went wrong', error.message || 'An unexpected error occurred.');
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

  // Wire up reconnect handler now that loaders are defined
  reconnectHandlerRef.current = () => {
    lastFetchRef.current = 0; // force fresh fetch
    Promise.all([loadProfile(), loadFriendCount(), loadBadges()]).catch(() => {});
  };

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
    if (isOffline) {
      showToast.error('You\'re offline', 'Your changes will need to be saved when you reconnect.');
      return false;
    }

    const questionToEdit = selectedQuestionForEdit || currentEditingQuestion;

    if (!questionToEdit || !newAnswer.trim()) {
      logger.error('Cannot save: no question selected or empty answer');
      return false;
    }

    if (!profile || !profile.deepQuestions) {
      logger.error('Save edited answer: profile data not loaded');
      showToast.error('Profile not loaded', 'Please try again.');
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
        showToast.error('Couldn\'t update answer', result.error?.message || 'Please try again.');
        return false;
      }
    } catch (error: any) {
      logger.error('Error saving edited answer:', error);
      showToast.error('Something went wrong', error.message || 'An unexpected error occurred.');
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
    if (isOffline) {
      showToast.error('You\'re offline', 'Your changes will need to be saved when you reconnect.');
      return;
    }
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
        logger.error('Inline save failed:', result.error);
        showToast.error('Couldn\'t save', result.error?.message || 'Please try again.');
      }
    } catch (error: any) {
      logger.error('Inline save exception:', error);
      showToast.error('Something went wrong', error.message || 'An unexpected error occurred.');
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
      logger.error('Remove question failed:', result.error);
      showToast.error('Couldn\'t remove question', result.error?.message || 'Please try again.');
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
        logger.error('Change question failed:', result.error);
        showToast.error('Couldn\'t change question', result.error?.message || 'Please try again.');
      }
    } catch (error: any) {
      logger.error('Error changing question:', error);
      showToast.error('Something went wrong', error.message || 'An unexpected error occurred.');
    }
  };

  const handleSaveNewAnswer = async (answer: string): Promise<boolean> => {
    if (isOffline) {
      showToast.error('You\'re offline', 'Your changes will need to be saved when you reconnect.');
      return false;
    }
    if (!selectedQuestionToAnswer || selectedSlotIndex === null || !profile) {
      logger.error('Save new answer: invalid state');
      showToast.error('Couldn\'t save', 'Please try again.');
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
        logger.error('Save new answer failed:', result.error);
        showToast.error('Couldn\'t save answer', result.error?.message || 'Please try again.');
        return false;
      }
    } catch (error: any) {
      logger.error('Error saving new answer:', error);
      showToast.error('Something went wrong', error.message || 'An unexpected error occurred.');
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
    cachedMainPhoto,
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
