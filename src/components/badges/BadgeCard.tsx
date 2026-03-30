/**
 * BadgeCard Component
 *
 * Displays a friend badge as a pill-shaped card with icon and message.
 * Supports tap-to-reveal author animation when revealAuthor is true.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { FriendBadgeWithGiver } from '../../types/badges';
import { BadgeIcon } from '../icons/BadgeIcon';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { lightHaptic } from '../../utils/haptics';

interface BadgeCardProps {
  badge: FriendBadgeWithGiver;
  revealAuthor?: boolean;
  compact?: boolean;
  /** Hide the giver name entirely — used in public contexts like proposal voting */
  hideGiverName?: boolean;
  /** Override max lines for the message text (default: compact ? 1 : 2) */
  maxLines?: number;
}

export const BadgeCard: React.FC<BadgeCardProps> = React.memo(({
  badge,
  revealAuthor = false,
  compact = false,
  hideGiverName = false,
  maxLines,
}) => {
  const [revealed, setRevealed] = useState(false);
  const translateY = useSharedValue(0);
  const authorOpacity = useSharedValue(0);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const authorStyle = useAnimatedStyle(() => ({
    opacity: authorOpacity.value,
  }));

  const canReveal = revealAuthor && !hideGiverName;

  const handlePress = () => {
    if (!canReveal || revealed) return;
    lightHaptic();
    setRevealed(true);
    translateY.value = withSpring(-2, { damping: 15, stiffness: 150 });
    authorOpacity.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const iconSize = compact ? 20 : 24;
  const fontSize = compact ? FONT_SIZES.sm : FONT_SIZES.md;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={canReveal && !revealed ? 0.7 : 1}
      disabled={!canReveal || revealed}
    >
      <Animated.View style={[styles.container, compact && styles.containerCompact, liftStyle]}>
        <BadgeIcon name={badge.iconName} size={iconSize} />
        <Text
          style={[styles.message, { fontSize }]}
          numberOfLines={maxLines ?? (compact ? 1 : 2)}
        >
          {badge.message}
        </Text>
      </Animated.View>
      {revealAuthor && !hideGiverName && revealed && (
        <Animated.View style={[styles.authorContainer, authorStyle]}>
          <Text style={styles.authorText}>— {badge.giverFirstName}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
    gap: 8,
  },
  containerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  message: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  authorContainer: {
    marginTop: 4,
    paddingLeft: 14,
  },
  authorText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryAccent,
  },
});
