/**
 * FriendGridRow Component
 *
 * Interaction model:
 * - Tap row → Open chat with friend (primary action)
 * - "View Grid" button → Navigate to friend's grid (secondary action)
 * - Profile photo → View friend's profile
 *
 * Shows:
 * - Friend photo (tappable), name, karma badge
 * - Candidate previews (3 overlapping circles)
 * - "View Grid" button (or "Done" if completed)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { FriendWithGridStatus } from '../../types/community';
import { lightHaptic } from '../../utils/haptics';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledImage = styled(Image) as typeof Image;
const StyledTouchable = styled(TouchableOpacity) as typeof TouchableOpacity;

interface FriendGridRowProps {
  friend: FriendWithGridStatus & {
    candidatePreviews?: Array<{ id: string; photo: string }>;
  };
  onViewGrid: () => void;
  onChatPress?: () => void;
  onProfilePress: () => void;
}

export function FriendGridRow({ friend, onViewGrid, onChatPress, onProfilePress }: FriendGridRowProps) {
  const handleChatPress = () => {
    lightHaptic();
    if (onChatPress) {
      onChatPress();
    }
  };

  const handleViewGrid = (e: any) => {
    e.stopPropagation();
    lightHaptic();
    onViewGrid();
  };

  const handleProfilePress = (e: any) => {
    e.stopPropagation();
    lightHaptic();
    onProfilePress();
  };

  const points = friend.karmaScore?.karmaPoints || 0;

  const candidatePreviews = friend.candidatePreviews || [];
  const showPreviews = candidatePreviews.length > 0;

  return (
    <StyledTouchable
      onPress={handleChatPress}
      className="bg-white py-3 px-4"
      activeOpacity={0.7}
    >
      <StyledView className="flex-row items-center">
        {/* Friend Photo - Tappable to view profile */}
        <StyledTouchable
          onPress={handleProfilePress}
          activeOpacity={0.6}
          className="mr-3"
        >
          <StyledImage
            source={{ uri: friend.friend.photos[0]?.url }}
            className="w-12 h-12 rounded-full border-2 border-rose-100"
          />
        </StyledTouchable>

        {/* Friend Info */}
        <StyledView className="flex-1">
          <StyledView className="flex-row items-center mb-1">
            <StyledText className="text-base font-semibold text-neutral-900">
              {friend.friend.firstName}
            </StyledText>
            <StyledText className="text-xs font-semibold text-green-600 ml-2">
              {points} pts
            </StyledText>
          </StyledView>

          {/* Candidate Previews */}
          {showPreviews && (
            <StyledView className="flex-row items-center">
              {candidatePreviews.slice(0, 3).map((candidate, index) => (
                <StyledImage
                  key={candidate.id}
                  source={{ uri: candidate.photo }}
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index }}
                />
              ))}
              <StyledText className="text-xs text-neutral-500 ml-2">
                {friend.hasCompletedGrid ? 'Helped ✓' : '3 candidates'}
              </StyledText>
            </StyledView>
          )}
        </StyledView>

        {/* View Grid / Done Button */}
        {friend.hasCompletedGrid ? (
          <StyledView className="flex-row items-center bg-green-50 rounded-lg px-3 py-2">
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <StyledText className="text-sm text-green-700 ml-1.5 font-semibold">
              Done
            </StyledText>
          </StyledView>
        ) : (
          <StyledTouchable
            onPress={handleViewGrid}
            className="bg-rose-500 rounded-lg px-4 py-2"
            activeOpacity={0.7}
          >
            <StyledText className="text-sm text-white font-semibold">
              View Grid
            </StyledText>
          </StyledTouchable>
        )}
      </StyledView>
    </StyledTouchable>
  );
}

export default FriendGridRow;
