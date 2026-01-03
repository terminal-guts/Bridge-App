/**
 * FriendCard Component
 *
 * Clash Royale-inspired friend card with Bridge styling
 *
 * Layout:
 * - Left: Circular avatar (tappable → profile)
 * - Center: Name + (Streak counter + Tier pill) (tappable → message)
 * - Right: "Grid" button (pending) OR "Assists: X" chip (completed)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { FriendWithGridStatus, KARMA_TIERS } from '../../types/community';
import { lightHaptic } from '../../utils/haptics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchable = styled(TouchableOpacity);

interface FriendCardProps {
  friend: FriendWithGridStatus;
  isPending: boolean; // true = needs grid, false = already helped (leaderboard)
  onViewGrid: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
}

// Friendship tier label mapping
const TIER_LABELS: Record<string, string> = {
  new: 'New friend',
  good: 'Good friends',
  great: 'Great friends',
  best: 'Best friends',
};

// Friendship tier colors
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#F1F5F9', text: '#64748B' }, // Light gray for new friends
  good: { bg: '#E0F2FE', text: '#0284C7' }, // Light blue
  great: { bg: '#DDD6FE', text: '#7C3AED' }, // Light purple
  best: { bg: '#FEF3C7', text: '#D97706' }, // Light amber
};

export const FriendCard = React.memo<FriendCardProps>(({ friend, isPending, onViewGrid, onMessage, onViewProfile }) => {
  const handleAvatarPress = () => {
    lightHaptic();
    onViewProfile();
  };

  const handleCenterPress = () => {
    lightHaptic();
    onMessage();
  };

  const handleGridPress = () => {
    lightHaptic();
    onViewGrid();
  };

  // Safely get tier colors with fallback to 'new' tier
  const tierColors = TIER_COLORS[friend.friendshipTier] || TIER_COLORS.new;
  const tierLabel = TIER_LABELS[friend.friendshipTier] || TIER_LABELS.new;

  return (
    <StyledView className="bg-white py-3 px-4 flex-row items-center border-b border-neutral-100">
      {/* LEFT: Avatar */}
      <StyledTouchable onPress={handleAvatarPress} activeOpacity={0.7}>
        <StyledImage
          source={{ uri: friend.friend.photos?.[0]?.url || friend.friend.photos?.[0] || 'https://via.placeholder.com/100' }}
          className="w-12 h-12 rounded-full border-2 border-blue-100"
        />
      </StyledTouchable>

      {/* CENTER: Name + Streak + Tier (Tappable) */}
      <StyledTouchable
        onPress={handleCenterPress}
        activeOpacity={0.7}
        className="flex-1 ml-3"
      >
        {/* Name with verification badge */}
        <StyledView className="flex-row items-center mb-1">
          <StyledText className="text-base font-semibold text-neutral-900">
            {friend.friend.firstName}
          </StyledText>
          {friend.friend.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" style={{ marginLeft: 4 }} />
          )}
        </StyledView>

        {/* Streak + Tier Pill Row */}
        <StyledView className="flex-row items-center">
          {/* Streak Counter */}
          <StyledView className="flex-row items-center mr-1.5">
            <StyledText className="text-sm mr-0.5">🔥</StyledText>
            <StyledText className="text-xs font-medium text-neutral-700">
              {friend.streakDays}
            </StyledText>
          </StyledView>

          {/* Tier Pill */}
          <StyledView
            style={{ backgroundColor: tierColors.bg }}
            className="px-2 py-0.5 rounded-full"
          >
            <StyledText
              style={{ color: tierColors.text }}
              className="text-[10px] font-semibold"
            >
              {tierLabel}
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledTouchable>

      {/* RIGHT: Grid Button or Karma Score */}
      {isPending ? (
        // Prominent Grid button (like CR trophy box)
        <StyledTouchable
          onPress={handleGridPress}
          activeOpacity={0.8}
          className="bg-blue-500 px-5 py-2.5 rounded-xl shadow-md"
          style={{
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <StyledText className="text-white text-sm font-bold">
            Grid
          </StyledText>
        </StyledTouchable>
      ) : (
        // Karma score on leaderboard (tappable - can view grid again)
        <StyledTouchable
          onPress={handleGridPress}
          activeOpacity={0.7}
          style={{ backgroundColor: friend.karmaScore ? KARMA_TIERS[friend.karmaScore.badgeTier].bgColor : '#F1F5F9' }}
          className="px-4 py-2 rounded-lg"
        >
          <StyledText
            style={{ color: friend.karmaScore ? KARMA_TIERS[friend.karmaScore.badgeTier].color : '#94A3B8' }}
            className="text-lg font-bold"
          >
            {friend.karmaScore ? friend.karmaScore.totalAssists : 0}
          </StyledText>
        </StyledTouchable>
      )}
    </StyledView>
  );
});

export default FriendCard;
