import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H2, Body } from './ui/Typography';
import { Button } from './ui/Button';
import { lightHaptic, mediumHaptic, successHaptic, errorHaptic } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (friendCode: string) => Promise<{ success: boolean; message: string }>;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

/**
 * AddFriendModal Component
 *
 * Modal popup for entering and submitting a friend code
 */
export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [friendCode, setFriendCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    lightHaptic();
    setFriendCode('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!friendCode.trim()) {
      errorHaptic();
      Alert.alert('Error', 'Please enter a friend code');
      return;
    }

    mediumHaptic();
    setIsSubmitting(true);

    try {
      const result = await onSubmit(friendCode.trim());

      if (result.success) {
        successHaptic();
        Alert.alert('Success', result.message);
        setFriendCode('');
        onClose();
      } else {
        errorHaptic();
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      errorHaptic();
      Alert.alert('Error', 'Failed to add friend. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <StyledTouchableOpacity
        className="flex-1 bg-black/50 justify-center items-center px-6"
        activeOpacity={1}
        onPress={handleClose}
      >
        {/* Modal Content */}
        <StyledTouchableOpacity
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <StyledView className="flex-row items-center justify-between mb-6">
            <H2 className="text-xl">Add Friend</H2>
            <StyledTouchableOpacity onPress={handleClose} className="p-1">
              <Ionicons name="close" size={24} color="#475467" />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Input */}
          <StyledTextInput
            className="border border-neutral-300 rounded-xl px-4 py-3 mb-6 text-base text-neutral-900 focus:border-primary-400"
            placeholder="Friend Code"
            placeholderTextColor="#98A2B3"
            value={friendCode}
            onChangeText={setFriendCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />

          {/* Actions */}
          <StyledView className="items-center">
            <StyledView style={{ minWidth: 200 }}>
              <Button
                variant="primary"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
              >
                Add Friend
              </Button>
            </StyledView>
          </StyledView>
        </StyledTouchableOpacity>
      </StyledTouchableOpacity>
    </Modal>
  );
};
