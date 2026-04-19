/**
 * EndMatchModal Component
 *
 * Shows when user wants to end an active match (after 3-day minimum).
 * Requires user to select a reason for ending the match.
 *
 * Features:
 * - Radio button group for predefined reasons
 * - Optional "Other" text field with validation
 * - Warm, empathetic tone (not punitive)
 * - Cannot submit without selecting a reason
 *
 * Design: Warm, supportive messaging with soft pink/neutral colors
 */

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { styled } from 'nativewind';
import { lightHaptic, mediumHaptic } from '../../../utils/haptics';
import { SHADOWS, OVERLAYS } from '../../../theme/shadows';
import { FONTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { EvaIcon } from '../../icons';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchable = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledScrollView = styled(ScrollView);

interface EndMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const PREDEFINED_REASONS = [
  { id: 'no_connection', label: 'Not feeling a connection' },
  { id: 'different_goals', label: 'Different life goals' },
  { id: 'communication', label: 'Communication issues' },
  { id: 'other', label: 'Other' },
];

export function EndMatchModal({ visible, onClose, onSubmit }: EndMatchModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReasonText, setOtherReasonText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleReasonSelect = (reasonId: string) => {
    lightHaptic();
    setSelectedReason(reasonId);
    setValidationError(null);

    // Clear "other" text if switching away from "other"
    if (reasonId !== 'other') {
      setOtherReasonText('');
    }
  };

  const handleCancel = () => {
    lightHaptic();
    // Reset state
    setSelectedReason(null);
    setOtherReasonText('');
    setValidationError(null);
    onClose();
  };

  const handleSubmit = () => {
    // Validation
    if (!selectedReason) {
      setValidationError('Please select a reason');
      mediumHaptic();
      return;
    }

    if (selectedReason === 'other' && otherReasonText.trim().length === 0) {
      setValidationError('Please tell us more');
      mediumHaptic();
      return;
    }

    // Get the reason text
    let reasonText = '';
    if (selectedReason === 'other') {
      reasonText = otherReasonText.trim();
    } else {
      const reason = PREDEFINED_REASONS.find((r) => r.id === selectedReason);
      reasonText = reason?.label || selectedReason;
    }

    mediumHaptic();

    // Reset state
    setSelectedReason(null);
    setOtherReasonText('');
    setValidationError(null);

    onSubmit(reasonText);
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <StyledView className="flex-1 bg-black/50 justify-center items-center px-6">
          <StyledView
            className="bg-white rounded-3xl w-full max-w-md"
            style={{
              ...SHADOWS.xxl,
              elevation: 10,
            }}
          >
            <StyledScrollView
              className="max-h-96"
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <StyledView className="items-center mb-6">
                <EvaIcon name="close-circle" variant="outline" size={32} color="#EF4444" style={{ marginBottom: 12 }} />
                <StyledText
                  className="text-2xl font-bold text-center mb-2"
                  style={{ color: COLORS.text.secondary }}
                >
                  End This Match?
                </StyledText>
                <StyledView className="h-1 w-16 bg-neutral-200 rounded-full mb-4" />
                <StyledText
                  className="text-base text-center"
                  style={{ color: COLORS.text.secondary, lineHeight: 22 }}
                >
                  We're sorry it didn't work out.{'\n'}
                  Help us learn — why are you ending?
                </StyledText>
              </StyledView>

              {/* Reasons List */}
              <StyledView className="mb-4">
                {PREDEFINED_REASONS.map((reason) => (
                  <StyledView key={reason.id} className="mb-3">
                    <StyledTouchable
                      onPress={() => handleReasonSelect(reason.id)}
                      className="flex-row items-center py-3 px-4 rounded-2xl"
                      style={{
                        backgroundColor:
                          selectedReason === reason.id ? '#FFF0F0' : COLORS.card,
                        borderWidth: 2,
                        borderColor:
                          selectedReason === reason.id ? '#FFB8B8' : '#E5E7EB',
                      }}
                      activeOpacity={0.7}
                    >
                      {/* Radio button */}
                      <StyledView
                        className="w-6 h-6 rounded-full items-center justify-center mr-3"
                        style={{
                          borderWidth: 2,
                          borderColor:
                            selectedReason === reason.id ? '#FF6B6B' : COLORS.border,
                          backgroundColor:
                            selectedReason === reason.id ? '#FF6B6B' : COLORS.card,
                        }}
                      >
                        {selectedReason === reason.id && (
                          <EvaIcon name="checkmark" variant="outline" size={16} color="#FFFFFF" />
                        )}
                      </StyledView>

                      {/* Label */}
                      <StyledText
                        className="text-base flex-1"
                        style={{
                          color: selectedReason === reason.id ? '#8B4545' : '#4B5563',
                          fontWeight: selectedReason === reason.id ? '600' : '400',
                          fontFamily: selectedReason === reason.id ? FONTS.semiBold : FONTS.regular,
                        }}
                      >
                        {reason.label}
                      </StyledText>
                    </StyledTouchable>

                    {/* "Other" text field */}
                    {reason.id === 'other' && selectedReason === 'other' && (
                      <StyledView className="mt-2 ml-10">
                        <StyledTextInput
                          placeholder="Please tell us more..."
                          value={otherReasonText}
                          onChangeText={setOtherReasonText}
                          multiline
                          numberOfLines={3}
                          className="rounded-xl p-3 text-base"
                          style={{
                            backgroundColor: COLORS.card,
                            borderWidth: 2,
                            borderColor: '#E5E7EB',
                            color: '#1F2937',
                            textAlignVertical: 'top',
                            minHeight: 80,
                          }}
                          placeholderTextColor={COLORS.text.tertiary}
                          maxLength={200}
                        />
                      </StyledView>
                    )}
                  </StyledView>
                ))}
              </StyledView>

              {/* Validation Error */}
              {validationError && (
                <StyledView className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <StyledText className="text-sm text-red-600 text-center">
                    {validationError}
                  </StyledText>
                </StyledView>
              )}

              {/* Buttons */}
              <StyledView className="flex-row space-x-3">
                {/* Cancel Button */}
                <StyledTouchable
                  onPress={handleCancel}
                  className="flex-1 py-4 rounded-2xl items-center justify-center mr-2"
                  style={{
                    backgroundColor: COLORS.card,
                    borderWidth: 2,
                    borderColor: '#E5E7EB',
                  }}
                  activeOpacity={0.7}
                >
                  <StyledText className="text-base font-semibold" style={{ color: COLORS.text.secondary }}>
                    Cancel
                  </StyledText>
                </StyledTouchable>

                {/* End Match Button */}
                <StyledTouchable
                  onPress={handleSubmit}
                  className="flex-1 py-4 rounded-2xl items-center justify-center ml-2"
                  style={{
                    backgroundColor: '#DC2626',
                    ...SHADOWS.accentRed,
                    elevation: 6,
                  }}
                  activeOpacity={0.85}
                >
                  <StyledText className="text-base font-bold text-white">
                    End Match
                  </StyledText>
                </StyledTouchable>
              </StyledView>
            </StyledScrollView>
          </StyledView>
        </StyledView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default EndMatchModal;
