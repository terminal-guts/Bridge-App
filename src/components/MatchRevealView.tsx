/**
 * MatchRevealView Component
 *
 * A "match reveal" screen focused on communicating that the community
 * chose this match, not a swipe algorithm. This screen:
 * - Creates a "moment of magic" to emphasize community-driven matching
 * - Highlights why this person is a good fit
 * - Encourages opening the full profile
 * - Does NOT include Accept/Pass decisions (those live on full profile)
 *
 * Design Philosophy: Calm, premium, minimal, warm, romantic - "Thoughtful over Flashy"
 * Follows Bridge Design & Technical Specifications for typography, colors, spacing
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Easing, Dimensions, Image } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from './ui';
import { Match, UserProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic, successHaptic } from '../utils/haptics';

// ============================================================================
// Styled Components
// ============================================================================

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

// ============================================================================
// Constants - Design Tokens
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animation timing constants (per spec: 150-250ms, ease-out-cubic)
const ANIMATION = {
  DURATION_FAST: 200,
  DURATION_STANDARD: 250,
  STAGGER_DELAY: 150,
  EASING: Easing.out(Easing.cubic),
} as const;

// Color tokens from design spec
const COLORS = {
  // Neutrals
  neutral900: '#101828',
  neutral700: '#344054',
  neutral600: '#475467',
  neutral500: '#667085',
  neutral400: '#98A2B3',
  neutral300: '#D0D5DD',
  neutral200: '#E4E7EC',
  neutral100: '#F2F4F7',
  neutral50: '#F9FAFB',
  white: '#FFFFFF',
  // Primary
  primary500: '#437FFF',
  primary50: '#F2F6FF',
  // Semantic
  success: '#12B981',
  successBg: '#ECFDF5',
  successBorder: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  // Accent
  pink500: '#EC4899',
  pinkBg: '#FDF2F8',
  pinkBorder: '#FBCFE8',
  purple500: '#8B5CF6',
  purpleBg: '#F5F3FF',
} as const;

// ============================================================================
// Types
// ============================================================================

interface MatchRevealViewProps {
  match: Match;
  profile: UserProfile;
  onViewFullProfile: () => void;
}

interface ScoreTier {
  label: string;
  percentile: string;
  color: string;
  bgColor: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getTimeRemaining = (expiresAt: string): string => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  return `${hours}h ${minutes}m left`;
};

const getScoreTier = (score: number): ScoreTier => {
  if (score >= 90) {
    return { label: 'Exceptional match', percentile: 'Top 5%', color: COLORS.success, bgColor: COLORS.successBg };
  }
  if (score >= 80) {
    return { label: 'Strong match', percentile: 'Top 15%', color: COLORS.primary500, bgColor: COLORS.primary50 };
  }
  if (score >= 70) {
    return { label: 'Good match', percentile: 'Top 30%', color: COLORS.purple500, bgColor: COLORS.purpleBg };
  }
  return { label: 'Promising match', percentile: 'Top 50%', color: COLORS.warning, bgColor: COLORS.warningBg };
};

const getMatchReasons = (profile: UserProfile, score: number): string[] => {
  const reasons: string[] = [];

  if (score >= 80) reasons.push('High alignment on core values');
  if (profile.interests?.length) reasons.push('Shared interests highlighted by the community');
  if (profile.values?.length) reasons.push('Compatible relationship priorities');
  if (profile.lifestyle) reasons.push('Similar lifestyle and schedule');
  if (reasons.length < 2) reasons.push('Strong compatibility indicators');
  if (reasons.length < 3) reasons.push('Mutual friend endorsements');

  return reasons.slice(0, 3);
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Floating hearts animation for romantic reveal effect
 */
