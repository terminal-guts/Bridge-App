/**
 * FriendStatusPill — shows the lifecycle state of a friend's proposal
 * in the "Your Crew" section of the Community screen.
 *
 * Renders a small colored pill with an optional icon that communicates
 * what's happening with this friend's match journey.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { EvaIcon } from '../icons';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { DURATIONS } from '../../constants/animations';
import type { FriendProposalState } from '../../types/community';

interface FriendStatusPillProps {
  proposalState?: FriendProposalState;
  isMatched?: boolean;
  assistsCount?: number;
}

// ── Status config ─────────────────────────────────────────────────────────
interface StatusConfig {
  label: string;
  color: string;       // text + icon color
  bgColor: string;     // pill background
  icon?: string;       // EvaIcon name (outline)
  pulse?: boolean;     // subtle pulse animation
}

function getStatusConfig(
  proposalState?: FriendProposalState,
  isMatched?: boolean,
  assistsCount?: number,
): StatusConfig | null {
  // Priority 1: Active proposal lifecycle states
  if (proposalState) {
    const { status, userVoted } = proposalState;

    switch (status) {
      case 'deciding':
      case 'candidate_match':
        return {
          label: 'Sent to them!',
          color: COLORS.primary,
          bgColor: COLORS.primaryLight,
          icon: 'heart-outline',
          pulse: true,
        };

      case 'voting':
      case 'pending':
        if (userVoted) {
          return {
            label: 'Votes coming in',
            color: '#92400E',     // amber-800
            bgColor: '#FEF3C7',  // amber-100
            icon: 'clock-outline',
            pulse: true,
          };
        }
        return null; // Not voted yet — they're in "Waiting on you", not here

      case 'confirmed':
      case 'accepted':
        return {
          label: 'Matched!',
          color: '#166534',       // green-800
          bgColor: '#DCFCE7',    // green-100
          icon: 'checkmark-circle-2-outline',
        };

      case 'rejected':
        return {
          label: "Didn't pass",
          color: COLORS.text.tertiary,
          bgColor: '#F1F5F9',    // slate-100
        };

      case 'declined':
        return {
          label: "Didn't work out",
          color: COLORS.text.tertiary,
          bgColor: '#F1F5F9',
        };

      case 'expired_sent':
        return {
          label: 'Expired',
          color: COLORS.text.tertiary,
          bgColor: '#F1F5F9',
        };
    }
  }

  // Priority 2: Ongoing active match (no new proposal lifecycle)
  if (isMatched) {
    return {
      label: 'Has a match',
      color: '#166534',
      bgColor: '#DCFCE7',
      icon: 'heart',
    };
  }

  // Priority 3: Historical assists
  if (assistsCount && assistsCount > 0) {
    return {
      label: `${assistsCount} match${assistsCount === 1 ? '' : 'es'} made`,
      color: '#166534',
      bgColor: '#DCFCE7',
    };
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────
export const FriendStatusPill: React.FC<FriendStatusPillProps> = React.memo(({
  proposalState,
  isMatched,
  assistsCount,
}) => {
  const config = getStatusConfig(proposalState, isMatched, assistsCount);
  if (!config) return null;

  const { label, color, bgColor, icon, pulse } = config;

  return (
    <PillContent
      label={label}
      color={color}
      bgColor={bgColor}
      icon={icon}
      pulse={pulse}
    />
  );
});

FriendStatusPill.displayName = 'FriendStatusPill';

// Inner component to avoid hook rules issues with early return
const PillContent: React.FC<{
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
  pulse?: boolean;
}> = React.memo(({ label, color, bgColor, icon, pulse }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      opacity.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: DURATIONS.emphasis, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: DURATIONS.emphasis, easing: Easing.inOut(Easing.ease) }),
          ),
          -1, // infinite
          true,
        ),
      );
    } else {
      opacity.value = 1;
    }
  }, [pulse, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      {pulse ? (
        // Pulsing dot for in-progress states — replaces icon to avoid clutter
        <Animated.View style={[styles.pulseDot, { backgroundColor: color }, dotStyle]} />
      ) : icon ? (
        // Static icon for resolved/stable states
        <EvaIcon name={icon} size={12} color={color} />
      ) : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

PillContent.displayName = 'PillContent';

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    lineHeight: FONT_SIZES.xs * 1.3,
  },
});
