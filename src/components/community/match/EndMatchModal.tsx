/**
 * EndMatchModal Component
 *
 * Shows when user wants to end an active match (after 3-day minimum).
 * Requires user to select a reason for ending the match.
 *
 * Features:
 * - Radio button group for predefined reasons
 * - "Other" reveals an in-place text input view (canonical "Other" pattern —
 *   see CLAUDE.md "Other" Free-Text Input Pattern; reference: ProfileMatchScreen)
 * - Warm, empathetic tone (not punitive)
 * - Cannot submit without selecting a reason
 *
 * Design: Warm, supportive messaging with soft pink/neutral colors
 */

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { styled } from 'nativewind';
import { lightHaptic, mediumHaptic } from '../../../utils/haptics';
import { SHADOWS, OVERLAYS } from '../../../theme/shadows';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
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
  // In-place transition: when true, the reason list is hidden and the free-text
  // input + Back/Submit buttons replace it (canonical "Other" pattern).
  const [showOtherInput, setShowOtherInput] = useState(false);
  const { height: windowHeight } = useWindowDimensions();

  const resetAll = () => {
    setSelectedReason(null);
    setOtherReasonText('');
    setValidationError(null);
    setShowOtherInput(false);
  };

  const handleReasonSelect = (reasonId: string) => {
    lightHaptic();
    setValidationError(null);

    if (reasonId === 'other') {
      setSelectedReason('other');
      setShowOtherInput(true);
      return;
    }

    setSelectedReason(reasonId);
    // Clear any prior Other text when switching back to a predefined reason
    setOtherReasonText('');
  };

  const handleCancel = () => {
    lightHaptic();
    resetAll();
    onClose();
  };

  const handleOtherBack = () => {
    // Return to the reason list so the user can pick a different option.
    setShowOtherInput(false);
    setSelectedReason(null);
    setOtherReasonText('');
    setValidationError(null);
  };

  const handleSubmit = () => {
    // Validation
    if (showOtherInput) {
      if (otherReasonText.trim().length === 0) {
        setValidationError('Please tell us more');
        mediumHaptic();
        return;
      }
      mediumHaptic();
      const reasonText = `Other: ${otherReasonText.trim()}`;
      resetAll();
      onSubmit(reasonText);
      return;
    }

    if (!selectedReason) {
      setValidationError('Please select a reason');
      mediumHaptic();
      return;
    }

    const reason = PREDEFINED_REASONS.find((r) => r.id === selectedReason);
    const reasonText = reason?.label || selectedReason;

    mediumHaptic();
    resetAll();
    onSubmit(reasonText);
  };

  const canSubmitOther = otherReasonText.trim().length > 0;

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
        <StyledView className="flex-1 justify-center items-center px-6" style={{ backgroundColor: OVERLAYS.medium }}>
          <StyledView
            className="bg-white rounded-3xl w-full max-w-md"
            style={{
              ...SHADOWS.xxl,
              elevation: 10,
            }}
          >
            <StyledScrollView
              style={{ maxHeight: windowHeight * 0.8 }}
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <StyledView className="items-center mb-6">
                <EvaIcon name="close-circle" variant="outline" size={32} color={COLORS.error} style={{ marginBottom: 12 }} />
                <StyledText
                  className="text-2xl font-bold text-center mb-2"
                  style={{ color: COLORS.text.secondary }}
                >
                  {showOtherInput ? 'Tell us what happened' : 'End This Match?'}
                </StyledText>
                <StyledView className="h-1 w-16 rounded-full mb-4" style={{ backgroundColor: COLORS.border }} />
                <StyledText
                  className="text-base text-center"
                  style={{ color: COLORS.text.secondary, lineHeight: 22 }}
                >
                  {showOtherInput
                    ? 'A quick note helps us understand what happened.'
                    : "We're sorry it didn't work out.\nHelp us learn — why are you ending?"}
                </StyledText>
              </StyledView>

              {showOtherInput ? (
                /* In-place "Other" text input view */
                <>
                  <StyledView className="mb-2">
                    <StyledTextInput
                      placeholder="Please describe..."
                      value={otherReasonText}
                      onChangeText={(t) => setOtherReasonText(t.slice(0, 300))}
                      multiline
                      autoFocus
                      className="rounded-xl p-3 text-base"
                      style={{
                        backgroundColor: COLORS.screenBackground,
                        borderWidth: 1.5,
                        borderColor: COLORS.border,
                        color: COLORS.text.primary,
                        textAlignVertical: 'top',
                        minHeight: 100,
                        maxHeight: 140,
                        fontFamily: FONTS.regular,
                      }}
                      placeholderTextColor={COLORS.text.tertiary}
                      maxLength={300}
                      accessibilityLabel="Describe why you're ending the match"
                    />
                    <StyledText
                      style={{
                        fontFamily: FONTS.regular,
                        fontSize: FONT_SIZES.sm,
                        color: COLORS.text.tertiary,
                        textAlign: 'right',
                        marginTop: 4,
                      }}
                    >
                      {otherReasonText.length}/300
                    </StyledText>
                  </StyledView>

                  {validationError && (
                    <StyledView className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                      <StyledText className="text-sm text-center" style={{ color: COLORS.error }}>
                        {validationError}
                      </StyledText>
                    </StyledView>
                  )}

                  <StyledView className="flex-row" style={{ gap: 12, marginTop: 8 }}>
                    <StyledTouchable
                      onPress={handleOtherBack}
                      className="flex-1 py-4 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: COLORS.card,
                        borderWidth: 1.5,
                        borderColor: COLORS.border,
                        minHeight: 48,
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Back to reasons"
                    >
                      <StyledText className="text-base font-semibold" style={{ color: COLORS.text.secondary, fontFamily: FONTS.semiBold }}>
                        Back
                      </StyledText>
                    </StyledTouchable>
                    <StyledTouchable
                      onPress={handleSubmit}
                      disabled={!canSubmitOther}
                      className="flex-1 py-4 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: COLORS.error,
                        opacity: canSubmitOther ? 1 : 0.4,
                        ...SHADOWS.accentRed,
                        elevation: 6,
                        minHeight: 48,
                      }}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="End match"
                      accessibilityState={{ disabled: !canSubmitOther }}
                    >
                      <StyledText className="text-base font-bold text-white" style={{ fontFamily: FONTS.semiBold }}>
                        End Match
                      </StyledText>
                    </StyledTouchable>
                  </StyledView>
                </>
              ) : (
                /* Reasons List */
                <>
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
                              selectedReason === reason.id ? '#FFB8B8' : COLORS.border,
                            minHeight: 48,
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
                              color: selectedReason === reason.id ? '#8B4545' : COLORS.text.secondary,
                              fontFamily: selectedReason === reason.id ? FONTS.semiBold : FONTS.regular,
                            }}
                          >
                            {reason.label}
                          </StyledText>
                        </StyledTouchable>
                      </StyledView>
                    ))}
                  </StyledView>

                  {/* Validation Error */}
                  {validationError && (
                    <StyledView className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                      <StyledText className="text-sm text-center" style={{ color: COLORS.error }}>
                        {validationError}
                      </StyledText>
                    </StyledView>
                  )}

                  {/* Buttons */}
                  <StyledView className="flex-row" style={{ gap: 12 }}>
                    <StyledTouchable
                      onPress={handleCancel}
                      className="flex-1 py-4 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: COLORS.card,
                        borderWidth: 2,
                        borderColor: COLORS.border,
                        minHeight: 48,
                      }}
                      activeOpacity={0.7}
                    >
                      <StyledText className="text-base font-semibold" style={{ color: COLORS.text.secondary, fontFamily: FONTS.semiBold }}>
                        Cancel
                      </StyledText>
                    </StyledTouchable>

                    <StyledTouchable
                      onPress={handleSubmit}
                      className="flex-1 py-4 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: '#DC2626',
                        ...SHADOWS.accentRed,
                        elevation: 6,
                        minHeight: 48,
                      }}
                      activeOpacity={0.85}
                    >
                      <StyledText className="text-base font-bold text-white" style={{ fontFamily: FONTS.semiBold }}>
                        End Match
                      </StyledText>
                    </StyledTouchable>
                  </StyledView>
                </>
              )}
            </StyledScrollView>
          </StyledView>
        </StyledView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default EndMatchModal;
