import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button } from '../../components/ui';
import { AnswerQuestionModal } from '../../components/AnswerQuestionModal';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, DeepQuestionAnswer, UserProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { lightHaptic, mediumHaptic, successHaptic } from '../../utils/haptics';
import { createLogger } from '../../utils/secureLogger';
import { DEEP_QUESTIONS, getQuestionById } from '../../utils/deepQuestions';
import { getQuestionTier, QUESTIONS_PER_TIER } from '../../utils/questionTiers';

const logger = createLogger('DeepQuestionsScreen');

interface DeepQuestionsScreenProps {
  navigation: NavigationProp<RootStackParamList, 'DeepQuestions'>;
  route: RouteProp<RootStackParamList, 'DeepQuestions'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);

// Animated card component for smooth entry
const AnimatedCard = React.memo<{ children: React.ReactNode; delay?: number; className?: string }>(({
  children,
  delay = 0,
  className = ''
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Card className={className}>{children}</Card>
    </Animated.View>
  );
});

// Helper function to group imported questions by tier
const getQuestionsByTier = () => {
  const grouped: { [key: number]: typeof DEEP_QUESTIONS } = { 1: [], 2: [], 3: [] };

  DEEP_QUESTIONS.forEach(q => {
    const tier = getQuestionTier(q.id);
    grouped[tier].push(q);
  });

  return grouped as { 1: typeof DEEP_QUESTIONS; 2: typeof DEEP_QUESTIONS; 3: typeof DEEP_QUESTIONS };
};

const QUESTIONS_BY_TIER = getQuestionsByTier();

