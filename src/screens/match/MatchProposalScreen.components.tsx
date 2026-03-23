/**
 * MatchProposalScreen Components
 * Extracted from MatchProposalScreen.tsx for maintainability.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { styled } from 'nativewind';
import { Body } from '../../components/ui';
import { EvaIcon, IconScoutIcon } from '../../components/icons';
import { lightHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../theme/shadows';
import { COLORS as THEME_COLORS } from '../../theme/colors';
import { Image } from 'expo-image';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

// Color tokens — referencing theme COLORS where possible
export const COLORS = {
  neutral900: THEME_COLORS.textDarkHeading,
  neutral800: '#1D2939',
  neutral700: THEME_COLORS.textGray800,
  neutral600: '#475467',
  neutral500: THEME_COLORS.navInactiveIcon,
  neutral400: THEME_COLORS.text.placeholder,
  neutral300: THEME_COLORS.borderDivider,
  neutral200: THEME_COLORS.borderNeutral,
  neutral100: THEME_COLORS.backgroundProgressTrack,
  neutral50: THEME_COLORS.backgroundSubtle,
  white: THEME_COLORS.card,
  primary500: THEME_COLORS.primaryAccent,
  primary50: '#F2F6FF',
  primaryBorder: THEME_COLORS.backgroundInterestTag,
  success: THEME_COLORS.emerald,
  successBg: '#ECFDF5',
  successBorder: THEME_COLORS.backgroundValuesTag,
  warning: THEME_COLORS.warning.icon,
  warningBg: THEME_COLORS.backgroundSoftYellow,
  warningBorder: '#FDE68A',
  warningIcon: THEME_COLORS.darkAmber,
  error: THEME_COLORS.error,
  errorBg: THEME_COLORS.backgroundSoftRed,
  errorText: '#B42318',
  pink: THEME_COLORS.pink,
  pinkBg: '#FDF2F8',
  purple: THEME_COLORS.violet,
  purpleBg: '#F5F3FF',
} as const;

// Animation constants
const ANIMATION = {
  DURATION_FAST: 180,
  DURATION_STANDARD: 200,
  DURATION_SLOW: 400,
  EASING: require('react-native').Easing.out(require('react-native').Easing.cubic),
} as const;

// ── Pill Styles Config ──────────────────────────────────────────────────────

export const PILL_STYLES: Record<string, { bg: string; iconColor: string; textColor: string }> = {
  'pin': { bg: THEME_COLORS.tier1.lightBg, iconColor: THEME_COLORS.tier1.icon, textColor: THEME_COLORS.blueText },
  'maximize': { bg: COLORS.successBg, iconColor: COLORS.success, textColor: THEME_COLORS.matchReasonGreen },
  'person': { bg: COLORS.purpleBg, iconColor: COLORS.purple, textColor: '#6D28D9' },
  'message-circle': { bg: COLORS.pinkBg, iconColor: COLORS.pink, textColor: '#BE185D' },
  'globe': { bg: COLORS.warningBg, iconColor: COLORS.warning, textColor: COLORS.warningIcon },
  'star': { bg: COLORS.purpleBg, iconColor: THEME_COLORS.purple, textColor: '#6D28D9' },
  'flag': { bg: '#FFF1F2', iconColor: THEME_COLORS.rose, textColor: '#BE123C' },
  default: { bg: COLORS.neutral50, iconColor: COLORS.neutral400, textColor: COLORS.neutral600 },
};

// ── Helper Functions ────────────────────────────────────────────────────────

export const formatFrequency = (value?: string): string | null => {
  if (!value) return null;
  return value
    .replace(/_/g, ' ')
    .replace(/\bdont\b/gi, "don't")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const getFirstInitial = (name: string): string => name?.charAt(0)?.toUpperCase() || '?';

export const calculateTimeRemaining = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    expired: false,
  };
};

export interface FriendEndorsement {
  count: number;
  topReason?: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export const getEndorsementData = (communityScore: number): FriendEndorsement => {
  const count = Math.round(communityScore * 10) || 3;
  if (communityScore >= 0.8) return { count, topReason: 'Strong compatibility match', confidenceLevel: 'high' };
  if (communityScore >= 0.6) return { count, topReason: 'Good personality match', confidenceLevel: 'medium' };
  return { count, topReason: 'Worth exploring', confidenceLevel: 'low' };
};

export const getFrequencyLevel = (value: string): number => {
  const lower = value.toLowerCase();
  if (lower.includes('never') || lower.includes('no')) return 0;
  if (lower.includes('rarely') || lower.includes('sometimes')) return 1;
  if (lower.includes('socially') || lower.includes('occasional')) return 2;
  if (lower.includes('often') || lower.includes('regular')) return 3;
  if (lower.includes('daily') || lower.includes('yes') || lower.includes('frequently')) return 4;
  return 2;
};

export interface PassFeedbackOption {
  id: string;
  label: string;
  icon: string;
}

export const PASS_FEEDBACK_OPTIONS: PassFeedbackOption[] = [
  { id: 'not_my_type', label: 'Not my type', icon: 'close-circle' },
  { id: 'age', label: 'Age preference', icon: 'calendar' },
  { id: 'location', label: 'Too far away', icon: 'pin' },
  { id: 'lifestyle', label: 'Lifestyle mismatch', icon: 'activity' },
  { id: 'values', label: 'Different values', icon: 'star' },
  { id: 'other', label: 'Other reason', icon: 'more-horizontal' },
];

// ── Sub-Components ──────────────────────────────────────────────────────────

export const LoadingSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const PHOTO_HEIGHT = require('react-native').Dimensions.get('window').height * 0.48;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <StyledView className="flex-1 bg-black">
      <Animated.View style={{ opacity: pulseAnim, height: PHOTO_HEIGHT, backgroundColor: '#1a1a1a' }} />
      <StyledView className="px-5 py-8 bg-white -mt-6 rounded-t-3xl">
        <Animated.View style={{ opacity: pulseAnim }}>
          <StyledView className="h-8 rounded-xl mb-4 w-28" style={{ backgroundColor: COLORS.neutral100 }} />
          <StyledView className="h-4 rounded-lg mb-3 w-36" style={{ backgroundColor: COLORS.neutral100 }} />
          <StyledView className="h-4 rounded-lg w-48" style={{ backgroundColor: COLORS.neutral100 }} />
        </Animated.View>
      </StyledView>
    </StyledView>
  );
};

export const ExpirationTimer: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeRemaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calculateTimeRemaining(expiresAt)), 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.expired) {
    return (
      <StyledView className="flex-row items-center px-3.5 py-2 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}>
        <EvaIcon name="clock" variant="outline" size={13} color="white" />
        <Body className="text-white text-xs font-semibold ml-1.5 tracking-wide">Expired</Body>
      </StyledView>
    );
  }

  const isUrgent = timeLeft.hours < 6;
  return (
    <StyledView className="flex-row items-center px-3.5 py-2 rounded-full" style={{ backgroundColor: isUrgent ? 'rgba(245, 158, 11, 0.9)' : 'rgba(0, 0, 0, 0.4)' }}>
      <EvaIcon name="clock" variant="outline" size={13} color="white" />
      <Body className="text-white text-xs font-semibold ml-1.5 tracking-wide">{timeLeft.hours}h {timeLeft.minutes}m</Body>
    </StyledView>
  );
};

export const CommunityScore: React.FC<{ score: number; endorsement: FriendEndorsement }> = ({ score, endorsement }) => {
  const displayScore = Math.round(score * 100);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [displayedScore, setDisplayedScore] = useState(0);
  const listenerRef = useRef<string | null>(null);

  useEffect(() => {
    animatedValue.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(animatedValue, { toValue: displayScore, duration: 1200, easing: ANIMATION.EASING, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]);
    animation.start();

    listenerRef.current = animatedValue.addListener(({ value }) => setDisplayedScore(Math.round(value)));

    return () => {
      animation.stop();
      if (listenerRef.current) {
        animatedValue.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      animatedValue.stopAnimation();
    };
  }, [displayScore, animatedValue, scaleAnim]);

  const colors = displayScore >= 80
    ? { bg: COLORS.success, light: COLORS.successBg }
    : displayScore >= 60
      ? { bg: COLORS.primary500, light: THEME_COLORS.tier1.lightBg }
      : displayScore >= 40
        ? { bg: COLORS.warning, light: COLORS.warningBg }
        : { bg: COLORS.neutral400, light: COLORS.neutral50 };

  const conf = {
    high: { bg: COLORS.successBg, text: THEME_COLORS.matchReasonGreen, label: 'Very Confident' },
    medium: { bg: THEME_COLORS.tier1.lightBg, text: THEME_COLORS.primary, label: 'Confident' },
    low: { bg: COLORS.warningBg, text: COLORS.warningIcon, label: 'Exploring' },
  }[endorsement.confidenceLevel];

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.neutral200,
        ...SHADOWS.sm,
      }}
    >
      <StyledView className="flex-row items-center justify-between mb-4">
        <StyledView className="flex-row items-center">
          <StyledView className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: colors.light }}>
            <EvaIcon name="people" variant="outline" size={16} color={colors.bg} />
          </StyledView>
          <Body className="font-bold text-base ml-3 tracking-tight" style={{ color: COLORS.neutral800 }}>Community Score</Body>
        </StyledView>
        <StyledView className="px-3 py-1.5 rounded-full" style={{ backgroundColor: conf.bg }}>
          <Body className="text-xs font-semibold" style={{ color: conf.text }}>{conf.label}</Body>
        </StyledView>
      </StyledView>

      <StyledView className="flex-row items-end">
        <Body style={{ fontSize: 44, lineHeight: 48, fontWeight: '700', fontFamily: FONTS.bold, color: colors.bg }}>{displayedScore}</Body>
        <Body className="text-xl font-medium mb-2 ml-1" style={{ color: COLORS.neutral300 }}>%</Body>
      </StyledView>

      <StyledView className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: COLORS.neutral100 }}>
        <Animated.View className="h-full rounded-full" style={{ backgroundColor: colors.bg, width: animatedValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
      </StyledView>

      <StyledView className="mt-5 pt-5" style={{ borderTopWidth: 1, borderTopColor: COLORS.neutral100 }}>
        <StyledView className="flex-row items-center mb-2">
          <StyledView className="flex-row">
            {[...Array(Math.min(endorsement.count, 5))].map((_, i) => (
              <StyledView key={i} className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: THEME_COLORS.tier1.lightBg, borderWidth: 2, borderColor: COLORS.white, marginLeft: i > 0 ? -8 : 0 }}>
                <EvaIcon name="person" variant="outline" size={11} color={COLORS.primary500} />
              </StyledView>
            ))}
          </StyledView>
          <Body className="font-semibold ml-3 text-sm" style={{ color: COLORS.neutral700 }}>{endorsement.count} friend{endorsement.count !== 1 ? 's' : ''} voted</Body>
        </StyledView>
        {endorsement.topReason && <Body className="text-sm" style={{ color: COLORS.neutral400, lineHeight: 18 }}>"{endorsement.topReason}"</Body>}
      </StyledView>
    </Animated.View>
  );
};

export const WhyThisMatch: React.FC<{ mutualInterests: string[]; mutualValues: string[]; compatibilityHighlights: string[] }> = ({ mutualInterests, mutualValues, compatibilityHighlights }) => {
  if (mutualInterests.length === 0 && mutualValues.length === 0 && compatibilityHighlights.length === 0) return null;

  return (
    <StyledView className="p-4 mb-4" style={{ backgroundColor: COLORS.primary50, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primaryBorder }}>
      <StyledView className="flex-row items-center mb-4">
        <StyledView className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: COLORS.primary500 }}>
          <EvaIcon name="heart" variant="outline" size={16} color="white" />
        </StyledView>
        <Body className="font-bold text-base ml-3 tracking-tight" style={{ color: COLORS.neutral800 }}>Why This Match</Body>
      </StyledView>

      {mutualInterests.length > 0 && (
        <StyledView className="mb-4">
          <StyledView className="flex-row items-center mb-3">
            <EvaIcon name="heart" variant="outline" size={13} color={COLORS.primary500} />
            <Body className="text-sm font-semibold ml-2" style={{ color: THEME_COLORS.blueText }}>You both love</Body>
          </StyledView>
          <StyledView className="flex-row flex-wrap">
            {mutualInterests.map((interest) => (
              <StyledView key={interest} className="rounded-full px-3.5 py-2 mr-2 mb-2 flex-row items-center" style={{ backgroundColor: THEME_COLORS.tier1.lightBg, borderWidth: 1, borderColor: COLORS.primaryBorder }}>
                <EvaIcon name="checkmark-circle-2" variant="outline" size={12} color={COLORS.primary500} />
                <IconScoutIcon name={require('../../utils/emojiMaps').interestIconName(interest) ?? ''} size={14} style={{ marginRight: 3 }} />
                <Body className="text-sm font-medium ml-1.5" style={{ color: THEME_COLORS.blueText }}>{interest}</Body>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {mutualValues.length > 0 && (
        <StyledView className="mb-4">
          <StyledView className="flex-row items-center mb-3">
            <EvaIcon name="award" variant="outline" size={13} color={COLORS.success} />
            <Body className="text-sm font-semibold ml-2" style={{ color: THEME_COLORS.matchReasonGreen }}>Shared values</Body>
          </StyledView>
          <StyledView className="flex-row flex-wrap">
            {mutualValues.map((value) => (
              <StyledView key={value} className="rounded-full px-3.5 py-2 mr-2 mb-2 flex-row items-center" style={{ backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.successBorder }}>
                <EvaIcon name="checkmark-circle-2" variant="outline" size={12} color={COLORS.success} />
                <IconScoutIcon name={require('../../utils/emojiMaps').valueIconName(value) ?? ''} size={14} style={{ marginRight: 3 }} />
                <Body className="text-sm font-medium ml-1.5" style={{ color: THEME_COLORS.matchReasonGreen }}>{value}</Body>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {compatibilityHighlights.length > 0 && compatibilityHighlights.map((highlight, i) => (
        <StyledView key={highlight} className="flex-row items-center" style={{ marginBottom: i === compatibilityHighlights.length - 1 ? 0 : 8 }}>
          <EvaIcon name="checkmark" variant="outline" size={15} color={COLORS.primary500} />
          <Body className="text-sm ml-2.5" style={{ color: COLORS.neutral600, lineHeight: 18 }}>{highlight}</Body>
        </StyledView>
      ))}
    </StyledView>
  );
};

export const BlurredPhoto: React.FC<{ uri: string; style?: object; index: number }> = ({ uri, style, index }) => {
  const BLUR_LEVELS = [5, 10, 12, 15];
  return (
    <StyledView style={style}>
      <StyledImage source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" blurRadius={BLUR_LEVELS[Math.min(index, BLUR_LEVELS.length - 1)]} transition={0} cachePolicy="memory-disk" priority="high" />
      <StyledView className="absolute inset-0" style={{ backgroundColor: `rgba(255,255,255,${0.03 + index * 0.02})` }} />
    </StyledView>
  );
};

export const InfoPill: React.FC<{ icon: string; text: string }> = React.memo(({ icon, text }) => {
  const style = PILL_STYLES[icon] || PILL_STYLES.default;
  return (
    <StyledView className="flex-row items-center rounded-full px-3.5 py-2 mr-2 mb-2.5" style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: `${style.iconColor}20` }}>
      <EvaIcon name={icon} variant="outline" size={14} color={style.iconColor} />
      <Body className="text-sm font-medium ml-1.5" style={{ color: style.textColor }}>{text}</Body>
    </StyledView>
  );
});

export const Section: React.FC<{ title: string; icon: string; children: React.ReactNode; delay?: number }> = React.memo(({ title, icon, children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: ANIMATION.DURATION_SLOW, easing: ANIMATION.EASING, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: ANIMATION.DURATION_SLOW, easing: ANIMATION.EASING, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 28 }}>
      <StyledView className="flex-row items-center mb-4">
        <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: THEME_COLORS.tier1.lightBg }}>
          <EvaIcon name={icon} variant="outline" size={15} color={COLORS.primary500} />
        </StyledView>
        <Body className="text-xs uppercase tracking-widest ml-3 font-medium" style={{ color: COLORS.neutral400 }}>{title}</Body>
      </StyledView>
      {children}
    </Animated.View>
  );
});

export const Tag: React.FC<{ label: string; variant?: 'default' | 'primary' | 'success'; isMutual?: boolean; iconName?: string }> = ({ label, variant = 'default', isMutual = false, iconName }) => {
  const styles = {
    default: { bg: COLORS.neutral50, border: COLORS.neutral200, text: COLORS.neutral600 },
    primary: { bg: THEME_COLORS.tier1.lightBg, border: COLORS.primaryBorder, text: THEME_COLORS.blueText },
    success: { bg: COLORS.successBg, border: COLORS.successBorder, text: THEME_COLORS.matchReasonGreen },
  };
  const s = styles[variant];
  const accentColor = variant === 'primary' ? COLORS.primary500 : COLORS.success;

  return (
    <StyledView className="rounded-full px-4 py-2.5 mr-2 mb-2.5 flex-row items-center" style={{ backgroundColor: s.bg, borderWidth: isMutual ? 2 : 1, borderColor: isMutual ? accentColor : s.border }}>
      {isMutual && <EvaIcon name="checkmark-circle-2" variant="outline" size={13} color={accentColor} style={{ marginRight: 5 }} />}
      {iconName && <IconScoutIcon name={iconName} size={14} style={{ marginRight: 3 }} />}
      <Body className="text-sm font-medium" style={{ color: s.text }}>{label}</Body>
    </StyledView>
  );
};

export const LifestyleRow: React.FC<{ icon?: string; customIcon?: React.ReactNode; label: string; value: string }> = ({ icon, customIcon, label, value }) => {
  const level = getFrequencyLevel(value);
  const freqColors = [COLORS.success, '#84CC16', COLORS.warning, '#F97316', COLORS.error];

  return (
    <StyledView className="flex-row items-center justify-between py-4" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.neutral100 }}>
      <StyledView className="flex-row items-center flex-1">
        <StyledView className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: COLORS.neutral50 }}>
          {customIcon || <EvaIcon name={icon!} variant="outline" size={17} color={COLORS.neutral500} />}
        </StyledView>
        <Body className="ml-3 font-medium" style={{ color: COLORS.neutral600 }}>{label}</Body>
      </StyledView>
      <StyledView className="flex-row items-center">
        <StyledView className="flex-row mr-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <StyledView key={i} className="w-1.5 h-1.5 rounded-full mx-0.5" style={{ backgroundColor: i <= level ? freqColors[level] : COLORS.neutral200 }} />
          ))}
        </StyledView>
        <Body className="font-semibold text-sm" style={{ minWidth: 80, textAlign: 'right', color: COLORS.neutral800 }}>{value}</Body>
      </StyledView>
    </StyledView>
  );
};

// ── Modal Components ────────────────────────────────────────────────────────

export const ModalContainer: React.FC<{ visible: boolean; children: React.ReactNode; onClose: () => void; variant?: 'sheet' | 'center' }> = ({ visible, children, onClose, variant = 'sheet' }) => {
  const scaleAnim = useRef(new Animated.Value(variant === 'center' ? 0.95 : 0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: ANIMATION.DURATION_FAST, easing: ANIMATION.EASING, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 10, tension: 60, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(variant === 'center' ? 0.95 : 0.97);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, variant]);

  if (variant === 'center') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <StyledView className="flex-1 items-center justify-center px-5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], backgroundColor: COLORS.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 320, ...SHADOWS.xxl }}>
            {children}
          </Animated.View>
        </StyledView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <StyledView className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, maxHeight: '85%', ...SHADOWS.xl }}>
          <StyledView className="w-10 h-1 rounded-full self-center mb-5" style={{ backgroundColor: COLORS.neutral300 }} />
          {children}
        </Animated.View>
      </StyledView>
    </Modal>
  );
};

export const PassFeedbackModal: React.FC<{ visible: boolean; onClose: () => void; onSubmit: (feedbackId: string) => void }> = ({ visible, onClose, onSubmit }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);

  return (
    <ModalContainer visible={visible} onClose={onClose}>
      <Body className="text-center mb-2" style={{ fontSize: 20, fontWeight: '600', fontFamily: FONTS.semiBold, color: COLORS.neutral900 }}>Help us improve</Body>
      <Body className="text-center mb-6" style={{ fontSize: 16, color: COLORS.neutral500, lineHeight: 24 }}>Why wasn't this a good match? (Optional)</Body>

      <StyledView className="mb-6">
        {PASS_FEEDBACK_OPTIONS.map((option) => (
          <StyledTouchableOpacity
            key={option.id}
            onPress={() => { lightHaptic(); setSelectedFeedback(option.id === selectedFeedback ? null : option.id); }}
            className="flex-row items-center mb-2 py-3 px-4"
            style={{ backgroundColor: selectedFeedback === option.id ? COLORS.primary50 : COLORS.white, borderWidth: 1, borderColor: selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral300, borderRadius: 8 }}
            activeOpacity={0.7}
          >
            <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: selectedFeedback === option.id ? COLORS.primaryBorder : COLORS.neutral50 }}>
              <EvaIcon name={option.icon} variant="outline" size={16} color={selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral500} />
            </StyledView>
            <Body className="ml-3 flex-1" style={{ fontSize: 16, fontWeight: '500', fontFamily: FONTS.medium, color: selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral700 }}>{option.label}</Body>
            {selectedFeedback === option.id && <EvaIcon name="checkmark-circle-2" variant="outline" size={20} color={COLORS.primary500} />}
          </StyledTouchableOpacity>
        ))}
      </StyledView>

      <StyledView className="flex-row" style={{ gap: 12 }}>
        <StyledTouchableOpacity onPress={onClose} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8 }} activeOpacity={0.7}>
          <Body style={{ fontSize: 16, fontWeight: '600', fontFamily: FONTS.semiBold, color: COLORS.neutral600 }}>Skip</Body>
        </StyledTouchableOpacity>
        <StyledTouchableOpacity onPress={() => selectedFeedback ? onSubmit(selectedFeedback) : onClose()} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.primary500, borderRadius: 8, ...SHADOWS.sm }} activeOpacity={0.8}>
          <Body style={{ fontSize: 16, fontWeight: '600', fontFamily: FONTS.semiBold, color: COLORS.white }}>Done</Body>
        </StyledTouchableOpacity>
      </StyledView>
    </ModalContainer>
  );
};

export const PassConfirmModal: React.FC<{ visible: boolean; onConfirm: () => void; onCancel: () => void }> = ({ visible, onConfirm, onCancel }) => (
  <ModalContainer visible={visible} onClose={onCancel} variant="center">
    <StyledView className="items-center mb-5">
      <StyledView className="w-14 h-14 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.warningBg }}>
        <EvaIcon name="question-mark-circle" variant="outline" size={28} color={COLORS.warningIcon} />
      </StyledView>
      <Body className="text-center mb-2" style={{ fontSize: 20, fontWeight: '600', fontFamily: FONTS.semiBold, color: COLORS.neutral900 }}>Pass on this match?</Body>
      <Body className="text-center" style={{ fontSize: 16, color: COLORS.neutral500, lineHeight: 24 }}>Are you sure? You won't be able to match with this person again.</Body>
    </StyledView>
    <StyledView className="flex-row" style={{ gap: 12 }}>
      <StyledTouchableOpacity onPress={onCancel} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8 }} activeOpacity={0.7}>
        <Body style={{ fontSize: 16, fontWeight: '600', fontFamily: FONTS.semiBold, color: COLORS.neutral600 }}>Keep Looking</Body>
      </StyledTouchableOpacity>
      <StyledTouchableOpacity onPress={onConfirm} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.errorBg, borderRadius: 8 }} activeOpacity={0.7}>
        <Body style={{ fontSize: 16, fontWeight: '600', fontFamily: FONTS.semiBold, color: COLORS.errorText }}>Pass</Body>
      </StyledTouchableOpacity>
    </StyledView>
  </ModalContainer>
);

export const CelebrationOverlay: React.FC<{ visible: boolean; recipientName: string; onComplete: () => void }> = ({ visible, recipientName, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heartScales = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.2, friction: 3, tension: 40, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      Animated.timing(rotateAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

      const heartTimers: NodeJS.Timeout[] = [];
      heartScales.forEach((scale, index) => {
        const heartTimer = setTimeout(() => {
          Animated.sequence([
            Animated.spring(scale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0, duration: 400, delay: 800, useNativeDriver: true }),
          ]).start();
        }, index * 80);
        heartTimers.push(heartTimer);
      });

      const timer = setTimeout(onComplete, 2000);
      return () => {
        clearTimeout(timer);
        heartTimers.forEach(t => clearTimeout(t));
      };
    }
  }, [visible, scaleAnim, rotateAnim, heartScales, onComplete]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StyledView className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        {heartScales.map((scale, index) => {
          const angle = (index * 30) * (Math.PI / 180);
          return (
            <Animated.View key={`heart-${index}`} style={{ position: 'absolute', transform: [{ translateX: Math.cos(angle) * 100 }, { translateY: Math.sin(angle) * 100 }, { scale }] }}>
              <EvaIcon name="heart" variant="outline" size={24} color={COLORS.pink} />
            </Animated.View>
          );
        })}
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }}>
          <StyledView className="w-28 h-28 rounded-full items-center justify-center mb-6" style={{ backgroundColor: COLORS.successBg }}>
            <EvaIcon name="checkmark-circle-2" variant="outline" size={64} color={COLORS.success} />
          </StyledView>
        </Animated.View>
        <Animated.View style={{ opacity: scaleAnim }}>
          <Body className="text-white text-2xl font-bold text-center mb-3 tracking-tight">It's a Match!</Body>
          <Body className="text-center text-base px-10" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 24 }}>Your community saw something special with {recipientName}.{'\n'}Now it's your turn to discover it.</Body>
        </Animated.View>
      </StyledView>
    </Modal>
  );
};
