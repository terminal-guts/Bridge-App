import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body } from '../../../components/ui';
import { OnboardingData, DeepQuestionAnswer } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { FONTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { SHADOWS } from '../../../theme/shadows';
import { EvaIcon } from '../../../components/icons';

interface DeepQuestionsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledScrollView = styled(ScrollView);

type Tier = 1 | 2 | 3;

interface Question {
  id: number;
  text: string;
  tier: Tier;
}

interface QuestionAnswer {
  questionId: number;
  question: string;
  answer: string;
  tier: Tier;
  isFeatured: boolean;
}

const QUESTIONS: Question[] = [
  // Tier 1: Lighthearted
  { id: 1, tier: 1, text: "Given the choice of anyone alive or dead, whom would you want as a dinner guest?" },
  { id: 2, tier: 1, text: "Would you like to be famous? Why?" },
  { id: 5, tier: 1, text: "If you could wake up tomorrow having gained any one quality or ability, what would it be?" },
  { id: 6, tier: 1, text: "Your house catches fire. What one item would you save?" },
  { id: 22, tier: 1, text: "What's the best trip or adventure you've ever been on?" },

  // Tier 2: Relationship
  { id: 9, tier: 2, text: "When you're overwhelmed or stressed, what actually helps you feel supported?" },
  { id: 10, tier: 2, text: "What are three qualities you value most in your closest friendships?" },
  { id: 12, tier: 2, text: "What do you notice first when you're attracted to someone?" },
  { id: 13, tier: 2, text: "What's something you're actively trying to improve about yourself right now?" },
  { id: 23, tier: 2, text: "What's something you could talk about for hours without getting bored?" },

  // Tier 3: Reflective
  { id: 14, tier: 3, text: "Is there something you've dreamed of doing for a long time? Why haven't you done it?" },
  { id: 15, tier: 3, text: "What is your greatest accomplishment?" },
  { id: 16, tier: 3, text: "If a crystal ball could tell you the truth about anything, what would you want to know?" },
  { id: 21, tier: 3, text: "Share an embarrassing moment that taught you something about yourself." },
  { id: 24, tier: 3, text: "What's a belief or opinion you've changed your mind about recently?" },
];

export const DeepQuestionsStep: React.FC<DeepQuestionsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  // Initialize answers from existing data
  const initializeAnswers = (): Map<number, QuestionAnswer> => {
    const existing = data.deepQuestions || [];
    const result = new Map<number, QuestionAnswer>();

    existing.forEach(q => {
      result.set(q.questionId, {
        questionId: q.questionId,
        question: q.question,
        answer: q.answer,
        tier: q.tier,
        isFeatured: q.isFeatured || false,
      });
    });

    return result;
  };

  const [answers, setAnswers] = useState<Map<number, QuestionAnswer>>(initializeAnswers());
  const [expandedTiers, setExpandedTiers] = useState<Set<Tier>>(new Set());
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  // Get answer for a question
  const getAnswer = (questionId: number): QuestionAnswer | undefined => {
    return answers.get(questionId);
  };

  // Toggle tier expansion
  const toggleTier = (tier: Tier) => {
    setExpandedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tier)) {
        newSet.delete(tier);
      } else {
        newSet.add(tier);
      }
      return newSet;
    });
  };

  // Open answer modal for a question
  const handleAnswerQuestion = (question: Question) => {
    setSelectedQuestion(question);
    const existingAnswer = getAnswer(question.id);
    setDraftAnswer(existingAnswer?.answer || '');
    setShowAnswerModal(true);
  };

  // Save answer
  const handleSaveAnswer = () => {
    if (!selectedQuestion || !draftAnswer.trim()) {
      return;
    }

    const newAnswer: QuestionAnswer = {
      questionId: selectedQuestion.id,
      question: selectedQuestion.text,
      answer: draftAnswer.trim(),
      tier: selectedQuestion.tier,
      isFeatured: getAnswer(selectedQuestion.id)?.isFeatured || false,
    };

    setAnswers(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedQuestion.id, newAnswer);
      return newMap;
    });

    // Collapse the tier after saving
    setExpandedTiers(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedQuestion.tier);
      return newSet;
    });

    setShowAnswerModal(false);
    setSelectedQuestion(null);
    setDraftAnswer('');
  };

  // Delete answer
  const handleDeleteAnswer = (questionId: number) => {
    setAnswers(prev => {
      const newMap = new Map(prev);
      newMap.delete(questionId);
      return newMap;
    });
  };

  // Validate and continue
  const handleContinue = () => {
    // Check if all 3 tiers have at least one answer
    if (!tier1Answered || !tier2Answered || !tier3Answered) {
      Alert.alert('Almost there!', 'Answer one question from each tier and you\'re good to go.');
      return;
    }

    const deepQuestions: DeepQuestionAnswer[] = Array.from(answers.values()).map(a => ({
      questionId: a.questionId,
      question: a.question,
      answer: a.answer,
      tier: a.tier,
      isFeatured: false, // No longer using featured questions
    }));

    // Automatically star/display all questions answered during onboarding
    // This ensures they appear on the profile by default
    const displayedQuestions = Array.from(answers.values()).map(a => a.questionId);

    updateData({
      deepQuestions,
      displayedQuestions, // Auto-star onboarding questions
    });
    onNext();
  };

  // Count how many tiers have at least one answer
  const tier1Answered = Array.from(answers.values()).some(a => a.tier === 1);
  const tier2Answered = Array.from(answers.values()).some(a => a.tier === 2);
  const tier3Answered = Array.from(answers.values()).some(a => a.tier === 3);
  const tiersCompleted = [tier1Answered, tier2Answered, tier3Answered].filter(Boolean).length;

  const tierDescriptions: Record<Tier, string> = {
    1: 'Lighthearted & fun',
    2: 'Relationship & connection',
    3: 'Reflective & meaningful',
  };

  const tierColors: Record<Tier, { bg: string; border: string; text: string }> = {
    1: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    2: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600' },
    3: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600' },
  };

  const tierIcons: Record<Tier, string> = {
    1: 'message-circle',
    2: 'heart',
    3: 'star',
  };

  // Render question item
  const renderQuestionItem = (question: Question) => {
    const answer = getAnswer(question.id);
    const isAnswered = !!answer;

    return (
      <StyledView key={question.id} className="mb-3">
        <StyledTouchableOpacity
          onPress={() => handleAnswerQuestion(question)}
          className={`p-4 rounded-xl border-2 ${
            isAnswered
              ? 'bg-primary-50 border-primary-300'
              : 'bg-white border-neutral-200'
          }`}
          style={isAnswered ? SHADOWS.md : SHADOWS.sm}
        >
          <StyledView className="flex-row items-start">
            {isAnswered && (
              <StyledView className="mr-3 mt-1">
                <EvaIcon name="checkmark-circle-2" variant="outline" size={20} color={COLORS.primaryAccent} />
              </StyledView>
            )}
            <StyledView className="flex-1">
              <Body className={`text-sm leading-5 ${isAnswered ? 'text-neutral-900 font-semibold' : 'text-neutral-700'}`}>
                {question.text}
              </Body>
              {isAnswered && (
                <Body className="text-neutral-600 text-sm mt-2 italic" numberOfLines={2}>
                  "{answer.answer}"
                </Body>
              )}
            </StyledView>
          </StyledView>

          {isAnswered && (
            <StyledView className="flex-row items-center justify-between mt-3 pt-3 border-t border-primary-100">
              <Body className="text-primary-500 text-xs font-medium">Tap to edit</Body>
              <StyledTouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteAnswer(question.id);
                }}
                className="flex-row items-center"
              >
                <EvaIcon name="trash-2" variant="outline" size={16} color={COLORS.error} />
                <Body className="ml-1 text-xs text-error">Delete</Body>
              </StyledTouchableOpacity>
            </StyledView>
          )}
        </StyledTouchableOpacity>
      </StyledView>
    );
  };

  // Render tier section
  const renderTierSection = (tier: Tier) => {
    const tierQuestions = QUESTIONS.filter(q => q.tier === tier);
    const isExpanded = expandedTiers.has(tier);
    const hasAnswerInTier = tierQuestions.some(q => getAnswer(q.id));
    const completionText = hasAnswerInTier ? '✓ Completed' : 'Tap to start';
    const completionColor = hasAnswerInTier ? 'text-success font-semibold' : 'text-neutral-400';
    const colors = tierColors[tier];

    return (
      <StyledView key={tier} className="mb-5">
        <StyledTouchableOpacity
          onPress={() => toggleTier(tier)}
          className={`flex-row items-center justify-between p-5 rounded-2xl border-2 ${
            hasAnswerInTier
              ? 'bg-green-50 border-green-300'
              : `${colors.bg} ${colors.border}`
          }`}
          style={SHADOWS.lg}
        >
          <StyledView className="flex-row items-center flex-1">
            <StyledView
              className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                hasAnswerInTier ? 'bg-green-100' : colors.bg
              }`}
            >
              <EvaIcon
                name={hasAnswerInTier ? 'checkmark-circle-2' : tierIcons[tier]}
                variant={hasAnswerInTier ? 'fill' : 'outline'}
                size={28}
                color={hasAnswerInTier
                  ? COLORS.success
                  : tier === 1 ? COLORS.primary : tier === 2 ? COLORS.primary : COLORS.primaryAccent}
              />
            </StyledView>
            <StyledView className="flex-1">
              <H3 className="text-lg font-bold mb-1">Tier {tier}</H3>
              <Body className="text-neutral-600 text-sm">{tierDescriptions[tier]}</Body>
            </StyledView>
          </StyledView>
          <StyledView className="flex-row items-center ml-2">
            <Body className={`text-sm mr-2 ${completionColor}`}>
              {completionText}
            </Body>
            <EvaIcon
              name={isExpanded ? 'arrow-ios-upward' : 'arrow-ios-downward'}
              variant="outline"
              size={24}
              color={COLORS.text.tertiary}
            />
          </StyledView>
        </StyledTouchableOpacity>

        {isExpanded && (
          <StyledView className="mt-4 ml-2">
            {tierQuestions.map(renderQuestionItem)}
          </StyledView>
        )}
      </StyledView>
    );
  };

  return (
    <>
      <OnboardingLayout
        onBack={onBack}
        onContinue={handleContinue}
        hasTextInput={false}
      >
        <StyledView className="mt-8">
          <H1 className="mb-4">Let people get to know you</H1>
          <Body className="text-neutral-600 mb-2">
            Answer <Body className="font-bold text-neutral-900">one question from each tier</Body> so your friends and matches can see the real you.
          </Body>
          <Body className="text-neutral-500 text-sm mb-8">
            Feel free to answer more if you're on a roll -- but 3 is all you need to get started.
          </Body>

          {/* Tiers */}
          {[1, 2, 3].map(tier => renderTierSection(tier as Tier))}
        </StyledView>
      </OnboardingLayout>

      {/* Answer Modal */}
      <Modal
        visible={showAnswerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <StyledView className="flex-1 bg-white">
          {/* Header */}
          <StyledView className="pt-14 pb-4 px-6 border-b border-neutral-200 bg-white">
            <StyledView className="flex-row items-center justify-between mb-4">
              <StyledTouchableOpacity onPress={() => setShowAnswerModal(false)}>
                <Body className="text-primary-500 font-medium">Cancel</Body>
              </StyledTouchableOpacity>
              <H2 className="text-lg">Answer Question</H2>
              <StyledTouchableOpacity
                onPress={handleSaveAnswer}
                disabled={!draftAnswer.trim()}
              >
                <Body className={`font-semibold ${
                  draftAnswer.trim() ? 'text-primary-500' : 'text-neutral-300'
                }`}>
                  Save
                </Body>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Question and Input */}
          <StyledScrollView className="flex-1 px-6 pt-6">
            <H3 className="text-base font-semibold mb-4 leading-6">
              {selectedQuestion?.text}
            </H3>

            <StyledTextInput
              value={draftAnswer}
              onChangeText={setDraftAnswer}
              placeholder="Type your answer here..."
              multiline
              autoFocus
              textAlignVertical="top"
              className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 min-h-[200px] text-base text-neutral-900"
              style={{ fontFamily: FONTS.regular }}
            />

            <Body className="text-neutral-400 text-xs mt-3">
              Your answers help us find people who really click with you.
            </Body>

            <StyledView className="h-20" />
          </StyledScrollView>
        </StyledView>
      </Modal>
    </>
  );
};
