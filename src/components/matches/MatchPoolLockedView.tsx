import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { calculateProfileStrengthBreakdown } from '../../utils/profileCompleteness';
import { UserProfile } from '../../types';

const MALE_IMAGE = require('../../../assets/MockMatch/BridgeMale.png');
const FEMALE_IMAGE = require('../../../assets/MockMatch/BridgeFemale.png');

// Progress ring constants
const RING_SIZE = 72;
const STROKE_WIDTH = 5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface MatchPoolLockedViewProps {
  profile: UserProfile | null;
  onNavigateToSection: (section: string) => void;
  onRingPress?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const MatchPoolLockedView: React.FC<MatchPoolLockedViewProps> = ({
  profile,
  onNavigateToSection,
  onRingPress,
  onRefresh,
  refreshing,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Photo crop position — tuned via dev overlay, now hardcoded
  const contentPosition = { top: '20%', left: '50%' };

  // Gender-based image selection (case-insensitive)
  const mockImage = useMemo(() => {
    const interested = (profile?.interestedInGenders ?? []).map(g => g.toLowerCase());
    if (interested.includes('male') && !interested.includes('female')) {
      return MALE_IMAGE;
    }
    return FEMALE_IMAGE;
  }, [profile?.interestedInGenders]);

  const breakdown = useMemo(
    () => calculateProfileStrengthBreakdown(profile),
    [profile],
  );

  const overallPercentage = breakdown.overall;
  const strokeDashoffset =
    CIRCUMFERENCE - (CIRCUMFERENCE * overallPercentage) / 100;

  // The gate now fires on profile_completed=false. Most often that means a
  // photo failed to upload during onboarding — single mandatory photo missing.
  // Headline/subtitle/CTA prioritize that case and only fall back to the
  // generic "finish your profile" copy if About Me or Match Preferences are
  // also incomplete (rare — onboarding requires both).
  const photoMissing = (profile?.photos?.length ?? 0) === 0;

  const headline = useMemo(() => {
    if (photoMissing) return 'Add a photo to enter\nthe matchmaking pool';
    if (breakdown.sections.aboutMe.percentage < 100) return 'Finish your About Me\nto enter the pool';
    if (breakdown.sections.matchPreferences.percentage < 100) return 'Set your match preferences\nto enter the pool';
    return 'Finish your profile\nto enter the pool';
  }, [photoMissing, breakdown]);

  const subtitle = useMemo(() => {
    if (photoMissing) return 'Friends can start matching you\nas soon as you have one photo.';
    return 'Finish the missing details so your\nfriends can start finding matches.';
  }, [photoMissing]);

  const cta = useMemo(() => {
    if (photoMissing) return { label: 'Add a Photo', section: 'Photos' };
    if (breakdown.sections.aboutMe.percentage < 100) return { label: 'Complete About Me', section: 'About Me' };
    if (breakdown.sections.matchPreferences.percentage < 100) return { label: 'Set Match Preferences', section: 'Match Preferences' };
    return { label: 'Complete Profile', section: 'About Me' };
  }, [photoMissing, breakdown]);

  // Entrance animation
  const animOpacity = useSharedValue(0);
  const animScale = useSharedValue(0.95);

  useEffect(() => {
    animOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    animScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: animOpacity.value,
    transform: [{ scale: animScale.value }],
  }));

  // Card sizing — mirrors MatchesScreen layout exactly
  const headerPad = Math.round(windowHeight * 0.011);
  const scrollMargin = Math.round(windowHeight * 0.009);
  const cardMB = Math.round(windowHeight * 0.018);
  const tabBarH = Math.round(windowHeight * 0.057) + insets.bottom;
  const headerTotal = headerPad + 38 + 8 + scrollMargin;
  const cardHeight = windowHeight - insets.top - headerTotal - tabBarH - cardMB;

  const content = (
    <View style={styles.container}>
      {/* Header — matches real MatchesScreen header */}
      <View style={[styles.header, { paddingTop: headerPad }]}>
        <Text style={styles.headerTitle}>Match</Text>
      </View>

      {/* Mock Match Card — blurred */}
      <View style={[styles.cardContainer, { height: cardHeight, marginTop: scrollMargin }]}>
        {/* The mock card itself */}
        <View style={styles.mockCard}>
          {/* Photo background — contentPosition centers the face in the crop */}
          <Image
            source={mockImage}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={contentPosition}
            blurRadius={8}
          />

          {/* Top vignette gradient (like real MatchCard) */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0.35)',
              'rgba(0, 0, 0, 0.12)',
              'rgba(0, 0, 0, 0)',
            ]}
            locations={[0, 0.4, 1]}
            style={styles.topVignette}
          />

          {/* Bottom cinematic gradient (like real MatchCard) */}
          <LinearGradient
            colors={[
              'rgba(9, 18, 46, 0)',
              'rgba(9, 18, 46, 0.06)',
              'rgba(9, 18, 46, 0.45)',
              'rgba(9, 18, 46, 0.75)',
            ]}
            locations={[0.15, 0.4, 0.68, 1.0]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top accent line */}
          <View style={styles.topAccent} />

          {/* Mock "New Match" badge */}
          <View style={styles.mockBadge}>
            <View style={styles.mockBadgeInner}>
              <Text style={styles.mockBadgeText}>New Match</Text>
            </View>
          </View>

          {/* Mock bottom content */}
          <View style={styles.mockBottom}>
            {/* Mock action pill */}
            <View style={styles.mockPill}>
              <Text style={styles.mockPillText}>Your friends found someone for you</Text>
            </View>

            {/* Mock name */}
            <Text style={styles.mockName}>Sarah, 21</Text>

            {/* Mock endorser row */}
            <View style={styles.mockEndorserRow}>
              <Text style={styles.mockEndorserLabel}>Matched by</Text>
              <View style={styles.mockAvatarStack}>
                <View style={[styles.mockAvatar, { zIndex: 3, backgroundColor: COLORS.primary }]} />
                <View style={[styles.mockAvatar, { zIndex: 2, marginLeft: -8, backgroundColor: COLORS.primary }]} />
                <View style={[styles.mockAvatar, { zIndex: 1, marginLeft: -8, backgroundColor: COLORS.success }]} />
              </View>
            </View>
          </View>

          {/* Mock floating action button */}
          <View style={styles.mockFab}>
            <View style={styles.mockFabArrow} />
          </View>
        </View>

        {/* Blur layer over the entire mock card */}
        <BlurView
          intensity={30}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}
        />

        {/* Dark tint over blur for contrast */}
        <View style={styles.blurTint} />

        {/* Overlay content — centered on the card, with entrance animation */}
        <Animated.View style={[styles.overlayContent, overlayAnimatedStyle]}>
          {/* Progress ring — tappable to navigate to Profile */}
          <TouchableOpacity
            style={styles.ringContainer}
            activeOpacity={onRingPress ? 0.7 : 1}
            onPress={onRingPress}
            disabled={!onRingPress}
            accessibilityRole="button"
            accessibilityLabel={`Profile ${Math.round(overallPercentage)}% complete`}
          >
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={COLORS.primaryAccent}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.ringTextContainer}>
              <Text style={styles.ringText}>{Math.round(overallPercentage)}%</Text>
            </View>
          </TouchableOpacity>

          {/* Headline */}
          <Text style={styles.headline}>{headline}</Text>

          {/* Subtitle — explains the 100% gate */}
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* CTA button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => onNavigateToSection(cta.section)}
            accessibilityRole="button"
            accessibilityLabel={cta.label}
          >
            <Text style={styles.ctaText}>{cta.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );

  // Wrap in ScrollView with pull-to-refresh if onRefresh is provided
  if (onRefresh) {
    return (
      <ScrollView
        contentContainerStyle={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryAccent}
          />
        }
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: FONT_SIZES['6xl'],
    lineHeight: 38,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },

  // ── Mock match card ──────────────────────────────────────────────
  mockCard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.success,
    zIndex: 10,
  },
  mockBadge: {
    position: 'absolute',
    top: 18,
    left: 14,
    zIndex: 5,
  },
  mockBadgeInner: {
    backgroundColor: 'rgba(52, 199, 89, 0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mockBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    lineHeight: 18,
    color: COLORS.card,
  },
  mockBottom: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    right: 80,
    gap: 6,
    zIndex: 2,
  },
  mockPill: {
    backgroundColor: 'rgba(43, 101, 249, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  mockPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    lineHeight: 17,
    color: COLORS.card,
  },
  mockName: {
    fontFamily: FONTS.extraBold,
    fontSize: FONT_SIZES['6xl'],
    lineHeight: 36,
    color: COLORS.card,
    letterSpacing: -0.8,
  },
  mockEndorserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockEndorserLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  mockAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  mockFab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  mockFabArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: COLORS.card,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },

  // ── Blur + overlay ───────────────────────────────────────────────
  blurTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 24,
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // ── Progress ring ────────────────────────────────────────────────
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTextContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.card,
  },

  // ── Text + CTA ──────────────────────────────────────────────────
  headline: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.card,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: LINE_HEIGHTS['5xl'],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: LINE_HEIGHTS.lg,
  },
  ctaButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    marginTop: 20,
    ...SHADOWS.xl,
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.primaryAccent,
  },
});

export default MatchPoolLockedView;
