/**
 * LeaderboardScreen Components
 * Extracted from LeaderboardScreen.tsx for maintainability.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { EvaIcon } from '../../components/icons';
import { FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { getInitialColor } from '../../utils/communityHelpers';
import { s } from './LeaderboardScreen.styles';

// ─── Karma Pill ──────────────────────────────────────────────────────────────

export const KarmaPill = ({ karma, size = 'medium' }: { karma: number; size?: 'small' | 'medium' | 'large' }) => {
  const fontSize = size === 'large' ? FONT_SIZES.xl : size === 'medium' ? FONT_SIZES.base : FONT_SIZES.md;
  const iconSize = size === 'large' ? 15 : size === 'medium' ? 13 : 12;
  const paddingV = size === 'large' ? 8 : 4;
  const paddingH = size === 'large' ? 16 : size === 'medium' ? 12 : 8;
  return (
    <View style={[s.karmaPillShadow, size === 'large' && s.karmaPillShadowLarge]}>
      <View style={[s.karmaPill, { paddingVertical: paddingV, paddingHorizontal: paddingH }]}>
        <EvaIcon name="star" variant="outline" size={iconSize} color={COLORS.success} style={{ marginRight: 4 }} />
        <Text style={[s.karmaPillText, { fontSize }]}>{karma} pts</Text>
      </View>
    </View>
  );
};

// ─── Friend Badge ────────────────────────────────────────────────────────────

export const FriendBadge = () => (
  <View style={s.friendBadge}>
    <EvaIcon name="people" variant="outline" size={12} color={COLORS.card} />
  </View>
);

// ─── Initial Avatar ──────────────────────────────────────────────────────────

export const InitialAvatar = ({ name, size, isAnonymous }: { name: string; size: number; isAnonymous?: boolean }) => {
  const bg = isAnonymous ? COLORS.borderDivider : getInitialColor(name);
  const fontSize = size * 0.42;
  if (isAnonymous) {
    return (
      <View style={[s.initialAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
        <EvaIcon name="eye-off" variant="outline" size={fontSize} color={COLORS.card} />
      </View>
    );
  }
  const initial = (name && name !== 'You' ? name[0] : '?').toUpperCase();
  return (
    <View style={[s.initialAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[s.initialAvatarText, { fontSize }]}>{initial}</Text>
    </View>
  );
};

// ─── Rank Change Arrow ───────────────────────────────────────────────────────

export const RankChangeArrow = ({ change }: { change: number }) => {
  if (change === 0) return null;
  const isUp = change > 0;
  return (
    <View style={[s.rankChangeWrap, isUp ? s.rankChangeUp : s.rankChangeDown]}>
      <EvaIcon
        name={isUp ? 'arrow-upward' : 'arrow-downward'}
        variant="outline"
        size={12}
        color={isUp ? COLORS.rankUp : COLORS.danger}
      />
      <Text style={[s.rankChangeText, { color: isUp ? COLORS.rankUp : COLORS.danger }]}>
        {Math.abs(change)}
      </Text>
    </View>
  );
};
