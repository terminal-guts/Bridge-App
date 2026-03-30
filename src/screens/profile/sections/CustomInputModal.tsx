import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, TextInput, Modal, Keyboard } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { H3, Body } from '../../../components/ui/Typography';
import { lightHaptic } from '../../../utils/haptics';
import { SPRINGS } from '../../../constants/animations';
import { COLORS } from '../../../theme/colors';
import { OVERLAYS } from '../../../theme/shadows';
import { FONTS } from '../../../constants/typography';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(Animated.View);

// Only allow letters, spaces, hyphens, ampersands, and apostrophes
const VALID_INPUT_PATTERN = /^[a-zA-Z\s\-&']+$/;

interface CustomInputModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  maxLength?: number;
  existingItems?: string[];
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export const CustomInputModal: React.FC<CustomInputModalProps> = ({
  visible,
  title,
  subtitle,
  placeholder,
  maxLength = 30,
  existingItems = [],
  onClose,
  onSubmit,
}) => {
  const [inputValue, setInputValue] = useState('');
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withSpring(visible ? 1 : 0, SPRINGS.responsive);
  }, [visible, animValue]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: animValue.value }));
  const modalScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(animValue.value, [0, 1], [0.9, 1]) }],
  }));

  const handleClose = () => {
    Keyboard.dismiss();
    setInputValue('');
    onClose();
  };

  const trimmed = inputValue.trim();
  const isDuplicate = existingItems.some(
    item => item.toLowerCase() === trimmed.toLowerCase()
  );
  const hasInvalidChars = trimmed.length > 0 && !VALID_INPUT_PATTERN.test(trimmed);
  const tooShort = trimmed.length > 0 && trimmed.length < 2;
  const canSubmit = trimmed.length >= 2 && !isDuplicate && !hasInvalidChars;

  // Determine which validation message to show
  const getValidationMessage = (): string | null => {
    if (trimmed.length === 0) return null;
    if (hasInvalidChars) return 'Letters, spaces, and hyphens only.';
    if (tooShort) return 'Must be at least 2 characters.';
    if (isDuplicate) return 'You already have this one.';
    return null;
  };

  const validationMessage = getValidationMessage();

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(trimmed);
      setInputValue('');
      Keyboard.dismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <StyledAnimatedView
        className="flex-1 justify-start items-center px-6 pt-24"
        style={[overlayStyle, { backgroundColor: OVERLAYS.medium }]}
      >
        <StyledTouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          className="absolute inset-0"
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        />

        <StyledAnimatedView
          className="bg-white rounded-2xl w-full max-w-md"
          style={modalScaleStyle}
        >
          {/* Header */}
          <StyledView className="px-6 pt-6 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
            <H3 className="mb-2">{title}</H3>
            <Body style={{ color: COLORS.text.secondary }} className="text-sm">{subtitle}</Body>
          </StyledView>

          {/* Input Field */}
          <StyledView className="px-6 py-5">
            <StyledTextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={placeholder}
              maxLength={maxLength}
              className="rounded-lg px-4 text-base"
              style={{
                minHeight: 48,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: validationMessage ? COLORS.error : COLORS.border,
                color: COLORS.text.primary,
                fontFamily: FONTS.regular,
              }}
              placeholderTextColor={COLORS.text.tertiary}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              accessibilityLabel={placeholder}
            />
            <StyledView className="flex-row justify-between mt-1.5">
              {validationMessage ? (
                <Body className="text-xs" style={{ color: COLORS.error }}>
                  {validationMessage}
                </Body>
              ) : (
                <View />
              )}
              <Body className="text-xs" style={{ color: COLORS.text.tertiary }}>
                {trimmed.length}/{maxLength}
              </Body>
            </StyledView>
          </StyledView>

          {/* Action Buttons */}
          <StyledView className="px-6 pb-6 flex-row gap-3">
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                handleClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              className="flex-1 rounded-lg items-center justify-center"
              style={{ minHeight: 48, backgroundColor: COLORS.card }}
            >
              <Body style={{ color: COLORS.text.secondary, fontFamily: FONTS.semiBold }}>Cancel</Body>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={handleSubmit}
              accessibilityRole="button"
              accessibilityLabel="Add"
              className="flex-1 rounded-lg items-center justify-center"
              style={{
                minHeight: 48,
                backgroundColor: canSubmit ? COLORS.primary : '#E5E7EB',
              }}
              disabled={!canSubmit}
            >
              <Body style={{
                fontFamily: FONTS.semiBold,
                color: canSubmit ? COLORS.card : COLORS.text.tertiary,
              }}>
                Add
              </Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledAnimatedView>
      </StyledAnimatedView>
    </Modal>
  );
};
