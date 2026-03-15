/**
 * StatsScreen styles
 * Extracted from StatsScreen.tsx for maintainability.
 */

import { StyleSheet, Dimensions } from 'react-native';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
export const STAT_CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

export const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.medium,
    color: COLORS.navInactiveIcon,
  },
  errorText: {
    marginTop: 12,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.medium,
    color: COLORS.textGray800,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryAccent,
    ...SHADOWS.accentBlue,
  },
  tabIcon: {
    marginRight: 8,
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
    paddingHorizontal: 20,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.xl,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroValue: {
    fontSize: 52,
    fontFamily: FONTS.bold,
    color: COLORS.card,
    lineHeight: 60,
  },
  heroLabel: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  heroSublabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Archetype card
  archetypeCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.xl,
  },
  archetypeEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  archetypeLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  archetypeName: {
    fontSize: FONT_SIZES['5xl'],
    fontFamily: FONTS.bold,
    color: COLORS.card,
    marginBottom: 8,
  },
  archetypeDesc: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Impact card
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  impactLeft: {
    flex: 1,
  },
  impactLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.navInactiveIcon,
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 40,
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    lineHeight: 48,
  },
  impactSubtext: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.text.light,
    marginTop: 4,
  },
  impactRight: {
    marginLeft: 16,
  },

  // Accuracy card
  accuracyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...SHADOWS.sm,
  },
  accuracyRingWrap: {
    position: 'relative',
    width: 88,
    height: 88,
    marginRight: 16,
  },
  accuracyRingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyValue: {
    fontSize: FONT_SIZES['4xl'],
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  accuracyText: {
    flex: 1,
  },
  accuracyTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: 4,
  },
  accuracyDesc: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.navInactiveIcon,
    lineHeight: 18,
    marginBottom: 8,
  },
  accuracyHint: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.text.light,
    lineHeight: 16,
    marginTop: 8,
  },

  // Section title
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: 12,
  },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 24,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.sm,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES['4xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.navInactiveIcon,
  },

  // Highlight card
  highlightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightIconDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    backgroundColor: COLORS.borderSubtle,
  },

  // Rank card
  rankCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    ...SHADOWS.sm,
  },
  rankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  rankIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(67, 127, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    flex: 1,
    marginLeft: 16,
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
    marginTop: 2,
  },
  rankBadge: {
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
  },

  // Period toggle
  periodBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
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
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.sm,
  },
  funFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  funFactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funFactText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    color: COLORS.text.muted,
    lineHeight: 20,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundFriendActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textDarkHeading,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    ...SHADOWS.accentBlue,
  },
  emptyCtaText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.card,
  },
});

// ─── Share Card Styles ───────────────────────────────────────────────────────

export const shareStyles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,
  },
  gradient: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  topBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  archetypeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  archetypeName: {
    fontSize: FONT_SIZES['5xl'],
    fontFamily: FONTS.bold,
    color: COLORS.card,
    marginBottom: 8,
  },
  archetypeDesc: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBlock: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.card,
    marginBottom: 2,
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
    marginTop: 8,
  },
  watermark: {
    position: 'absolute',
    bottom: 30,
  },
  watermarkText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
});
