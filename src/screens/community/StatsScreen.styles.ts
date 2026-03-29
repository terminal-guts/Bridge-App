/**
 * StatsScreen styles
 * Extracted from StatsScreen.tsx for maintainability.
 *
 * Responsive scaling: layout dimensions scale relative to iPhone 16 (393x852).
 * On iPhone SE (375x667) values shrink proportionally; on Pro Max (430x932) they grow.
 * Font sizes use clamped scaling (85%-110% of nominal) to stay readable on all devices.
 */

import { StyleSheet, Dimensions } from 'react-native';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Responsive Scaling ─────────────────────────────────────────────────────
// Baseline: iPhone 16 (393x852). Scales for SE (375x667) through Pro Max (430x932).
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;
const wScale = SCREEN_WIDTH / BASE_WIDTH;
const hScale = SCREEN_HEIGHT / BASE_HEIGHT;
/** Scale width-relative values (padding, card sizes, icon circles) */
const sw = (size: number) => Math.round(wScale * size);
/** Scale height-relative values (vertical padding/margin, spacing) */
const sh = (size: number) => Math.round(hScale * size);
/** Scale hero/display font sizes: clamp between 85%-110% of nominal */
const sf = (size: number) => Math.round(Math.max(size * 0.85, Math.min(wScale * size, size * 1.1)));

const CARD_GAP = sw(12);
const H_PAD = sw(20);
export const STAT_CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2;

// Exported so ProgressRing in components file can use the scaled ring size
export const ACCURACY_RING_SIZE = sw(88);

export const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: sw(40),
  },
  loadingText: {
    marginTop: sh(12),
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.medium,
    color: COLORS.navInactiveIcon,
  },
  errorText: {
    marginTop: sh(12),
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.medium,
    color: COLORS.textGray800,
    textAlign: 'center',
    marginBottom: sh(16),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: sw(20),
    paddingVertical: sh(12),
    borderRadius: sw(10),
    minHeight: 44,
  },
  retryText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.card,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  hidden: {
    display: 'none',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingVertical: sh(16),
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: H_PAD,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: sw(12),
    padding: sw(4),
    marginBottom: sh(16),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sh(10),
    borderRadius: sw(10),
    minHeight: 44, // iOS HIG touch target
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryAccent,
    ...SHADOWS.accentBlue,
  },
  tabIcon: {
    marginRight: sw(8),
  },
  tabText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.navInactiveIcon,
  },
  tabTextActive: {
    color: COLORS.card,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingHorizontal: H_PAD,
  },

  // Hero card
  heroCard: {
    borderRadius: sw(20),
    padding: sw(24),
    alignItems: 'center',
    marginBottom: sh(24),
    ...SHADOWS.xl,
  },
  heroIconCircle: {
    width: sw(48),
    height: sw(48),
    borderRadius: sw(24),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sh(10),
  },
  heroValue: {
    fontSize: sf(40),
    fontFamily: FONTS.extraBold,
    color: COLORS.card,
    lineHeight: sf(48),
  },
  heroLabel: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.9)',
    marginTop: sh(4),
    textAlign: 'center',
  },
  heroSublabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: sh(2),
  },

  // Archetype card
  archetypeCard: {
    borderRadius: sw(20),
    padding: sw(16),
    alignItems: 'center',
    marginBottom: sh(20),
    ...SHADOWS.md,
  },
  archetypeEmoji: {
    fontSize: sf(32),
    marginBottom: sh(6),
  },
  archetypeLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: sh(4),
  },
  archetypeName: {
    fontSize: sf(24),
    fontFamily: FONTS.bold,
    color: COLORS.card,
    marginBottom: sh(6),
  },
  archetypeDesc: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.lg,
    paddingHorizontal: sw(8),
  },

  // Impact card
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: sw(16),
    padding: sw(18),
    marginBottom: sh(20),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  impactLeft: {
    flex: 1,
  },
  impactLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.navInactiveIcon,
    marginBottom: sh(4),
  },
  impactValue: {
    fontSize: sf(36),
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    lineHeight: sf(44),
  },
  impactSubtext: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.text.light,
    marginTop: sh(4),
  },
  impactRight: {
    marginLeft: sw(16),
  },

  // Accuracy card
  accuracyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: sw(16),
    padding: sw(18),
    marginBottom: sh(24),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  accuracyRingWrap: {
    position: 'relative',
    width: ACCURACY_RING_SIZE,
    height: ACCURACY_RING_SIZE,
    marginRight: sw(16),
  },
  accuracyRingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyValue: {
    fontSize: sf(22),
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  accuracyText: {
    flex: 1,
  },
  accuracyTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: sh(4),
  },
  accuracyDesc: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.navInactiveIcon,
    lineHeight: LINE_HEIGHTS.base,
    marginBottom: sh(8),
  },
  accuracyHint: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.text.light,
    lineHeight: LINE_HEIGHTS.sm,
    marginTop: sh(8),
  },

  // Section title
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: sh(12),
  },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: sh(24),
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: sw(16),
    padding: sw(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sh(12),
  },
  statIconCircle: {
    width: sw(34),
    height: sw(34),
    borderRadius: sw(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: sf(22),
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: sh(2),
  },
  statLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.navInactiveIcon,
  },

  // Highlight card
  highlightCard: {
    backgroundColor: COLORS.card,
    borderRadius: sw(16),
    padding: sw(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sh(10),
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(12),
  },
  highlightIconDot: {
    width: sw(32),
    height: sw(32),
    borderRadius: sw(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightLabel: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.semiBold,
    color: COLORS.text.muted,
  },
  highlightValue: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
  },
  highlightDivider: {
    height: 1,
    backgroundColor: COLORS.borderWarm,
  },

  // Rank card
  rankCard: {
    borderRadius: sw(16),
    overflow: 'hidden',
    marginBottom: sh(24),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  rankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sw(18),
  },
  rankIconWrap: {
    width: sw(44),
    height: sw(44),
    borderRadius: sw(12),
    backgroundColor: 'rgba(67, 127, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    flex: 1,
    marginLeft: sw(16),
  },
  rankTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
  },
  rankDesc: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.navInactiveIcon,
    marginTop: sh(2),
  },
  rankBadge: {
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: sw(16),
    paddingVertical: sh(8),
    borderRadius: sw(12),
  },
  rankValue: {
    fontSize: FONT_SIZES['3xl'],
    fontFamily: FONTS.bold,
    color: COLORS.card,
  },
});

