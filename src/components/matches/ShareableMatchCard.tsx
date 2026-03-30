import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import Svg, { Circle } from 'react-native-svg';
import { HeartsIcon } from '../icons/Icons';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface ShareableMatchCardProps {
  user1Photo: string | null;
  user1Name: string;
  user2Photo: string | null;
  user2Name: string;
  approvalPercent: number;
  matchedByCount: number;
  matchedByAvatars: string[];
  matchedByNames: string[];
  onCapture?: (uri: string) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const PHOTO_SIZE = 360;
const PHOTO_BORDER = 8;
const OVERLAP = 60;
const ICON_CIRCLE_SIZE = 72;
const AVATAR_SIZE = 56;
const AVATAR_OVERLAP = -16;
const MAX_AVATARS = 5;

// Confetti dots — larger, bolder, more festive
const CONFETTI_DOTS = [
  { top: 100, left: 70, size: 12, color: COLORS.primary, opacity: 0.65 },
  { top: 180, right: 100, size: 10, color: COLORS.success, opacity: 0.55 },
  { top: 340, left: 140, size: 14, color: COLORS.error, opacity: 0.5 },
  { top: 480, right: 180, size: 11, color: '#FFD700', opacity: 0.6 },
  { top: 620, left: 50, size: 8, color: '#A78BFA', opacity: 0.5 },
  { top: 780, right: 60, size: 13, color: '#F472B6', opacity: 0.45 },
  { top: 1250, left: 90, size: 12, color: COLORS.primary, opacity: 0.5 },
  { top: 1380, right: 130, size: 10, color: COLORS.success, opacity: 0.55 },
  { top: 1500, left: 220, size: 11, color: COLORS.error, opacity: 0.45 },
  { top: 1620, right: 260, size: 9, color: '#FFD700', opacity: 0.5 },
  { top: 1100, left: 40, size: 10, color: '#A78BFA', opacity: 0.45 },
  { top: 950, right: 70, size: 14, color: '#F472B6', opacity: 0.5 },
  // Smaller accent dots for depth
  { top: 240, left: 300, size: 6, color: COLORS.card, opacity: 0.2 },
  { top: 700, right: 300, size: 5, color: COLORS.card, opacity: 0.15 },
  { top: 1450, left: 350, size: 7, color: COLORS.card, opacity: 0.18 },
];

/** Format endorser names: "Alex, Sam & Jordan" or "Alex, Sam & 3 others" */
function formatEndorserNames(names: string[], total: number): string {
  if (names.length === 0) return `${total} friend${total !== 1 ? 's' : ''}`;
  if (names.length === 1 && total === 1) return names[0];
  if (names.length === 1 && total > 1) return `${names[0]} & ${total - 1} other${total > 2 ? 's' : ''}`;
  if (names.length === 2 && total === 2) return `${names[0]} & ${names[1]}`;
  if (names.length >= 2 && total > names.length) {
    return `${names[0]}, ${names[1]} & ${total - 2} other${total - 2 !== 1 ? 's' : ''}`;
  }
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]}, ${names[1]} & ${names[2]}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component (rendered offscreen for capture only)
// ──────────────────────────────────────────────────────────────────────────────
export const ShareableMatchCard = React.forwardRef<ViewShot, ShareableMatchCardProps>(
  ({ user1Photo, user1Name, user2Photo, user2Name, approvalPercent, matchedByCount, matchedByAvatars, matchedByNames, onCapture }, ref) => {

    const handleCapture = useCallback((uri: string) => {
      onCapture?.(uri);
    }, [onCapture]);

    const avatarsToShow = useMemo(() => matchedByAvatars.slice(0, MAX_AVATARS), [matchedByAvatars]);
    const endorserLine = useMemo(() => `${matchedByCount} friend${matchedByCount !== 1 ? 's' : ''}`, [matchedByCount]);

    return (
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot
          ref={ref}
          options={{ format: 'png', quality: 1, width: CARD_WIDTH, height: CARD_HEIGHT }}
          onCapture={handleCapture}
          style={styles.card}
        >
          {/* Rich gradient background — deeper navy with blue tint */}
          <LinearGradient
            colors={['#070E1F', '#0F1D3D', '#162850']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Subtle radial glow behind photos */}
          <View style={styles.photoGlow} />

          {/* Confetti dots */}
          {CONFETTI_DOTS.map((dot, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.confettiDot,
                {
                  top: dot.top,
                  ...(dot.left != null ? { left: dot.left } : {}),
                  ...(dot.right != null ? { right: dot.right } : {}),
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: dot.color,
                  opacity: dot.opacity,
                },
              ]}
            />
          ))}

          {/* Sparkle SVG accents */}
          <Svg width={24} height={24} style={{ position: 'absolute', top: 240, left: 160, opacity: 0.55 }}>
            <Circle cx={5} cy={5} r={4} fill="#FFD700" />
            <Circle cx={19} cy={19} r={3} fill="#FFD700" />
          </Svg>
          <Svg width={24} height={24} style={{ position: 'absolute', top: 680, right: 90, opacity: 0.45 }}>
            <Circle cx={12} cy={12} r={4} fill="#A78BFA" />
          </Svg>
          <Svg width={20} height={20} style={{ position: 'absolute', top: 1200, left: 200, opacity: 0.4 }}>
            <Circle cx={10} cy={10} r={3} fill="#F472B6" />
          </Svg>

          {/* Photos section */}
          <View style={styles.photosSection}>
            {/* User 1 photo */}
            <View style={[styles.photoRing, { marginRight: -OVERLAP / 2, zIndex: 2 }]}>
              {user1Photo ? (
                <Image
                  source={{ uri: user1Photo }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <LinearGradient colors={[COLORS.primary, '#162850']} style={styles.photo} />
              )}
            </View>

            {/* Heart icon between photos */}
            <View style={styles.iconCircle}>
              <HeartsIcon size={34} color="#FFFFFF" />
            </View>

            {/* User 2 photo */}
            <View style={[styles.photoRing, { marginLeft: -OVERLAP / 2, zIndex: 1 }]}>
              {user2Photo ? (
                <Image
                  source={{ uri: user2Photo }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <LinearGradient colors={[COLORS.primary, '#162850']} style={styles.photo} />
              )}
            </View>
          </View>

          {/* Names */}
          <Text style={styles.namesText}>{user1Name} & {user2Name}</Text>

          {/* Approval pill */}
          <View style={styles.approvalPill}>
            <Text style={styles.approvalText}>{approvalPercent}% community approval</Text>
          </View>

          {/* Endorser section */}
          {matchedByCount > 0 ? (
            <View style={styles.matchedBySection}>
              {avatarsToShow.length > 0 && (
                <View style={styles.avatarRow}>
                  {avatarsToShow.map((url, i) => (
                    <Image
                      key={`avatar-${i}`}
                      source={{ uri: url }}
                      style={[
                        styles.friendAvatar,
                        { marginLeft: i === 0 ? 0 : AVATAR_OVERLAP, zIndex: MAX_AVATARS - i },
                      ]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ))}
                </View>
              )}
              <Text style={styles.matchedByText}>Matched by {endorserLine}</Text>
            </View>
          ) : (
            <Text style={styles.taglineText}>Matched by your community</Text>
          )}

          {/* Watermark */}
          <View style={styles.watermark}>
            <Text style={styles.watermarkBridge}>bridge</Text>
            <Text style={styles.watermarkUrl}>bridge.dating</Text>
          </View>
        </ViewShot>
      </View>
    );
  }
);

ShareableMatchCard.displayName = 'ShareableMatchCard';

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiDot: {
    position: 'absolute',
  },
  photoGlow: {
    position: 'absolute',
    top: CARD_HEIGHT / 2 - 400,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(43, 101, 249, 0.08)',
  },
  photosSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -180,
  },
  photoRing: {
    width: PHOTO_SIZE + PHOTO_BORDER * 2,
    height: PHOTO_SIZE + PHOTO_BORDER * 2,
    borderRadius: (PHOTO_SIZE + PHOTO_BORDER * 2) / 2,
    borderWidth: PHOTO_BORDER,
    borderColor: COLORS.card,
    overflow: 'hidden',
    backgroundColor: '#162850',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    marginHorizontal: -ICON_CIRCLE_SIZE / 2 + 6,
    ...SHADOWS.accentBlue,
  },
  namesText: {
    color: COLORS.card,
    fontFamily: FONTS.bold,
    fontSize: 72,
    lineHeight: 88,
    textAlign: 'center',
    marginTop: 44,
    paddingHorizontal: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  approvalPill: {
    backgroundColor: COLORS.success,
    borderRadius: 32,
    paddingHorizontal: 44,
    paddingVertical: 20,
    marginTop: 36,
    ...SHADOWS.accentGreen,
  },
  approvalText: {
    color: COLORS.card,
    fontFamily: FONTS.semiBold,
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
  },
  matchedBySection: {
    alignItems: 'center',
    marginTop: 40,
    gap: 18,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: COLORS.card,
    backgroundColor: COLORS.navInactiveIcon,
  },
  matchedByText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: FONTS.semiBold,
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    paddingHorizontal: 80,
  },
  taglineText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: FONTS.semiBold,
    fontSize: 30,
    lineHeight: 38,
    marginTop: 40,
  },
  watermark: {
    position: 'absolute',
    bottom: 70,
    alignItems: 'center',
    gap: 6,
  },
  watermarkBridge: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: FONTS.bold,
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: 3,
    textTransform: 'lowercase',
  },
  watermarkUrl: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: FONTS.semiBold,
    fontSize: 22,
    lineHeight: 28,
  },
});

export default ShareableMatchCard;
