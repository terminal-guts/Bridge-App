/**
 * LiveVoteBar — Animated vote percentage bar with yes/no/unsure segments.
 * Migrated to Reanimated for UI-thread performance (no useNativeDriver: false).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { SHADOWS } from '../../../theme/shadows';
import { DURATIONS } from '../../../constants/animations';
import { lightHaptic } from '../../../utils/haptics';

const BLUE = COLORS.primary;
const GREEN = COLORS.success;
const RED = COLORS.rejectRed;
const GREY_VOTE = COLORS.text.secondary;  // #64748B — WCAG AA compliant (was text.disabled #9CA3AF, failed AA at small sizes)

export function LiveVoteBar({
  yesVotes,
  noVotes,
  totalVotes,
}: {
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
}) {
  const unsureVotes = Math.max(0, totalVotes - yesVotes - noVotes);
  const total = yesVotes + noVotes + unsureVotes;

  const [barWidth, setBarWidth] = useState(0);
  const hasMounted = useSharedValue(false);

  const yesPct = useSharedValue(0);
  const noPct = useSharedValue(0);
  const unsurePct = useSharedValue(0);

  useEffect(() => {
    if (total === 0) return;
    const yp = (yesVotes / total) * 100;
    const np = (noVotes / total) * 100;
    const up = (unsureVotes / total) * 100;

    yesPct.value = withTiming(yp, { duration: DURATIONS.slow });
    noPct.value = withTiming(np, { duration: DURATIONS.slow });
    unsurePct.value = withTiming(up, { duration: DURATIONS.slow }, (finished) => {
      // Only fire haptic on user-initiated vote changes, not initial mount
      if (finished && hasMounted.value) runOnJS(lightHaptic)();
    });
    hasMounted.value = true;
  }, [yesVotes, noVotes, unsureVotes, total]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  // Use pixel widths (not %) for Reanimated UI-thread compatibility
  const yesStyle = useAnimatedStyle(() => ({
    width: barWidth > 0 ? interpolate(yesPct.value, [0, 100], [0, barWidth]) : 0,
    height: 14,
    overflow: 'hidden' as const,
  }));

  const noStyle = useAnimatedStyle(() => ({
    width: barWidth > 0 ? interpolate(noPct.value, [0, 100], [0, barWidth]) : 0,
    height: 14,
    overflow: 'hidden' as const,
  }));

  const unsureStyle = useAnimatedStyle(() => ({
    width: barWidth > 0 ? interpolate(unsurePct.value, [0, 100], [0, barWidth]) : 0,
    height: 14,
    overflow: 'hidden' as const,
  }));

  if (total === 0) {
    return (
      <View style={{ marginTop: 10, marginBottom: 4, alignItems: 'center' }}>
        <View style={{
          height: 14, borderRadius: 7, width: '100%', marginBottom: 8,
          backgroundColor: COLORS.borderSubtle,
          ...SHADOWS.sm,
          overflow: 'hidden',
        }}>
          <LinearGradient
            colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.03)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE }} />
          <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: BLUE }}>
            Be the first to weigh in!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10, marginBottom: 4 }} accessibilityLabel={`Vote results: ${yesVotes} yes, ${noVotes} no, ${unsureVotes} unsure out of ${total} votes`}>
      <View style={{
        height: 14, borderRadius: 7, overflow: 'hidden',
        backgroundColor: COLORS.borderSubtle,
        ...SHADOWS.sm,
      }}>
        <LinearGradient
          colors={['rgba(0,0,0,0.04)', 'transparent', 'rgba(0,0,0,0.06)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
        />
        <View style={{ flexDirection: 'row', height: 14, zIndex: 1 }} onLayout={onBarLayout}>
          {yesVotes > 0 && (
            <Animated.View style={yesStyle}>
              <LinearGradient colors={['#4ADE80', GREEN, '#22C55E']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
          {noVotes > 0 && (
            <Animated.View style={noStyle}>
              <LinearGradient colors={[COLORS.urgentRed, RED, '#E11D48']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
          {unsureVotes > 0 && (
            <Animated.View style={unsureStyle}>
              <LinearGradient colors={['#C4C9D4', GREY_VOTE, '#8B93A1']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 7, zIndex: 2 }}
          pointerEvents="none"
        />
      </View>

      <View style={{ alignItems: 'center', marginTop: 8, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: GREEN }}>{yesVotes} Yes</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.borderGray }}>&middot;</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: RED }}>{noVotes} No</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.borderGray }}>&middot;</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: GREY_VOTE }}>{unsureVotes} Unsure</Text>
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, color: COLORS.text.disabled }}>
          {total} voted{' \u00b7 '}
          {yesVotes > noVotes + unsureVotes ? 'strong yes' :
           noVotes > yesVotes + unsureVotes ? 'strong no' :
           yesVotes === noVotes && unsureVotes === 0 ? 'evenly split' :
           'community is split'}
        </Text>
      </View>
    </View>
  );
}
