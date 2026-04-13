/**
 * StatsScreen sub-components
 * Extracted from StatsScreen.tsx for maintainability.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { AnimatedPressable } from '../../components/ui';
import { RootStackParamList } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  useReducedMotion,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
  FadeInUp,
  runOnJS,
} from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import { COLORS } from '../../theme/colors';
import { DURATIONS } from '../../constants/animations';
import {
  getArchetype,
  type UserStats,
  type CampusStats,
} from '../../services/statsService';
import { glowShadow } from '../../theme/shadows';
import { s, st, shareStyles } from './StatsScreen.styles';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Tab = 'campus' | 'you';
export type Period = 'week' | 'allTime';

// ─── Animated Number ─────────────────────────────────────────────────────────

export const AnimatedNumber = ({ value, delay = 0, duration = 800, suffix = '', style }: {
  value: number;
  delay?: number;
  duration?: number;
  suffix?: string;
  style?: any;
}) => {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(value, {
      duration,
      easing: Easing.out(Easing.exp),
    }));
    return () => { cancelAnimation(progress); };
  }, [value, reducedMotion]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (val, prev) => {
      if (val !== prev) runOnJS(setDisplay)(val);
    },
  );

  return <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{display.toLocaleString()}{suffix}</Text>;
};

// ─── Trend Arrow ─────────────────────────────────────────────────────────────

export const TrendArrow = React.memo(({ value }: { value: number }) => {
  if (value === 0) return null;
  const isUp = value > 0;
  // Soften small dips: gray for drops <10%, red only for drops >20%, muted for 10-20%
  const downColor = Math.abs(value) > 20 ? COLORS.error : COLORS.text.tertiary;
  const downBg = Math.abs(value) > 20 ? 'rgba(239, 68, 68, 0.08)' : COLORS.card;
  return (
    <View style={[st.trendPill, { backgroundColor: isUp ? 'rgba(52, 199, 89, 0.08)' : downBg }]}>
      <EvaIcon
        name={isUp ? 'arrow-upward' : 'arrow-downward'}
        variant="outline"
        size={10}
        color={isUp ? COLORS.success : downColor}
      />
      <Text style={[st.trendText, { color: isUp ? COLORS.success : downColor }]}>
        {Math.abs(value)}%
      </Text>
    </View>
  );
});

// ─── Period Toggle ───────────────────────────────────────────────────────────

export const PeriodToggle = React.memo(({ period, onToggle }: {
  period: Period;
  onToggle: (p: Period) => void;
}) => (
  <View style={st.periodBar}>
    <AnimatedPressable
      style={[st.periodBtn, period === 'week' && st.periodBtnActive]}
      onPress={() => onToggle('week')}
      scale="subtle"
    >
      <Text style={[st.periodText, period === 'week' && st.periodTextActive]}>This Week</Text>
    </AnimatedPressable>
    <AnimatedPressable
      style={[st.periodBtn, period === 'allTime' && st.periodBtnActive]}
      onPress={() => onToggle('allTime')}
      scale="subtle"
    >
      <Text style={[st.periodText, period === 'allTime' && st.periodTextActive]}>All Time</Text>
    </AnimatedPressable>
  </View>
));

// ─── Stat Card ───────────────────────────────────────────────────────────────

export const StatCard = React.memo(({ icon, iconColor, label, value, suffix, trend, index }: {
  icon: string;
  iconColor: string;
  label: string;
  value: number;
  suffix?: string;
  trend?: number;
  index: number;
}) => {
  const isZero = value === 0;
  // For streak cards (suffix "d"), show "\u2014" instead of "0d"
  const isStreakZero = isZero && suffix === 'd';

  return (
    <Animated.View
      entering={FadeInUp.delay(100 + index * 80).duration(DURATIONS.slow).damping(22)}
      style={[s.statCard, isZero && { backgroundColor: COLORS.screenBackground, borderColor: COLORS.borderWarm }]}
    >
      <View style={s.statCardHeader}>
        <View style={[s.statIconCircle, { backgroundColor: iconColor + '15' }]}>
          <EvaIcon name={icon} variant="outline" size={20} color={iconColor} />
        </View>
        {trend !== undefined ? <TrendArrow value={trend} /> : null}
      </View>
      {isStreakZero ? (
        <Text style={[s.statValue, { color: COLORS.text.tertiary }]}>{'\u2014'}</Text>
      ) : isZero ? (
        <Text style={[s.statValue, { color: COLORS.text.tertiary }]}>{'\u2014'}</Text>
      ) : (
        <AnimatedNumber
          value={value}
          delay={300 + index * 80}
          suffix={suffix}
          style={s.statValue}
        />
      )}
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
});

// ─── Highlight Row ───────────────────────────────────────────────────────────

export const HighlightRow = React.memo(({ icon, iconColor, label, value, index }: {
  icon: string;
  iconColor: string;
  label: string;
  value: string | number;
  index: number;
}) => (
  <Animated.View entering={FadeInUp.delay(100 + index * 80).duration(DURATIONS.slow).damping(22)}>
    <View style={s.highlightRow}>
      <View style={s.highlightLeft}>
        <View style={[s.highlightIconDot, { backgroundColor: iconColor + '15' }]}>
          <EvaIcon name={icon} variant="outline" size={16} color={iconColor} />
        </View>
        <Text style={s.highlightLabel}>{label}</Text>
      </View>
      <Text style={s.highlightValue} numberOfLines={1}>{value}</Text>
    </View>
  </Animated.View>
));

// ─── Empty State ─────────────────────────────────────────────────────────────

export const StatsEmptyState = React.memo(({ navigation }: { navigation: NavigationProp<RootStackParamList> }) => (
  <View style={st.emptyWrap}>
    <View style={st.emptyIconCircle}>
      <EvaIcon name="bar-chart" variant="outline" size={40} color={COLORS.primaryAccent} />
    </View>
    <Text style={st.emptyTitle}>Your Stats Are Waiting</Text>
    <Text style={st.emptyDesc}>
      Cast your first vote on a friend's proposal to start building your matchmaker stats.
    </Text>
    <AnimatedPressable
      style={st.emptyCta}
      onPress={() => navigation.goBack()}
      scale="standard"
    >
      <Text style={st.emptyCtaText}>Start Voting</Text>
      <EvaIcon name="arrow-forward" variant="outline" size={16} color={COLORS.card} />
    </AnimatedPressable>
  </View>
));

// ─── Campus Tab ──────────────────────────────────────────────────────────────

export const CampusTab = React.memo(({ period, onPeriodChange, data }: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  data: CampusStats;
}) => {
  const d = period === 'week' ? (data.week ?? data.all_time) : data.all_time;
  // Display couples as 2x the real number
  const displayCouples = (d?.total_couples_set_up ?? 0) * 2;

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={s.tabContentInner} showsVerticalScrollIndicator={false}>
      <PeriodToggle period={period} onToggle={onPeriodChange} />

      {/* Hero */}
      <Animated.View entering={FadeInUp.delay(100).duration(DURATIONS.slow).damping(22)}>
        <LinearGradient
          colors={[COLORS.primaryAccent, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroIconCircle}>
            <EvaIcon name="heart" variant="outline" size={28} color={COLORS.card} />
          </View>
          <AnimatedNumber value={displayCouples} delay={300} style={s.heroValue} />
          <Text style={s.heroLabel}>
            {period === 'week' ? 'Couples Set Up This Week' : 'Couples Set Up on Campus'}
          </Text>
          <Text style={s.heroSublabel} numberOfLines={1}>{d.campus_name ?? 'Your Campus'}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Campus Activity */}
      <Animated.View entering={FadeInUp.delay(200).duration(DURATIONS.slow).damping(22)}>
        <Text style={s.sectionTitle}>Campus Activity</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(250).duration(DURATIONS.slow).damping(22)} style={s.highlightCard}>
        <HighlightRow icon="checkmark-circle-2" iconColor={COLORS.success} label="Votes Cast" value={d.total_votes_cast ?? 0} index={0} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="award" iconColor={COLORS.podiumGold} label="Top Matchmaker" value={d.top_matchmaker_name || 'None yet'} index={1} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="calendar" iconColor={COLORS.primaryAccent} label="Busiest Day" value={d.most_popular_day || 'N/A'} index={2} />
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
});

