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

// ─── Friend Badge ────────────────────────────────────────────────────────────

export const FriendBadge = () => (
  <View style={s.friendBadge}>
    <EvaIcon name="people" variant="outline" size={12} color={COLORS.card} />
  </View>
);

// ─── Initial Avatar ──────────────────────────────────────────────────────────

export const InitialAvatar = ({ name, size, isAnonymous }: { name: string; size: number; isAnonymous?: boolean }) => {
  const bg = isAnonymous ? '#B0B8C4' : getInitialColor(name);
  const fontSize = size * 0.42;
  // Anonymous users now show their initials (e.g., "S.B.") instead of eye-off icon
  // The edge function sends initials like "S.B." for anonymous users
  const initial = isAnonymous
    ? (name && name !== '?' ? name.replace(/\./g, '').charAt(0) : '?').toUpperCase()
    : (name && name !== 'You' ? name[0] : '?').toUpperCase();
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
    <View style={s.rankChangeWrap}>
      <EvaIcon
        name={isUp ? 'arrow-upward' : 'arrow-downward'}
        variant="outline"
        size={12}
        color={isUp ? COLORS.success : COLORS.error}
      />
      <Text style={[s.rankChangeText, { color: isUp ? COLORS.success : COLORS.error }]}>
        {Math.abs(change)}
      </Text>
    </View>
  );
};
