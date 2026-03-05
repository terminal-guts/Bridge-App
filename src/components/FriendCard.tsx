import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image, Animated } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { Body, Caption } from './ui/Typography';
import { BadgePill } from './BadgePill';
import { lightHaptic } from '../utils/haptics';
import { shadows, gradients } from '../utils/shadows';

export interface FriendData {
  id: string;
  name: string;
  photoUrl: string;
  badges: string[]; // Max 3 badges with format "icon|label" e.g., "🎯|Great Matcher"
  prospectiveMatches: number;
  streak?: number; // Streak in days
  matchmakerQuality?: 'gold' | 'silver' | 'bronze'; // Matchmaker quality badge
}

interface FriendCardProps {
  friend: FriendData;
  onPress: () => void;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

/**
 * FriendCard Component
 *
 * Displays friend information with profile photo, streak pill, matchmaker badge, and match count
 * Inspired by reference image card layout
 *
 * Performance: Wrapped in React.memo to prevent unnecessary re-renders in lists
 */
export const FriendCard: React.FC<FriendCardProps> = React.memo(({ friend, onPress }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    lightHaptic();
    onPress();
  }, [onPress]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Get matchmaker badge emoji based on quality
  const getMatchmakerBadge = (quality?: 'gold' | 'silver' | 'bronze') => {
    switch (quality) {
      case 'gold':
        return '🥇';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return null;
    }
  };

  const matchmakerBadge = getMatchmakerBadge(friend.matchmakerQuality);

  // Mock total users for X/Y format (in real app, this would come from props)
  const totalUsers = 1247;

  return (
    <Animated.View className="mb-2" style={{ transform: [{ scale: scaleAnim }] }}>
      {/* Subtle gradient divider at bottom */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.03)', 'rgba(0, 0, 0, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 12,
          right: 12,
          height: 1,
          zIndex: 2,
        }}
      />

      <StyledView
        style={[
          shadows.small,
          { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
        ]}
      >
        {/* Top light shadow overlay */}
        <LinearGradient
          colors={gradients.cardShine.colors}
          start={gradients.cardShine.start}
          end={gradients.cardShine.end}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            borderRadius: 12,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <StyledTouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          className="bg-neutral-50 rounded-xl p-3"
        >
      <StyledView className="flex-row items-center">
        {/* Profile Photo - Smaller */}
        <StyledView className="mr-3">
          <StyledImage
            source={{ uri: friend.photoUrl }}
            className="w-12 h-12 rounded-full bg-neutral-100"
            resizeMode="cover"
          />
        </StyledView>

        {/* Content */}
        <StyledView className="flex-1 flex-row items-center justify-between">
          <StyledView className="flex-1">
            {/* Name */}
            <Body className="text-neutral-900 font-semibold text-sm mb-1" style={{ letterSpacing: -0.2 }}>
              {friend.name}
            </Body>

            {/* Streak Pill & Matchmaker Badge */}
            <StyledView className="flex-row items-center" style={{ gap: 6 }}>
              {/* Light Purple Streak Pill */}
              {friend.streak !== undefined && friend.streak > 0 && (
                <StyledView className="bg-purple-100 rounded-full px-2.5 py-0.5">
                  <Caption className="text-purple-700 text-xs font-medium">
                    🔥 {friend.streak} day{friend.streak !== 1 ? 's' : ''}
                  </Caption>
                </StyledView>
              )}

              {/* Matchmaker Quality Badge */}
              {matchmakerBadge && (
                <StyledView className="w-6 h-6 items-center justify-center">
                  <Body className="text-base">{matchmakerBadge}</Body>
                </StyledView>
              )}
            </StyledView>
          </StyledView>

          {/* Prospective Matches Count - X/Y Format - More Pronounced */}
          <StyledView className="ml-3 bg-primary-50 px-3 py-1.5 rounded-lg flex-row items-baseline">
            <Body className="text-primary-700 font-bold text-sm" style={{ letterSpacing: -0.3 }}>
              {friend.prospectiveMatches}
            </Body>
            <Caption className="text-primary-500 text-xs font-medium ml-1" style={{ letterSpacing: -0.1 }}>
              / {totalUsers}
            </Caption>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledTouchableOpacity>
      </StyledView>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these key props change
  return (
    prevProps.friend.id === nextProps.friend.id &&
    prevProps.friend.name === nextProps.friend.name &&
    prevProps.friend.photoUrl === nextProps.friend.photoUrl &&
    prevProps.friend.prospectiveMatches === nextProps.friend.prospectiveMatches &&
    prevProps.friend.streak === nextProps.friend.streak &&
    prevProps.friend.matchmakerQuality === nextProps.friend.matchmakerQuality &&
    prevProps.onPress === nextProps.onPress
  );
});
