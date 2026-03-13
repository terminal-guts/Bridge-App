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
}

export const BadgeCard: React.FC<BadgeCardProps> = React.memo(({
  badge,
  revealAuthor = false,
  compact = false,
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

  const handlePress = () => {
    if (!revealAuthor || revealed) return;
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
      activeOpacity={revealAuthor && !revealed ? 0.7 : 1}
      disabled={!revealAuthor || revealed}
    >
      <Animated.View style={[styles.container, compact && styles.containerCompact, liftStyle]}>
        <BadgeIcon name={badge.iconName} size={iconSize} />
        <Text
          style={[styles.message, { fontSize }]}
          numberOfLines={compact ? 1 : 2}
        >
          {badge.message}
        </Text>
      </Animated.View>
      {revealAuthor && revealed && (
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
    backgroundColor: COLORS.backgroundGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  containerCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  message: {
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  authorContainer: {
    marginTop: 4,
    paddingLeft: 12,
  },
  authorText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.muted,
    fontStyle: 'italic',
  },
});
