/**
 * Match Proposal Screen
 *
 * Displays a prospective match's profile with privacy restrictions.
 * Information is partially obscured until both parties accept the match.
 *
 * Privacy Restrictions:
 * - Name: Only first initial + age shown (e.g., "S, 27")
 * - Photos: Progressive blur (first less, others more)
 * - Hidden: School, Company, Job Title
 *
 * Features:
 * - "Why This Match" explainability section
 * - Mutual interests/values highlighting
 * - Animated community score
 * - Swipe gestures for Accept/Pass
 * - Pass feedback for better recommendations
 *
 * Design Philosophy: Calm, premium, romantic - consistent with Bridge visual identity
 * Follows Bridge Design & Technical Specifications
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Dimensions,
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Modal,
  Alert,
  ActionSheetIOS,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { Body } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile, DeepQuestionAnswer, Match } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic, mediumHaptic, successHaptic, warningHaptic } from '../../utils/haptics';
import { TIER_CONFIG } from '../../utils/questionTiers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFriends } from '../../services/friendService';
import { communityService } from '../../services/communityServiceIndex';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('MatchProposalScreen');

// ============================================================================
// Styled Components
// ============================================================================

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

// ============================================================================
// Constants - Design Tokens
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.min(SCREEN_HEIGHT * 0.48, SCREEN_WIDTH * 1.12);
const TAP_ZONE_WIDTH = SCREEN_WIDTH * 0.35;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const BLUR_LEVELS = [5, 10, 12, 15];

// Animation constants (per spec: 150-250ms, ease-out-cubic)
const ANIMATION = {
  DURATION_FAST: 180,
  DURATION_STANDARD: 200,
  DURATION_SLOW: 400,
  EASING: Easing.out(Easing.cubic),
} as const;

// Color tokens from design spec
const COLORS = {
  neutral900: '#101828',
  neutral800: '#1D2939',
  neutral700: '#344054',
  neutral600: '#475467',
  neutral500: '#667085',
  neutral400: '#98A2B3',
  neutral300: '#D0D5DD',
  neutral200: '#E4E7EC',
  neutral100: '#F2F4F7',
  neutral50: '#F9FAFB',
  white: '#FFFFFF',
  primary500: '#437FFF',
  primary50: '#F2F6FF',
  primaryBorder: '#DBEAFE',
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningIcon: '#D97706',
  error: '#EF4444',
  errorBg: '#FEF3F2',
  errorText: '#B42318',
  pink: '#EC4899',
  pinkBg: '#FDF2F8',
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',
} as const;

// ============================================================================
// Types
// ============================================================================

interface MatchProposalScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'MatchProposal'>;
}

interface FriendEndorsement {
  count: number;
  topReason?: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

interface PassFeedbackOption {
  id: string;
  label: string;
  icon: string;
}

// ============================================================================
// Configuration
// ============================================================================

const PASS_FEEDBACK_OPTIONS: PassFeedbackOption[] = [
  { id: 'not_my_type', label: 'Not my type', icon: 'heart-dislike-outline' },
  { id: 'age', label: 'Age preference', icon: 'calendar-outline' },
  { id: 'location', label: 'Too far away', icon: 'location-outline' },
  { id: 'lifestyle', label: 'Lifestyle mismatch', icon: 'leaf-outline' },
  { id: 'values', label: 'Different values', icon: 'diamond-outline' },
  { id: 'other', label: 'Other reason', icon: 'ellipsis-horizontal' },
];

const PILL_STYLES: Record<string, { bg: string; iconColor: string; textColor: string }> = {
  'location-outline': { bg: '#EFF6FF', iconColor: '#3B82F6', textColor: '#1D4ED8' },
  'resize-outline': { bg: COLORS.successBg, iconColor: COLORS.success, textColor: '#059669' },
  'person-outline': { bg: COLORS.purpleBg, iconColor: COLORS.purple, textColor: '#6D28D9' },
  'chatbubble-outline': { bg: COLORS.pinkBg, iconColor: COLORS.pink, textColor: '#BE185D' },
  'globe-outline': { bg: COLORS.warningBg, iconColor: COLORS.warning, textColor: COLORS.warningIcon },
  'sparkles-outline': { bg: COLORS.purpleBg, iconColor: '#7C3AED', textColor: '#6D28D9' },
  'flag-outline': { bg: '#FFF1F2', iconColor: '#F43F5E', textColor: '#BE123C' },
  default: { bg: COLORS.neutral50, iconColor: COLORS.neutral400, textColor: COLORS.neutral600 },
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatFrequency = (value?: string): string | null => {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getFirstInitial = (name: string): string => name?.charAt(0)?.toUpperCase() || '?';

const calculateTimeRemaining = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    expired: false,
  };
};

const getEndorsementData = (communityScore: number): FriendEndorsement => {
  const count = Math.round(communityScore * 10) || 3;
  if (communityScore >= 0.8) return { count, topReason: 'Strong compatibility match', confidenceLevel: 'high' };
  if (communityScore >= 0.6) return { count, topReason: 'Good personality match', confidenceLevel: 'medium' };
  return { count, topReason: 'Worth exploring', confidenceLevel: 'low' };
};

const getFrequencyLevel = (value: string): number => {
  const lower = value.toLowerCase();
  if (lower.includes('never') || lower.includes('no')) return 0;
  if (lower.includes('rarely') || lower.includes('sometimes')) return 1;
  if (lower.includes('socially') || lower.includes('occasional')) return 2;
  if (lower.includes('often') || lower.includes('regular')) return 3;
  if (lower.includes('daily') || lower.includes('yes') || lower.includes('frequently')) return 4;
  return 2;
};

// ============================================================================
// Sub-Components
// ============================================================================

const LoadingSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

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

const ExpirationTimer: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeRemaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calculateTimeRemaining(expiresAt)), 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.expired) {
    return (
      <StyledView className="flex-row items-center px-3.5 py-2 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}>
        <Ionicons name="time-outline" size={13} color="white" />
        <Body className="text-white text-xs font-semibold ml-1.5 tracking-wide">Expired</Body>
      </StyledView>
    );
  }

  const isUrgent = timeLeft.hours < 6;
  return (
    <StyledView className="flex-row items-center px-3.5 py-2 rounded-full" style={{ backgroundColor: isUrgent ? 'rgba(245, 158, 11, 0.9)' : 'rgba(0, 0, 0, 0.4)' }}>
      <Ionicons name="time-outline" size={13} color="white" />
      <Body className="text-white text-xs font-semibold ml-1.5 tracking-wide">{timeLeft.hours}h {timeLeft.minutes}m</Body>
    </StyledView>
  );
};

const CommunityScore: React.FC<{ score: number; endorsement: FriendEndorsement }> = ({ score, endorsement }) => {
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
      ? { bg: COLORS.primary500, light: '#EFF6FF' }
      : displayScore >= 40
        ? { bg: COLORS.warning, light: COLORS.warningBg }
        : { bg: COLORS.neutral400, light: COLORS.neutral50 };

  const conf = {
    high: { bg: COLORS.successBg, text: '#059669', label: 'Very Confident' },
    medium: { bg: '#EFF6FF', text: '#2563EB', label: 'Confident' },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <StyledView className="flex-row items-center justify-between mb-4">
        <StyledView className="flex-row items-center">
          <StyledView className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: colors.light }}>
            <Ionicons name="people" size={16} color={colors.bg} />
          </StyledView>
          <Body className="font-bold text-base ml-3 tracking-tight" style={{ color: COLORS.neutral800 }}>Community Score</Body>
        </StyledView>
        <StyledView className="px-3 py-1.5 rounded-full" style={{ backgroundColor: conf.bg }}>
          <Body className="text-xs font-semibold" style={{ color: conf.text }}>{conf.label}</Body>
        </StyledView>
      </StyledView>

      <StyledView className="flex-row items-end">
        <Body style={{ fontSize: 44, lineHeight: 48, fontWeight: '700', color: colors.bg }}>{displayedScore}</Body>
        <Body className="text-xl font-medium mb-2 ml-1" style={{ color: COLORS.neutral300 }}>%</Body>
      </StyledView>

      <StyledView className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: COLORS.neutral100 }}>
        <Animated.View className="h-full rounded-full" style={{ backgroundColor: colors.bg, width: animatedValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
      </StyledView>

      <StyledView className="mt-5 pt-5" style={{ borderTopWidth: 1, borderTopColor: COLORS.neutral100 }}>
        <StyledView className="flex-row items-center mb-2">
          <StyledView className="flex-row">
            {[...Array(Math.min(endorsement.count, 5))].map((_, i) => (
              <StyledView key={i} className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: COLORS.white, marginLeft: i > 0 ? -8 : 0 }}>
                <Ionicons name="person" size={11} color={COLORS.primary500} />
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

const WhyThisMatch: React.FC<{ mutualInterests: string[]; mutualValues: string[]; compatibilityHighlights: string[] }> = ({ mutualInterests, mutualValues, compatibilityHighlights }) => {
  if (mutualInterests.length === 0 && mutualValues.length === 0 && compatibilityHighlights.length === 0) return null;

  return (
    <StyledView className="p-4 mb-4" style={{ backgroundColor: COLORS.primary50, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primaryBorder }}>
      <StyledView className="flex-row items-center mb-4">
        <StyledView className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: COLORS.primary500 }}>
          <Ionicons name="sparkles" size={16} color="white" />
        </StyledView>
        <Body className="font-bold text-base ml-3 tracking-tight" style={{ color: COLORS.neutral800 }}>Why This Match</Body>
      </StyledView>

      {mutualInterests.length > 0 && (
        <StyledView className="mb-4">
          <StyledView className="flex-row items-center mb-3">
            <Ionicons name="heart" size={13} color={COLORS.primary500} />
            <Body className="text-sm font-semibold ml-2" style={{ color: '#1D4ED8' }}>You both love</Body>
          </StyledView>
          <StyledView className="flex-row flex-wrap">
            {mutualInterests.map((interest) => (
              <StyledView key={interest} className="rounded-full px-3.5 py-2 mr-2 mb-2 flex-row items-center" style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: COLORS.primaryBorder }}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.primary500} />
                <Body className="text-sm font-medium ml-1.5" style={{ color: '#1D4ED8' }}>{interest}</Body>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {mutualValues.length > 0 && (
        <StyledView className="mb-4">
          <StyledView className="flex-row items-center mb-3">
            <Ionicons name="diamond" size={13} color={COLORS.success} />
            <Body className="text-sm font-semibold ml-2" style={{ color: '#059669' }}>Shared values</Body>
          </StyledView>
          <StyledView className="flex-row flex-wrap">
            {mutualValues.map((value) => (
              <StyledView key={value} className="rounded-full px-3.5 py-2 mr-2 mb-2 flex-row items-center" style={{ backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.successBorder }}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                <Body className="text-sm font-medium ml-1.5" style={{ color: '#059669' }}>{value}</Body>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {compatibilityHighlights.length > 0 && compatibilityHighlights.map((highlight, i) => (
        <StyledView key={highlight} className="flex-row items-center" style={{ marginBottom: i === compatibilityHighlights.length - 1 ? 0 : 8 }}>
          <Ionicons name="checkmark" size={15} color={COLORS.primary500} />
          <Body className="text-sm ml-2.5" style={{ color: COLORS.neutral600, lineHeight: 18 }}>{highlight}</Body>
        </StyledView>
      ))}
    </StyledView>
  );
};

const BlurredPhoto: React.FC<{ uri: string; style?: object; index: number }> = ({ uri, style, index }) => (
  <StyledView style={style}>
    <StyledImage source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" blurRadius={BLUR_LEVELS[Math.min(index, BLUR_LEVELS.length - 1)]} />
    <StyledView className="absolute inset-0" style={{ backgroundColor: `rgba(255,255,255,${0.03 + index * 0.02})` }} />
  </StyledView>
);

const InfoPill: React.FC<{ icon: string; text: string }> = React.memo(({ icon, text }) => {
  const style = PILL_STYLES[icon] || PILL_STYLES.default;
  return (
    <StyledView className="flex-row items-center rounded-full px-3.5 py-2 mr-2 mb-2.5" style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: `${style.iconColor}20` }}>
      <Ionicons name={icon as any} size={14} color={style.iconColor} />
      <Body className="text-sm font-medium ml-1.5" style={{ color: style.textColor }}>{text}</Body>
    </StyledView>
  );
});

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode; delay?: number }> = React.memo(({ title, icon, children, delay = 0 }) => {
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
        <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
          <Ionicons name={icon as any} size={15} color={COLORS.primary500} />
        </StyledView>
        <Body className="text-xs uppercase tracking-widest ml-3 font-medium" style={{ color: COLORS.neutral400 }}>{title}</Body>
      </StyledView>
      {children}
    </Animated.View>
  );
});

const Tag: React.FC<{ label: string; variant?: 'default' | 'primary' | 'success'; isMutual?: boolean }> = ({ label, variant = 'default', isMutual = false }) => {
  const styles = {
    default: { bg: COLORS.neutral50, border: COLORS.neutral200, text: COLORS.neutral600 },
    primary: { bg: '#EFF6FF', border: COLORS.primaryBorder, text: '#1D4ED8' },
    success: { bg: COLORS.successBg, border: COLORS.successBorder, text: '#059669' },
  };
  const s = styles[variant];
  const accentColor = variant === 'primary' ? COLORS.primary500 : COLORS.success;

  return (
    <StyledView className="rounded-full px-4 py-2.5 mr-2 mb-2.5 flex-row items-center" style={{ backgroundColor: s.bg, borderWidth: isMutual ? 2 : 1, borderColor: isMutual ? accentColor : s.border }}>
      {isMutual && <Ionicons name="checkmark-circle" size={13} color={accentColor} style={{ marginRight: 5 }} />}
      <Body className="text-sm font-medium" style={{ color: s.text }}>{label}</Body>
    </StyledView>
  );
};

const LifestyleRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => {
  const level = getFrequencyLevel(value);
  const colors = [COLORS.success, '#84CC16', COLORS.warning, '#F97316', COLORS.error];

  return (
    <StyledView className="flex-row items-center justify-between py-4" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.neutral100 }}>
      <StyledView className="flex-row items-center flex-1">
        <StyledView className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: COLORS.neutral50 }}>
          <Ionicons name={icon as any} size={17} color={COLORS.neutral500} />
        </StyledView>
        <Body className="ml-3 font-medium" style={{ color: COLORS.neutral600 }}>{label}</Body>
      </StyledView>
      <StyledView className="flex-row items-center">
        <StyledView className="flex-row mr-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <StyledView key={i} className="w-1.5 h-1.5 rounded-full mx-0.5" style={{ backgroundColor: i <= level ? colors[level] : COLORS.neutral200 }} />
          ))}
        </StyledView>
        <Body className="font-semibold text-sm" style={{ minWidth: 80, textAlign: 'right', color: COLORS.neutral800 }}>{value}</Body>
      </StyledView>
    </StyledView>
  );
};

// ============================================================================
// Modal Components
// ============================================================================

const ModalContainer: React.FC<{ visible: boolean; children: React.ReactNode; onClose: () => void; variant?: 'sheet' | 'center' }> = ({ visible, children, onClose, variant = 'sheet' }) => {
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
          <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], backgroundColor: COLORS.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 320, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 12 }}>
            {children}
          </Animated.View>
        </StyledView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <StyledView className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 8 }}>
          <StyledView className="w-10 h-1 rounded-full self-center mb-5" style={{ backgroundColor: COLORS.neutral300 }} />
          {children}
        </Animated.View>
      </StyledView>
    </Modal>
  );
};

const PassFeedbackModal: React.FC<{ visible: boolean; onClose: () => void; onSubmit: (feedbackId: string) => void }> = ({ visible, onClose, onSubmit }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);

  return (
    <ModalContainer visible={visible} onClose={onClose}>
      <Body className="text-center mb-2" style={{ fontSize: 20, fontWeight: '600', color: COLORS.neutral900 }}>Help us improve</Body>
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
              <Ionicons name={option.icon as any} size={16} color={selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral500} />
            </StyledView>
            <Body className="ml-3 flex-1" style={{ fontSize: 16, fontWeight: '500', color: selectedFeedback === option.id ? COLORS.primary500 : COLORS.neutral700 }}>{option.label}</Body>
            {selectedFeedback === option.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary500} />}
          </StyledTouchableOpacity>
        ))}
      </StyledView>

      <StyledView className="flex-row" style={{ gap: 12 }}>
        <StyledTouchableOpacity onPress={onClose} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8 }} activeOpacity={0.7}>
          <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.neutral600 }}>Skip</Body>
        </StyledTouchableOpacity>
        <StyledTouchableOpacity onPress={() => selectedFeedback ? onSubmit(selectedFeedback) : onClose()} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.primary500, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }} activeOpacity={0.8}>
          <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.white }}>Done</Body>
        </StyledTouchableOpacity>
      </StyledView>
    </ModalContainer>
  );
};

const RecommendToFriendModal: React.FC<{ visible: boolean; profileName: string; onClose: () => void; onRecommend: (friendId: string) => void; onSkip: () => void; navigation: NavigationProp<RootStackParamList> }> = ({ visible, profileName, onClose, onRecommend, onSkip, navigation }) => {
  const [friends, setFriends] = useState<Array<{ friendId: string; profile: { firstName: string } }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoadingFriends(true);
      getFriends().then(result => {
        if (result.ok && result.data) setFriends(result.data);
        setLoadingFriends(false);
      }).catch(() => setLoadingFriends(false));
    }
  }, [visible]);

  return (
    <ModalContainer visible={visible} onClose={onClose}>
      <StyledView className="items-center mb-5">
        <StyledView className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.primary50 }}>
          <Ionicons name="gift-outline" size={28} color={COLORS.primary500} />
        </StyledView>
        <Body className="text-center mb-2" style={{ fontSize: 20, fontWeight: '600', color: COLORS.neutral900 }}>Know someone who'd click?</Body>
        <Body className="text-center" style={{ fontSize: 16, color: COLORS.neutral500, lineHeight: 24 }}>Recommend {profileName} to a friend</Body>
      </StyledView>

      {loadingFriends ? (
        <StyledView className="py-8 items-center"><Body style={{ fontSize: 16, color: COLORS.neutral500 }}>Loading friends...</Body></StyledView>
      ) : friends.length === 0 ? (
        <StyledView className="py-6 items-center">
          <StyledView className="w-14 h-14 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.neutral50 }}><Ionicons name="people-outline" size={24} color={COLORS.neutral300} /></StyledView>
          <Body className="mb-2" style={{ fontSize: 16, fontWeight: '600', color: COLORS.neutral700 }}>No friends yet</Body>
          <Body className="text-center mb-5" style={{ fontSize: 14, color: COLORS.neutral500, lineHeight: 20, paddingHorizontal: 16 }}>Add friends to share match recommendations</Body>
          <StyledTouchableOpacity onPress={() => { onClose(); navigation.navigate('FriendCode'); }} style={{ backgroundColor: COLORS.primary500, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 }} activeOpacity={0.8}>
            <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.white }}>Add Friends</Body>
          </StyledTouchableOpacity>
        </StyledView>
      ) : (
        <ScrollView className="mb-5" style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
          {friends.slice(0, 5).map((friend) => (
            <StyledTouchableOpacity key={friend.friendId} onPress={() => { lightHaptic(); setSelectedFriend(friend.friendId === selectedFriend ? null : friend.friendId); }} className="flex-row items-center mb-2 py-3 px-3" style={{ backgroundColor: selectedFriend === friend.friendId ? COLORS.primary50 : COLORS.white, borderWidth: 1, borderColor: selectedFriend === friend.friendId ? COLORS.primary500 : COLORS.neutral300, borderRadius: 8 }} activeOpacity={0.7}>
              <StyledView className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: selectedFriend === friend.friendId ? COLORS.primaryBorder : COLORS.primary50 }}>
                <Ionicons name="person" size={16} color={selectedFriend === friend.friendId ? COLORS.primary500 : '#93C5FD'} />
              </StyledView>
              <Body className="ml-3 flex-1" style={{ fontSize: 16, fontWeight: '500', color: selectedFriend === friend.friendId ? COLORS.primary500 : COLORS.neutral700 }}>{friend.profile.firstName}</Body>
              {selectedFriend === friend.friendId && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary500} />}
            </StyledTouchableOpacity>
          ))}
        </ScrollView>
      )}

      <StyledView className="flex-row" style={{ gap: 12 }}>
        <StyledTouchableOpacity onPress={onSkip} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8 }} activeOpacity={0.7}>
          <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.neutral600 }}>No Thanks</Body>
        </StyledTouchableOpacity>
        {friends.length > 0 && (
          <StyledTouchableOpacity onPress={() => selectedFriend && onRecommend(selectedFriend)} disabled={!selectedFriend} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: selectedFriend ? COLORS.primary500 : COLORS.neutral100, borderRadius: 8 }} activeOpacity={0.8}>
            <Body style={{ fontSize: 16, fontWeight: '600', color: selectedFriend ? COLORS.white : COLORS.neutral400 }}>Recommend</Body>
          </StyledTouchableOpacity>
        )}
      </StyledView>
    </ModalContainer>
  );
};

const PassConfirmModal: React.FC<{ visible: boolean; onConfirm: () => void; onCancel: () => void }> = ({ visible, onConfirm, onCancel }) => (
  <ModalContainer visible={visible} onClose={onCancel} variant="center">
    <StyledView className="items-center mb-5">
      <StyledView className="w-14 h-14 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.warningBg }}>
        <Ionicons name="help-circle-outline" size={28} color={COLORS.warningIcon} />
      </StyledView>
      <Body className="text-center mb-2" style={{ fontSize: 20, fontWeight: '600', color: COLORS.neutral900 }}>Pass on this match?</Body>
      <Body className="text-center" style={{ fontSize: 16, color: COLORS.neutral500, lineHeight: 24 }}>Are you sure? You won't be able to match with this person again.</Body>
    </StyledView>
    <StyledView className="flex-row" style={{ gap: 12 }}>
      <StyledTouchableOpacity onPress={onCancel} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8 }} activeOpacity={0.7}>
        <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.neutral600 }}>Keep Looking</Body>
      </StyledTouchableOpacity>
      <StyledTouchableOpacity onPress={onConfirm} className="flex-1 items-center justify-center py-3.5" style={{ backgroundColor: COLORS.errorBg, borderRadius: 8 }} activeOpacity={0.7}>
        <Body style={{ fontSize: 16, fontWeight: '600', color: COLORS.errorText }}>Pass</Body>
      </StyledTouchableOpacity>
    </StyledView>
  </ModalContainer>
);


const CelebrationOverlay: React.FC<{ visible: boolean; recipientName: string; onComplete: () => void }> = ({ visible, recipientName, onComplete }) => {
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
              <Ionicons name="heart" size={24} color={COLORS.pink} />
            </Animated.View>
          );
        })}
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }}>
          <StyledView className="w-28 h-28 rounded-full items-center justify-center mb-6" style={{ backgroundColor: COLORS.successBg }}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
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

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_PROFILE: UserProfile = {
  id: 'mock-1',
  userId: 'mock-user-1',
  firstName: 'Sarah',
  lastName: 'M',
  age: 27,
  gender: ['Woman'],
  pronouns: 'she/her',
  pronounsList: ['she', 'her'],
  currentJob: 'Product Designer',
  companyPosition: 'Senior Designer',
  educationLevel: 'bachelors',
  school: 'NYU',
  height: "5'7\"",
  ethnicity: 'Asian',
  religion: 'Spiritual',
  politicalLeaning: 'liberal',
  location: 'Brooklyn, NY',
  hometown: 'Boston, MA',
  photos: [
    { id: '1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', isMain: true, order: 0 },
    { id: '2', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', isMain: false, order: 1 },
    { id: '3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', isMain: false, order: 2 },
  ],
  interests: ['Travel', 'Photography', 'Hiking', 'Music', 'Art', 'Cooking'],
  values: ['Honesty', 'Growth', 'Adventure', 'Family', 'Creativity'],
  lifestyle: { drinking: 'socially', smoking: 'never', exercise: 'often' },
  nonNegotiables: [],
  preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  hasChildren: 'no',
  familyPlans: 'want_someday',
  drinkingFrequency: 'socially',
  cannabisFrequency: 'never',
  tobaccoFrequency: 'never',
  deepQuestions: [
    { questionId: 1, tier: 1, question: "What's your idea of a perfect weekend?", answer: "Exploring a new neighborhood, finding a cozy coffee shop, and ending with dinner at a restaurant I've been wanting to try." },
    { questionId: 2, tier: 2, question: "What are you most passionate about?", answer: "Creating beautiful, functional designs that make people's lives easier. I love the problem-solving aspect of my work." },
    { questionId: 3, tier: 3, question: "What's a life lesson that took you a while to learn?", answer: "That it's okay to change your mind about what you want. Growth means evolving, and your past decisions don't have to define your future." },
  ],
  displayedQuestions: [1, 2, 3],
  sectionVisibility: { religion: true, politics: true, family: true, lifestyle: true },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Main Component
// ============================================================================

export const MatchProposalScreen: React.FC<MatchProposalScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { match, profile: passedProfile } = route.params || {};

  const effectiveProfile = useMemo(() => {
    if (passedProfile) return passedProfile;
    if (match) return match.currentUserId === match.user1Id ? match.user2Profile : match.user1Profile;
    return MOCK_PROFILE;
  }, [passedProfile, match]);

  const [loading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  const [showPassFeedback, setShowPassFeedback] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [passFeedbackId, setPassFeedbackId] = useState<string | undefined>(undefined);
  const flatListRef = useRef<FlatList>(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const profile = effectiveProfile;
  const userInterests = useMemo(() => ['Travel', 'Hiking', 'Photography', 'Music', 'Cooking'], []);
  const userValues = useMemo(() => ['Honesty', 'Family', 'Growth', 'Adventure'], []);

  const mutualInterests = useMemo(() => profile?.interests?.filter(i => userInterests.includes(i)).slice(0, 3) || [], [profile, userInterests]);
  const mutualValues = useMemo(() => profile?.values?.filter(v => userValues.includes(v)).slice(0, 3) || [], [profile, userValues]);
  const compatibilityHighlights = useMemo(() => {
    const h: string[] = [];
    if (mutualInterests.length >= 2) h.push('Strong interest alignment');
    if (mutualValues.length >= 2) h.push('Core values align');
    if (profile?.familyPlans) h.push('Similar life goals');
    return h;
  }, [mutualInterests, mutualValues, profile]);

  const endorsement = useMemo(() => getEndorsementData(match?.communityScore || 0.75), [match?.communityScore]);

  const handlePassInitiate = useCallback(() => { lightHaptic(); setShowPassConfirm(true); }, []);

  // Accept immediately without confirmation - reduced friction!
  const handleAcceptInitiate = useCallback(async () => {
    setIsAccepting(true);
    mediumHaptic();

    // Record acceptance in community service
    if (route.params?.proposalId) {
      try {
        await communityService.respondToMatchProposal(route.params.proposalId, true);
        logger.info('[MatchProposalScreen] Proposal accepted:', route.params.proposalId);
      } catch (error) {
        logger.error('[MatchProposalScreen] Error accepting proposal:', error);
      }
    }

    successHaptic();
    setShowCelebration(true);
  }, [route.params]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 50,
    onPanResponderMove: (_, gs) => swipeX.setValue(gs.dx),
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > SWIPE_THRESHOLD) {
        Animated.parallel([
          Animated.timing(swipeX, { toValue: SCREEN_WIDTH, duration: 200, useNativeDriver: true }),
          Animated.timing(swipeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => handleAcceptInitiate());
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        Animated.parallel([
          Animated.timing(swipeX, { toValue: -SCREEN_WIDTH, duration: 200, useNativeDriver: true }),
          Animated.timing(swipeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => handlePassInitiate());
      } else {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  }), [swipeX, swipeOpacity, handleAcceptInitiate, handlePassInitiate]);

  const handlePhotoScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentPhotoIndex) setCurrentPhotoIndex(index);
  }, [currentPhotoIndex]);

  const goToPhoto = useCallback((index: number) => { flatListRef.current?.scrollToIndex({ index, animated: true }); setCurrentPhotoIndex(index); lightHaptic(); }, []);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setIsAccepting(false);
    if (match) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Love' } }, { name: 'Chat', params: { matchId: match.id, recipientName: profile?.firstName || 'Match' } }] });
    } else {
      navigation.goBack();
    }
  }, [navigation, match, profile]);

  const handlePassConfirmed = useCallback(() => { setShowPassConfirm(false); setShowPassFeedback(true); }, []);
  const handlePassFeedbackSubmit = useCallback((feedbackId?: string) => { setShowPassFeedback(false); setPassFeedbackId(feedbackId); setShowRecommendModal(true); }, []);
  const handleRecommendToFriend = useCallback((friendId: string) => {
    setShowRecommendModal(false);
    setIsPassing(true);
    Alert.alert('Recommendation Sent!', 'Your friend will see this match in their recommendations.', [{ text: 'OK', onPress: () => { setIsPassing(false); navigation.navigate('MainTabs', { screen: 'Love', params: { variant: 'post_pass' } }); } }]);
  }, [navigation]);

  const handleSkipRecommend = useCallback(async () => {
    setShowRecommendModal(false);
    setIsPassing(true);

    // Record pass in community service
    if (route.params?.proposalId) {
      try {
        await communityService.respondToMatchProposal(route.params.proposalId, false);
        logger.info('[MatchProposalScreen] Proposal passed:', route.params.proposalId);
      } catch (error) {
        logger.error('[MatchProposalScreen] Error passing proposal:', error);
      }
    }

    warningHaptic();
    // Clear any existing navigation timer
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
    }
    navigationTimerRef.current = setTimeout(() => {
      setIsPassing(false);
      navigation.navigate('MainTabs', { screen: 'Love', params: { variant: 'post_pass' } });
      navigationTimerRef.current = null;
    }, 500);
  }, [navigation, route.params]);

  const handleOptionsMenu = useCallback(() => {
    lightHaptic();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancel', 'Report User', 'Block User'], destructiveButtonIndex: 2, cancelButtonIndex: 0 }, (i) => {
        if (i === 1) Alert.alert('Report User', 'Are you sure you want to report this user?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', style: 'destructive' }]);
        else if (i === 2) Alert.alert('Block User', 'Are you sure? You will not see this user again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: () => navigation.goBack() }]);
      });
    } else {
      Alert.alert('Options', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report User', onPress: () => Alert.alert('Report User', 'Are you sure you want to report this user?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', style: 'destructive' }]) },
        { text: 'Block User', style: 'destructive', onPress: () => Alert.alert('Block User', 'Are you sure? You will not see this user again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: () => navigation.goBack() }]) }
      ]);
    }
  }, [navigation]);

  const handleViewDeepQuestions = useCallback(() => { if (profile) { lightHaptic(); navigation.navigate('DeepQuestions', { userId: profile.userId, editable: false }); } }, [navigation, profile]);

  // Cleanup navigation timer on unmount
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
    };
  }, []);

  if (loading) return <StyledView className="flex-1 bg-black"><StatusBar barStyle="light-content" /><LoadingSkeleton /></StyledView>;

  if (!profile) {
    return (
      <StyledView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: COLORS.neutral50 }}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="person-outline" size={64} color={COLORS.neutral300} />
        <Body className="mt-4 text-center" style={{ color: COLORS.neutral600 }}>Profile not found</Body>
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mt-4 px-6 py-3 rounded-full" style={{ backgroundColor: COLORS.primary500 }}>
          <Body className="font-semibold" style={{ color: COLORS.white }}>Go Back</Body>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  const photos = profile.photos || [];
  const communityScore = match?.communityScore || 0.75;
  const expiresAt = match?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const displayedQuestions = (profile.displayedQuestions || []).map(id => profile.deepQuestions?.find(q => q.questionId === id)).filter((q): q is DeepQuestionAnswer => q !== undefined).sort((a, b) => (a.tier || 0) - (b.tier || 0));
  const hasLifestyleInfo = profile.drinkingFrequency || profile.cannabisFrequency || profile.tobaccoFrequency || profile.otherDrugsFrequency;
  const visibility = { religion: profile.sectionVisibility?.religion ?? true, politics: profile.sectionVisibility?.politics ?? true, family: profile.sectionVisibility?.family ?? true, lifestyle: profile.sectionVisibility?.lifestyle ?? true };

  const basicInfoPills: Array<{ icon: string; text: string }> = [];
  if (profile.gender?.length) basicInfoPills.push({ icon: 'person-outline', text: profile.gender.join(', ') });
  if (profile.pronounsList?.length) basicInfoPills.push({ icon: 'chatbubble-outline', text: profile.pronounsList.join('/') });
  if (profile.height) basicInfoPills.push({ icon: 'resize-outline', text: profile.height });
  if (profile.location) basicInfoPills.push({ icon: 'location-outline', text: profile.location });
  if (profile.ethnicity) basicInfoPills.push({ icon: 'globe-outline', text: profile.ethnicity });
  if (visibility.religion && profile.religion) basicInfoPills.push({ icon: 'sparkles-outline', text: profile.religion });
  if (visibility.politics && profile.politicalLeaning) basicInfoPills.push({ icon: 'flag-outline', text: formatFrequency(profile.politicalLeaning) || '' });

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="light-content" />

      {/* Swipe Indicators */}
      <Animated.View style={{ position: 'absolute', top: '33%', left: 32, zIndex: 40, opacity: swipeX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ scale: swipeX.interpolate({ inputRange: [-100, 0], outputRange: [1.2, 0.8], extrapolate: 'clamp' }) }] }}>
        <StyledView className="rounded-full p-4" style={{ backgroundColor: COLORS.error }}><Ionicons name="close" size={32} color="white" /></StyledView>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: '33%', right: 32, zIndex: 40, opacity: swipeX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: swipeX.interpolate({ inputRange: [0, 100], outputRange: [0.8, 1.2], extrapolate: 'clamp' }) }] }}>
        <StyledView className="rounded-full p-4" style={{ backgroundColor: COLORS.success }}><Ionicons name="heart" size={32} color="white" /></StyledView>
      </Animated.View>

      {/* Fixed Header */}
      <StyledView className="absolute z-50 flex-row items-center justify-between px-4" style={{ top: insets.top + 8, left: 0, right: 0 }}>
        <StyledTouchableOpacity onPress={() => { lightHaptic(); navigation.goBack(); }} className="rounded-full p-2.5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="white" />
        </StyledTouchableOpacity>
        <StyledView className="flex-row items-center">
          <ExpirationTimer expiresAt={expiresAt} />
          <StyledTouchableOpacity onPress={handleOptionsMenu} className="rounded-full p-2.5 ml-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} activeOpacity={0.8}>
            <Ionicons name="ellipsis-vertical" size={18} color="white" />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Photo Section */}
        <View style={{ height: PHOTO_HEIGHT, backgroundColor: '#111' }}>
          {photos.length > 0 ? (
            <>
              <FlatList ref={flatListRef} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handlePhotoScroll} scrollEventThrottle={16} keyExtractor={(item, index) => item.id || `photo-${index}`} renderItem={({ item, index }) => <BlurredPhoto uri={item.url} style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }} index={index} />} />
              {photos.length > 1 && (
                <>
                  <TouchableWithoutFeedback onPress={() => { if (currentPhotoIndex > 0) { goToPhoto(currentPhotoIndex - 1); mediumHaptic(); } }}><View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: TAP_ZONE_WIDTH }} /></TouchableWithoutFeedback>
                  <TouchableWithoutFeedback onPress={() => { if (currentPhotoIndex < photos.length - 1) { goToPhoto(currentPhotoIndex + 1); mediumHaptic(); } }}><View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: TAP_ZONE_WIDTH }} /></TouchableWithoutFeedback>
                </>
              )}
              {photos.length > 1 && (
                <StyledView className="absolute left-5 right-5 flex-row" style={{ top: insets.top + 56 }}>
                  {photos.map((photo, index) => (
                    <StyledTouchableOpacity key={photo.id || `indicator-${index}`} onPress={() => goToPhoto(index)} className="flex-1 mx-1" activeOpacity={0.8}>
                      <StyledView className="h-1 rounded-full" style={{ backgroundColor: index === currentPhotoIndex ? COLORS.white : 'rgba(255, 255, 255, 0.4)' }} />
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              )}
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} className="absolute top-0 left-0 right-0 h-32" pointerEvents="none" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} className="absolute bottom-0 left-0 right-0 h-44" pointerEvents="none" />
              <StyledView className="absolute bottom-10 left-5 right-5">
                <StyledView className="flex-row items-center flex-wrap mb-2">
                  <Body className="text-white font-bold" style={{ fontSize: 34, lineHeight: 40, letterSpacing: -0.5, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}>{getFirstInitial(profile.firstName)}, {profile.age}</Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Body className="ml-1.5" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Full profile revealed after matching</Body>
                </StyledView>
              </StyledView>
            </>
          ) : (
            <StyledView className="flex-1 items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
              <StyledView className="w-32 h-32 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#262626' }}><Ionicons name="camera-outline" size={48} color="#525252" /></StyledView>
              <Body className="font-medium" style={{ color: COLORS.neutral500 }}>No photos available</Body>
            </StyledView>
          )}
        </View>

        {/* Content Section */}
        <StyledView className="bg-white px-5 pt-8 -mt-5" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <CommunityScore score={communityScore} endorsement={endorsement} />
          <WhyThisMatch mutualInterests={mutualInterests} mutualValues={mutualValues} compatibilityHighlights={compatibilityHighlights} />
          {basicInfoPills.length > 0 && <StyledView className="flex-row flex-wrap mb-6">{basicInfoPills.map((pill) => <InfoPill key={`${pill.icon}-${pill.text}`} icon={pill.icon} text={pill.text} />)}</StyledView>}
          {profile.interests?.length > 0 && <Section title="Interests" icon="heart-outline" delay={50}><StyledView className="flex-row flex-wrap">{profile.interests.map((interest) => <Tag key={interest} label={interest} variant="primary" isMutual={mutualInterests.includes(interest)} />)}</StyledView></Section>}
          {profile.values?.length > 0 && <Section title="Values" icon="diamond-outline" delay={100}><StyledView className="flex-row flex-wrap">{profile.values.map((value) => <Tag key={value} label={value} variant="success" isMutual={mutualValues.includes(value)} />)}</StyledView></Section>}
          {visibility.family && (profile.hasChildren || profile.familyPlans) && (
            <Section title="Family" icon="people-outline" delay={150}>
              <StyledView className="rounded-2xl p-4" style={{ backgroundColor: COLORS.neutral50 }}>
                {profile.hasChildren && <StyledView className="flex-row items-center mb-2.5"><Ionicons name="person-outline" size={17} color={COLORS.neutral400} /><Body className="ml-2.5" style={{ color: COLORS.neutral600 }}>{formatFrequency(profile.hasChildren)}</Body></StyledView>}
                {profile.familyPlans && <StyledView className="flex-row items-center"><Ionicons name="heart-outline" size={17} color={COLORS.neutral400} /><Body className="ml-2.5" style={{ color: COLORS.neutral600 }}>{formatFrequency(profile.familyPlans)}</Body></StyledView>}
              </StyledView>
            </Section>
          )}
          {visibility.lifestyle && hasLifestyleInfo && (
            <Section title="Lifestyle" icon="leaf-outline" delay={200}>
              <StyledView className="rounded-2xl px-4 py-1" style={{ backgroundColor: COLORS.neutral50 }}>
                {profile.drinkingFrequency && <LifestyleRow icon="wine-outline" label="Drinking" value={formatFrequency(profile.drinkingFrequency) || ''} />}
                {profile.cannabisFrequency && <LifestyleRow icon="leaf-outline" label="Cannabis" value={formatFrequency(profile.cannabisFrequency) || ''} />}
                {profile.tobaccoFrequency && <LifestyleRow icon="flame-outline" label="Tobacco" value={formatFrequency(profile.tobaccoFrequency) || ''} />}
                {profile.otherDrugsFrequency && <LifestyleRow icon="medical-outline" label="Other" value={formatFrequency(profile.otherDrugsFrequency) || ''} />}
              </StyledView>
            </Section>
          )}
          {displayedQuestions.length > 0 && (
            <Section title="Questions" icon="chatbubble-ellipses-outline" delay={250}>
              {displayedQuestions.map((qa) => {
                const config = TIER_CONFIG[qa.tier as 1 | 2 | 3];
                return (
                  <StyledView key={qa.questionId} className="rounded-2xl p-5 mb-3" style={{ backgroundColor: config.bg, borderWidth: 1, borderColor: config.border }}>
                    <Body className="font-semibold mb-3" style={{ fontSize: 15, lineHeight: 22, color: COLORS.neutral800 }}>{qa.question}</Body>
                    <Body style={{ fontSize: 15, lineHeight: 24, color: COLORS.neutral600 }}>{qa.answer}</Body>
                  </StyledView>
                );
              })}
              {profile.deepQuestions && profile.deepQuestions.length > displayedQuestions.length && (
                <StyledTouchableOpacity onPress={handleViewDeepQuestions} className="flex-row items-center justify-center py-3 mt-2">
                  <Body className="font-semibold" style={{ color: COLORS.primary500 }}>View all {profile.deepQuestions.length} answers</Body>
                  <Ionicons name="chevron-forward" size={17} color={COLORS.primary500} style={{ marginLeft: 4 }} />
                </StyledTouchableOpacity>
              )}
            </Section>
          )}
          <StyledView className="items-center py-5"><Body className="text-sm" style={{ color: COLORS.neutral300 }}>Swipe right to accept, left to pass</Body></StyledView>
          <StyledView className="h-4" />
        </StyledView>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <StyledView className="absolute bottom-0 left-0 right-0 bg-white" style={{ paddingBottom: insets.bottom + 8, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: COLORS.neutral200 }}>
        <StyledView className="flex-row" style={{ gap: 12 }}>
          <StyledTouchableOpacity onPress={handlePassInitiate} disabled={isPassing || isAccepting} className="flex-1 flex-row items-center justify-center py-3.5" activeOpacity={0.8} style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8, opacity: isPassing || isAccepting ? 0.6 : 1 }}>
            <Ionicons name="close" size={18} color={COLORS.neutral600} />
            <Body style={{ color: COLORS.neutral600, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>{isPassing ? 'Passing...' : 'Pass'}</Body>
          </StyledTouchableOpacity>
          <StyledTouchableOpacity onPress={handleAcceptInitiate} disabled={isPassing || isAccepting} className="flex-1 flex-row items-center justify-center py-3.5" activeOpacity={0.8} style={{ backgroundColor: COLORS.primary500, borderRadius: 8, opacity: isPassing || isAccepting ? 0.6 : 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
            <Ionicons name="heart" size={18} color="white" />
            <Body style={{ color: COLORS.white, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>{isAccepting ? 'Accepting...' : 'Accept'}</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Modals */}
      <PassConfirmModal visible={showPassConfirm} onConfirm={handlePassConfirmed} onCancel={() => setShowPassConfirm(false)} />
      <PassFeedbackModal visible={showPassFeedback} onClose={() => handlePassFeedbackSubmit()} onSubmit={(id) => handlePassFeedbackSubmit(id)} />
      <RecommendToFriendModal visible={showRecommendModal} profileName={getFirstInitial(profile.firstName)} onClose={() => setShowRecommendModal(false)} onRecommend={handleRecommendToFriend} onSkip={handleSkipRecommend} navigation={navigation} />
      <CelebrationOverlay visible={showCelebration} recipientName={profile.firstName} onComplete={handleCelebrationComplete} />
    </View>
  );
};
