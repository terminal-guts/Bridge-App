/**
 * ProposalReviewView Styles
 * Extracted from ProposalReviewView.tsx for maintainability.
 */

import { StyleSheet } from 'react-native';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';

// ─── Design tokens (aliased from theme) ──────────────────────────────────────
const BLUE = COLORS.primary;
const BOX_BG = 'rgba(1, 1, 1, 0.02)';
const BOX_BORDER = 'rgba(1, 1, 1, 0.04)';

export { BLUE, BOX_BG, BOX_BORDER };

export const proposalStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.screenBackground,
  },
  loadingText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.text.secondary,
    fontFamily: FONTS.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  votingGateBanner: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  votingGateText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    textAlign: 'center',
  },
  headerRow: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  progressDotsCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const styles = StyleSheet.create({
  // Badge styles (MatchBadge, PercentBadge)
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
  },

  // SectionCard
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
  },

  // ValueBox
  valueBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(1, 1, 1, 0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center' as const,
  },
  valueBoxLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  valueBoxText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
    textAlign: 'center' as const,
  },

  // Vote button container — normal flow, white card with upward shadow
  voteContainer: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16, // Overridden with safe area inset in component
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    gap: 8,
  },

  // Secondary vote button
  secondaryButton: {
    height: 44,
    backgroundColor: '#F5F2EE',
    borderWidth: 1,
    borderColor: '#D9D2C9',
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  secondaryButtonText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,  // #475569 — WCAG AA compliant (was navInactiveIcon #667085, borderline)
  },

  // Recommend sent confirmation badge (replaces button after recommendation)
  recommendSentBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
  },
  recommendSentText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: '100%' as const,
    overflow: 'hidden' as const,
  },

  // Progress dots
  progressDotsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  progressLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginLeft: 4,
  },

  // Compatibility badge — centered between photos.
  // Uses flex centering (minHeight + justifyContent) instead of a fixed translateY
  // so the badge scales with Dynamic Type and never escapes its frame.
  compatBadgeContainer: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    minHeight: 36,
    zIndex: 10,
  },
  compatBadgePill: {
    backgroundColor: BLUE,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  compatBadgeText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },

  // Yes button
  yesButton: {
    borderRadius: 12,
    height: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
  },
  yesButtonText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },

  // Secondary buttons row
  secondaryButtonsRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },

  // Vote flash overlay
  voteFlashOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none' as const,
    zIndex: 9998,
  },

  // ── Modal styles ──────────────────────────────────────────────────
  modalContent: {
    padding: 24,
  },
  modalHeading: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.text.primary,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  modalSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,  // WCAG AA compliant (was text.black + opacity: 0.6)
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  modalSubtextNoMargin: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center' as const,
  },
  modalPersonRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  modalPersonCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden' as const,
    height: 180,
  },
  modalPersonGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  modalPersonInfo: {
    position: 'absolute' as const,
    bottom: 12,
    left: 12,
  },
  modalPersonName: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },
  modalPersonAge: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.card,
    opacity: 0.85,
  },
  modalCancelLink: {
    marginTop: 16,
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  modalCancelText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
  },
  modalStep2Header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  modalLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center' as const,
  },
  modalFriendsList: {
    maxHeight: 280,
  },
  modalFriendsContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalFriendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  modalFriendAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  modalFriendName: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
  },
  modalFriendJob: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,  // WCAG AA (was text.black + opacity: 0.55)
  },
  modalCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BLUE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 8,
  },
  modalFooterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalFooterBtnText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.lg,
    color: COLORS.card,
  },

  // Friend suggestion banner
  friendSuggestionBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 6,
  },
  friendSuggestionText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.primaryAccent,
  },
});
