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
    color: COLORS.text.subtle,
    fontFamily: FONTS.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.screenBackground,
  },
  votingGateBanner: {
    backgroundColor: COLORS.backgroundBlueTint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  votingGateText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.primaryButton,
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
    color: COLORS.text.label,
    marginBottom: 2,
  },
  valueBoxText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.black,
    textAlign: 'center' as const,
  },

  // Vote button container
  voteContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.screenBackground,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16, // Overridden with safe area inset in component
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },

  // Secondary vote button
  secondaryButton: {
    height: 48,
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
    color: COLORS.text.muted,  // #475569 — WCAG AA compliant (was navInactiveIcon #667085, borderline)
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
    color: COLORS.text.disabled,
    marginLeft: 4,
  },

  // Compatibility badge — centered between photos
  compatBadgeContainer: {
    position: 'absolute' as const,
    top: '50%' as unknown as number,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 10,
    transform: [{ translateY: -18 }],
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
    height: 52,
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
    gap: 12,
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
    color: COLORS.text.black,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  modalSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.muted,  // WCAG AA compliant (was text.black + opacity: 0.6)
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  modalSubtextNoMargin: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.muted,
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
    color: COLORS.text.muted,
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
    color: COLORS.text.black,
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
