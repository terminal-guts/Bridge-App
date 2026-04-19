/**
 * MatchProposalScreen Components
 * Extracted from MatchProposalScreen.tsx for maintainability.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  Modal,
  useWindowDimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { styled } from 'nativewind';
import { Body } from '../../components/ui';
import { EvaIcon, IconScoutIcon } from '../../components/icons';
import { lightHaptic, successHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { DURATIONS, SPRINGS } from '../../constants/animations';
import { SHADOWS, OVERLAYS } from '../../theme/shadows';
import { COLORS as THEME_COLORS } from '../../theme/colors';
import { Image } from 'expo-image';

// Screen dimensions now read per-component via useWindowDimensions() so values
// reflow on rotation, split-view, and different devices.

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

// Color tokens — referencing theme COLORS where possible
export const COLORS = {
  neutral900: THEME_COLORS.text.primary,
  neutral800: '#1D2939',
  neutral700: THEME_COLORS.text.secondary,
  neutral600: '#475467',
  neutral500: THEME_COLORS.navInactiveIcon,
  neutral400: THEME_COLORS.text.tertiary,
  neutral300: THEME_COLORS.border,
  neutral200: THEME_COLORS.border,
  neutral100: THEME_COLORS.card,
  neutral50: THEME_COLORS.card,
  white: THEME_COLORS.card,
  primary500: THEME_COLORS.primaryAccent,
  primary50: '#F2F6FF',
  primaryBorder: '#BFDBFE',
  success: THEME_COLORS.success,
  successBg: '#ECFDF5',
  successBorder: 'rgba(52, 199, 89, 0.08)',
  warning: THEME_COLORS.amber,
  warningBg: 'rgba(245, 158, 11, 0.08)',
  warningBorder: THEME_COLORS.border,
  warningIcon: THEME_COLORS.amber,
  error: THEME_COLORS.error,
  errorBg: 'rgba(239, 68, 68, 0.08)',
  errorText: '#B42318',
  freqLime: '#84CC16',
  freqOrange: '#F97316',
  accentBg: '#EFF6FF',
  accentText: THEME_COLORS.primary,
  skeletonDark: '#1A1A1A',
  whiteTranslucent: '#FFFFFFCC',
} as const;

// Animation easing (durations and springs now come from DURATIONS/SPRINGS imports)
const ANIMATION_EASING = Easing.out(Easing.cubic);

// ── Pill Styles Config ──────────────────────────────────────────────────────

export const PILL_STYLES: Record<string, { bg: string; iconColor: string; textColor: string }> = {
  'pin': { bg: COLORS.accentBg, iconColor: THEME_COLORS.primary, textColor: COLORS.accentText },
  'maximize': { bg: COLORS.successBg, iconColor: COLORS.success, textColor: THEME_COLORS.success },
  'person': { bg: COLORS.accentBg, iconColor: THEME_COLORS.primary, textColor: COLORS.accentText },
  'message-circle': { bg: COLORS.accentBg, iconColor: THEME_COLORS.primary, textColor: COLORS.accentText },
  'globe': { bg: COLORS.warningBg, iconColor: COLORS.warning, textColor: COLORS.warningIcon },
  'star': { bg: COLORS.accentBg, iconColor: THEME_COLORS.primary, textColor: COLORS.accentText },
  'flag': { bg: COLORS.errorBg, iconColor: THEME_COLORS.error, textColor: COLORS.errorText },
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

export const getFirstInitial = (name?: string | null): string => {
  if (!name || name.length === 0) return '?';
  return name.charAt(0).toUpperCase();
};

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
  if (communityScore >= 0.8) return { count, topReason: 'Your friends really think you two would hit it off', confidenceLevel: 'high' };
  if (communityScore >= 0.6) return { count, topReason: 'Your friends see real potential here', confidenceLevel: 'medium' };
  return { count, topReason: 'Your friends thought this was worth a look', confidenceLevel: 'low' };
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
  { id: 'not_my_type', label: "Didn't feel a connection", icon: 'close-circle' },
  { id: 'age', label: 'Looking for a different age range', icon: 'calendar' },
  { id: 'location', label: 'Too far away', icon: 'pin' },
  { id: 'lifestyle', label: "Our lifestyles don't align", icon: 'activity' },
  { id: 'values', label: 'We value different things', icon: 'star' },
  { id: 'other', label: 'Something else', icon: 'more-horizontal' },
];

// ── Sub-Components ──────────────────────────────────────────────────────────

export const LoadingSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const PHOTO_HEIGHT = Math.min(SCREEN_HEIGHT * 0.48, SCREEN_WIDTH * 1.12);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: DURATIONS.emphasis, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: DURATIONS.emphasis, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <StyledView className="flex-1 bg-black">
      <Animated.View style={{ opacity: pulseAnim, height: PHOTO_HEIGHT, backgroundColor: COLORS.skeletonDark }} />
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
    const interval = setInterval(() => setTimeLeft(calculateTimeRemaining(expiresAt)), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.expired) {
    return (
      <StyledView className="flex-row items-center px-3.5 py-2 rounded-full" style={{ backgroundColor: `${THEME_COLORS.error}E6` }}>
        <EvaIcon name="clock" variant="outline" size={13} color="white" />
        <Body className="text-white text-xs font-semibold ml-1.5 tracking-wide">Expired</Body>
      </StyledView>
    );
  }

  const isUrgent = timeLeft.hours < 6;
  return (
    <StyledView className="flex-row items-center px-3.5 py-2 rounded-full" style={{ backgroundColor: isUrgent ? `${THEME_COLORS.amber}E6` : OVERLAYS.light }}>
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
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;

  useEffect(() => {
    animatedValue.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(animatedValue, { toValue: displayScore, duration: DURATIONS.emphasis * 2, easing: ANIMATION_EASING, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, damping: SPRINGS.gentle.damping, stiffness: SPRINGS.gentle.stiffness, mass: SPRINGS.gentle.mass, useNativeDriver: true }),
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
      ? { bg: COLORS.primary500, light: '#EFF6FF' }
      : displayScore >= 40
        ? { bg: COLORS.warning, light: COLORS.warningBg }
        : { bg: COLORS.neutral400, light: COLORS.neutral50 };

  const conf = {
    high: { bg: COLORS.successBg, text: THEME_COLORS.success, label: 'Strong Match' },
    medium: { bg: '#EFF6FF', text: THEME_COLORS.primary, label: 'Good Vibes' },
    low: { bg: COLORS.warningBg, text: COLORS.warningIcon, label: 'Worth a Look' },
  }[endorsement.confidenceLevel];

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: Math.round(20 * SCALE),
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: colors.light,
        ...SHADOWS.md,
      }}
    >
      <StyledView className="flex-row items-center justify-between mb-2">
        <StyledView className="flex-row items-center" style={{ flex: 1, marginRight: 8 }}>
          <StyledView className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.light }}>
            <EvaIcon name="people" variant="fill" size={18} color={colors.bg} />
          </StyledView>
          <Body className="font-bold ml-3 tracking-tight" style={{ color: COLORS.neutral800, fontSize: Math.round(FONT_SIZES.base * SCALE) }}>Your Friends' Verdict</Body>
        </StyledView>
        <StyledView className="px-3 py-1.5 rounded-full" style={{ backgroundColor: conf.bg }}>
          <Body className="text-xs font-semibold" style={{ color: conf.text }}>{conf.label}</Body>
        </StyledView>
      </StyledView>

      <StyledView className="flex-row items-end mt-1">
        <Body style={{ fontSize: Math.round((FONT_SIZES['7xl'] + 8) * SCALE), lineHeight: Math.round((LINE_HEIGHTS['7xl'] + 4) * SCALE), fontFamily: FONTS.extraBold, fontWeight: '800', color: colors.bg }}>{displayedScore}</Body>
        <Body className="font-bold mb-2.5 ml-0.5" style={{ fontSize: Math.round(FONT_SIZES['2xl'] * SCALE), color: colors.bg, opacity: 0.5 }}>%</Body>
      </StyledView>

      <StyledView className="h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: COLORS.neutral100 }}>
        <Animated.View className="h-full rounded-full" style={{ backgroundColor: colors.bg, width: animatedValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
      </StyledView>

      <StyledView className="mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: COLORS.neutral100 }}>
        <StyledView className="flex-row items-center mb-2">
          <StyledView className="flex-row">
            {[...Array(Math.min(endorsement.count, 5))].map((_, i) => (
              <StyledView key={i} className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: colors.light, borderWidth: 2, borderColor: COLORS.white, marginLeft: i > 0 ? -8 : 0 }}>
                <EvaIcon name="person" variant="fill" size={11} color={colors.bg} />
              </StyledView>
            ))}
          </StyledView>
          <Body className="font-semibold ml-3 text-sm" style={{ color: COLORS.neutral700, flexShrink: 1 }}>{endorsement.count} friend{endorsement.count !== 1 ? 's' : ''} voted</Body>
        </StyledView>
        {endorsement.topReason && <Body className="text-sm" style={{ color: COLORS.neutral400, lineHeight: LINE_HEIGHTS.base }}>"{endorsement.topReason}"</Body>}
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
        <Body className="font-bold text-base ml-3 tracking-tight" style={{ color: COLORS.neutral800 }}>Why You Two</Body>
      </StyledView>

      {mutualInterests.length > 0 && (
        <StyledView className="mb-4">
          <StyledView className="flex-row items-center mb-3">
            <EvaIcon name="heart" variant="outline" size={13} color={COLORS.primary500} />
            <Body className="text-sm font-semibold ml-2" style={{ color: THEME_COLORS.primary }}>You both love</Body>
          </StyledView>
          <StyledView className="flex-row flex-wrap">
            {mutualInterests.map((interest) => (
              <StyledView key={interest} className="rounded-full px-3.5 py-2 mr-2 mb-2 flex-row items-center" style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: COLORS.primaryBorder }}>
                <EvaIcon name="checkmark-circle-2" variant="outline" size={12} color={COLORS.primary500} />
                <IconScoutIcon name={require('../../utils/emojiMaps').interestIconName(interest) ?? ''} size={14} style={{ marginRight: 3 }} />
                <Body className="text-sm font-medium ml-1.5" style={{ color: THEME_COLORS.primary }}>{interest}</Body>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {mutualValues.length > 0 && (
        <StyledView className="mb-4">
          <StyledView className="flex-row items-center mb-3">
            <EvaIcon name="award" variant="outline" size={13} color={COLORS.success} />
            <Body className="text-sm font-semibold ml-2" style={{ color: THEME_COLORS.success }}>Shared values</Body>
          </StyledView>
          <StyledView className="flex-row flex-wrap">
            {mutualValues.map((value) => (
              <StyledView key={value} className="rounded-full px-3.5 py-2 mr-2 mb-2 flex-row items-center" style={{ backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.successBorder }}>
                <EvaIcon name="checkmark-circle-2" variant="outline" size={12} color={COLORS.success} />
                <IconScoutIcon name={require('../../utils/emojiMaps').valueIconName(value) ?? ''} size={14} style={{ marginRight: 3 }} />
                <Body className="text-sm font-medium ml-1.5" style={{ color: THEME_COLORS.success }}>{value}</Body>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {compatibilityHighlights.length > 0 && compatibilityHighlights.map((highlight, i) => (
        <StyledView key={highlight} className="flex-row items-center" style={{ marginBottom: i === compatibilityHighlights.length - 1 ? 0 : 8 }}>
          <EvaIcon name="checkmark" variant="outline" size={15} color={COLORS.primary500} />
          <Body className="text-sm ml-2.5" style={{ color: COLORS.neutral600, lineHeight: LINE_HEIGHTS.base }}>{highlight}</Body>
        </StyledView>
      ))}
    </StyledView>
  );
};

export const BlurredPhoto: React.FC<{ uri: string; style?: object; index: number }> = ({ uri, style, index }) => {
  const BLUR_LEVELS = [5, 10, 12, 15];
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return (
      <StyledView style={[style, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]} accessibilityRole="image" accessibilityLabel="Photo unavailable">
        <EvaIcon name="person" variant="outline" size={48} color="#525252" />
      </StyledView>
    );
  }

  return (
    <StyledView style={style} accessibilityRole="image" accessibilityLabel={`Photo ${index + 1}`}>
      <StyledImage source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" blurRadius={BLUR_LEVELS[Math.min(index, BLUR_LEVELS.length - 1)]} transition={200} cachePolicy="memory-disk" priority="high" onError={() => setHasError(true)} />
      <StyledView className="absolute inset-0" style={{ backgroundColor: `rgba(255,255,255,${0.03 + index * 0.02})` }} />
    </StyledView>
  );
};

export const InfoPill: React.FC<{ icon: string; text: string }> = React.memo(({ icon, text }) => {
  const style = PILL_STYLES[icon] || PILL_STYLES.default;
  return (
    <StyledView className="flex-row items-center rounded-full px-3.5 py-2 mr-2 mb-2.5" style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: `${style.iconColor}20` }}>
      <EvaIcon name={icon} variant="outline" size={14} color={style.iconColor} />
      <Body className="text-sm font-medium ml-1.5" style={{ color: style.textColor, flexShrink: 1 }} numberOfLines={1}>{text}</Body>
    </StyledView>
  );
});

export const Section: React.FC<{ title: string; icon: string; children: React.ReactNode; delay?: number }> = React.memo(({ title, icon, children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: DURATIONS.slow, easing: ANIMATION_EASING, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: DURATIONS.slow, easing: ANIMATION_EASING, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: Math.round(28 * SCALE) }}>
      <StyledView className="flex-row items-center mb-4">
        <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
          <EvaIcon name={icon} variant="outline" size={15} color={COLORS.primary500} />
        </StyledView>
        <Body className="text-xs uppercase tracking-widest ml-3 font-medium" style={{ color: COLORS.neutral400 }}>{title}</Body>
      </StyledView>
      {children}
    </Animated.View>
  );
});

export const Tag: React.FC<{ label: string; variant?: 'default' | 'primary' | 'success'; isMutual?: boolean; iconName?: string }> = ({ label, variant = 'default', isMutual = false, iconName }) => {
  const tagStyles = {
    default: { bg: COLORS.neutral50, border: COLORS.neutral200, text: COLORS.neutral600 },
    primary: { bg: '#EFF6FF', border: COLORS.primaryBorder, text: THEME_COLORS.primary },
    success: { bg: COLORS.successBg, border: COLORS.successBorder, text: THEME_COLORS.success },
  };
  const s = tagStyles[variant];
  const accentColor = variant === 'primary' ? COLORS.primary500 : COLORS.success;

  return (
    <StyledView className="rounded-full px-4 py-2.5 mr-2 mb-2.5 flex-row items-center" style={{ backgroundColor: isMutual ? accentColor : s.bg, borderWidth: isMutual ? 0 : 1, borderColor: s.border }}>
      {iconName && <IconScoutIcon name={iconName} size={14} style={{ marginRight: 4 }} />}
      <Body className="text-sm font-semibold" style={{ color: isMutual ? COLORS.white : s.text }}>{label}</Body>
    </StyledView>
  );
};

export const LifestyleRow: React.FC<{ icon?: string; customIcon?: React.ReactNode; label: string; value: string }> = ({ icon, customIcon, label, value }) => {
  const level = getFrequencyLevel(value);
  const freqColors = [COLORS.success, COLORS.freqLime, COLORS.warning, COLORS.freqOrange, COLORS.error];
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;

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
        <Body className="font-semibold text-sm" style={{ minWidth: Math.round(80 * SCALE), textAlign: 'right', color: COLORS.neutral800 }}>{value}</Body>
      </StyledView>
    </StyledView>
  );
};

// ── Modal Components ────────────────────────────────────────────────────────

export const ModalContainer: React.FC<{ visible: boolean; children: React.ReactNode; onClose: () => void; variant?: 'sheet' | 'center' }> = ({ visible, children, onClose, variant = 'sheet' }) => {
  const scaleAnim = useRef(new Animated.Value(variant === 'center' ? 0.95 : 0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: DURATIONS.micro, easing: ANIMATION_EASING, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: SPRINGS.gentle.damping, stiffness: SPRINGS.gentle.stiffness, mass: SPRINGS.gentle.mass, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(variant === 'center' ? 0.95 : 0.97);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, variant]);

  if (variant === 'center') {
    return (
      <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
        <StyledView className="flex-1 items-center justify-center px-5" style={{ backgroundColor: OVERLAYS.medium }}>
          <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], backgroundColor: COLORS.white, borderRadius: 12, padding: Math.round(24 * SCALE), width: '100%', maxWidth: Math.min(320, SCREEN_WIDTH - 40), ...SHADOWS.xxl }}>
            {children}
          </Animated.View>
        </StyledView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StyledView className="flex-1 justify-end" style={{ backgroundColor: OVERLAYS.medium }}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: Math.round(16 * SCALE), paddingTop: 16, paddingBottom: 32, maxHeight: '85%', ...SHADOWS.xl }}>
          <StyledView className="w-10 h-1 rounded-full self-center mb-5" style={{ backgroundColor: COLORS.neutral300 }} />
          {children}
        </Animated.View>
      </StyledView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const PassFeedbackModal: React.FC<{ visible: boolean; onClose: () => void; onSubmit: (feedbackId: string) => void }> = ({ visible, onClose, onSubmit }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  // When true, the reason list is hidden and the "Other" text input view replaces it (canonical in-place pattern).
  const [showOtherInput, setShowOtherInput] = useState(false);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;

  const resetAll = () => {
    setSelectedFeedback(null);
    setOtherText('');
    setShowOtherInput(false);
  };

  const handleClose = () => {
    onClose();
    resetAll();
  };

  const handleOptionSelect = (optionId: string) => {
    lightHaptic();
    if (optionId === 'other') {
      setSelectedFeedback('other');
      setShowOtherInput(true);
      return;
    }
    setSelectedFeedback(optionId === selectedFeedback ? null : optionId);
    setOtherText('');
  };

  const handleOtherBack = () => {
    // Return to the reason list so the user can pick a different option.
    setShowOtherInput(false);
    setSelectedFeedback(null);
    setOtherText('');
  };

  const handleOtherSubmit = () => {
    const trimmed = otherText.trim();
    if (!trimmed) return;
    onSubmit(`Other: ${trimmed}`);
    resetAll();
  };

  const handleSubmitList = () => {
    if (!selectedFeedback || selectedFeedback === 'other') return;
    onSubmit(selectedFeedback);
    resetAll();
  };

  const canSubmitList = !!selectedFeedback && selectedFeedback !== 'other';
  const canSubmitOther = otherText.trim().length > 0;

  return (
    <ModalContainer visible={visible} onClose={handleClose}>
      {showOtherInput ? (
        <>
          <Body className="text-center mb-2" style={{ fontSize: FONT_SIZES['3xl'], fontFamily: FONTS.semiBold, color: COLORS.neutral900 }}>Tell us what didn't feel right</Body>
          <Body className="text-center mb-6" style={{ fontSize: FONT_SIZES.xl, color: COLORS.neutral500, lineHeight: LINE_HEIGHTS['2xl'] }}>A quick note helps us surface better matches next time.</Body>

          <StyledView className="mb-4">
            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: COLORS.primary500,
                borderRadius: 12,
                padding: 14,
                fontFamily: FONTS.regular,
                fontSize: FONT_SIZES.lg,
                lineHeight: LINE_HEIGHTS.lg,
                color: THEME_COLORS.text.primary,
                minHeight: 100,
                maxHeight: 140,
                backgroundColor: THEME_COLORS.screenBackground,
                textAlignVertical: 'top',
              }}
              placeholder="Tell us a bit more..."
              placeholderTextColor={THEME_COLORS.text.tertiary}
              value={otherText}
              onChangeText={(t) => setOtherText(t.slice(0, 300))}
              multiline
              maxLength={300}
              autoFocus
              accessibilityLabel="Describe what didn't feel right"
            />
            <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: THEME_COLORS.text.tertiary, textAlign: 'right', marginTop: 4 }}>
              {otherText.length}/300
            </Text>
          </StyledView>

          <StyledView className="flex-row" style={{ gap: Math.round(12 * SCALE) }}>
            <StyledTouchableOpacity
              onPress={handleOtherBack}
              className="flex-1 items-center justify-center"
              style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 14, minHeight: 48, paddingVertical: Math.round(12 * SCALE) }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to reasons"
            >
              <Body style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.semiBold, color: COLORS.neutral600 }}>Back</Body>
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={handleOtherSubmit}
              disabled={!canSubmitOther}
              className="flex-1 items-center justify-center"
              style={{ backgroundColor: canSubmitOther ? COLORS.primary500 : COLORS.neutral300, borderRadius: 14, minHeight: 48, paddingVertical: Math.round(12 * SCALE), ...SHADOWS.sm }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Submit feedback"
              accessibilityState={{ disabled: !canSubmitOther }}
            >
              <Body style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.semiBold, color: COLORS.white }}>Submit</Body>
            </StyledTouchableOpacity>
          </StyledView>
        </>
      ) : (
        <>
          <Body className="text-center mb-2" style={{ fontSize: FONT_SIZES['3xl'], fontFamily: FONTS.semiBold, color: COLORS.neutral900 }}>Quick question before you go</Body>
          <Body className="text-center mb-6" style={{ fontSize: FONT_SIZES.xl, color: COLORS.neutral500, lineHeight: LINE_HEIGHTS['2xl'] }}>What didn't feel right? This helps us find better matches for you.</Body>

          <StyledView className="mb-6">
            {PASS_FEEDBACK_OPTIONS.map((option) => (
              <StyledTouchableOpacity
                key={option.id}
                onPress={() => handleOptionSelect(option.id)}
                className="flex-row items-center mb-2"
                hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
                style={{ backgroundColor: selectedFeedback === option.id ? COLORS.primary50 : COLORS.white, borderWidth: 1, borderColor: selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral300, borderRadius: 14, paddingVertical: Math.round(12 * SCALE), paddingHorizontal: Math.round(16 * SCALE), minHeight: 52 }}
                activeOpacity={0.7}
              >
                <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: selectedFeedback === option.id ? COLORS.primaryBorder : COLORS.neutral50 }}>
                  <EvaIcon name={option.icon} variant="outline" size={16} color={selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral500} />
                </StyledView>
                <Body className="ml-3 flex-1" style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.medium, color: selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral700 }}>{option.label}</Body>
                {selectedFeedback === option.id && <EvaIcon name="checkmark-circle-2" variant="outline" size={20} color={COLORS.primary500} />}
              </StyledTouchableOpacity>
            ))}
          </StyledView>

          <StyledView className="flex-row" style={{ gap: Math.round(12 * SCALE) }}>
            <StyledTouchableOpacity onPress={handleClose} className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 14, minHeight: 48, paddingVertical: Math.round(12 * SCALE) }} activeOpacity={0.7}>
              <Body style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.semiBold, color: COLORS.neutral600 }}>No Thanks</Body>
            </StyledTouchableOpacity>
            <StyledTouchableOpacity onPress={handleSubmitList} disabled={!canSubmitList} className="flex-1 items-center justify-center" style={{ backgroundColor: canSubmitList ? COLORS.primary500 : COLORS.neutral300, borderRadius: 14, minHeight: 48, paddingVertical: Math.round(12 * SCALE), ...SHADOWS.sm }} activeOpacity={0.8}>
              <Body style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.semiBold, color: COLORS.white }}>Submit</Body>
            </StyledTouchableOpacity>
          </StyledView>
        </>
      )}
    </ModalContainer>
  );
};

export const PassConfirmModal: React.FC<{ visible: boolean; onConfirm: () => void; onCancel: () => void }> = ({ visible, onConfirm, onCancel }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;
  return (
    <ModalContainer visible={visible} onClose={onCancel} variant="center">
      <StyledView className="items-center mb-5">
        <StyledView className="w-14 h-14 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.warningBg }}>
          <EvaIcon name="question-mark-circle" variant="outline" size={28} color={COLORS.warningIcon} />
        </StyledView>
        <Body className="text-center mb-2" style={{ fontSize: FONT_SIZES['3xl'], fontFamily: FONTS.semiBold, color: COLORS.neutral900 }}>Are you sure?</Body>
        <Body className="text-center" style={{ fontSize: FONT_SIZES.xl, color: COLORS.neutral500, lineHeight: LINE_HEIGHTS['2xl'] }}>If you pass, you won't be able to connect with this person later.</Body>
      </StyledView>
      <StyledView className="flex-row" style={{ gap: Math.round(12 * SCALE) }}>
        <StyledTouchableOpacity onPress={onCancel} className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 14, minHeight: 48, paddingVertical: Math.round(12 * SCALE) }} activeOpacity={0.7}>
          <Body style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.semiBold, color: COLORS.neutral600 }}>Go Back</Body>
        </StyledTouchableOpacity>
        <StyledTouchableOpacity onPress={onConfirm} className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.errorBg, borderRadius: 14, minHeight: 48, paddingVertical: Math.round(12 * SCALE) }} activeOpacity={0.7}>
          <Body style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.semiBold, color: COLORS.errorText }}>Yes, Pass</Body>
        </StyledTouchableOpacity>
      </StyledView>
    </ModalContainer>
  );
};

export const CelebrationOverlay: React.FC<{ visible: boolean; recipientName: string; onComplete: () => void }> = ({ visible, recipientName, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const heartScales = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current;
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SCALE = SCREEN_WIDTH / 375;

  useEffect(() => {
    if (!visible) return;

    // Triple haptic burst for celebration delight
    successHaptic();
    const hapticTimer2 = setTimeout(() => successHaptic(), 200);
    const hapticTimer3 = setTimeout(() => successHaptic(), 400);

    // Main icon: bouncy entrance with overshoot, then settle
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.2, damping: SPRINGS.bouncy.damping, stiffness: SPRINGS.bouncy.stiffness, mass: SPRINGS.bouncy.mass, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: SPRINGS.responsive.damping, stiffness: SPRINGS.responsive.stiffness, mass: SPRINGS.responsive.mass, useNativeDriver: true }),
    ]).start();

    // Spin-in for the heart icon
    Animated.timing(rotateAnim, { toValue: 1, duration: DURATIONS.emphasis, useNativeDriver: true }).start();

    // Fade in text slightly after icon lands
    const textTimer = setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: DURATIONS.normal, useNativeDriver: true }).start();
    }, DURATIONS.slow);

    // Scattered heart particles with staggered burst
    const heartTimers: NodeJS.Timeout[] = [];
    heartScales.forEach((scale, index) => {
      const heartTimer = setTimeout(() => {
        Animated.sequence([
          Animated.spring(scale, { toValue: 1, damping: SPRINGS.bouncy.damping, stiffness: SPRINGS.bouncy.stiffness, mass: SPRINGS.bouncy.mass, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0, duration: DURATIONS.slow, delay: DURATIONS.emphasis * 2, useNativeDriver: true }),
        ]).start();
      }, index * 80);
      heartTimers.push(heartTimer);
    });

    // 3 seconds lets users emotionally register the moment
    const completeTimer = setTimeout(onComplete, 3000);
    return () => {
      clearTimeout(hapticTimer2);
      clearTimeout(hapticTimer3);
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
      heartTimers.forEach(t => clearTimeout(t));
    };
  }, [visible, scaleAnim, rotateAnim, textOpacity, heartScales, onComplete]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade">
      <StyledView className="flex-1 items-center justify-center" style={{ backgroundColor: OVERLAYS.heavy }}>
        {heartScales.map((scale, index) => {
          const angle = (index * 30) * (Math.PI / 180);
          const radius = Math.round((90 + (index % 3) * 20) * SCALE);
          return (
            <Animated.View key={`heart-${index}`} style={{ position: 'absolute', transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }, { scale }] }}>
              <EvaIcon name="heart" variant="fill" size={Math.round((index % 3 === 0 ? 28 : 20) * SCALE)} color={COLORS.error} />
            </Animated.View>
          );
        })}
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }}>
          <StyledView className="rounded-full items-center justify-center mb-6" style={{ backgroundColor: COLORS.errorBg, width: Math.round(112 * SCALE), height: Math.round(112 * SCALE) }}>
            <EvaIcon name="heart" variant="fill" size={Math.round(64 * SCALE)} color={COLORS.error} />
          </StyledView>
        </Animated.View>
        <Animated.View style={{ opacity: textOpacity }}>
          <Body className="text-white font-bold text-center mb-3 tracking-tight" style={{ fontSize: Math.round(FONT_SIZES['4xl'] * SCALE) }}>It's a Match!</Body>
          <Body className="text-center text-base" style={{ color: COLORS.whiteTranslucent, lineHeight: LINE_HEIGHTS['2xl'], paddingHorizontal: Math.round(40 * SCALE) }}>Your community saw something special with {recipientName}.{'\n'}Now it's your turn to discover it.</Body>
        </Animated.View>
      </StyledView>
    </Modal>
  );
};
