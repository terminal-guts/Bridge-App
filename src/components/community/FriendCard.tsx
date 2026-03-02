/**
 * FriendCard Component
 *
 * Redesigned friend card with unified height and cleaner layout.
 *
 * Layout:
 * - Left: Circular avatar (56x56, tappable → profile)
 * - Center: Name + tucked streak/tier (tappable → message)
 * - Right: "Vote" button (pending) OR Karma score + stars (completed)
 *
 * Design Changes (Jan 2026):
 * - Removed "✓ Helped today" text
 * - Reduced font sizes (name 18px, streak 12px, tier 10px)
 * - Both variants are 76px height
 * - Added karma star visualization
 * - Added streak celebration (15+, 20+, 30+)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { FriendWithGridStatus } from '../../types/community';
import { lightHaptic } from '../../utils/haptics';
import {
  FRIEND_CARD,
  TYPOGRAPHY,
  SPACING,
  COLORS,
  STREAK_TIERS,
  KARMA_TIERS,
} from '../../constants/friendsArea';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchable = styled(TouchableOpacity);

interface FriendCardProps {
  friend: FriendWithGridStatus;
  variant: 'pending' | 'completed'; // NEW: replaces isPending
  onHelpMatch: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
}

// Karma tier label mapping
const TIER_LABELS: Record<string, string> = {
  new: 'New',
  solid: 'Solid',
  trusted: 'Trusted',
  elite: 'Elite',
};

// Karma tier colors
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#F1F5F9', text: '#64748B' },
  solid: { bg: '#E0F2FE', text: '#0284C7' },
  trusted: { bg: '#DDD6FE', text: '#7C3AED' },
  elite: { bg: '#FEF3C7', text: '#D97706' },
};

/**
 * Get streak visual treatment based on streak length
 */
const getStreakDisplay = (streakDays: number) => {
  if (streakDays >= STREAK_TIERS.CROWN) {
    return { emoji: '🔥', suffix: '👑', hasGlow: true };
  }
  if (streakDays >= STREAK_TIERS.DIAMOND) {
    return { emoji: '🔥', suffix: '💎', hasGlow: true };
  }
  if (streakDays >= STREAK_TIERS.STAR) {
    return { emoji: '🔥', suffix: '💫', hasGlow: true };
  }
  if (streakDays >= STREAK_TIERS.SPARKLE) {
    return { emoji: '🔥', suffix: '✨', hasGlow: true };
  }
  return { emoji: '🔥', suffix: null, hasGlow: false };
};

/**
 * Get karma stars based on assist count
 */
const getKarmaStars = (assists: number): string => {
  if (assists >= KARMA_TIERS.THREE_STARS_SPARKLE) return '⭐⭐⭐✨';
  if (assists >= KARMA_TIERS.THREE_STARS) return '⭐⭐⭐';
  if (assists >= KARMA_TIERS.TWO_STARS) return '⭐⭐';
  if (assists >= KARMA_TIERS.ONE_STAR) return '⭐';
  return '';
};

/**
 * Get karma color based on assist count
 */
const getKarmaColor = (assists: number): string => {
  if (assists >= KARMA_TIERS.THREE_STARS_SPARKLE) return COLORS.KARMA_DIAMOND;
  if (assists >= KARMA_TIERS.THREE_STARS) return COLORS.KARMA_GOLD;
  if (assists >= KARMA_TIERS.TWO_STARS) return COLORS.KARMA_SILVER;
  if (assists >= KARMA_TIERS.ONE_STAR) return COLORS.KARMA_BRONZE;
  return COLORS.KARMA_GRAY;
};