export const DeepQuestionsScreen: React.FC<DeepQuestionsScreenProps> = ({ navigation, route }) => {
  const { userId, editable = true, tier } = route.params || {};
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [answers, setAnswers] = useState<DeepQuestionAnswer[]>([]);
  const [displayedQuestions, setDisplayedQuestions] = useState<number[]>([]);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<{ id: number; question: string; tier: 1 | 2 | 3 } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) return;

      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
        setAnswers(profileResult.data.deepQuestions || []);
        setDisplayedQuestions(profileResult.data.displayedQuestions || []);
      }
    } catch (error) {
      logger.error('Failed to load profile:', error);
    }
  };

  const saveAnswersToBackend = async (updatedAnswers: DeepQuestionAnswer[]) => {
    if (!profile) return;

    setSaving(true);
    try {
      const result = await updateUserProfile({
        ...profile,
        deepQuestions: updatedAnswers,
      });

      if (!result.ok) {
        Alert.alert('Error', 'Failed to save answers. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const saveDisplayedQuestionsToBackend = async (updated: number[]) => {
    if (!profile) return;

    try {
      const updatedProfile = {
        ...profile,
        displayedQuestions: updated,
      };
      const result = await updateUserProfile(updatedProfile);

      if (result.ok) {
        // Update local profile state to keep in sync
        setProfile(updatedProfile);
      } else {
        Alert.alert('Error', 'Failed to update starred questions. Please try again.');
        // Revert the local state if save failed
        setDisplayedQuestions(profile.displayedQuestions || []);
      }
    } catch (error) {
      logger.error('Failed to save displayed questions:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      // Revert the local state if save failed
      setDisplayedQuestions(profile.displayedQuestions || []);
    }
  };

  const openAnswerModal = (questionId: number, tier: 1 | 2 | 3, question: string) => {
    setCurrentQuestion({ id: questionId, question, tier });
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    // Clean up state
    setCurrentQuestion(null);
  };

  const handleModalSave = async (answer: string) => {
    if (!currentQuestion) return;

    const newAnswer: DeepQuestionAnswer = {
      questionId: currentQuestion.id,
      tier: currentQuestion.tier,
      question: currentQuestion.question,
      answer: answer.trim(),
      updatedAt: new Date().toISOString(),
    };

    // Update or add answer
    const existingIndex = answers.findIndex((a) => a.questionId === currentQuestion.id);
    const updatedAnswers =
      existingIndex >= 0
        ? answers.map((a, i) => (i === existingIndex ? newAnswer : a))
        : [...answers, newAnswer];

    setAnswers(updatedAnswers);
    setSavingQuestionId(currentQuestion.id);

    // Save to backend
    await saveAnswersToBackend(updatedAnswers);
    setSavingQuestionId(null);

    // Auto-star first question answered in each tier
    const isNewAnswer = existingIndex < 0; // This is a new answer, not an edit
    if (isNewAnswer) {
      // Check if this tier has any starred questions using centralized function
      const questionTier = currentQuestion.tier;
      const hasStarredQuestionInTier = displayedQuestions.some(id => getQuestionTier(id) === questionTier);

      // If this tier has no starred questions, auto-star this one
      if (!hasStarredQuestionInTier) {
        const updatedDisplayed = [...displayedQuestions, currentQuestion.id];
        setDisplayedQuestions(updatedDisplayed);
        await saveDisplayedQuestionsToBackend(updatedDisplayed);
      }
    }

    // Close modal after successful save
    handleModalClose();
  };

  const handleToggleDisplayed = async (questionId: number) => {
    const isCurrentlyDisplayed = displayedQuestions.includes(questionId);

    if (isCurrentlyDisplayed) {
      const updated = displayedQuestions.filter((id) => id !== questionId);
      setDisplayedQuestions(updated);
      await saveDisplayedQuestionsToBackend(updated);
      return;
    }

    // Determine which tier this question belongs to using centralized function
    const newQuestionTier = getQuestionTier(questionId);

    // Check if we already have a question from this tier displayed
    const tierCounts = { 1: 0, 2: 0, 3: 0 };
    displayedQuestions.forEach(id => {
      const tier = getQuestionTier(id);
      tierCounts[tier]++;
    });

    if (tierCounts[newQuestionTier] >= 1) {
      // Find the currently starred question from this tier
      const currentlyStarredId = displayedQuestions.find(id => getQuestionTier(id) === newQuestionTier);
      const currentlyStarredQuestion = answers.find(a => a.questionId === currentlyStarredId);

      Alert.alert(
        'Switch Starred Question?',
        `You already have a question from Tier ${newQuestionTier} starred${currentlyStarredQuestion ? `:\n\n"${currentlyStarredQuestion.question.substring(0, 80)}..."\n\n` : '. '}Would you like to switch the star to this question instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch Star',
            onPress: async () => {
              // Remove old starred question from this tier and add new one
              const updated = displayedQuestions.filter(id => id !== currentlyStarredId);
              updated.push(questionId);
              setDisplayedQuestions(updated);
              await saveDisplayedQuestionsToBackend(updated);
            }
          }
        ]
      );
      return;
    }

    // Check max limit (3 questions total, one from each tier)
    if (displayedQuestions.length >= 3) {
      Alert.alert(
        'Maximum Reached',
        'You can only display 3 questions to other users (one from each tier). Please unstar another question to select this one.',
        [{ text: 'OK' }]
      );
      return;
    }

    const updated = [...displayedQuestions, questionId];
    setDisplayedQuestions(updated);
    await saveDisplayedQuestionsToBackend(updated);
  };

  const handleDeleteAnswer = (questionId: number) => {
    // CRITICAL FIX: Check if question is currently starred
    const isStarred = displayedQuestions.includes(questionId);
    const warningMessage = isStarred
      ? 'This question is currently starred on your profile. Deleting it will also remove it from your displayed questions. Are you sure?'
      : 'Are you sure you want to delete this answer?';

    Alert.alert('Delete Answer', warningMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedAnswers = answers.filter((a) => a.questionId !== questionId);
          setAnswers(updatedAnswers);

          // CRITICAL FIX: If question was starred, also remove from displayedQuestions
          if (isStarred) {
            const updatedDisplayedQuestions = displayedQuestions.filter(id => id !== questionId);
            setDisplayedQuestions(updatedDisplayedQuestions);

            // Update both answers AND displayedQuestions in profile
            const result = await updateUserProfile({
              deepQuestions: updatedAnswers,
              displayedQuestions: updatedDisplayedQuestions,
            });

            if (result.ok && profile) {
              // Update local profile state to keep in sync
              setProfile({ ...profile, displayedQuestions: updatedDisplayedQuestions });
            }
          } else {
            // Only update answers
            await saveAnswersToBackend(updatedAnswers);
          }
        },
      },
    ]);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const getAnswerForQuestion = (questionId: number) => {
    return answers.find((a) => a.questionId === questionId);
  };

  // Smart Recommendation System - Returns single best question
  const getRecommendedQuestion = (): {
    question: { id: number; question: string };
    tier: 1 | 2 | 3;
    reason: string;
  } | null => {

    // Get unanswered questions for each tier
    const unansweredByTier = {
      1: QUESTIONS_BY_TIER[1].filter(q => !getAnswerForQuestion(q.id)),
      2: QUESTIONS_BY_TIER[2].filter(q => !getAnswerForQuestion(q.id)),
      3: QUESTIONS_BY_TIER[3].filter(q => !getAnswerForQuestion(q.id)),
    };

    // Calculate tier stats
    const tierStats = {
      1: { answered: 0, total: QUESTIONS_PER_TIER },
      2: { answered: 0, total: QUESTIONS_PER_TIER },
      3: { answered: 0, total: QUESTIONS_PER_TIER },
    };

    answers.forEach(a => {
      if (a.tier) {
        tierStats[a.tier].answered++;
      }
    });

    // Find tier with lowest completion percentage
    const sortedTiers = ([1, 2, 3] as const).slice().sort((a, b) => {
      const percentA = tierStats[a].answered / tierStats[a].total;
      const percentB = tierStats[b].answered / tierStats[b].total;
      return percentA - percentB;
    });

    // Return first unanswered question from tier with lowest completion
    for (const tier of sortedTiers) {
      if (unansweredByTier[tier].length > 0) {
        const tierNames: { [key in 1 | 2 | 3]: string } = {
          1: 'Build your foundation',
          2: 'Show your depth',
          3: 'Create connection',
        };
        return {
          question: unansweredByTier[tier][0],
          tier,
          reason: tierNames[tier],
        };
      }
    }

    return null; // All questions answered
  };

  const renderQuestion = (question: { id: number; question: string }, tier: 1 | 2 | 3) => {
    const answer = getAnswerForQuestion(question.id);
    const isDisplayed = displayedQuestions.includes(question.id);

    // Different styles based on tier and state
    const getCardStyle = () => {
      if (isDisplayed) {
        return {
          backgroundColor: '#EFF6FF',
          borderColor: '#93C5FD',
          borderWidth: 2,
        };
      }
      if (answer) {
        return {
          backgroundColor: '#FFFFFF',
          borderColor: '#BFDBFE',
          borderWidth: 1,
        };
      }
      return {
        backgroundColor: '#F9FAFB',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderStyle: 'dashed' as const,
      };
    };

    return (
      <Card key={question.id} style={getCardStyle()} className="mb-3">
        <StyledView>
          <StyledView className="flex-row items-start justify-between mb-3">
            <StyledView className="flex-1 mr-2">
              {isDisplayed && (
                <StyledView className="flex-row items-center mb-2">
                  <Ionicons name="star" size={14} color="#FDB022" />
                  <Body className="text-xs text-warning ml-1 font-semibold uppercase tracking-wider">
                    Shown to matches
                  </Body>
                </StyledView>
              )}
              <Body className={`font-semibold text-base leading-6 ${answer ? 'text-neutral-900' : 'text-neutral-600'}`}>
                {question.question}
              </Body>
            </StyledView>
            {answer && editable && (
              <StyledView className="flex-row gap-3 pt-1">
                <StyledTouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    handleToggleDisplayed(question.id);
                  }}
                  className="w-8 h-8 items-center justify-center rounded-full bg-white border border-neutral-200"
                >
                  <Ionicons
                    name={isDisplayed ? "star" : "star-outline"}
                    size={16}
                    color={isDisplayed ? "#FDB022" : "#98A2B3"}
                  />
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    openAnswerModal(question.id, tier, question.question);
                  }}
                  className="w-8 h-8 items-center justify-center rounded-full bg-primary-50 border border-primary-200"
                >
                  <Ionicons name="pencil" size={14} color="#437FFF" />
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  onPress={() => {
                    mediumHaptic();
                    handleDeleteAnswer(question.id);
                  }}
                  className="w-8 h-8 items-center justify-center rounded-full bg-error/10 border border-error/20"
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                </StyledTouchableOpacity>
              </StyledView>
            )}
          </StyledView>

          {answer ? (
            <StyledView>
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  openAnswerModal(question.id, tier, question.question);
                }}
                activeOpacity={0.7}
                className={`rounded-lg p-3 ${isDisplayed ? 'bg-white/70' : 'bg-neutral-50'}`}
              >
                <Body className="text-neutral-800 text-sm leading-6">{answer.answer}</Body>
              </StyledTouchableOpacity>
              {savingQuestionId === question.id && (
                <StyledView className="mt-2 flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Body className="text-success text-xs font-semibold ml-1">Saved successfully</Body>
                </StyledView>
              )}
            </StyledView>
          ) : (
            editable && (
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  openAnswerModal(question.id, tier, question.question);
                }}
                style={{ backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }}
                className="border-2 border-dashed rounded-xl p-4 items-center"
              >
                <Ionicons name="add-circle-outline" size={24} color="#437FFF" />
                <Body className="text-primary-600 text-sm font-semibold mt-2">
                  Tap to share your answer
                </Body>
              </StyledTouchableOpacity>
            )
          )}
        </StyledView>
      </Card>
    );
  };

  const renderTier = (tier: 1 | 2 | 3) => {
    const questions = QUESTIONS_BY_TIER[tier];
    const answeredCount = questions.filter(q => getAnswerForQuestion(q.id)).length;
    const isExpanded = expandedTier === tier;
    const progressPercent = (answeredCount / questions.length) * 100;

    const tierConfig = {
      1: {
        name: 'Getting to Know You',
        icon: 'chatbubbles' as const,
        bgColor: '#DBEAFE',
        borderColor: '#93C5FD',
        iconBg: '#3B82F6',
        emoji: '👋',
      },
      2: {
        name: 'Going Deeper',
        icon: 'heart-half' as const,
        bgColor: '#E0E7FF',
        borderColor: '#A5B4FC',
        iconBg: '#6366F1',
        emoji: '💭',
      },
      3: {
        name: 'Building Connection',
        icon: 'heart' as const,
        bgColor: '#EDE9FE',
        borderColor: '#C4B5FD',
        iconBg: '#A855F7',
        emoji: '💙',
      },
    };

    const config = tierConfig[tier];

    return (
      <StyledView key={tier} className="mb-4">
        <StyledTouchableOpacity
          onPress={() => {
            lightHaptic();
            setExpandedTier(isExpanded ? null : tier);
          }}
          activeOpacity={0.8}
          style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
          className="rounded-xl p-5 flex-row items-center justify-between border-2 shadow-sm"
        >
          <StyledView className="flex-row items-center flex-1">
            <StyledView style={{ backgroundColor: config.iconBg }} className="w-14 h-14 rounded-2xl items-center justify-center mr-4 shadow-md">
              <Body className="text-3xl">{config.emoji}</Body>
            </StyledView>
            <StyledView className="flex-1">
              <StyledView className="flex-row items-center mb-1">
                <StyledView style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: config.borderColor }} className="px-2.5 py-1 rounded-full mr-2 border">
                  <Body style={{ color: config.iconBg }} className="text-xs font-bold">TIER {tier}</Body>
                </StyledView>
                {answeredCount === questions.length && (
                  <StyledView style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)' }} className="px-2 py-0.5 rounded-full border">
                    <Body style={{ color: '#10B981' }} className="text-xs font-bold">✓ Complete</Body>
                  </StyledView>
                )}
              </StyledView>
              <Body className="text-neutral-900 font-bold text-base mb-1">{config.name}</Body>
              <Body style={{ color: config.iconBg }} className="text-sm font-semibold">
                {answeredCount}/{questions.length} answered
              </Body>
              <StyledView style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', borderColor: 'rgba(147, 197, 253, 0.5)' }} className="mt-2.5 rounded-full h-2.5 border overflow-hidden">
                <StyledView
                  style={{ backgroundColor: '#437FFF', width: `${progressPercent}%` }}
                  className="h-2.5 rounded-full"
                />
              </StyledView>
            </StyledView>
          </StyledView>
          <StyledView style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: '#BFDBFE' }} className="ml-3 w-10 h-10 rounded-full items-center justify-center border">
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#437FFF"
            />
          </StyledView>
        </StyledTouchableOpacity>

        {isExpanded && (
          <StyledView className="mt-3 px-1">
            {questions.map(q => renderQuestion(q, tier))}
          </StyledView>
        )}
      </StyledView>
    );
  };

  return (
    <StyledKeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StyledSafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <StyledView style={{ backgroundColor: '#437FFF' }} className="px-4 py-4 shadow-lg">
          <StyledView className="flex-row items-center justify-between">
            <StyledTouchableOpacity
              onPress={() => {
                mediumHaptic();
                handleGoBack();
              }}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              className="mr-3 w-10 h-10 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </StyledTouchableOpacity>
            <StyledView className="flex-1">
              <Body style={{ color: 'rgba(255, 255, 255, 0.8)' }} className="text-xs uppercase tracking-wider mb-0.5">Your Story</Body>
              <H3 className="text-white font-bold">Questions</H3>
            </StyledView>
          </StyledView>
        </StyledView>

        <StyledScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <StyledView className="px-4 py-4">
            {/* Progress Overview with Instructions */}
            <Card style={{ backgroundColor: '#F0F7FF', borderColor: '#BFDBFE' }} className="mb-6 border-2 shadow-sm">
              <StyledView className="flex-row items-center mb-3">
                <StyledView className="w-16 h-16 bg-white rounded-2xl items-center justify-center mr-4 shadow-sm">
                  <Body style={{ color: '#437FFF' }} className="text-xl font-bold">{displayedQuestions.length}</Body>
                  <Body style={{ color: '#437FFF' }} className="text-sm font-semibold">/3</Body>
                </StyledView>
                <StyledView className="flex-1">
                  <Body style={{ color: '#64748B' }} className="text-xs uppercase tracking-wider mb-1">
                    Required to Match
                  </Body>
                  <Body style={{ color: '#1E293B' }} className="font-bold text-xl mb-1">
                    {displayedQuestions.length >= 3 ? '✓ Ready to Match!' : `${displayedQuestions.length} of 3 starred`}
                  </Body>
                  <StyledView style={{ backgroundColor: '#E0E7FF' }} className="rounded-full h-2 overflow-hidden">
                    <StyledView
                      className="h-2 rounded-full"
                      style={{ width: `${(displayedQuestions.length / 3) * 100}%`, backgroundColor: '#437FFF' }}
                    />
                  </StyledView>
                </StyledView>
              </StyledView>
              <StyledView style={{ backgroundColor: '#E0F2FE' }} className="rounded-lg p-3">
                <Body style={{ color: '#475569' }} className="text-xs leading-5">
                  Star 3 questions to match • Answering more improves match quality
                </Body>
              </StyledView>
            </Card>

            {/* Recommended Question - Single Card */}
            {(() => {
              const recommendation = getRecommendedQuestion();
              if (!recommendation) return null;

              const tierColors = {
                1: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
                2: { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' },
                3: { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' },
              };
              const colors = tierColors[recommendation.tier];

              return (
                <Card className="mb-6 border-2" style={{ borderColor: colors.border, backgroundColor: colors.bg }}>
                  <StyledView className="flex-row items-center mb-3">
                    <Ionicons name="bulb" size={20} color={colors.border} style={{ marginRight: 8 }} />
                    <Body className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.text }}>
                      Recommended · Tier {recommendation.tier}
                    </Body>
                  </StyledView>

                  <Body className="text-neutral-900 font-semibold text-sm leading-6 mb-3">
                    {recommendation.question.question}
                  </Body>

                  <StyledTouchableOpacity
                    onPress={() => {
                      mediumHaptic();
                      setExpandedTier(recommendation.tier);
                      openAnswerModal(recommendation.question.id, recommendation.tier, recommendation.question.question);
                    }}
                    className="flex-row items-center justify-center py-2.5 px-4 rounded-xl"
                    style={{ backgroundColor: colors.border }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create" size={18} color="#FFFFFF" />
                    <Body className="text-white font-bold text-sm ml-2">Answer This Question</Body>
                  </StyledTouchableOpacity>
                </Card>
              );
            })()}

            {/* Tier Sections */}
            {renderTier(1)}
            {renderTier(2)}
            {renderTier(3)}

            {/* Bottom Padding */}
            <StyledView className="h-6" />
          </StyledView>
        </StyledScrollView>
      </StyledSafeAreaView>

      {/* Answer Question Modal */}
      <AnswerQuestionModal
        visible={showModal}
        question={currentQuestion?.question || ''}
        tier={currentQuestion?.tier || 1}
        initialAnswer={currentQuestion ? getAnswerForQuestion(currentQuestion.id)?.answer || '' : ''}
        onSave={handleModalSave}
        onClose={handleModalClose}
      />
    </StyledKeyboardAvoidingView>
  );
};