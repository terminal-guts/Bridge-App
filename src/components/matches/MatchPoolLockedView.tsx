import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
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
}

export const MatchPoolLockedView: React.FC<MatchPoolLockedViewProps> = ({
  profile,
  onNavigateToSection,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── DEV: Photo alignment controls (temporary) ──────────────────────────
  const [posX, setPosX] = useState(50); // percentage 0-100 (left-right)
  const [posY, setPosY] = useState(20); // percentage 0-100 (top-bottom)
  const contentPosition = { top: `${posY}%`, left: `${posX}%` };

  const breakdown = useMemo(
    () => calculateProfileStrengthBreakdown(profile),
    [profile],
  );

  const overallPercentage = breakdown.overall;
  const strokeDashoffset =
    CIRCUMFERENCE - (CIRCUMFERENCE * overallPercentage) / 100;

  // Select mock image based on interestedInGenders
  const backgroundImage = useMemo(() => {
    const prefs = (profile?.interestedInGenders ?? []).map(g => g.toLowerCase());
    if (prefs.includes('male') && !prefs.includes('female')) {
      return MALE_IMAGE;
    }
    return FEMALE_IMAGE;
  }, [profile?.interestedInGenders]);

  // Smart CTA: first incomplete section
  const cta = useMemo(() => {
    const { sections } = breakdown;
    if (sections.photos.percentage < 100)
      return { label: 'Add Photos', section: 'Photos' };
    if (sections.aboutMe.percentage < 100)
      return { label: 'Complete About Me', section: 'About Me' };
    if (sections.matchPreferences.percentage < 100)
      return { label: 'Set Match Preferences', section: 'Match Preferences' };
    if (sections.deepQuestions.percentage < 100)
      return { label: 'Answer Questions', section: 'Questions' };
    return { label: 'Complete Profile', section: 'About Me' };
  }, [breakdown]);

  // Card sizing — mirrors MatchesScreen layout exactly
  const headerPad = Math.round(windowHeight * 0.011);
  const scrollMargin = Math.round(windowHeight * 0.009);
  const cardMB = Math.round(windowHeight * 0.018);
  const tabBarH = Math.round(windowHeight * 0.057) + insets.bottom;
  const headerTotal = headerPad + 38 + 8 + scrollMargin;
  const cardHeight = windowHeight - insets.top - headerTotal - tabBarH - cardMB;

  return (
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
            source={backgroundImage}
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
              <Text style={styles.mockPillText}>Your friends picked someone</Text>
            </View>

            {/* Mock name */}
            <Text style={styles.mockName}>Sarah, 21</Text>

            {/* Mock endorser row */}
            <View style={styles.mockEndorserRow}>
              <Text style={styles.mockEndorserLabel}>Picked by</Text>
              <View style={styles.mockAvatarStack}>
                <View style={[styles.mockAvatar, { zIndex: 3, backgroundColor: '#7C3AED' }]} />
                <View style={[styles.mockAvatar, { zIndex: 2, marginLeft: -8, backgroundColor: '#3B82F6' }]} />
                <View style={[styles.mockAvatar, { zIndex: 1, marginLeft: -8, backgroundColor: '#10B981' }]} />
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

        {/* Overlay content — centered on the card */}
        <View style={styles.overlayContent}>
          {/* Progress ring */}
          <View style={styles.ringContainer}>
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
                stroke="#437FFF"
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
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            Complete your profile{'\n'}to get matched
          </Text>

          {/* CTA button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => onNavigateToSection(cta.section)}
          >
            <Text style={styles.ctaText}>{cta.label}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── DEV: Photo alignment overlay (TEMPORARY — remove after alignment) ── */}
      {__DEV__ && (
        <View style={devStyles.container}>
          <View style={devStyles.panel}>
            <Text style={devStyles.label}>Position: X={posX}%  Y={posY}%</Text>
            <View style={devStyles.row}>
              <TouchableOpacity style={devStyles.btn} onPress={() => setPosX(p => Math.max(0, p - 5))}>
                <Text style={devStyles.btnText}>{'<'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={devStyles.btn} onPress={() => setPosY(p => Math.max(0, p - 5))}>
                <Text style={devStyles.btnText}>UP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={devStyles.btn} onPress={() => setPosY(p => Math.min(100, p + 5))}>
                <Text style={devStyles.btnText}>DN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={devStyles.btn} onPress={() => setPosX(p => Math.min(100, p + 5))}>
                <Text style={devStyles.btnText}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const devStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  panel: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  label: {
    color: '#FFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    width: 50,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#437FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});

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
    color: COLORS.text.black,
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
    backgroundColor: '#34C759',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  mockName: {
    fontFamily: FONTS.extraBold,
    fontSize: FONT_SIZES['6xl'],
    lineHeight: 36,
    color: '#FFFFFF',
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
    backgroundColor: COLORS.primaryButton,
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
    borderLeftColor: '#FFFFFF',
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
    fontSize: 22,
    color: '#FFFFFF',
  },

  // ── Text + CTA ──────────────────────────────────────────────────
  headline: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#437FFF',
  },
});

export default MatchPoolLockedView;
