/**
 * KarmaPill — unified karma badge used across the entire app.
 *
 * Canonical source: Community UserRow's pointsBtn style.
 * All instances (Community, Profile, Leaderboard) use this exact component.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StarIcon } from '../icons/Icons';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

interface KarmaPillProps {
  karma: number;
  /** small = podium 2nd/3rd, medium = default (matches Community), large = 1st place podium */
  size?: 'small' | 'medium' | 'large';
}

export const KarmaPill: React.FC<KarmaPillProps> = ({ karma, size = 'medium' }) => {
  const sizeConfig = SIZE_MAP[size];
  return (
    <View style={[styles.pill, { paddingVertical: sizeConfig.paddingV, paddingHorizontal: sizeConfig.paddingH }]}>
      <StarIcon size={sizeConfig.icon} color={COLORS.primaryAccent} />
      <Text style={[styles.text, { fontSize: sizeConfig.font }]}>
        {karma} {karma === 1 ? 'pt' : 'pts'}
      </Text>
    </View>
  );
};

const SIZE_MAP = {
  small:  { paddingV: 6,  paddingH: 10, font: FONT_SIZES.md,  icon: 12 },
  medium: { paddingV: 10, paddingH: 14, font: FONT_SIZES.lg,  icon: 15 },
  large:  { paddingV: 10, paddingH: 16, font: FONT_SIZES.xl,  icon: 16 },
} as const;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryAccent,
    borderRadius: 999,
    backgroundColor: 'rgba(67, 127, 255, 0.08)',
    gap: 6,
    ...SHADOWS.accentBlue,
  },
  text: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    color: COLORS.primaryAccent,
  },
});
