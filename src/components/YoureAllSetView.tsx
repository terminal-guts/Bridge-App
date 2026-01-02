/**
 * YoureAllSetView Component
 *
 * A flexible "You're All Set" screen that serves as the base Love home state.
 * This component displays different variants based on the user's recent activity:
 *
 * Variants:
 * - base: Default state - no survey, no match, waiting for next opportunity
 * - post_survey: Just completed a survey, encouraging them about community impact
 * - post_pass: Just passed on a match, supportive and reassuring tone
 * - post_expired: A match expired without decision, gentle acknowledgment
 * - post_unmatch: Just ended an active match, reflective and supportive
 *
 * Design Philosophy: Calm, premium, minimal - "Thoughtful over Flashy"
 * Follows Bridge Design & Technical Specifications
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from './ui';
import { SurveyCountdown } from './SurveyCountdown';
import { Ionicons } from '@expo/vector-icons';
import { successHaptic } from '../utils/haptics';

// ============================================================================
// Styled Components
// ============================================================================

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

// ============================================================================
// Constants - Design Tokens
// ============================================================================

// Animation timing constants (per spec: 150-250ms, ease-out-cubic)
const ANIMATION = {
  DURATION_FAST: 200,
  DURATION_STANDARD: 250,
  STAGGER_CARD: 150,
  STAGGER_CTA: 250,
  EASING: Easing.out(Easing.cubic),
} as const;

// Color tokens from design spec
const COLORS = {
  // Neutrals
  neutral900: '#101828',
  neutral600: '#475467',
  neutral500: '#667085',
  neutral400: '#98A2B3',
  neutral300: '#D0D5DD',
  neutral200: '#E4E7EC',
  neutral50: '#F9FAFB',
  white: '#FFFFFF',
  // Primary
  primary500: '#437FFF',
  primary50: '#F2F6FF',
  primaryBorder: '#DBEAFE',
  // Semantic
  success: '#12B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  warningTextSecondary: '#B45309',
  warningBadgeBg: '#FEF3C7',
  // Accent
  pink: '#EC4899',
  pinkBg: '#FDF2F8',
  purple: '#6366F1',
  purpleBg: '#EEF2FF',
  teal: '#14B8A6',
  tealBg: '#F0FDFA',
  orange: '#F97316',
} as const;

// ============================================================================
// Types
// ============================================================================

export type YoureAllSetVariant = 'base' | 'post_survey' | 'post_pass' | 'post_expired' | 'post_unmatch';

interface SurveyStats {
  surveysCompleted: number;
  friendsHelped: number;
  currentStreak: number;
  longestStreak: number;
  matchesFacilitated: number;
  weeklyRank?: number;
}

interface YoureAllSetViewProps {
  variant?: YoureAllSetVariant;
  stats?: SurveyStats;
  canEditSurvey?: boolean;
  onEditSurvey?: () => void;
  onCountdownComplete?: () => void;
  expiredMatchName?: string;
}

interface VariantConfig {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  encouragement: string;
  showCountdown: boolean;
  showStats: boolean;
  showEditSurvey: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const VARIANT_CONFIG: Record<YoureAllSetVariant, VariantConfig> = {
  base: {
    icon: 'checkmark-circle',
    iconColor: COLORS.success,
    iconBgColor: COLORS.successBg,
    title: "You're All Set",
    subtitle: "You've done your part. Now sit back and let the community work its magic.",
    encouragement: "Your next match could be right around the corner. We'll notify you when something special comes up.",
    showCountdown: true,
    showStats: true,
    showEditSurvey: true,
  },
  post_survey: {
    icon: 'heart-circle',
    iconColor: COLORS.pink,
    iconBgColor: COLORS.pinkBg,
    title: 'Great Work',
    subtitle: "Your rankings are in. You're helping friends find meaningful connections.",
    encouragement: "Every survey you complete makes the community's matches better. You're making a real difference.",
    showCountdown: true,
    showStats: true,
    showEditSurvey: true,
  },
  post_pass: {
    icon: 'heart-outline',
    iconColor: COLORS.purple,
    iconBgColor: COLORS.purpleBg,
    title: "You're All Set",
    subtitle: "It's okay to wait for the right connection. Trust your instincts.",
    encouragement: "The community is still working to find your perfect match. Good things take time.",
    showCountdown: true,
    showStats: false,
    showEditSurvey: false,
  },
  post_expired: {
    icon: 'time-outline',
    iconColor: COLORS.warning,
    iconBgColor: COLORS.warningBg,
    title: 'Match Expired',
    subtitle: "A recent match has expired. Don't worry—there's more to come.",
    encouragement: "Life gets busy. Your next match will be waiting for you. We'll make sure to notify you.",
    showCountdown: true,
    showStats: false,
    showEditSurvey: false,
  },
  post_unmatch: {
    icon: 'leaf-outline',
    iconColor: COLORS.teal,
    iconBgColor: COLORS.tealBg,
    title: 'A Fresh Start',
    subtitle: "It's healthy to recognize when something isn't right. We're here for you.",
    encouragement: "Your community is still here, working to find connections that truly fit. Better things are ahead.",
    showCountdown: true,
    showStats: false,
    showEditSurvey: false,
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Stat Card - animated entry with staggered delay
 */
