/**
 * ProfileScreen Questions Tab
 *
 * Questions tab content: progress header, three question slots,
 * inline editing, "Answer More" accordion, and slot management.
 */

import React from 'react';
import { View, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { H3, Body, Card } from '../../components/ui';
import { UserProfile, DeepQuestionAnswer } from '../../types';
import { EvaIcon } from '../../components/icons';
import { AnswerQuestionModal } from '../../components/profile/AnswerQuestionModal';
import { updateUserProfile } from '../../services/profileService';
import { getUnansweredQuestions } from '../../utils/deepQuestions';
import { showToast } from '../../utils/toast';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { QuestionsSkeleton, UnansweredQuestionCard, AnsweredQuestionCard } from './ProfileScreen.sections';

const StyledView = styled(View) as typeof View;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;

// ─── Questions Tab ───────────────────────────────────────────────────

export interface QuestionsTabProps {
  profile: UserProfile;
  loading: boolean;
  inlineEditSlot: number | null;
  inlineEditText: string;
  inlineEditSaving: boolean;
  answerMoreExpanded: boolean;
  showAnswerModal: boolean;
  selectedQuestionToAnswer: { id: number; question: string } | null;
  selectedSlotIndex: number | null;
  onSetInlineEditText: (text: string) => void;
  onSetInlineEditSlot: (slot: number | null) => void;
  onSetAnswerMoreExpanded: (expanded: boolean) => void;
  onSetSelectedSlotIndex: (index: number | null) => void;
  onSetShowQuestionSelectionModal: (show: boolean) => void;
  onSetSelectedQuestionToAnswer: (q: { id: number; question: string } | null) => void;
  onSetShowAnswerModal: (show: boolean) => void;
  onSetCurrentEditingQuestion: (q: DeepQuestionAnswer | null) => void;
  onSetShowEditAnswerModal: (show: boolean) => void;
  onSetProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  onShowSlotActions: (slotIndex: number, question: DeepQuestionAnswer) => void;
  onHandleInlineSave: (slotIndex: number, question: DeepQuestionAnswer) => void;
  isMountedRef: React.MutableRefObject<boolean>;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({
  profile,
  loading,
  inlineEditSlot,
  inlineEditText,
  inlineEditSaving,
  answerMoreExpanded,
  showAnswerModal,
  selectedQuestionToAnswer,
  selectedSlotIndex,
  onSetInlineEditText,
  onSetInlineEditSlot,
  onSetAnswerMoreExpanded,
  onSetSelectedSlotIndex,
  onSetShowQuestionSelectionModal,
  onSetSelectedQuestionToAnswer,
  onSetShowAnswerModal,
  onSetCurrentEditingQuestion,
  onSetShowEditAnswerModal,
  onSetProfile,
  onShowSlotActions,
  onHandleInlineSave,
  isMountedRef,
}) => {
  if (loading || !profile) {
    return <QuestionsSkeleton />;
  }

  const answeredQuestions = profile.deepQuestions || [];
  const displayedQuestionIds = profile.displayedQuestions || [];

  return (
    <StyledView className="px-4 py-6 bg-neutral-50">
      {/* Progress Header */}
      {displayedQuestionIds.length < 3 && (
        <ProgressHeader count={displayedQuestionIds.length} />
      )}

      {/* Three Question Slots */}
      <QuestionSlots
        profile={profile}
        answeredQuestions={answeredQuestions}
        displayedQuestionIds={displayedQuestionIds}
        inlineEditSlot={inlineEditSlot}
        inlineEditText={inlineEditText}
        inlineEditSaving={inlineEditSaving}
        answerMoreExpanded={answerMoreExpanded}
        showAnswerModal={showAnswerModal}
        selectedQuestionToAnswer={selectedQuestionToAnswer}
        selectedSlotIndex={selectedSlotIndex}
        onSetInlineEditText={onSetInlineEditText}
        onSetInlineEditSlot={onSetInlineEditSlot}
        onSetAnswerMoreExpanded={onSetAnswerMoreExpanded}
        onSetSelectedSlotIndex={onSetSelectedSlotIndex}
        onSetShowQuestionSelectionModal={onSetShowQuestionSelectionModal}
        onSetSelectedQuestionToAnswer={onSetSelectedQuestionToAnswer}
        onSetShowAnswerModal={onSetShowAnswerModal}
        onSetCurrentEditingQuestion={onSetCurrentEditingQuestion}
        onSetShowEditAnswerModal={onSetShowEditAnswerModal}
        onSetProfile={onSetProfile}
        onShowSlotActions={onShowSlotActions}
        onHandleInlineSave={onHandleInlineSave}
        isMountedRef={isMountedRef}
      />
    </StyledView>
  );
};

// ─── Progress Header ─────────────────────────────────────────────────

const ProgressHeader: React.FC<{ count: number }> = ({ count }) => (
  <Card
    className="mb-6 overflow-hidden"
    style={{ backgroundColor: 'transparent', padding: 0 }}
  >
    <LinearGradient
      colors={['#F0F9FF', '#E0F2FE', '#DBEAFE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 12, ...SHADOWS.accentBlue }}
    >
      <StyledView className="p-4">
        <StyledView className="mb-3">
          <Body className="text-sky-800 text-xs uppercase tracking-wider font-semibold opacity-80">Getting Started</Body>
          <Body className="text-sky-900 font-bold text-2xl mb-1">{count}/3</Body>
        </StyledView>
        <StyledView className="mb-3">
          <Body className="text-sky-700 text-xs opacity-90 leading-5">Pick 3 questions to show on your profile</Body>
          <Body className="text-sky-700 text-xs opacity-90 leading-5">The more you answer, the better your matches get</Body>
        </StyledView>
        <StyledView className="rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
          <LinearGradient
            colors={['#38BDF8', '#0EA5E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: '100%', width: `${(count / 3) * 100}%`, borderRadius: 9999 }}
          />
        </StyledView>
      </StyledView>
    </LinearGradient>
  </Card>
);

// ─── Question Slots ──────────────────────────────────────────────────

interface QuestionSlotsProps {
  profile: UserProfile;
  answeredQuestions: DeepQuestionAnswer[];
  displayedQuestionIds: number[];
  inlineEditSlot: number | null;
  inlineEditText: string;
  inlineEditSaving: boolean;
  answerMoreExpanded: boolean;
  showAnswerModal: boolean;
  selectedQuestionToAnswer: { id: number; question: string } | null;
  selectedSlotIndex: number | null;
  onSetInlineEditText: (text: string) => void;
  onSetInlineEditSlot: (slot: number | null) => void;
  onSetAnswerMoreExpanded: (expanded: boolean) => void;
  onSetSelectedSlotIndex: (index: number | null) => void;
  onSetShowQuestionSelectionModal: (show: boolean) => void;
  onSetSelectedQuestionToAnswer: (q: { id: number; question: string } | null) => void;
  onSetShowAnswerModal: (show: boolean) => void;
  onSetCurrentEditingQuestion: (q: DeepQuestionAnswer | null) => void;
  onSetShowEditAnswerModal: (show: boolean) => void;
  onSetProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  onShowSlotActions: (slotIndex: number, question: DeepQuestionAnswer) => void;
  onHandleInlineSave: (slotIndex: number, question: DeepQuestionAnswer) => void;
  isMountedRef: React.MutableRefObject<boolean>;
}

const QuestionSlots: React.FC<QuestionSlotsProps> = ({
  profile,
  answeredQuestions,
  displayedQuestionIds,
  inlineEditSlot,
  inlineEditText,
  inlineEditSaving,
  answerMoreExpanded,
  showAnswerModal,
  selectedQuestionToAnswer,
  selectedSlotIndex,
  onSetInlineEditText,
  onSetInlineEditSlot,
  onSetAnswerMoreExpanded,
  onSetSelectedSlotIndex,
  onSetShowQuestionSelectionModal,
  onSetSelectedQuestionToAnswer,
  onSetShowAnswerModal,
  onSetCurrentEditingQuestion,
  onSetShowEditAnswerModal,
  onSetProfile,
  onShowSlotActions,
  onHandleInlineSave,
  isMountedRef,
}) => {
  const slot1Question = displayedQuestionIds[0] ? answeredQuestions.find(q => q.questionId === displayedQuestionIds[0]) : null;
  const slot2Question = displayedQuestionIds[1] ? answeredQuestions.find(q => q.questionId === displayedQuestionIds[1]) : null;
  const slot3Question = displayedQuestionIds[2] ? answeredQuestions.find(q => q.questionId === displayedQuestionIds[2]) : null;

  const handleSlotClick = (slotIndex: number, currentQuestion: DeepQuestionAnswer | null | undefined) => {
    if (currentQuestion) {
      onShowSlotActions(slotIndex, currentQuestion);
    } else {
      lightHaptic();
      onSetSelectedSlotIndex(slotIndex);
      onSetShowQuestionSelectionModal(true);
    }
  };

  const renderQuestionSlot = (slotIndex: number, question: DeepQuestionAnswer | null | undefined) => {
    // Inline editing mode
    if (question && inlineEditSlot === slotIndex) {
      return (
        <StyledView key={slotIndex} className="mb-3">
          <Card className="bg-white border-2 border-primary-400">
            <Body className="text-xs font-bold text-primary-600 uppercase mb-2">Question {slotIndex + 1}</Body>
            <Body className="text-neutral-900 font-semibold text-base mb-2">{question.question}</Body>
            <TextInput
              value={inlineEditText}
              onChangeText={onSetInlineEditText}
              multiline
              autoFocus
              style={{
                fontFamily: FONTS.regular, fontSize: FONT_SIZES.base,
                color: COLORS.text.secondary, backgroundColor: COLORS.card,
                borderRadius: 8, padding: 12, minHeight: 80,
                textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border,
              }}
            />
            <StyledView className="flex-row justify-end mt-3" style={{ gap: 8 }}>
              <StyledTouchableOpacity
                onPress={() => onSetInlineEditSlot(null)}
                className="px-4 py-2 rounded-lg bg-neutral-100"
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Body className="text-neutral-600 text-sm font-medium">Cancel</Body>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                onPress={() => onHandleInlineSave(slotIndex, question)}
                disabled={inlineEditSaving || !inlineEditText.trim()}
                className="px-4 py-2 rounded-lg bg-primary-500"
                style={{ opacity: inlineEditSaving || !inlineEditText.trim() ? 0.5 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={inlineEditSaving ? 'Saving answer' : 'Save answer'}
                accessibilityState={{ disabled: inlineEditSaving || !inlineEditText.trim() }}
              >
                <Body className="text-white text-sm font-medium">
                  {inlineEditSaving ? 'Saving...' : 'Save'}
                </Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>
        </StyledView>
      );
    }

    return (
      <StyledTouchableOpacity
        key={slotIndex}
        onPress={() => handleSlotClick(slotIndex, question)}
        activeOpacity={0.7}
        className="mb-3"
        accessibilityRole="button"
        accessibilityLabel={question ? `Question ${slotIndex + 1}: ${question.question}` : `Add question ${slotIndex + 1}`}
      >
        {question ? (
          <Card className="bg-white border border-neutral-200">
            <StyledView className="flex-row items-start justify-between mb-2">
              <Body className="text-xs font-bold text-primary-600 uppercase">Question {slotIndex + 1}</Body>
              <StyledTouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onShowSlotActions(slotIndex, question);
                }}
                className="w-6 h-6 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Question ${slotIndex + 1} options`}
              >
                <EvaIcon name="more-horizontal" variant="outline" size={20} color={COLORS.navInactiveIcon} />
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-900 font-semibold text-base mb-2">{question.question}</Body>
            <Body className="text-neutral-600 text-sm" numberOfLines={2}>{question.answer}</Body>
          </Card>
        ) : (
          <Card className="bg-neutral-50 border-2 border-dashed border-neutral-300">
            <StyledView className="items-center py-6">
              <StyledView className="w-10 h-10 rounded-full items-center justify-center mb-2" style={{ backgroundColor: 'rgba(67, 127, 255, 0.12)' }}>
                <EvaIcon name="plus" variant="outline" size={20} color={COLORS.primaryAccent} />
              </StyledView>
              <Body className="text-neutral-500 font-medium text-sm">Tap to add a question</Body>
            </StyledView>
          </Card>
        )}
      </StyledTouchableOpacity>
    );
  };

  // "Answer More" section
  const answeredIds = answeredQuestions.map(q => q.questionId);
  const unansweredQuestions = getUnansweredQuestions(answeredIds);
  const nonDisplayedAnswers = answeredQuestions.filter(q => !displayedQuestionIds.includes(q.questionId));

  const handleAnswerMoreQuestion = (questionId: number, questionText: string) => {
    onSetSelectedQuestionToAnswer({ id: questionId, question: questionText });
    onSetSelectedSlotIndex(null);
    onSetShowAnswerModal(true);
  };

  const handleSaveMoreAnswer = async (answer: string): Promise<boolean> => {
    if (!selectedQuestionToAnswer || !profile) return false;

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
          onSetProfile(prev => prev ? { ...prev, deepQuestions: updatedQuestions } : prev);
        }
        showToast.success('Answer saved!');
        return true;
      } else {
        Alert.alert('Couldn\'t Save', result.error?.message || 'Something went wrong saving your answer. Give it another try.');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Couldn\'t Save', error.message || 'Something went wrong. Please try again.');
      return false;
    }
  };

  return (
    <>
      <StyledView className="mb-4">
        <H3 className="mb-2">On Your Profile</H3>
        <Body className="text-neutral-600 text-xs mb-4">These 3 questions are what your matches will see</Body>
      </StyledView>

      {renderQuestionSlot(0, slot1Question)}
      {renderQuestionSlot(1, slot2Question)}
      {renderQuestionSlot(2, slot3Question)}

      {/* Answer More accordion */}
      {(unansweredQuestions.length > 0 || nonDisplayedAnswers.length > 0) && (
        <>
          <StyledTouchableOpacity
            onPress={() => {
              lightHaptic();
              onSetAnswerMoreExpanded(!answerMoreExpanded);
            }}
            activeOpacity={0.7}
            className="my-6"
          >
            <StyledView className="flex-row items-center">
              <StyledView className="flex-1 h-px bg-neutral-200" />
              <StyledView className="flex-row items-center mx-3">
                <Body className="text-neutral-400 text-xs uppercase tracking-wide mr-1">Explore More Questions</Body>
                <EvaIcon
                  name={answerMoreExpanded ? 'arrow-ios-upward' : 'arrow-ios-downward'}
                  variant="outline"
                  size={14}
                  color={COLORS.text.tertiary}
                />
              </StyledView>
              <StyledView className="flex-1 h-px bg-neutral-200" />
            </StyledView>
          </StyledTouchableOpacity>

          {answerMoreExpanded && (
            <>
              <StyledView className="mb-4">
                <H3 className="mb-2">Go Deeper</H3>
                <Body className="text-neutral-600 text-xs mb-4">
                  The more you share, the better we can connect you with someone who really fits. These stay behind the scenes.
                </Body>
              </StyledView>

              {unansweredQuestions.length > 0 && (
                <>
                  <Body className="text-neutral-700 font-semibold text-sm mb-3">
                    Ready to Answer ({unansweredQuestions.length})
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

              {nonDisplayedAnswers.length > 0 && (
                <>
                  <Body className="text-neutral-700 font-semibold text-sm mb-3 mt-4">
                    Your Other Answers ({nonDisplayedAnswers.length})
                  </Body>
                  <FlatList
                    data={nonDisplayedAnswers}
                    keyExtractor={(item) => `answered-${item.questionId}`}
                    renderItem={({ item }) => (
                      <AnsweredQuestionCard
                        question={item}
                        onPress={() => {
                          lightHaptic();
                          onSetCurrentEditingQuestion(item);
                          onSetShowEditAnswerModal(true);
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
            </>
          )}
        </>
      )}

      {/* All Questions Answered */}
      {unansweredQuestions.length === 0 && (
        <Card className="bg-green-50 border border-green-200 mt-4">
          <StyledView className="flex-row items-center">
            <EvaIcon name="checkmark-circle-2" variant="outline" size={28} color={COLORS.success} />
            <StyledView className="ml-3 flex-1">
              <Body className="text-green-900 font-bold text-sm">You're all set!</Body>
              <Body className="text-green-700 text-xs">
                You've answered every question -- your matches will be that much better for it.
              </Body>
            </StyledView>
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
          onSave={async (answer: string) => {
            const success = await handleSaveMoreAnswer(answer);
            if (success) {
              onSetShowAnswerModal(false);
              onSetSelectedQuestionToAnswer(null);
            }
          }}
          onClose={() => {
            onSetShowAnswerModal(false);
            onSetSelectedQuestionToAnswer(null);
          }}
        />
      )}
    </>
  );
};
