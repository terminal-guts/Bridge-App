/**
 * ProfileScreen Modals
 *
 * All modal and overlay UI extracted from ProfileScreen:
 * - Edit Answer Modal
 * - Question Selection Modal
 * - Change Question Modal
 * - Answer Modal (for displayed slots)
 * - Photo Carousel
 * - Karma Info Modal
 * - Confetti celebration
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal, StyleSheet as RNStyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { styled } from 'nativewind';
import { COLORS } from '../../theme/colors';
import { H2, Body, Card } from '../../components/ui';
import { UserProfile, DeepQuestionAnswer } from '../../types';
import { EvaIcon } from '../../components/icons';
import { AnswerQuestionModal } from '../../components/profile/AnswerQuestionModal';
import { PhotoCarousel } from '../../components/profile/PhotoCarousel';
import { KarmaInfoModal } from '../../components/community/karma/KarmaInfoModal';
import { DEEP_QUESTIONS, getUnansweredQuestions } from '../../utils/deepQuestions';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';

const CONFETTI_ANIM = require('../../../assets/Icons/AnimatedIcons/confetti.json');

const StyledView = styled(View) as typeof View;
const StyledScrollView = styled(ScrollView) as typeof ScrollView;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;

interface ProfileModalsProps {
  profile: UserProfile | null;

  // Edit answer modal
  showEditAnswerModal: boolean;
  selectedQuestionForEdit: DeepQuestionAnswer | null;
  currentEditingQuestion: DeepQuestionAnswer | null;
  onSaveEditedAnswer: (answer: string) => Promise<boolean>;
  onCloseEditAnswerModal: () => void;
  onChangeQuestion?: () => void;

  // Question selection modal
  showQuestionSelectionModal: boolean;
  onCloseQuestionSelectionModal: () => void;
  onQuestionSelected: (questionId: number, questionText: string) => void;
  onChangeToAnsweredQuestion: (questionId: number) => void;

  // Answer modal (for displayed slots)
  showAnswerModal: boolean;
  selectedQuestionToAnswer: { id: number; question: string } | null;
  selectedSlotIndex: number | null;
  onSaveNewAnswer: (answer: string) => Promise<boolean>;
  onCloseAnswerModal: () => void;

  // Change question modal
  showChangeQuestionModal: boolean;
  onCloseChangeQuestionModal: () => void;
  onChangeToAnsweredQuestionFromModal: (questionId: number) => void;

  // Photo carousel
  showPhotoCarousel: boolean;
  photoCarouselIndex: number;
  onClosePhotoCarousel: () => void;

  // Karma info modal
  showKarmaInfoModal: boolean;
  onCloseKarmaInfoModal: () => void;

  // Confetti celebration
  celebrationActive: boolean;
  confettiRef: React.RefObject<LottieView | null>;
}

export const ProfileModals: React.FC<ProfileModalsProps> = ({
  profile,
  showEditAnswerModal,
  selectedQuestionForEdit,
  currentEditingQuestion,
  onSaveEditedAnswer,
  onCloseEditAnswerModal,
  onChangeQuestion,
  showQuestionSelectionModal,
  onCloseQuestionSelectionModal,
  onQuestionSelected,
  onChangeToAnsweredQuestion,
  showAnswerModal,
  selectedQuestionToAnswer,
  selectedSlotIndex,
  onSaveNewAnswer,
  onCloseAnswerModal,
  showChangeQuestionModal,
  onCloseChangeQuestionModal,
  onChangeToAnsweredQuestionFromModal,
  showPhotoCarousel,
  photoCarouselIndex,
  onClosePhotoCarousel,
  showKarmaInfoModal,
  onCloseKarmaInfoModal,
  celebrationActive,
  confettiRef,
}) => (
  <>
    {/* Edit Answer Modal */}
    <AnswerQuestionModal
      visible={showEditAnswerModal}
      question={selectedQuestionForEdit?.question || currentEditingQuestion?.question || ''}
      tier={(selectedQuestionForEdit?.tier || currentEditingQuestion?.tier || 1) as 1 | 2 | 3}
      initialAnswer={selectedQuestionForEdit?.answer || currentEditingQuestion?.answer || ''}
      onSave={async (answer) => {
        const success = await onSaveEditedAnswer(answer);
        if (success) {
          onCloseEditAnswerModal();
        }
      }}
      onClose={onCloseEditAnswerModal}
      onChangeQuestion={currentEditingQuestion ? onChangeQuestion : undefined}
    />

    {/* Question Selection Modal */}
    <QuestionSelectionModal
      visible={showQuestionSelectionModal}
      profile={profile}
      onClose={onCloseQuestionSelectionModal}
      onQuestionSelected={onQuestionSelected}
      onChangeToAnsweredQuestion={onChangeToAnsweredQuestion}
    />

    {/* Answer Modal (for displayed slots) */}
    {selectedQuestionToAnswer && selectedSlotIndex !== null && (
      <AnswerQuestionModal
        visible={showAnswerModal}
        question={selectedQuestionToAnswer.question}
        tier={1 as 1 | 2 | 3}
        initialAnswer=""
        onSave={async (answer) => {
          const success = await onSaveNewAnswer(answer);
          if (success) {
            onCloseAnswerModal();
          }
        }}
        onClose={onCloseAnswerModal}
      />
    )}

    {/* Change Question Modal */}
    <ChangeQuestionModal
      visible={showChangeQuestionModal}
      profile={profile}
      onClose={onCloseChangeQuestionModal}
      onChangeToAnsweredQuestion={onChangeToAnsweredQuestionFromModal}
      onQuestionSelected={onQuestionSelected}
    />

    {/* Photo Carousel */}
    {profile?.photos && profile.photos.length > 0 && (
      <PhotoCarousel
        photos={profile.photos}
        initialIndex={photoCarouselIndex}
        visible={showPhotoCarousel}
        onClose={onClosePhotoCarousel}
      />
    )}

    <KarmaInfoModal visible={showKarmaInfoModal} onClose={onCloseKarmaInfoModal} />

    {/* Profile complete confetti celebration */}
    {celebrationActive && (
      <View style={RNStyleSheet.absoluteFill} pointerEvents="none">
        <LottieView
          ref={confettiRef}
          source={CONFETTI_ANIM}
          autoPlay
          loop={false}
          style={{ flex: 1 }}
          speed={1}
        />
      </View>
    )}
  </>
);

