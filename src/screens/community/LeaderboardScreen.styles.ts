/**
 * LeaderboardScreen Styles
 * Extracted from LeaderboardScreen.tsx for maintainability.
 */

import { StyleSheet } from 'react-native';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

export const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES['5xl'],
    color: COLORS.text.primary,
  },

  // Layer 2 — Banner (floating)
  bannerShadow: {
    paddingHorizontal: 20,
    marginBottom: 8,
    ...SHADOWS.accentBlue,
  },
  banner: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67, 127, 255, 0.12)',
  },
  bannerText: {
    fontFamily: FONTS.regular,
    fontWeight: '400' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.primaryAccent,
    textAlign: 'center',
  },
  bannerBold: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
  },

  // Countdown
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 4,
  },
  countdownText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.navInactiveIcon,
  },

  // Friend badge
  friendBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
    zIndex: 1,
    ...SHADOWS.accentBlue,
  },

  // Initial avatar fallback
  initialAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialAvatarText: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    color: COLORS.card,
  },

  // Layer 3 — Podium (hero card)
  podiumOuter: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 24,
    ...SHADOWS.xl,
  },
  podiumGradient: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  podiumGlassEdge: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingTop: 24,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  podiumSide: { alignItems: 'center', flex: 1, marginBottom: 4 },
  podiumCenter: { alignItems: 'center', flex: 1, marginBottom: 8 },
  crownIconWrap: { alignItems: 'center', marginBottom: 8 },

  // Avatar wrappers
  avatarWrapperLarge: { position: 'relative', marginBottom: 12 },
  avatarWrapperMedium: { position: 'relative', marginBottom: 12 },
  avatarWrapperSmall: { position: 'relative', marginBottom: 12 },

  avatarRing: {
    borderWidth: 3,
    borderRadius: 999,
    padding: 4,
    backgroundColor: COLORS.card,
  },
  avatarRingGold: {
    borderWidth: 4,
    padding: 4,
    borderColor: COLORS.podiumGold,
    ...SHADOWS.accentGold,
  },
  avatarRingSilver: {
    borderColor: COLORS.podiumSilver,
    ...SHADOWS.accentSilver,
  },
  avatarRingBronze: {
    borderColor: COLORS.podiumBronze,
    ...SHADOWS.accentBronze,
  },

  avatarLarge: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E5E7EB' },
  avatarMedium: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E5E7EB' },
  avatarSmall: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E7EB' },

  // Rank badges
  rankBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
    ...SHADOWS.sm,
  },
  rankBadgeLarge: { width: 30, height: 30, borderRadius: 15 },
  rankBadgeText: { fontFamily: FONTS.bold, fontWeight: '700' as const, fontSize: FONT_SIZES.sm, color: COLORS.card },
  rankBadgeTextLarge: { fontSize: FONT_SIZES.base },

  // Podium text
  podiumName: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    maxWidth: 100,
    textAlign: 'center',
    marginBottom: 8,
  },
  podiumNameFirst: {
    color: COLORS.primaryAccent,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
  },

  // Layer 4 — How to Earn (inline in podium)
  howToEarnInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(67, 127, 255, 0.12)',
    gap: 8,
  },
  howToEarnItem: {
    fontFamily: FONTS.regular,
    fontWeight: '400' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.navInactiveIcon,
  },
  howToEarnBold: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    color: COLORS.primaryAccent,
  },
  howToEarnDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
  },

  // Layer 5 — List (card-style rows)
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  listSeparator: {
    height: 8,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  listCardHighlighted: {
    backgroundColor: 'rgba(67, 127, 255, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryAccent,
    borderColor: 'rgba(67, 127, 255, 0.15)',
    ...SHADOWS.accentBlue,
  },
  rankPill: {
    width: 36,
    height: 28,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankPillHighlighted: {
    backgroundColor: COLORS.primaryAccent,
    ...SHADOWS.accentBlue,
  },
  rankPillText: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.navInactiveIcon,
  },
  rankPillTextHighlighted: {
    color: COLORS.card,
  },

  // Layer 8 — List avatars with ring shadow
  listAvatarWrap: {
    position: 'relative',
    marginRight: 12,
    ...SHADOWS.sm,
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: '#E5E7EB',
  },
  listNameCol: { flex: 1 },
  listName: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text.primary,
  },
  listNameHighlighted: {
    color: COLORS.primaryAccent,
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
  },
  gapText: {
    fontFamily: FONTS.regular,
    fontWeight: '400' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.navInactiveIcon,
    marginTop: 2,
  },

  // Layer 7 — Sticky bar (seamless with page gradient)
  stickyBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  stickyBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...SHADOWS.md,
  },
  stickyRankPill: {
    backgroundColor: COLORS.primaryAccent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 12,
    ...SHADOWS.accentBlue,
  },
  stickyRankText: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.card,
  },
  stickyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  stickyNameCol: { flex: 1 },
  stickyName: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES.lg,
    color: COLORS.primaryAccent,
  },
  stickyGapText: {
    fontFamily: FONTS.regular,
    fontWeight: '400' as const,
    fontSize: FONT_SIZES.xs,
    color: COLORS.navInactiveIcon,
    marginTop: 1,
  },

  // Empty / Error
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.text.primary,
    marginTop: 16,
  },
  emptyBody: {
    fontFamily: FONTS.regular,
    fontWeight: '400' as const,
    fontSize: FONT_SIZES.lg,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primaryAccent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    ...SHADOWS.accentBlue,
  },
  retryBtnText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.lg,
    color: COLORS.card,
  },

  // Rank change arrows
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankChangeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  rankChangeText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
  },

  // Back button — 44x44 touch target per Back Button Standard
  headerBackButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Spacer to balance header row when info icon is hidden
  headerSpacer: {
    width: 24,
  },

  // Sticky bar avatar fallback wrapper
  stickyAvatarFallback: {
    marginRight: 12,
  },

  // Podium rank badge colors
  rankBadgeGold: {
    backgroundColor: COLORS.podiumGold,
  },
  rankBadgeSilver: {
    backgroundColor: COLORS.podiumSilver,
  },
  rankBadgeBronze: {
    backgroundColor: COLORS.podiumBronze,
  },

  // Header title column with "Weekly" subtitle
  headerTitleCol: {
    alignItems: 'center' as const,
  },
  headerSubtitle: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.navInactiveIcon,
    marginTop: -2,
  },

  // Total participants row
  participantsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.navInactiveIcon,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.navInactiveIcon,
  },
  participantsText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.navInactiveIcon,
  },

});