const FloatingHearts: React.FC<{ active: boolean }> = ({ active }) => {
  const hearts = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: new Animated.Value(SCREEN_WIDTH * (0.1 + Math.random() * 0.8)),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
      rotation: new Animated.Value(Math.random() * 30 - 15),
    }))
  ).current;

  useEffect(() => {
    if (!active) return;

    const timers: NodeJS.Timeout[] = [];

    hearts.forEach((heart, index) => {
      const delay = index * ANIMATION.STAGGER_DELAY;
      const duration = 2000 + Math.random() * 1000;

      timers.push(setTimeout(() => {
        const currentX = (heart.x as any).__getValue?.() ?? SCREEN_WIDTH * 0.5;

        Animated.parallel([
          Animated.sequence([
            Animated.timing(heart.opacity, { toValue: 0.8, duration: ANIMATION.DURATION_FAST, useNativeDriver: true }),
            Animated.timing(heart.opacity, { toValue: 0, duration: duration - 200, delay: 400, useNativeDriver: true }),
          ]),
          Animated.timing(heart.y, { toValue: -150, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(heart.x, { toValue: currentX + (Math.random() - 0.5) * 50, duration: duration / 2, useNativeDriver: true }),
            Animated.timing(heart.x, { toValue: currentX - (Math.random() - 0.5) * 30, duration: duration / 2, useNativeDriver: true }),
          ]),
        ]).start();
      }, delay));
    });

    return () => timers.forEach(clearTimeout);
  }, [active, hearts]);

  if (!active) return null;

  return (
    <View className="absolute inset-0 z-10 pointer-events-none">
      {hearts.map((heart) => (
        <Animated.View
          key={heart.id}
          style={{
            position: 'absolute',
            opacity: heart.opacity,
            transform: [
              { translateX: heart.x },
              { translateY: heart.y },
              { scale: heart.scale },
              { rotate: heart.rotation.interpolate({ inputRange: [-15, 15], outputRange: ['-15deg', '15deg'] }) },
            ],
          }}
        >
          <Ionicons name="heart" size={20} color={COLORS.pink500} />
        </Animated.View>
      ))}
    </View>
  );
};

/**
 * Circular Score Ring with animated fill
 */
const ScoreRing: React.FC<{ score: number; size: number; color: string }> = ({ score, size, color }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedValue, { toValue: score / 100, duration: 800, easing: ANIMATION.EASING, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [score, animatedValue, scaleAnim]);

  const strokeWidth = 4;

  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale: scaleAnim }] }}>
      <StyledView className="absolute" style={{ width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: COLORS.neutral200 }} />
      <Animated.View
        className="absolute"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: '-45deg' }],
          opacity: animatedValue,
        }}
      />
      <Body className="text-lg font-semibold" style={{ color: COLORS.neutral900 }}>{score}</Body>
    </Animated.View>
  );
};

/**
 * Interest/Value Chip - rounded-full per spec
 */
