import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { styled } from 'nativewind';
import { Body, H3 } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';

interface AnswerQuestionModalProps {
  visible: boolean;
  question: string;
  tier: 1 | 2 | 3;
  initialAnswer?: string;
  onSave: (answer: string) => void;
  onClose: () => void;
  onChangeQuestion?: () => void; // Optional: For editing existing answers
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledScrollView = styled(ScrollView);
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);

export const AnswerQuestionModal: React.FC<AnswerQuestionModalProps> = ({
  visible,
  question,
  tier,
  initialAnswer = '',
  onSave,
  onClose,
  onChangeQuestion,
}) => {
  const [answer, setAnswer] = useState(initialAnswer);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnswer(initialAnswer);
      setHasChanges(false);
    }
  }, [visible, initialAnswer]);

  useEffect(() => {
    setHasChanges(answer !== initialAnswer);
  }, [answer, initialAnswer]);

  const handleClose = () => {
    if (hasChanges && answer.trim().length > 0) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              lightHaptic();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (!answer.trim()) {
      Alert.alert('Empty Answer', 'Please write an answer before saving');
      return;
    }

    successHaptic();
    onSave(answer.trim());
    // Note: Don't call onClose() here - let the parent component decide when to close
    // based on whether the save operation succeeded or failed
  };

  const tierColors = {
    1: { bg: '#EFF6FF', accent: '#3B82F6' },
    2: { bg: '#EEF2FF', accent: '#6366F1' },
    3: { bg: '#FAF5FF', accent: '#A855F7' },
  };

  const colors = tierColors[tier];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <StyledKeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <StyledView className="px-4 py-4 border-b border-neutral-200">
          <StyledView className="flex-row items-center justify-between">
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                handleClose();
              }}
              className="py-2"
            >
              <Body className="text-neutral-600 text-base">Cancel</Body>
            </StyledTouchableOpacity>

            <H3 className="text-neutral-900 font-bold">Write answer</H3>

            <StyledTouchableOpacity
              onPress={() => {
                mediumHaptic();
                handleSave();
              }}
              className="py-2"
            >
              <Body className="text-primary-600 text-base font-bold">Done</Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        <StyledScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question Display */}
          <StyledView
            className="mb-4 p-4 rounded-xl bg-blue-50"
          >
            <StyledView className="flex-row items-start justify-between">
              <StyledView className="flex-1 pr-2">
                <Body className="text-neutral-900 font-semibold text-base leading-6">
                  {question}
                </Body>
              </StyledView>
              {onChangeQuestion && (
                <StyledTouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    onChangeQuestion();
                  }}
                  className="w-8 h-8 items-center justify-center bg-white rounded-full"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#437FFF" />
                </StyledTouchableOpacity>
              )}
            </StyledView>
          </StyledView>

          {/* Text Input with Character Count Overlay */}
          <StyledView className="relative">
            <StyledTextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder="Share your authentic thoughts..."
              placeholderTextColor="#98A2B3"
              multiline
              maxLength={500}
              className="text-neutral-900 text-base leading-6 p-4 pb-10 bg-neutral-50 rounded-xl border border-neutral-200"
              style={{ textAlignVertical: 'top', height: 200 }}
              autoFocus
            />
            {/* Character Count - Bottom Right of Text Box */}
            <StyledView className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 rounded-full">
              <Body
                className="text-xs font-semibold"
                style={{ color: answer.length === 0 ? '#EF4444' : '#98A2B3' }}
              >
                {answer.length}/500
              </Body>
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </StyledKeyboardAvoidingView>
    </Modal>
  );
};