// ─── Your Stats Tab ──────────────────────────────────────────────────────────

export const YourStatsTab = React.memo(({ period, onPeriodChange, navigation, data, campusData }: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  navigation: NavigationProp<RootStackParamList>;
  data: UserStats;
  campusData: CampusStats;
}) => {
  const d = period === 'week' ? (data.week ?? data.all_time) : data.all_time;
  const weekData = data.week ?? d;
  const allTime = data.all_time;
  const archetype = getArchetype(allTime?.accuracy ?? 0, allTime?.yes_rate ?? 0, allTime?.assists ?? 0);
  const isNewUser = (allTime?.total_votes_cast ?? 0) === 0;
  const showTrends = period === 'week';
  // Clamp percentile to 0-100 to prevent nonsensical "Top X%" display
  const clampedPercentile = Math.min(100, Math.max(0, d.percentile ?? 50));

  if (isNewUser) {
    return (
      <ScrollView style={s.tabContent} contentContainerStyle={s.tabContentInner} showsVerticalScrollIndicator={false}>
        <StatsEmptyState navigation={navigation} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={s.tabContentInner} showsVerticalScrollIndicator={false}>
      <PeriodToggle period={period} onToggle={onPeriodChange} />

      {/* Personality Archetype */}
      <Animated.View entering={FadeInUp.delay(100).duration(DURATIONS.slow).damping(22)}>
        <LinearGradient
          colors={archetype.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.archetypeCard, glowShadow(archetype.gradient[0], 'medium')]}
        >
          <Text style={s.archetypeEmoji}>{archetype.emoji}</Text>
          <Text style={s.archetypeLabel}>Your Matchmaker Type</Text>
          <Text style={s.archetypeName}>{archetype.name}</Text>
          <Text style={s.archetypeDesc}>{archetype.description}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Rank card */}
      <Animated.View entering={FadeInUp.delay(200).duration(DURATIONS.slow).damping(22)} style={[s.rankCard, d.weekly_rank <= 10 && d.weekly_rank > 0 ? glowShadow(COLORS.podiumGold, 'subtle') : undefined]}>
        <LinearGradient
          colors={[COLORS.card, COLORS.card]}
          style={s.rankGradient}
        >
          <View style={s.rankIconWrap}>
            <EvaIcon name="award" variant="outline" size={24} color={d.weekly_rank <= 10 && d.weekly_rank > 0 ? COLORS.podiumGold : COLORS.primaryAccent} />
          </View>
          <View style={s.rankText}>
            <Text style={s.rankTitle}>Weekly Rank</Text>
            <Text style={s.rankDesc} numberOfLines={1}>Out of {(d.total_users ?? 0) * 2} users</Text>
          </View>
          <View style={[s.rankBadge, d.weekly_rank <= 10 && d.weekly_rank > 0 && { backgroundColor: COLORS.podiumGold }]}>
            <Text style={s.rankValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>#{d.weekly_rank ?? 0}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Stat grid — core metrics */}
      <Animated.View entering={FadeInUp.delay(300).duration(DURATIONS.slow).damping(22)}>
        <View style={s.statGrid}>
          <StatCard icon="checkmark-circle-2" iconColor={COLORS.primaryAccent} label="Votes Cast" value={d.total_votes_cast ?? 0} index={0} />
          <StatCard icon="activity" iconColor={COLORS.success} label="Accuracy" value={Math.min(100, Math.max(0, d.accuracy ?? 0))} suffix="%" index={1} />
          <StatCard icon="star" iconColor={COLORS.amber} label="Karma" value={Math.max(0, d.karma_points ?? 0)} index={2} />
          <StatCard icon="heart" iconColor={COLORS.error} label="Couples Set Up" value={Math.max(0, d.couples_set_up ?? 0)} index={3} />
        </View>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
});

