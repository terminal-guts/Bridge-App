/**
 * MatchContextCard
 *
 * Warm context card shown at the top of match chats.
 * Displays community social proof and shared traits.
 * Scrolls away naturally as messages accumulate.
 *
 * Design: White card with warm brown shadow (SHADOWS.md),
 * gentle fade+slide entrance animation, no hard borders.
 *
 * Privacy: Never shows endorser names or specific voter information.
 */

import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { BodySmall } from '../ui';
import { EvaIcon } from '../icons';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { SPRINGS, DURATIONS, EASINGS } from '../../constants/animations';
import { UserProfile } from '../../types';

interface MatchContextCardProps {
  currentUserProfile?: UserProfile | null;
  recipientProfile?: UserProfile | null;
}

/** Compute up to 3 shared traits between two profiles */
function computeSharedTraits(
  currentUser: UserProfile | null | undefined,
  recipient: UserProfile | null | undefined,
): string[] {
  if (!currentUser || !recipient) return [];

  const traits: string[] = [];

  // Shared values (highest priority)
  const currentValues = new Set(
    (currentUser.values || []).map(v => v.toLowerCase().trim()),
  );
  for (const v of recipient.values || []) {
    if (currentValues.has(v.toLowerCase().trim()) && traits.length < 3) {
      traits.push(`You both value ${v.toLowerCase()}`);
    }
  }

  // Shared interests
  const currentInterests = new Set(
    (currentUser.interests || []).map(i => i.toLowerCase().trim()),
  );
  for (const i of recipient.interests || []) {
    if (currentInterests.has(i.toLowerCase().trim()) && traits.length < 3) {
      traits.push(`You're both into ${i.toLowerCase()}`);
    }
  }

  return traits;
}

export const MatchContextCard: React.FC<MatchContextCardProps> = ({
  currentUserProfile,
  recipientProfile,
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 8);

  useEffect(() => {
    if (!reduceMotion) {
      opacity.value = withTiming(1, {
        duration: DURATIONS.normal,
        easing: EASINGS.enter,
      });
      translateY.value = withSpring(0, SPRINGS.gentle);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const sharedTraits = useMemo(
    () => computeSharedTraits(currentUserProfile, recipientProfile),
    [currentUserProfile, recipientProfile],
  );

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Community social line with icon */}
      <View style={styles.socialRow}>
        <EvaIcon
          name="people"
          variant="outline"
          size={16}
          color={COLORS.primaryAccent}
        />
        <BodySmall style={styles.socialLine}>
          Your friends brought you two together
        </BodySmall>
      </View>

      {/* Shared traits */}
      {sharedTraits.length > 0 && (
        <View style={styles.traitsSection}>
          {sharedTraits.map((trait, i) => (
            <View key={i} style={styles.traitRow}>
              <View style={styles.dot} />
              <BodySmall style={styles.traitText}>{trait}</BodySmall>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialLine: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    flex: 1,
  },
  traitsSection: {
    marginTop: 14,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primaryAccent,
    marginRight: 10,
  },
  traitText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.primary,
    flex: 1,
  },
});
