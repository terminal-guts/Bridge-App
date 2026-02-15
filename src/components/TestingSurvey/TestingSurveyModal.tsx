import React, { useState } from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Button } from '../ui';
import { TESTING_SURVEY_CONFIG } from '../../config/features';
import { Ionicons } from '@expo/vector-icons';
import { successHaptic, mediumHaptic } from '../../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('TestingSurveyModal');

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(Animated.View);
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);

interface TestingSurveyModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface SurveyAnswers {
  [key: string]: any;
}

export const TestingSurveyModal: React.FC<TestingSurveyModalProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [showThankYou, setShowThankYou] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const { questions, ui } = TESTING_SURVEY_CONFIG;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion.id];
  const canProceed = currentQuestion.optional || currentAnswer !== undefined;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleAnswer = async (value: any) => {
    await mediumHaptic();
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = async () => {
    await mediumHaptic();

    if (isLastQuestion) {
      // Submit survey
      await handleSubmit();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = async () => {
    await mediumHaptic();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    await successHaptic();

    // Save survey completion status
    await AsyncStorage.setItem(TESTING_SURVEY_CONFIG.storageKey, 'true');

    // TODO: Send survey responses to backend
    logger.info('Survey responses:', answers);

    // Show thank you message
    setShowThankYou(true);

    // Close after delay
    setTimeout(() => {
      onComplete();
      // Reset for next time
      setShowThankYou(false);
      setCurrentQuestionIndex(0);
      setAnswers({});
    }, 2000);
  };

  const handleSkip = async () => {
    await mediumHaptic();
    // Mark as completed so it doesn't show again
    await AsyncStorage.setItem(TESTING_SURVEY_CONFIG.storageKey, 'skipped');
    onSkip();
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'rating':
        return (
          <RatingQuestion
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
        );
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
        );
      case 'text':
        return (
          <TextQuestion
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
        );
      default:
        return null;
    }
  };

  if (!visible) return null;

  if (showThankYou) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <StyledView className="flex-1 bg-black/50 items-center justify-center p-6">
          <StyledAnimatedView
            style={{ opacity: fadeAnim }}
            className="bg-white rounded-3xl p-8 w-full max-w-md items-center"
          >
            <StyledView className="w-20 h-20 bg-success/20 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#12B981" />
            </StyledView>
            <H2 className="mb-2 text-center">{ui.thankYouTitle}</H2>
            <Body className="text-neutral-600 text-center">{ui.thankYouMessage}</Body>
          </StyledAnimatedView>
        </StyledView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <StyledKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-neutral-50"
      >
        {/* Header */}
        <StyledView className="bg-white border-b border-neutral-200 pt-12 pb-4 px-6">
          <StyledView className="flex-row items-center justify-between mb-4">
            <StyledTouchableOpacity onPress={handleSkip} className="py-2">
              <Body className="text-neutral-600">{ui.skipButtonText}</Body>
            </StyledTouchableOpacity>
            <Body className="text-neutral-500">
              {currentQuestionIndex + 1} / {questions.length}
            </Body>
          </StyledView>

          <H1 className="text-xl mb-1">{ui.title}</H1>
          <Body className="text-neutral-600 text-sm mb-4">{ui.subtitle}</Body>

          {/* Progress Bar */}
          <StyledView className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <Animated.View
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#437FFF',
              }}
            />
          </StyledView>
        </StyledView>

        <StyledScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
          <StyledAnimatedView style={{ opacity: fadeAnim }}>
            {renderQuestion()}
          </StyledAnimatedView>
        </StyledScrollView>

        {/* Footer */}
        <StyledView className="bg-white border-t border-neutral-200 p-6 pb-8">
          <StyledView className="flex-row space-x-3">
            {currentQuestionIndex > 0 && (
              <StyledView className="flex-1">
                <Button onPress={handleBack} variant="secondary" fullWidth>
                  Back
                </Button>
              </StyledView>
            )}
            <StyledView className="flex-1">
              <Button
                onPress={handleNext}
                variant="primary"
                fullWidth
                disabled={!canProceed}
              >
                {isLastQuestion ? ui.submitButtonText : 'Next'}
              </Button>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledKeyboardAvoidingView>
    </Modal>
  );
};

// Rating Question Component
const RatingQuestion: React.FC<{
  question: any;
  value: number;
  onChange: (value: number) => void;
}> = ({ question, value, onChange }) => {
  const { question: text, subtitle, min, max, labels } = question;
  const scale = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <StyledView>
      <H2 className="mb-2">{text}</H2>
      {subtitle && <Body className="text-neutral-600 mb-6">{subtitle}</Body>}

      <StyledView className="flex-row justify-between items-center mb-2">
        {labels && (
          <>
            <Body className="text-neutral-500 text-xs">{labels[0]}</Body>
            <Body className="text-neutral-500 text-xs">{labels[1]}</Body>
          </>
        )}
      </StyledView>

      <StyledView className="flex-row flex-wrap -mx-1">
        {scale.map(num => (
          <StyledTouchableOpacity
            key={num}
            onPress={() => onChange(num)}
            className="px-1 mb-2"
            style={{ width: `${100 / scale.length}%` }}
          >
            <StyledView
              className={`py-3 rounded-lg border-2 items-center ${
                value === num
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
              }`}
            >
              <Body
                className={`font-semibold ${
                  value === num ? 'text-white' : 'text-neutral-700'
                }`}
              >
                {num}
              </Body>
            </StyledView>
          </StyledTouchableOpacity>
        ))}
      </StyledView>
    </StyledView>
  );
};

// Multiple Choice Question Component
const MultipleChoiceQuestion: React.FC<{
  question: any;
  value: string;
  onChange: (value: string) => void;
}> = ({ question, value, onChange }) => {
  const { question: text, options } = question;

  return (
    <StyledView>
      <H2 className="mb-6">{text}</H2>

      <StyledView className="space-y-3">
        {options.map((option: string, index: number) => (
          <StyledTouchableOpacity
            key={index}
            onPress={() => onChange(option)}
            className={`p-4 rounded-xl border-2 ${
              value === option
                ? 'bg-primary-50 border-primary-500'
                : 'bg-white border-neutral-200'
            }`}
          >
            <StyledView className="flex-row items-center">
              <StyledView
                className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  value === option ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                }`}
              >
                {value === option && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </StyledView>
              <Body
                className={`flex-1 ${value === option ? 'text-primary-700' : 'text-neutral-700'}`}
              >
                {option}
              </Body>
            </StyledView>
          </StyledTouchableOpacity>
        ))}
      </StyledView>
    </StyledView>
  );
};

// Text Question Component
const TextQuestion: React.FC<{
  question: any;
  value: string;
  onChange: (value: string) => void;
}> = ({ question, value, onChange }) => {
  const { question: text, placeholder, multiline } = question;

  return (
    <StyledView>
      <H2 className="mb-6">{text}</H2>

      <StyledTextInput
        value={value || ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        className={`bg-white border-2 border-neutral-200 rounded-xl px-4 ${
          multiline ? 'py-3 min-h-32' : 'py-3'
        } text-neutral-900`}
        style={{
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </StyledView>
  );
};
