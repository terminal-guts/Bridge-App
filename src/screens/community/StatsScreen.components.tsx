/**
 * StatsScreen sub-components
 * Extracted from StatsScreen.tsx for maintainability.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Text,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { RootStackParamList } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import {
  getArchetype,
  type UserStats,
  type CampusStats,
  type PeriodStats,
  type CampusPeriodStats,
} from '../../services/statsService';
import { s, st, shareStyles, STAT_CARD_WIDTH, ACCURACY_RING_SIZE } from './StatsScreen.styles';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Tab = 'campus' | 'you';
export type Period = 'week' | 'allTime';

type FunFact = { icon: string; color: string; text: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatAssistDate = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return null; }
};

export const buildFunFacts = (user: UserStats, campus: CampusStats): FunFact[] => {
  const facts: FunFact[] = [];
  const at = user.all_time;
  const wk = user.week;
  const cat = campus.all_time;

  if (at.percentile >= 80) {
    facts.push({ icon: 'flash', color: '#FF9500', text: `You're in the top ${Math.max(1, 100 - at.percentile)}% of all voters on campus` });
  }
  if (at.current_streak >= 3) {
    facts.push({ icon: 'flash', color: '#FF3B30', text: `You're on a ${at.current_streak}-day voting streak — keep it going!` });
  }
  if (at.yes_rate >= 75 && at.total_votes_cast >= 5) {
    facts.push({ icon: 'heart', color: COLORS.urgentRed, text: `You approve ${at.yes_rate}% of proposals — you see the best in people` });
  } else if (at.yes_rate > 0 && at.yes_rate <= 35 && at.total_votes_cast >= 5) {
    facts.push({ icon: 'shield', color: '#6C5CE7', text: `You only approve ${at.yes_rate}% of proposals — high standards!` });
  }
  if (at.assists >= 1) {
    facts.push({ icon: 'people', color: COLORS.primaryAccent, text: `You've directly helped create ${at.assists} ${at.assists === 1 ? 'couple' : 'couples'} on campus` });
  }
  if (wk.karma_trend > 20) {
    facts.push({ icon: 'trending-up', color: COLORS.emerald, text: `Your karma is up ${wk.karma_trend}% this week — nice momentum` });
  }
  if (cat.active_matchmakers > 1) {
    facts.push({ icon: 'home', color: '#AF52DE', text: `${cat.active_matchmakers} matchmakers are active on campus this week` });
  }
  if (cat.most_popular_day !== 'N/A') {
    facts.push({ icon: 'calendar', color: '#FF9500', text: `${cat.most_popular_day} is the most popular voting day at ${cat.campus_name}` });
  }
  if (facts.length === 0) {
    facts.push({ icon: 'bulb', color: COLORS.primaryAccent, text: 'Keep voting on proposals to unlock personalized fun facts!' });
  }
  return facts.slice(0, 3);
};

// ─── Animated Number ─────────────────────────────────────────────────────────

export const AnimatedNumber = ({ value, delay = 0, duration = 1200, suffix = '', style }: {
  value: number;
  delay?: number;
  duration?: number;
  suffix?: string;
  style?: any;
}) => {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(value, {
      duration,
      easing: Easing.out(Easing.exp),
    }));
  }, [value]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (val, prev) => {
      if (val !== prev) runOnJS(setDisplay)(val);
    },
  );

  return <Text style={style}>{display.toLocaleString()}{suffix}</Text>;
};

// ─── Animated Progress Ring ──────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ProgressRing = ({ progress, size = ACCURACY_RING_SIZE, strokeWidth = 7, color = COLORS.success, delay = 300 }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  delay?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = 0;
    animatedProgress.value = withDelay(delay, withTiming(progress / 100, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    }));
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={COLORS.backgroundGray} strokeWidth={strokeWidth} fill="none"
      />
      <AnimatedCircle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

// ─── Trend Arrow ─────────────────────────────────────────────────────────────

export const TrendArrow = React.memo(({ value }: { value: number }) => {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <View style={[st.trendPill, { backgroundColor: isUp ? COLORS.backgroundSuccessBadge : COLORS.backgroundSoftRed }]}>
      <EvaIcon
        name={isUp ? 'arrow-upward' : 'arrow-downward'}
        variant="outline"
        size={10}
        color={isUp ? COLORS.emerald : COLORS.error}
      />
      <Text style={[st.trendText, { color: isUp ? COLORS.emerald : COLORS.error }]}>
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
    <TouchableOpacity
      style={[st.periodBtn, period === 'week' && st.periodBtnActive]}
      onPress={() => onToggle('week')}
      activeOpacity={0.7}
    >
      <Text style={[st.periodText, period === 'week' && st.periodTextActive]}>This Week</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[st.periodBtn, period === 'allTime' && st.periodBtnActive]}
      onPress={() => onToggle('allTime')}
      activeOpacity={0.7}
    >
      <Text style={[st.periodText, period === 'allTime' && st.periodTextActive]}>All Time</Text>
    </TouchableOpacity>
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
}) => (
  <Animated.View
    entering={FadeInUp.delay(200 + index * 100).springify().damping(15)}
    style={s.statCard}
  >
    <View style={s.statCardHeader}>
      <View style={[s.statIconCircle, { backgroundColor: iconColor + '15' }]}>
        <EvaIcon name={icon} variant="outline" size={20} color={iconColor} />
      </View>
      {trend !== undefined ? <TrendArrow value={trend} /> : null}
    </View>
    <AnimatedNumber
      value={value}
      delay={400 + index * 100}
      suffix={suffix}
      style={s.statValue}
    />
    <Text style={s.statLabel}>{label}</Text>
  </Animated.View>
));

// ─── Highlight Row ───────────────────────────────────────────────────────────

export const HighlightRow = React.memo(({ icon, iconColor, label, value, index }: {
  icon: string;
  iconColor: string;
  label: string;
  value: string | number;
  index: number;
}) => (
  <Animated.View entering={FadeInUp.delay(400 + index * 80).springify().damping(18)}>
    <View style={s.highlightRow}>
      <View style={s.highlightLeft}>
        <View style={[s.highlightIconDot, { backgroundColor: iconColor + '15' }]}>
          <EvaIcon name={icon} variant="outline" size={16} color={iconColor} />
        </View>
        <Text style={s.highlightLabel}>{label}</Text>
      </View>
      <Text style={s.highlightValue}>{value}</Text>
    </View>
  </Animated.View>
));

// ─── Fun Fact Card ───────────────────────────────────────────────────────────

export const FunFactCard = React.memo(({ fact, index }: {
  fact: FunFact;
  index: number;
}) => (
  <Animated.View
    entering={FadeInUp.delay(900 + index * 120).springify().damping(16)}
    style={st.funFactRow}
  >
    <View style={[st.funFactIcon, { backgroundColor: fact.color + '15' }]}>
      <EvaIcon name={fact.icon} variant="outline" size={16} color={fact.color} />
    </View>
    <Text style={st.funFactText}>{fact.text}</Text>
  </Animated.View>
));

// ─── Empty State ─────────────────────────────────────────────────────────────

export const StatsEmptyState = React.memo(({ navigation }: { navigation: NavigationProp<RootStackParamList> }) => (
  <View style={st.emptyWrap}>
    <View style={st.emptyIconCircle}>
      <EvaIcon name="bar-chart" variant="outline" size={40} color={COLORS.primaryAccent} />
    </View>
    <Text style={st.emptyTitle}>Your stats are waiting</Text>
    <Text style={st.emptyDesc}>
      Cast your first vote on a friend's proposal to start building your matchmaker stats.
    </Text>
    <TouchableOpacity
      style={st.emptyCta}
      onPress={() => navigation.navigate('MainTabs', { screen: 'Community' })}
      activeOpacity={0.7}
    >
      <Text style={st.emptyCtaText}>Start Voting</Text>
      <EvaIcon name="arrow-forward" variant="outline" size={16} color={COLORS.card} />
    </TouchableOpacity>
  </View>
));

// ─── Campus Tab ──────────────────────────────────────────────────────────────

export const CampusTab = React.memo(({ period, onPeriodChange, data }: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  data: CampusStats;
}) => {
  const d = period === 'week' ? data.week : data.all_time;

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={s.tabContentInner} showsVerticalScrollIndicator={false}>
      <PeriodToggle period={period} onToggle={onPeriodChange} />

      {/* Hero */}
      <Animated.View entering={FadeInUp.delay(100).springify().damping(14)}>
        <LinearGradient
          colors={[COLORS.primaryAccent, COLORS.primaryButton]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroIconCircle}>
            <EvaIcon name="heart" variant="outline" size={28} color={COLORS.card} />
          </View>
          <AnimatedNumber value={d.total_couples_set_up} delay={300} style={s.heroValue} />
          <Text style={s.heroLabel}>
            {period === 'week' ? 'Couples Set Up This Week' : 'Couples Set Up on Campus'}
          </Text>
          <Text style={s.heroSublabel}>{d.campus_name}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Stat Grid */}
      <Animated.View entering={FadeInUp.delay(250).springify().damping(18)}>
        <Text style={s.sectionTitle}>Campus Activity</Text>
      </Animated.View>
      <View style={s.statGrid}>
        <StatCard icon="checkmark-circle-2" iconColor="#34C759" label="Votes Cast" value={d.total_votes_cast} index={0} />
        <StatCard icon="checkmark-circle-2" iconColor="#437FFF" label="Approval Rate" value={d.avg_approval_rate} suffix="%" index={1} />
        <StatCard icon="people" iconColor="#AF52DE" label="Active Voters" value={d.active_matchmakers} index={2} />
        <StatCard icon="file-text" iconColor="#FF9500" label="Proposals / Week" value={d.proposals_this_week} index={3} />
      </View>

      {/* Highlights */}
      <Animated.View entering={FadeInUp.delay(500).springify().damping(18)}>
        <Text style={s.sectionTitle}>Highlights</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(550).springify().damping(18)} style={s.highlightCard}>
        <HighlightRow icon="award" iconColor="#FFD700" label="Top Matchmaker" value={d.top_matchmaker_name} index={0} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="star" iconColor="#FF9500" label="Most Assists" value={d.top_matchmaker_assists} index={1} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="calendar" iconColor="#437FFF" label="Busiest Day" value={d.most_popular_day} index={2} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="flash" iconColor="#FF3B30" label="Streak Record" value={`${d.streak_record} days`} index={3} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="bar-chart" iconColor="#34C759" label="Match Rate" value={`${d.match_rate}%`} index={4} />
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
  const d = period === 'week' ? data.week : data.all_time;
  const weekData = data.week;
  const allTime = data.all_time;
  const archetype = getArchetype(allTime.accuracy, allTime.yes_rate, allTime.assists);
  const isNewUser = allTime.total_votes_cast === 0;
  const showTrends = period === 'week';
  const firstAssistDate = formatAssistDate(allTime.first_assist_date);
  const funFacts = buildFunFacts(data, campusData);

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
      <Animated.View entering={FadeInUp.delay(100).springify().damping(14)}>
        <LinearGradient
          colors={archetype.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.archetypeCard}
        >
          <Text style={s.archetypeEmoji}>{archetype.emoji}</Text>
          <Text style={s.archetypeLabel}>Your Matchmaker Type</Text>
          <Text style={s.archetypeName}>{archetype.name}</Text>
          <Text style={s.archetypeDesc}>{archetype.description}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Impact hero */}
      <Animated.View entering={FadeInUp.delay(200).springify().damping(14)}>
        <View style={s.impactCard}>
          <View style={s.impactLeft}>
            <Text style={s.impactLabel}>
              {period === 'week' ? 'Couples This Week' : 'Couples You Helped Create'}
            </Text>
            <AnimatedNumber value={d.couples_set_up} delay={500} style={s.impactValue} />
            {period === 'allTime' && firstAssistDate ? (
              <Text style={s.impactSubtext}>First assist: {firstAssistDate}</Text>
            ) : null}
          </View>
          <View style={s.impactRight}>
            <EvaIcon name="heart" variant="outline" size={52} color={COLORS.urgentRed} />
          </View>
        </View>
      </Animated.View>

      {/* Accuracy ring */}
      <Animated.View entering={FadeInUp.delay(300).springify().damping(16)} style={s.accuracyCard}>
        <View style={s.accuracyRingWrap}>
          <ProgressRing progress={d.accuracy} delay={600} />
          <View style={s.accuracyRingOverlay}>
            <AnimatedNumber value={d.accuracy} delay={700} suffix="%" style={s.accuracyValue} />
          </View>
        </View>
        <View style={s.accuracyText}>
          <Text style={s.accuracyTitle}>Accuracy</Text>
          <Text style={s.accuracyDesc}>Your yes-votes that became matches</Text>
          {d.accuracy === 0 && d.total_votes_cast > 0 ? (
            <Text style={s.accuracyHint}>Vote yes on proposals you believe in to build accuracy</Text>
          ) : null}
        </View>
      </Animated.View>

      {/* Voting Stats */}
      <Animated.View entering={FadeInUp.delay(400).springify().damping(18)}>
        <Text style={s.sectionTitle}>Voting</Text>
      </Animated.View>
      <View style={s.statGrid}>
        <StatCard icon="checkmark-circle-2" iconColor="#437FFF" label="Votes Cast" value={d.total_votes_cast} trend={showTrends ? weekData.votes_trend : undefined} index={0} />
        <StatCard icon="done-all" iconColor="#34C759" label="Yes Rate" value={d.yes_rate} suffix="%" index={1} />
        <StatCard icon="people" iconColor="#AF52DE" label="Friends Helped" value={d.friends_helped} index={2} />
        <StatCard icon="star" iconColor="#FF9500" label="Karma" value={d.karma_points} trend={showTrends ? weekData.karma_trend : undefined} index={3} />
      </View>

      {/* Streaks */}
      <Animated.View entering={FadeInUp.delay(600).springify().damping(18)}>
        <Text style={s.sectionTitle}>Streaks</Text>
      </Animated.View>
      <View style={s.statGrid}>
        <StatCard icon="flash" iconColor="#FF3B30" label="Current Streak" value={d.current_streak} suffix="d" index={4} />
        <StatCard icon="award" iconColor="#FF9500" label="Best Streak" value={d.longest_streak} suffix="d" index={5} />
      </View>

      {/* Rank card */}
      <Animated.View entering={FadeInUp.delay(700).springify().damping(16)} style={s.rankCard}>
        <LinearGradient
          colors={[COLORS.backgroundLightBlue, '#E8EEFF']}
          style={s.rankGradient}
        >
          <View style={s.rankIconWrap}>
            <EvaIcon name="award" variant="outline" size={24} color={COLORS.primaryAccent} />
          </View>
          <View style={s.rankText}>
            <Text style={s.rankTitle}>Weekly Rank</Text>
            <Text style={s.rankDesc}>Top {Math.max(1, 100 - d.percentile)}% — out of {d.total_users} active voters</Text>
          </View>
          <View style={s.rankBadge}>
            <Text style={s.rankValue}>#{d.weekly_rank}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Fun Facts */}
      <Animated.View entering={FadeInUp.delay(850).springify().damping(18)}>
        <Text style={s.sectionTitle}>Did You Know?</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(880).springify().damping(18)} style={st.funFactCard}>
        {funFacts.map((fact, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={s.highlightDivider} />}
            <FunFactCard fact={fact} index={i} />
          </React.Fragment>
        ))}
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
  const archetype = getArchetype(d.accuracy, d.yes_rate, d.assists);

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
          <Text style={shareStyles.archetypeName}>{archetype.name}</Text>
          <Text style={shareStyles.archetypeDesc}>{archetype.description}</Text>

          <View style={shareStyles.divider} />

          <View style={shareStyles.statsRow}>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d.couples_set_up}</Text>
              <Text style={shareStyles.statLabel}>Couples</Text>
            </View>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d.accuracy}%</Text>
              <Text style={shareStyles.statLabel}>Accuracy</Text>
            </View>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d.total_votes_cast}</Text>
              <Text style={shareStyles.statLabel}>Votes</Text>
            </View>
          </View>

          <View style={shareStyles.statsRow}>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d.current_streak}d</Text>
              <Text style={shareStyles.statLabel}>Streak</Text>
            </View>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>{d.karma_points}</Text>
              <Text style={shareStyles.statLabel}>Karma</Text>
            </View>
            <View style={shareStyles.statBlock}>
              <Text style={shareStyles.statNum}>Top {100 - d.percentile}%</Text>
              <Text style={shareStyles.statLabel}>Rank</Text>
            </View>
          </View>

          <Text style={shareStyles.campusText}>{campusName}</Text>

          <View style={shareStyles.watermark}>
            <Text style={shareStyles.watermarkText}>bridge</Text>
          </View>
        </LinearGradient>
      </View>
    </ViewShot>
  );
});
