/**
 * CustomInputModal - Reusable modal for custom text input
 * Extracted from ProfileEditScreen to reduce code duplication
 */

import React, { useRef, useEffect } from 'react';
import { View, Modal, TouchableOpacity, TextInput, Animated, Keyboard } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body } from './ui';
import { lightHaptic, mediumHaptic } from '../utils/haptics';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(Animated.View);

interface CustomInputModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export const CustomInputModal: React.FC<CustomInputModalProps> = ({
  visible,
  title,
  subtitle,
  placeholder,
  value,
  onChangeText,
  onSubmit,
  onClose,
}) => {
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(modalAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      mediumHaptic();
      onChangeText('');
      onClose();
      Keyboard.dismiss();
    }
  };

  const handleCancel = () => {
    lightHaptic();
    onChangeText('');
    onClose();
    Keyboard.dismiss();
  };

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onChangeText('');
    onClose();
  };

  const hasValue = value.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <StyledAnimatedView
        className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
        style={{ opacity: modalAnim }}
      >
        <StyledTouchableOpacity
          activeOpacity={1}
          onPress={handleBackdropPress}
          className="absolute inset-0"
        />

        <StyledAnimatedView
          className="bg-white rounded-2xl w-full max-w-md"
          style={{
            transform: [{
              scale: modalAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            }],
          }}
        >
          {/* Header */}
          <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
            <H3 className="mb-2">{title}</H3>
            <Body className="text-neutral-600 text-sm">{subtitle}</Body>
          </StyledView>

          {/* Input Field */}
          <StyledView className="px-6 py-5">
            <StyledTextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
              placeholderTextColor="#9CA3AF"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </StyledView>

          {/* Action Buttons */}
          <StyledView className="px-6 pb-6 flex-row gap-3">
            <StyledTouchableOpacity
              onPress={handleCancel}
              className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
            >
              <Body className="text-neutral-700 font-semibold">Cancel</Body>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={handleSubmit}
              className={`flex-1 rounded-lg py-3 items-center ${
                hasValue ? 'bg-primary-500' : 'bg-neutral-200'
              }`}
              disabled={!hasValue}
            >
              <Body className={`font-semibold ${hasValue ? 'text-white' : 'text-neutral-400'}`}>
                Add
              </Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledAnimatedView>
      </StyledAnimatedView>
    </Modal>
  );
};