const StatCard: React.FC<{
  value: number;
  label: string;
  icon: string;
  color: string;
  delay: number;
}> = ({ value, label, icon, color, delay }) => {
  const slideAnim = useRef(new Animated.Value(8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <StyledView className="w-10 h-10 rounded-full items-center justify-center mb-2" style={{ backgroundColor: `${color}15` }}>
        <Ionicons name={icon as any} size={20} color={color} />
      </StyledView>
      <Body style={{ fontSize: 20, fontWeight: '600', color: COLORS.neutral900 }}>{value}</Body>
      <Body className="text-center mt-1" style={{ fontSize: 12, color: COLORS.neutral500 }}>{label}</Body>
    </Animated.View>
  );
};

/**
 * Section Label - uppercase 12px/500 per spec
 */
const SectionLabel: React.FC<{ children: string; className?: string }> = ({ children, className = '' }) => (
  <Body className={className} style={{ fontSize: 12, fontWeight: '500', color: COLORS.neutral400, letterSpacing: 0.5, textTransform: 'uppercase' }}>
    {children}
  </Body>
);

/**
 * Info Card wrapper - 12px radius per spec
 */
const InfoCard: React.FC<{
  bgColor: string;
  borderColor: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  label: string;
  textColor: string;
  children: React.ReactNode;
}> = ({ bgColor, borderColor, icon, iconBgColor, iconColor, label, textColor, children }) => (
  <StyledView className="mx-1 p-4" style={{ backgroundColor: bgColor, borderRadius: 12, borderWidth: 1, borderColor }}>
    <StyledView className="flex-row items-center mb-3">
      <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: iconBgColor }}>
        <Ionicons name={icon as any} size={14} color={iconColor} />
      </StyledView>
      <SectionLabel className="ml-3">{label}</SectionLabel>
    </StyledView>
    <Body style={{ fontSize: 16, lineHeight: 24, color: textColor }}>{children}</Body>
  </StyledView>
);

// ============================================================================
// Main Component
// ============================================================================

