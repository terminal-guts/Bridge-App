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

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(Animated.View);

interface CustomInputModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export const CustomInputModal: React.FC<CustomInputModalProps> = ({
  visible,
  title,
  subtitle,
  placeholder,
  onClose,
  onSubmit,
}) => {
  const [inputValue, setInputValue] = useState('');
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withSpring(visible ? 1 : 0, SPRINGS.responsive);
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: animValue.value }));
  const modalScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(animValue.value, [0, 1], [0.9, 1]) }],
  }));

  const handleClose = () => {
    Keyboard.dismiss();
    setInputValue('');
    onClose();
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
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
        className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
        style={overlayStyle}
      >
        <StyledTouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          className="absolute inset-0"
        />

        <StyledAnimatedView
          className="bg-white rounded-2xl w-full max-w-md"
          style={modalScaleStyle}
        >
          {/* Header */}
          <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
            <H3 className="mb-2">{title}</H3>
            <Body className="text-neutral-600 text-sm">{subtitle}</Body>
          </StyledView>

          {/* Input Field */}
          <StyledView className="px-6 py-5">
            <StyledTextInput
              value={inputValue}
              onChangeText={setInputValue}
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
              onPress={() => {
                lightHaptic();
                handleClose();
              }}
              className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
            >
              <Body className="text-neutral-700 font-semibold">Cancel</Body>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={handleSubmit}
              className={`flex-1 rounded-lg py-3 items-center ${inputValue.trim()
                ? 'bg-primary-500'
                : 'bg-neutral-200'
              }`}
              disabled={!inputValue.trim()}
            >
              <Body className={`font-semibold ${inputValue.trim()
                ? 'text-white'
                : 'text-neutral-400'
              }`}>
                Add
              </Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledAnimatedView>
      </StyledAnimatedView>
    </Modal>
  );
};
