/**
 * LiveVoteBar — Animated vote percentage bar with yes/no/unsure segments.
 * Extracted from ProposalReviewView.tsx.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';

const BLUE = COLORS.primary;
const GREEN = COLORS.success;
const RED = COLORS.rejectRed;
const GREY_VOTE = COLORS.text.disabled;

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

  const yesWidth = useRef(new Animated.Value(0)).current;
  const noWidth = useRef(new Animated.Value(0)).current;
  const unsureWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (total === 0) return;
    const yesPct = (yesVotes / total) * 100;
    const noPct = (noVotes / total) * 100;
    const unsurePct = (unsureVotes / total) * 100;

    Animated.parallel([
      Animated.timing(yesWidth, { toValue: yesPct, duration: 400, useNativeDriver: false }),
      Animated.timing(noWidth, { toValue: noPct, duration: 400, useNativeDriver: false }),
      Animated.timing(unsureWidth, { toValue: unsurePct, duration: 400, useNativeDriver: false }),
    ]).start();
  }, [yesVotes, noVotes, unsureVotes, total, yesWidth, noWidth, unsureWidth]);

  if (total === 0) {
    return (
      <View style={{ marginTop: 10, marginBottom: 4, alignItems: 'center' }}>
        <View style={{
          height: 14, borderRadius: 7, width: '100%', marginBottom: 8,
          backgroundColor: COLORS.borderSubtle,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
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
    <View style={{ marginTop: 10, marginBottom: 4 }}>
      <View style={{
        height: 14, borderRadius: 7, overflow: 'hidden',
        backgroundColor: COLORS.borderSubtle,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
      }}>
        <LinearGradient
          colors={['rgba(0,0,0,0.04)', 'transparent', 'rgba(0,0,0,0.06)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
        />
        <View style={{ flexDirection: 'row', height: 14, zIndex: 1 }}>
          {yesVotes > 0 && (
            <Animated.View style={{
              height: 14, overflow: 'hidden',
              width: yesWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }}>
              <LinearGradient colors={['#4ADE80', GREEN, '#22C55E']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
          {noVotes > 0 && (
            <Animated.View style={{
              height: 14, overflow: 'hidden',
              width: noWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }}>
              <LinearGradient colors={['#FF6B6B', RED, '#E11D48']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
          {unsureVotes > 0 && (
            <Animated.View style={{
              height: 14, overflow: 'hidden',
              width: unsureWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }}>
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