// ─── Question Selection Modal ────────────────────────────────────────

interface QuestionSelectionModalProps {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onQuestionSelected: (questionId: number, questionText: string) => void;
  onChangeToAnsweredQuestion: (questionId: number) => void;
}

const QuestionSelectionModal: React.FC<QuestionSelectionModalProps> = ({
  visible,
  profile,
  onClose,
  onQuestionSelected,
  onChangeToAnsweredQuestion,
}) => {
  const answeredIds = profile?.deepQuestions?.map(q => q.questionId) || [];
  const displayedIds = profile?.displayedQuestions || [];
  const unanswered = getUnansweredQuestions(answeredIds);
  const answeredNotDisplayed = (profile?.deepQuestions || [])
    .filter(q => !displayedIds.includes(q.questionId));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center justify-between">
        <H2 className="text-lg">Pick a Question</H2>
        <StyledTouchableOpacity
          onPress={() => { lightHaptic(); onClose(); }}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <EvaIcon name="close" variant="outline" size={28} color={COLORS.textDarkHeading} />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-4 py-4">
        <Body className="text-neutral-600 text-sm mb-4">
          Choose from 21 questions. You can answer as many as you want, but only 3 will display on your profile.
        </Body>

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
                    onClose();
                    onChangeToAnsweredQuestion(q.questionId);
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
            onPress={() => { mediumHaptic(); onQuestionSelected(q.id, q.question); }}
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
              <EvaIcon name="checkmark-circle-2" variant="outline" size={48} color={COLORS.primaryAccent} />
              <Body className="text-blue-900 font-bold text-lg mt-3 mb-2">All Questions Answered!</Body>
              <Body className="text-blue-700 text-sm text-center">
                You've answered all 21 questions. You can edit your answers anytime.
              </Body>
            </StyledView>
          </Card>
        )}
      </StyledScrollView>
    </Modal>
  );
};

