/**
 * MatchPreviewCardEnhanced Component
 *
 * Enhanced match preview with:
 * - Gradient blur photo effect (sharp center, blurry edges)
 * - Community score badge with percentile
 * - Staggered reveal animations
 * - Improved visual hierarchy
 * - Designed for use with sticky action buttons
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Animated, Easing, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Card, Avatar } from './ui';
import { CommunityScoreBadge } from './CommunityScoreBadge';
import { UserProfile, Match } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from './ui';
import { LinearGradient } from 'expo-linear-gradient';

const StyledView = styled(View);
const StyledImage = styled(Image);
const StyledAnimatedView = styled(Animated.View);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchPreviewCardEnhancedProps {
  match: Match;
  profile: UserProfile;
  onViewFullProfile: () => void;
  isRevealed?: boolean;
}

/**
 * Get urgency level and styling based on hours remaining
 */
const getUrgencyInfo = (expiresAt: string) => {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) {
    return { text: 'Expired', level: 'expired', hours: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let level: 'normal' | 'warning' | 'urgent' | 'critical' = 'normal';
  if (hours <= 1) level = 'critical';
  else if (hours <= 3) level = 'urgent';
  else if (hours <= 12) level = 'warning';

  let text = '';
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    text = `${days}d ${hours % 24}h left`;
  } else if (hours >= 1) {
    text = `${hours}h ${minutes}m left`;
  } else {
    text = `${minutes}m left`;
  }

  return { text, level, hours };
};

const urgencyStyles = {
  normal: { bg: 'bg-neutral-100', text: 'text-neutral-600', icon: '#6B7280' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '#F59E0B' },
  urgent: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '#F97316' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', icon: '#EF4444' },
  expired: { bg: 'bg-red-100', text: 'text-red-700', icon: '#EF4444' },
};

/**
 * Enhanced photo component with gradient blur effect
 */
const GradientBlurPhoto: React.FC<{
  uri?: string;
  size: number;
  revealed: boolean;
}> = ({ uri, size, revealed }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <StyledView
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.15,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Base image with blur */}
        <Avatar
          uri={uri}
          size={size}
          rounded="2xl"
          blurRadius={revealed ? 4 : 8}
        />

        {/* Gradient overlay for "frosted glass" effect */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.1)',
            'rgba(255,255,255,0.3)',
          ]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Vignette effect */}
        <StyledView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: size * 0.15,
            borderWidth: size * 0.08,
            borderColor: 'rgba(0,0,0,0.03)',
          }}
        />

        {/* "Tap to see more" hint */}
        {!revealed && (
          <StyledView
            className="absolute bottom-3 left-0 right-0 items-center"
          >
            <StyledView className="bg-black/40 px-3 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
              <Body className="text-white text-xs ml-1.5">Tap to preview</Body>
            </StyledView>
          </StyledView>
        )}
      </StyledView>
    </Animated.View>
  );
};