const Chip: React.FC<{ label: string; variant?: 'interest' | 'value' }> = ({ label, variant = 'interest' }) => {
  const isValue = variant === 'value';

  return (
    <StyledView
      className="rounded-full px-3 py-2 mr-2 mb-2"
      style={{
        backgroundColor: isValue ? COLORS.successBg : COLORS.white,
        borderWidth: 1,
        borderColor: isValue ? COLORS.successBorder : COLORS.neutral300,
      }}
    >
      <Body className="text-sm" style={{ color: isValue ? '#059669' : COLORS.neutral700 }}>{label}</Body>
    </StyledView>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const MatchRevealView: React.FC<MatchRevealViewProps> = ({ match, profile, onViewFullProfile }) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(match.expiresAt));
  const [showHearts, setShowHearts] = useState(false);

  // Animation refs
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(12)).current;
  const photoFadeAnim = useRef(new Animated.Value(0)).current;
  const photoScale = useRef(new Animated.Value(0.95)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(16)).current;
  const ctaFadeAnim = useRef(new Animated.Value(0)).current;

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setTimeRemaining(getTimeRemaining(match.expiresAt)), 60000);
    return () => clearInterval(interval);
  }, [match.expiresAt]);

  // Entry animations - staggered per spec
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Hearts + haptic
    timers.push(setTimeout(() => { successHaptic(); setShowHearts(true); }, 400));

    // Header
    Animated.parallel([
      Animated.timing(headerFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_STANDARD, easing: ANIMATION.EASING, useNativeDriver: true }),
      Animated.timing(headerSlideAnim, { toValue: 0, duration: ANIMATION.DURATION_STANDARD, easing: ANIMATION.EASING, useNativeDriver: true }),
    ]).start();

    // Photo (stagger: 150ms)
    timers.push(setTimeout(() => {
      Animated.parallel([
        Animated.timing(photoFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, useNativeDriver: true }),
        Animated.spring(photoScale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    }, ANIMATION.STAGGER_DELAY));

    // Cards (stagger: 250ms)
    timers.push(setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
        Animated.timing(cardSlideAnim, { toValue: 0, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
      ]).start();
    }, 250));

    // CTA (stagger: 350ms)
    timers.push(setTimeout(() => {
      Animated.timing(ctaFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, useNativeDriver: true }).start();
    }, 350));

    return () => timers.forEach(clearTimeout);
  }, [headerFadeAnim, headerSlideAnim, photoFadeAnim, photoScale, cardFadeAnim, cardSlideAnim, ctaFadeAnim]);

  const handlePress = async () => {
    await lightHaptic();
    onViewFullProfile();
  };

  // Derived data
  const scoreTier = getScoreTier(match.communityScore);
  const matchReasons = getMatchReasons(profile, match.communityScore);
  const displayName = `${profile.firstName?.charAt(0)?.toUpperCase() || '?'}, ${profile.age}`;
  const previewInterests = profile.interests?.slice(0, 3) || [];
  const previewValues = profile.values?.slice(0, 2) || [];
  const photoSize = SCREEN_WIDTH * 0.6;

  // Timer styling based on urgency
  const isExpired = timeRemaining.includes('Expired');
  const isUrgent = !isExpired && parseInt(timeRemaining) <= 6;
  const timerBg = isExpired ? COLORS.errorBg : isUrgent ? COLORS.warningBg : COLORS.neutral50;
  const timerBorder = isExpired ? COLORS.errorBorder : isUrgent ? COLORS.warningBorder : COLORS.neutral300;
  const timerColor = isExpired ? '#DC2626' : isUrgent ? '#D97706' : COLORS.neutral600;
  const timerIconColor = isExpired ? COLORS.error : isUrgent ? '#D97706' : COLORS.neutral500;

  return (
    <StyledView className="flex-1">
      <FloatingHearts active={showHearts} />

      {/* Header Section */}
      <Animated.View style={{ opacity: headerFadeAnim, transform: [{ translateY: headerSlideAnim }], paddingTop: 8 }}>
        {/* Status Pill */}
        <StyledView className="items-center mb-4">
          <StyledView
            className="rounded-full px-4 py-2 flex-row items-center"
            style={{ backgroundColor: COLORS.pinkBg, borderWidth: 1, borderColor: COLORS.pinkBorder }}
          >
            <Ionicons name="heart" size={14} color={COLORS.pink500} />
            <Body className="text-sm ml-2" style={{ color: '#BE185D', fontWeight: '500' }}>New match waiting</Body>
          </StyledView>
        </StyledView>

        {/* Hero Text */}
        <StyledView className="items-center mb-4">
          <H1 className="text-center mb-2" style={{ fontSize: 24, fontWeight: '600', color: COLORS.neutral900 }}>You have a match</H1>
          <Body className="text-center px-8" style={{ fontSize: 16, lineHeight: 24, color: COLORS.neutral600 }}>
            Your community saw something special here.{'\n'}They chose this person just for you.
          </Body>
        </StyledView>

        {/* Countdown Timer */}
        <StyledView className="items-center mb-6">
          <StyledView
            className="rounded-full px-3 py-1.5 flex-row items-center"
            style={{ backgroundColor: timerBg, borderWidth: 1, borderColor: timerBorder }}
          >
            <Ionicons name="time-outline" size={12} color={timerIconColor} />
            <Body className="text-xs ml-1.5" style={{ fontWeight: '500', color: timerColor }}>{timeRemaining}</Body>
          </StyledView>
        </StyledView>
      </Animated.View>

      {/* Photo Card */}
      <Animated.View style={{ transform: [{ scale: photoScale }], opacity: photoFadeAnim }}>
        <StyledTouchableOpacity onPress={handlePress} activeOpacity={0.98} className="items-center mb-6">
          <View
            style={{
              width: photoSize,
              height: photoSize * 1.15,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: COLORS.neutral100,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {profile.photos?.[0]?.url ? (
              <StyledImage source={{ uri: profile.photos[0].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <StyledView className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.neutral100 }}>
                <Ionicons name="person" size={64} color={COLORS.neutral300} />
              </StyledView>
            )}

            {/* Tap overlay */}
            <StyledView className="absolute top-3 left-0 right-0 items-center">
              <StyledView
                className="rounded-full px-3 py-1.5 flex-row items-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}
              >
                <Ionicons name="eye-outline" size={12} color={COLORS.primary500} />
                <Body className="text-xs ml-1.5" style={{ color: COLORS.primary500, fontWeight: '500' }}>View full profile</Body>
              </StyledView>
            </StyledView>

            {/* Name/Age overlay */}
            <StyledView className="absolute bottom-3 left-3 right-3">
              <StyledView
                className="rounded-xl px-4 py-3 flex-row items-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.97)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
              >
                <StyledView className="flex-1">
                  <Body style={{ fontSize: 18, fontWeight: '600', color: COLORS.neutral900 }}>{displayName}</Body>
                  {profile.location && (
                    <StyledView className="flex-row items-center mt-0.5">
                      <Ionicons name="location-outline" size={11} color={COLORS.neutral400} />
                      <Body className="text-xs ml-1" style={{ color: COLORS.neutral500 }}>{profile.location}</Body>
                    </StyledView>
                  )}
                </StyledView>
                <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: COLORS.primary50 }}>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary500} />
                </StyledView>
              </StyledView>
            </StyledView>
          </View>
        </StyledTouchableOpacity>
      </Animated.View>

      {/* Why matched card */}
      <Animated.View style={{ opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] }}>
        <StyledView
          className="mb-4 mx-1 p-4"
          style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.neutral200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
        >
          <Body className="text-xs uppercase mb-3" style={{ color: COLORS.neutral400, fontWeight: '500', letterSpacing: 0.5 }}>Why the community matched you</Body>

          <StyledView className="flex-row items-center mb-4">
            <ScoreRing score={match.communityScore} size={56} color={scoreTier.color} />
            <StyledView className="flex-1 ml-4">
              <Body className="font-semibold mb-1" style={{ fontSize: 16, color: scoreTier.color }}>{scoreTier.label}</Body>
              <StyledView className="self-start rounded-full px-2 py-0.5 mb-1.5" style={{ backgroundColor: scoreTier.bgColor }}>
                <Body className="text-xs" style={{ fontWeight: '500', color: scoreTier.color }}>{scoreTier.percentile}</Body>
              </StyledView>
              <Body className="text-sm" style={{ color: COLORS.neutral500, lineHeight: 18 }}>Friends who know you rated this highly</Body>
            </StyledView>
          </StyledView>

          <StyledView className="h-px mb-4" style={{ backgroundColor: COLORS.neutral200 }} />

          {matchReasons.map((reason, index) => (
            <StyledView key={index} className="flex-row items-center" style={{ marginBottom: index === matchReasons.length - 1 ? 0 : 8 }}>
              <StyledView className="w-5 h-5 rounded-full items-center justify-center mr-3" style={{ backgroundColor: COLORS.successBg }}>
                <Ionicons name="checkmark" size={10} color={COLORS.success} />
              </StyledView>
              <Body className="text-sm flex-1" style={{ color: COLORS.neutral600, lineHeight: 18 }}>{reason}</Body>
            </StyledView>
          ))}
        </StyledView>
      </Animated.View>

      {/* What you have in common */}
      {(previewInterests.length > 0 || previewValues.length > 0) && (
        <Animated.View style={{ opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] }}>
          <StyledView className="mb-6 mx-1">
            <Body className="text-xs uppercase mb-2 px-1" style={{ color: COLORS.neutral400, fontWeight: '500', letterSpacing: 0.5 }}>What you have in common</Body>
            <StyledView className="flex-row flex-wrap">
              {previewInterests.map((interest, i) => <Chip key={`i-${i}`} label={interest} variant="interest" />)}
              {previewValues.map((value, i) => <Chip key={`v-${i}`} label={value} variant="value" />)}
            </StyledView>
          </StyledView>
        </Animated.View>
      )}

      {/* CTA Button */}
      <Animated.View style={{ opacity: ctaFadeAnim, paddingHorizontal: 4 }}>
        <StyledTouchableOpacity
          onPress={handlePress}
          activeOpacity={0.98}
          className="flex-row items-center justify-center py-3.5"
          style={{ backgroundColor: COLORS.primary500, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
        >
          <Body style={{ color: COLORS.white, fontSize: 16, fontWeight: '600' }}>View full profile to decide</Body>
          <Ionicons name="arrow-forward" size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
        </StyledTouchableOpacity>
      </Animated.View>
    </StyledView>
  );
};

export default MatchRevealView;
