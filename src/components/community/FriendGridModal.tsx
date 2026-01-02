/**
 * FriendGridModal Component
 *
 * Full-screen modal for viewing a friend's grid:
 * - Header: "Help [FriendName] Find Love" with close button (X)
 * - Shows TriangleGrid component
 * - Submit button at bottom: "Propose Match"
 * - After submit: Success message, auto-close modal
 */

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FriendWithGridStatus, DailyGrid } from '../../types/community';
import { TriangleGrid } from './TriangleGrid';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchable = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledSafeArea = styled(SafeAreaView);

interface FriendGridModalProps {
  friend: FriendWithGridStatus;
  grid: DailyGrid;
  onSubmit: (candidateId: string) => void;
  onClose: () => void;
}

export function FriendGridModal({ friend, grid, onSubmit, onClose }: FriendGridModalProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    lightHaptic();
    onClose();
  };

  const handleCandidateSelect = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
  };

  const handleSubmit = async () => {
    if (!selectedCandidateId) {
      Alert.alert('Select a candidate', 'Please select someone from the grid to propose.');
      return;
    }

    mediumHaptic();
    setIsSubmitting(true);

    try {
      await onSubmit(selectedCandidateId);

      // Show success message
      Alert.alert(
        'Proposal Submitted!',
        `You proposed a match for ${friend.friend.firstName}. The community will vote on it.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsSubmitting(false);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit proposal. Please try again.');
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <StyledSafeArea className="flex-1 bg-neutral-50" edges={['top', 'bottom']}>
        {/* Header */}
        <StyledView className="bg-white border-b border-neutral-200 px-4 py-4">
          <StyledView className="flex-row items-center justify-between">
            <StyledText className="text-xl font-semibold text-neutral-900">
              Help {friend.friend.firstName} Find Love
            </StyledText>
            <StyledTouchable
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center"
              activeOpacity={0.6}
            >
              <Ionicons name="close" size={28} color="#344054" />
            </StyledTouchable>
          </StyledView>
        </StyledView>

        {/* Content */}
        <StyledScrollView className="flex-1 px-4 py-6">
          {/* Instructions */}
          <StyledView className="bg-primary-50 rounded-lg p-4 mb-6">
            <StyledText className="text-sm text-neutral-700 text-center">
              Select someone from the grid who you think would be a great match for{' '}
              {friend.friend.firstName}
            </StyledText>
          </StyledView>

          {/* Triangle Grid */}
          <TriangleGrid
            anchor={grid.anchor}
            candidates={grid.candidates}
            selectedCandidateId={selectedCandidateId}
            onCandidateSelect={handleCandidateSelect}
            disabled={isSubmitting}
          />
        </StyledScrollView>

        {/* Submit Button */}
        <StyledView className="bg-white border-t border-neutral-200 px-4 py-4">
          <StyledTouchable
            onPress={handleSubmit}
            disabled={!selectedCandidateId || isSubmitting}
            className={`rounded-lg py-4 items-center justify-center ${
              selectedCandidateId && !isSubmitting
                ? 'bg-primary-500'
                : 'bg-neutral-300'
            }`}
            activeOpacity={0.8}
          >
            <StyledText className="text-white font-semibold text-base">
              {isSubmitting ? 'Submitting...' : 'Propose Match'}
            </StyledText>
          </StyledTouchable>
        </StyledView>
      </StyledSafeArea>
    </Modal>
  );
}

export default FriendGridModal;