export const YoureAllSetView: React.FC<YoureAllSetViewProps> = ({
  variant = 'base',
  stats,
  canEditSurvey = false,
  onEditSurvey,
  onCountdownComplete,
  expiredMatchName,
}) => {
  const config = VARIANT_CONFIG[variant];

  // Animation refs
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(12)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.9)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(16)).current;
  const ctaFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant === 'post_survey') {
      successHaptic();
    }

    // Header animation
    Animated.parallel([
      Animated.timing(headerFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_STANDARD, easing: ANIMATION.EASING, useNativeDriver: true }),
      Animated.timing(headerSlideAnim, { toValue: 0, duration: ANIMATION.DURATION_STANDARD, easing: ANIMATION.EASING, useNativeDriver: true }),
      Animated.spring(iconScaleAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();

    // Cards animation (staggered)
    const cardTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
        Animated.timing(cardSlideAnim, { toValue: 0, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
      ]).start();
    }, ANIMATION.STAGGER_CARD);

    // CTA animation (staggered)
    const ctaTimer = setTimeout(() => {
      Animated.timing(ctaFadeAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, useNativeDriver: true }).start();
    }, ANIMATION.STAGGER_CTA);

    return () => {
      clearTimeout(cardTimer);
      clearTimeout(ctaTimer);
    };
  }, [variant, headerFadeAnim, headerSlideAnim, iconScaleAnim, cardFadeAnim, cardSlideAnim, ctaFadeAnim]);

  const subtitleText = variant === 'post_expired' && expiredMatchName
    ? `Your match with ${expiredMatchName} has expired. Don't worry—there's more to come.`
    : config.subtitle;

  return (
    <StyledView className="flex-1">
      {/* Header Section */}
      <Animated.View style={{ opacity: headerFadeAnim, transform: [{ translateY: headerSlideAnim }], paddingTop: 8 }}>
        <StyledView className="items-center mb-6">
          {/* Icon */}
          <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
            <StyledView className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: config.iconBgColor }}>
              <Ionicons name={config.icon as any} size={36} color={config.iconColor} />
            </StyledView>
          </Animated.View>

          {/* Title: H1 24px/600 per spec */}
          <H1 className="text-center mb-2" style={{ fontSize: 24, fontWeight: '600', color: COLORS.neutral900 }}>{config.title}</H1>

          {/* Subtitle: Body 16px/400, neutral.600 */}
          <Body className="text-center px-8" style={{ fontSize: 16, lineHeight: 24, color: COLORS.neutral600 }}>{subtitleText}</Body>
        </StyledView>
      </Animated.View>

      {/* Countdown Timer */}
      {config.showCountdown && onCountdownComplete && (
        <Animated.View style={{ opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] }}>
          <StyledView className="mb-4 px-1">
            <SurveyCountdown onCountdownComplete={onCountdownComplete} />
          </StyledView>
        </Animated.View>
      )}

      {/* Stats Card - 12px radius per spec */}
      {config.showStats && stats && (
        <Animated.View style={{ opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] }}>
          <StyledView
            className="mb-4 mx-1 py-5"
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.neutral200,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <SectionLabel className="mb-4 px-4">Your Impact</SectionLabel>
            <StyledView className="flex-row">
              <StatCard value={stats.friendsHelped} label="Friends Helped" icon="people" color={COLORS.primary500} delay={200} />
              <StatCard value={stats.currentStreak} label="Day Streak" icon="flame" color={COLORS.orange} delay={250} />
              <StatCard value={stats.matchesFacilitated || 0} label="Matches Made" icon="heart" color={COLORS.pink} delay={300} />
            </StyledView>
          </StyledView>
        </Animated.View>
      )}

      {/* Weekly Rank Badge */}
      {stats?.weeklyRank && stats.weeklyRank <= 10 && config.showStats && (
        <Animated.View style={{ opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] }}>
          <StyledView className="mb-4 mx-1 p-4" style={{ backgroundColor: COLORS.warningBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.warningBorder }}>
            <StyledView className="flex-row items-center">
              <StyledView className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: COLORS.warningBadgeBg }}>
                <Ionicons name="trophy" size={20} color={COLORS.warning} />
              </StyledView>
              <StyledView className="flex-1 ml-3">
                <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.warningText }}>Top {stats.weeklyRank}% Matcher</Body>
                <Body className="mt-0.5" style={{ fontSize: 14, color: COLORS.warningTextSecondary }}>You're one of our most active members</Body>
              </StyledView>
            </StyledView>
          </StyledView>
        </Animated.View>
      )}

      {/* What Happens Next Card */}
      <Animated.View style={{ opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] }}>
        <StyledView className="mb-4">
          <InfoCard
            bgColor={COLORS.primary50}
            borderColor={COLORS.primaryBorder}
            icon="sparkles"
            iconBgColor={COLORS.primary500}
            iconColor={COLORS.white}
            label="What happens next"
            textColor={COLORS.neutral600}
          >
            {config.encouragement}
          </InfoCard>
        </StyledView>
      </Animated.View>

      {/* Edit Survey Button - 8px radius for buttons per spec */}
      {config.showEditSurvey && canEditSurvey && onEditSurvey && (
        <Animated.View style={{ opacity: ctaFadeAnim, paddingHorizontal: 4 }}>
          <StyledTouchableOpacity
            onPress={onEditSurvey}
            activeOpacity={0.7}
            className="mb-4 flex-row items-center justify-center py-3.5"
            style={{ backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.neutral300 }}
          >
            <Ionicons name="pencil-outline" size={16} color={COLORS.primary500} />
            <Body className="ml-2" style={{ color: COLORS.primary500, fontSize: 16, fontWeight: '600' }}>Edit Today's Survey</Body>
          </StyledTouchableOpacity>
        </Animated.View>
      )}

      {/* Community Impact Card */}
      <Animated.View style={{ opacity: ctaFadeAnim }}>
        <InfoCard
          bgColor={COLORS.successBg}
          borderColor={COLORS.successBorder}
          icon="heart"
          iconBgColor={COLORS.success}
          iconColor={COLORS.white}
          label="Your impact matters"
          textColor={COLORS.successText}
        >
          Every survey you complete helps your community find meaningful connections. Quality matchmaking takes all of us working together.
        </InfoCard>
      </Animated.View>
    </StyledView>
  );
};

export default YoureAllSetView;
