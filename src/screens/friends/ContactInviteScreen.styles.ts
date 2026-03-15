/**
 * ContactInviteScreen Styles
 * Extracted from ContactInviteScreen.tsx for maintainability.
 */

import { StyleSheet } from 'react-native';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';

export const AVATAR_SIZE = 40;

export const contactStyles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 12,
  },
  azSidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  azLetter: {
    fontSize: 9,
    lineHeight: 13,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  friendCodeText: {
    fontSize: FONT_SIZES['3xl'],
    fontFamily: FONTS.extraBold,
    color: '#0B1226',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: OVERLAYS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  celebrationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
    ...SHADOWS.xxl,
  },
  celebrationTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#0B1226',
    marginBottom: 4,
  },
  celebrationSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.label,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
});