export const FriendCard = React.memo<FriendCardProps>(({ friend, variant, onHelpMatch, onMessage, onViewProfile }) => {
  const handleAvatarPress = () => {
    lightHaptic();
    onViewProfile();
  };

  const handleCenterPress = () => {
    lightHaptic();
    onMessage();
  };

  const handleHelpPress = () => {
    lightHaptic();
    onHelpMatch();
  };

  // Get tier styling from karma badgeTier
  const karmaTier = friend.karmaScore?.badgeTier || 'new';
  const tierColors = TIER_COLORS[karmaTier] || TIER_COLORS.new;
  const tierLabel = TIER_LABELS[karmaTier] || TIER_LABELS.new;

  // Get streak display info
  const streakDisplay = getStreakDisplay(friend.streakDays);

  // Get karma info (for completed variant)
  const karmaPoints = friend.karmaScore?.karmaPoints ?? 0;
  const karmaStars = getKarmaStars(friend.assistsCount);
  const karmaColor = getKarmaColor(friend.assistsCount);

  return (
    <StyledView
      style={{
        backgroundColor: variant === 'completed' ? COLORS.COMPLETED_BG : COLORS.PENDING_BG,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: variant === 'completed' ? '#E5E7EB' : '#F3F4F6',
        minHeight: 84,
      }}
    >
      {/* LEFT: Avatar (60x60) - Enhanced with shadow */}
      <StyledTouchable onPress={handleAvatarPress} activeOpacity={0.7}>
        <StyledView style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <StyledImage
            source={{
              uri: (() => {
                const photos = friend.friend.photos;
                // Handle null/undefined photos
                if (!photos || !Array.isArray(photos) || photos.length === 0) {
                  return 'https://via.placeholder.com/100';
                }
                const firstPhoto = photos[0];
                // Handle photo as object with url property
                if (firstPhoto && typeof firstPhoto === 'object' && 'url' in firstPhoto) {
                  return firstPhoto.url || 'https://via.placeholder.com/100';
                }
                // Handle photo as direct string URL
                if (typeof firstPhoto === 'string') {
                  return firstPhoto;
                }
                // Fallback
                return 'https://via.placeholder.com/100';
              })()
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              borderWidth: 2.5,
              borderColor: variant === 'pending' ? '#EFF6FF' : '#F0FDF4',
            }}
            resizeMode="cover"
          />
        </StyledView>
      </StyledTouchable>

      {/* CENTER: Name + Streak + Tier (Tappable) */}
      <StyledTouchable
        onPress={handleCenterPress}
        activeOpacity={0.7}
        style={{ flex: 1, marginLeft: 14 }}
      >
        {/* Name with verification badge */}
        <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
          <StyledText
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: '#0F172A',
              lineHeight: 22,
              letterSpacing: -0.3,
            }}
          >
            {friend.friend.firstName}
          </StyledText>
        </StyledView>

        {/* Streak + Tier Row - TUCKED UNDERNEATH */}
        <StyledView
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 3,
          }}
        >
          {/* Streak (only show if > 0) */}
          {friend.streakDays > 0 && (
            <>
              <StyledText style={{ fontSize: 13 }}>
                {streakDisplay.emoji}
              </StyledText>
              <StyledText
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#475569',
                  marginLeft: 3,
                  marginRight: 6,
                }}
              >
                {friend.streakDays}
              </StyledText>
              {streakDisplay.suffix && (
                <StyledText
                  style={{
                    fontSize: 13,
                    marginRight: 6,
                  }}
                >
                  {streakDisplay.suffix}
                </StyledText>
              )}
            </>
          )}

          {/* Tier Pill - Enhanced */}
          <StyledView
            style={{
              backgroundColor: tierColors.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: tierColors.text + '20', // 20% opacity
            }}
          >
            <StyledText
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: tierColors.text,
                letterSpacing: 0.3,
              }}
            >
              {tierLabel}
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledTouchable>

      {/* RIGHT: Vote Button or Karma Score */}
      {variant === 'pending' ? (
        // Enhanced Vote button with gradient feel
        <StyledTouchable
          onPress={handleHelpPress}
          activeOpacity={0.75}
          style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 22,
            paddingVertical: 11,
            borderRadius: 14,
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 5,
            minWidth: 72,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <StyledText
            style={{
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          >
            Vote
          </StyledText>
        </StyledTouchable>
      ) : (
        // Karma Score + Stars (completed variant) - Enhanced
        <StyledView style={{ alignItems: 'flex-end' }}>
          <StyledText
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: karmaColor,
              letterSpacing: -0.5,
            }}
          >
            {karmaPoints}
          </StyledText>
          {karmaStars && (
            <StyledText
              style={{
                fontSize: 15,
                marginTop: 1,
                letterSpacing: -1,
              }}
            >
              {karmaStars}
            </StyledText>
          )}
        </StyledView>
      )}
    </StyledView>
  );
});

export default FriendCard;