// ─── Change Question Modal ───────────────────────────────────────────

interface ChangeQuestionModalProps {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onChangeToAnsweredQuestion: (questionId: number) => void;
  onQuestionSelected: (questionId: number, questionText: string) => void;
}

const ChangeQuestionModal: React.FC<ChangeQuestionModalProps> = ({
  visible,
  profile,
  onClose,
  onChangeToAnsweredQuestion,
  onQuestionSelected,
}) => {
  const answeredQuestions = profile?.deepQuestions || [];
  const displayedIds = profile?.displayedQuestions || [];
  const answeredIds = answeredQuestions.map(q => q.questionId);
  const unansweredForChange = getUnansweredQuestions(answeredIds);
  const availableQuestions = answeredQuestions.filter(q => !displayedIds.includes(q.questionId));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center justify-between">
        <H2 className="text-lg">Switch Question</H2>
        <StyledTouchableOpacity
          onPress={() => { lightHaptic(); onClose(); }}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <EvaIcon name="close" variant="outline" size={28} color={COLORS.textDarkHeading} />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-4 py-4">
        <Body className="text-neutral-600 text-sm mb-4">
          Pick a different question to display in this slot.
        </Body>

        {availableQuestions.length > 0 && (
          <>
            <Body className="text-neutral-700 font-semibold text-sm mb-3">
              Already Answered ({availableQuestions.length})
            </Body>
            {availableQuestions.map((q) => (
              <StyledTouchableOpacity
                key={q.questionId}
                onPress={() => { mediumHaptic(); onChangeToAnsweredQuestion(q.questionId); }}
                activeOpacity={0.7}
                className="mb-3"
              >
                <Card className="bg-white border border-neutral-200">
                  <Body className="text-neutral-900 font-semibold text-base mb-2">{q.question}</Body>
                  <Body className="text-neutral-600 text-sm" numberOfLines={2}>{q.answer}</Body>
                </Card>
              </StyledTouchableOpacity>
            ))}
          </>
        )}

        {unansweredForChange.length > 0 && (
          <>
            <Body className="text-neutral-700 font-semibold text-sm mb-3 mt-2">
              Unanswered ({unansweredForChange.length})
            </Body>
            {unansweredForChange.map((q) => (
              <StyledTouchableOpacity
                key={q.id}
                onPress={() => {
                  mediumHaptic();
                  onClose();
                  onQuestionSelected(q.id, q.question);
                }}
                activeOpacity={0.7}
                className="mb-3"
              >
                <Card className="bg-white border border-dashed border-neutral-300">
                  <Body className="text-neutral-900 font-medium text-base leading-6">{q.question}</Body>
                </Card>
              </StyledTouchableOpacity>
            ))}
          </>
        )}

        {availableQuestions.length === 0 && unansweredForChange.length === 0 && (
          <Card className="bg-blue-50 border border-blue-200">
            <StyledView className="items-center py-8">
              <EvaIcon name="info" variant="outline" size={48} color={COLORS.primaryAccent} />
              <Body className="text-blue-900 font-bold text-lg mt-3 mb-2">No Other Questions</Body>
              <Body className="text-blue-700 text-sm text-center">
                All your answered questions are already displayed. Answer more questions to have more options!
              </Body>
            </StyledView>
          </Card>
        )}
      </StyledScrollView>
    </Modal>
  );
};