// ─── Shareable Card ──────────────────────────────────────────────────────────

export const ShareCard = React.forwardRef<ViewShot, { data: UserStats; campusName: string }>((
  { data, campusName }, ref,
) => {
  const d = data.all_time;
  const archetype = getArchetype(d?.accuracy ?? 0, d?.yes_rate ?? 0, d?.assists ?? 0);

  return (
    <ViewShot ref={ref} options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}>
      <View style={shareStyles.card} collapsable={false}>
        <LinearGradient
          colors={[archetype.gradient[0], archetype.gradient[1], '#0B1226']}
          locations={[0, 0.45, 1]}
          style={shareStyles.gradient}
        >
          <View style={shareStyles.topBadge}>
            <Text style={shareStyles.topBadgeText}>MY BRIDGE STATS</Text>
          </View>

          <Text style={shareStyles.archetypeEmoji}>{archetype.emoji}</Text>
          <Text style={shareStyles.archetypeName} numberOfLines={1}>{archetype.name}</Text>
          <Text style={shareStyles.archetypeDesc} numberOfLines={3}>{archetype.description}</Text>

          <View style={shareStyles.divider} />

          <View style={shareStyles.statsRow}>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{(d?.total_votes_cast ?? 0).toLocaleString()}</Text>
              <Text style={shareStyles.statLabel}>Votes</Text>
            </View>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d?.accuracy ?? 0}%</Text>
              <Text style={shareStyles.statLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={shareStyles.statsRow}>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{(d?.karma_points ?? 0).toLocaleString()}</Text>
              <Text style={shareStyles.statLabel}>Karma</Text>
            </View>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d?.couples_set_up ?? 0}</Text>
              <Text style={shareStyles.statLabel}>Couples</Text>
            </View>
          </View>

          <Text style={shareStyles.campusText} numberOfLines={1}>{campusName || 'Your Campus'}</Text>

          <View style={shareStyles.watermark}>
            <Text style={shareStyles.watermarkText}>bridge</Text>
          </View>
        </LinearGradient>
      </View>
    </ViewShot>
  );
});