// ─── Additional Styles (trend, period, fun facts, empty) ─────────────────────

export const st = StyleSheet.create({
  // Trend arrows
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(8),
    paddingVertical: sh(2),
    borderRadius: sw(8),
    gap: sw(2),
  },
  trendText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },

  // Period toggle
  periodBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: sw(10),
    padding: sw(4),
    marginBottom: sh(20),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: sh(8),
    alignItems: 'center',
    borderRadius: sw(8),
    minHeight: 44, // iOS HIG touch target
  },
  periodBtnActive: {
    backgroundColor: COLORS.backgroundLightBlue,
  },
  periodText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text.light,
  },
  periodTextActive: {
    color: COLORS.primaryAccent,
  },

  // Fun facts
  funFactCard: {
    backgroundColor: COLORS.card,
    borderRadius: sw(16),
    padding: sw(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  funFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sh(10),
    gap: sw(12),
  },
  funFactIcon: {
    width: sw(32),
    height: sw(32),
    borderRadius: sw(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  funFactText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    color: COLORS.text.muted,
    lineHeight: LINE_HEIGHTS.lg,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: sh(60),
    paddingHorizontal: sw(32),
  },
  emptyIconCircle: {
    width: sw(72),
    height: sw(72),
    borderRadius: sw(36),
    backgroundColor: COLORS.backgroundFriendActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sh(20),
  },
  emptyTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: sh(8),
  },
  emptyDesc: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.xl,
    marginBottom: sh(28),
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: sw(24),
    paddingVertical: sh(14),
    borderRadius: sw(14),
    gap: sw(8),
    minHeight: 48,
    ...SHADOWS.accentBlue,
  },
  emptyCtaText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.card,
  },
});

// ─── Share Card Styles ───────────────────────────────────────────────────────
// Share card scales proportionally to screen width so it fits all devices.
// The capture resolution (1080x1920) is fixed in the captureRef call, not here.

const SHARE_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 400);
const SHARE_CARD_HEIGHT = SHARE_CARD_WIDTH * (16 / 9);

export const shareStyles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
  },
  gradient: {
    flex: 1,
    padding: sw(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: sw(16),
    paddingVertical: sh(8),
    borderRadius: sw(20),
    marginBottom: sh(24),
  },
  topBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  archetypeEmoji: {
    fontSize: sf(40),
    marginBottom: sh(8),
  },
  archetypeName: {
    fontSize: sf(28),
    fontFamily: FONTS.bold,
    color: COLORS.card,
    marginBottom: sh(8),
  },
  archetypeDesc: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.base,
    paddingHorizontal: sw(16),
    marginBottom: sh(24),
  },
  divider: {
    width: sw(40),
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: sh(24),
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: sh(20),
  },
  statBlock: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: sf(22),
    fontFamily: FONTS.bold,
    color: COLORS.card,
    marginBottom: sh(2),
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  campusText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginTop: sh(8),
  },
  watermark: {
    position: 'absolute',
    bottom: sh(30),
  },
  watermarkText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
});