export const MatchPreviewCardEnhanced: React.FC<MatchPreviewCardEnhancedProps> = ({
  match,
  profile,
  onViewFullProfile,
  isRevealed = false,
}) => {
  const [timeInfo, setTimeInfo] = useState(getUrgencyInfo(match.expiresAt));

  // Staggered animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const photoAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getUrgencyInfo(match.expiresAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [match.expiresAt]);

  // Staggered reveal animation
  useEffect(() => {
    const stagger = 150;
    Animated.stagger(stagger, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(photoAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, photoAnim, scoreAnim, contentAnim]);

  const urgency = urgencyStyles[timeInfo.level as keyof typeof urgencyStyles];

  // Privacy: First initial + age
  const firstInitial = profile.firstName?.charAt(0)?.toUpperCase() || '?';
  const displayName = `${firstInitial}, ${profile.age}`;

  // Limited preview data
  const previewInterests = profile.interests?.slice(0, 4) || [];
  const previewValues = profile.values?.slice(0, 3) || [];
  const firstPrompt = profile.deepQuestions?.[0];

  // Mock ranking breakdown (would come from backend)
  const rankingBreakdown = {
    firstChoice: Math.floor(match.communityScore * 0.04),
    secondChoice: Math.floor(match.communityScore * 0.03),
    thirdChoice: Math.floor(match.communityScore * 0.02),
  };

  return (
    <StyledView className="flex-1">
      {/* Header with Timer */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        }}
      >
        <StyledView className="items-center mb-4">
          <H1 className="text-2xl text-center mb-2">You Have a Match!</H1>
          <Body className="text-neutral-500 text-center mb-3">
            Your friends think this could be something special
          </Body>

          {/* Timer Badge */}
          <StyledView className={`${urgency.bg} rounded-full px-4 py-2 flex-row items-center`}>
            <Ionicons name="timer-outline" size={16} color={urgency.icon} />
            <Body className={`${urgency.text} font-semibold ml-1.5 text-sm`}>
              {timeInfo.text}
            </Body>
          </StyledView>
        </StyledView>
      </Animated.View>

      {/* Photo Section */}
      <Animated.View
        style={{
          opacity: photoAnim,
          transform: [{
            scale: photoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          }],
        }}
      >
        <StyledView className="items-center mb-5">
          <GradientBlurPhoto
            uri={profile.photos?.[0]?.url}
            size={SCREEN_WIDTH * 0.45}
            revealed={isRevealed}
          />

          {/* Name/Age Badge */}
          <StyledView
            className="bg-white px-5 py-2.5 rounded-full -mt-5 border border-neutral-200"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <H2 className="text-neutral-900">{displayName}</H2>
          </StyledView>
        </StyledView>
      </Animated.View>

      {/* Community Score Badge */}
      <Animated.View
        style={{
          opacity: scoreAnim,
          transform: [{
            translateY: scoreAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        }}
        className="mb-5"
      >
        <CommunityScoreBadge
          score={match.communityScore}
          animate={true}
          size="md"
          showBreakdown={true}
          rankingBreakdown={rankingBreakdown}
        />
      </Animated.View>

      {/* Content Section */}
      <Animated.View
        style={{
          opacity: contentAnim,
          transform: [{
            translateY: contentAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        }}
      >
        <Card elevation={2} className="mb-4">
          {/* Interests */}
          {previewInterests.length > 0 && (
            <StyledView className="mb-4">
              <Body className="text-neutral-500 text-xs uppercase tracking-wide mb-2">
                Interests
              </Body>
              <StyledView className="flex-row flex-wrap -m-1">
                {previewInterests.map((interest, i) => (
                  <StyledView key={i} className="m-1">
                    <Chip label={interest} size="sm" />
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          )}

          {/* Values */}
          {previewValues.length > 0 && (
            <StyledView className="mb-4">
              <Body className="text-neutral-500 text-xs uppercase tracking-wide mb-2">
                Values
              </Body>
              <StyledView className="flex-row flex-wrap -m-1">
                {previewValues.map((value, i) => (
                  <StyledView key={i} className="m-1">
                    <Chip label={value} size="sm" variant="partner" />
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          )}

          {/* Prompt Preview */}
          {firstPrompt && (
            <StyledView className="bg-neutral-50 rounded-xl p-4">
              <Body className="text-neutral-500 text-xs mb-1.5">
                {firstPrompt.question}
              </Body>
              <Body className="text-neutral-900 text-sm leading-relaxed" numberOfLines={3}>
                {firstPrompt.answer}
              </Body>
            </StyledView>
          )}
        </Card>

        {/* Info Footer */}
        <Card elevation={0} className="bg-primary-50 border border-primary-100">
          <StyledView className="flex-row items-center">
            <Ionicons name="shield-checkmark-outline" size={18} color="#437FFF" />
            <Body className="text-primary-700 text-sm ml-2 flex-1">
              Accept to unlock full profile and start chatting
            </Body>
          </StyledView>
        </Card>
      </Animated.View>
    </StyledView>
  );
};

export default MatchPreviewCardEnhanced;
