import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  Dimensions,
  ActivityIndicator,
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
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { lightHaptic, mediumHaptic, successHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import {
  fetchStats,
  getArchetype,
  type UserStats,
  type CampusStats,
  type PeriodStats,
  type WeekStats,
  type CampusPeriodStats,
} from '../../services/statsService';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'campus' | 'you';
type Period = 'week' | 'allTime';

interface Props {
  navigation: NavigationProp<RootStackParamList>;
}

// ─── Fallback Defaults ───────────────────────────────────────────────────────

const EMPTY_PERIOD: PeriodStats = {
  couples_set_up: 0, total_votes_cast: 0, accuracy: 0, yes_rate: 0,
  current_streak: 0, longest_streak: 0, karma_points: 0, assists: 0,
  friends_helped: 0, weekly_rank: 0, total_users: 0, percentile: 50,
};

const EMPTY_WEEK: WeekStats = {
  ...EMPTY_PERIOD, votes_trend: 0, accuracy_trend: 0, karma_trend: 0, assists_trend: 0,
};

const EMPTY_USER_STATS: UserStats = {
  all_time: { ...EMPTY_PERIOD, first_assist_date: null },
  week: EMPTY_WEEK,
};

const EMPTY_CAMPUS_PERIOD: CampusPeriodStats = {
  campus_name: 'Your Campus', total_couples_set_up: 0, total_votes_cast: 0,
  avg_approval_rate: 0, active_matchmakers: 0, proposals_this_week: 0,
  top_matchmaker_name: 'None yet', top_matchmaker_assists: 0,
  most_popular_day: 'N/A', streak_record: 0, match_rate: 0,
};

const EMPTY_CAMPUS_STATS: CampusStats = {
  all_time: EMPTY_CAMPUS_PERIOD, week: EMPTY_CAMPUS_PERIOD,
};

// ─── Dynamic Fun Facts ──────────────────────────────────────────────────────

type FunFact = { icon: keyof typeof Record<string, number>; color: string; text: string };

const buildFunFacts = (user: UserStats, campus: CampusStats): FunFact[] => {
  const facts: FunFact[] = [];
  const at = user.all_time;
  const wk = user.week;
  const cat = campus.all_time;

  // Percentile brag
  if (at.percentile >= 80) {
    facts.push({ icon: 'flash', color: '#FF9500', text: `You're in the top ${Math.max(1, 100 - at.percentile)}% of all voters on campus` });
  }

  // Streak highlight
  if (at.current_streak >= 3) {
    facts.push({ icon: 'flash', color: '#FF3B30', text: `You're on a ${at.current_streak}-day voting streak — keep it going!` });
  }

  // Yes-rate personality
  if (at.yes_rate >= 75 && at.total_votes_cast >= 5) {
    facts.push({ icon: 'heart', color: '#FF6B6B', text: `You approve ${at.yes_rate}% of proposals — you see the best in people` });
  } else if (at.yes_rate > 0 && at.yes_rate <= 35 && at.total_votes_cast >= 5) {
    facts.push({ icon: 'shield', color: '#6C5CE7', text: `You only approve ${at.yes_rate}% of proposals — high standards!` });
  }

  // Assists milestone
  if (at.assists >= 1) {
    facts.push({ icon: 'people', color: '#437FFF', text: `You've directly helped create ${at.assists} ${at.assists === 1 ? 'couple' : 'couples'} on campus` });
  }

  // Weekly karma growth
  if (wk.karma_trend > 20) {
    facts.push({ icon: 'trending-up', color: '#10B981', text: `Your karma is up ${wk.karma_trend}% this week — nice momentum` });
  }

  // Campus context
  if (cat.active_matchmakers > 1) {
    facts.push({ icon: 'school', color: '#AF52DE', text: `${cat.active_matchmakers} matchmakers are active on campus this week` });
  }

  // Campus busiest day
  if (cat.most_popular_day !== 'N/A') {
    facts.push({ icon: 'calendar', color: '#FF9500', text: `${cat.most_popular_day} is the most popular voting day at ${cat.campus_name}` });
  }

  // Fallback — always show at least one
  if (facts.length === 0) {
    facts.push({ icon: 'sparkles', color: '#437FFF', text: 'Keep voting on proposals to unlock personalized fun facts!' });
  }

  return facts.slice(0, 3);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatAssistDate = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return null; }
};

// ─── Animated Number ─────────────────────────────────────────────────────────

const AnimatedNumber = ({ value, delay = 0, duration = 1200, suffix = '', style }: {
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

const ProgressRing = ({ progress, size = 88, strokeWidth = 7, color = '#34C759', delay = 300 }: {
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
        stroke="#F3F4F6" strokeWidth={strokeWidth} fill="none"
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

const TrendArrow = React.memo(({ value }: { value: number }) => {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <View style={[st.trendPill, { backgroundColor: isUp ? '#EDFCF2' : '#FEF2F2' }]}>
      <EvaIcon
        name={isUp ? 'arrow-upward' : 'arrow-downward'}
        variant="outline"
        size={10}
        color={isUp ? '#10B981' : '#EF4444'}
      />
      <Text style={[st.trendText, { color: isUp ? '#10B981' : '#EF4444' }]}>
        {Math.abs(value)}%
      </Text>
    </View>
  );
});

// ─── Period Toggle ───────────────────────────────────────────────────────────

const PeriodToggle = React.memo(({ period, onToggle }: {
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

const StatCard = React.memo(({ icon, iconColor, label, value, suffix, trend, index }: {
  icon: keyof typeof Record<string, number>;
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

const HighlightRow = React.memo(({ icon, iconColor, label, value, index }: {
  icon: keyof typeof Record<string, number>;
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

const FunFactCard = React.memo(({ fact, index }: {
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

const EmptyState = React.memo(({ navigation }: { navigation: NavigationProp<RootStackParamList> }) => (
  <View style={st.emptyWrap}>
    <View style={st.emptyIconCircle}>
      <EvaIcon name="bar-chart" variant="outline" size={40} color="#437FFF" />
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
      <EvaIcon name="arrow-forward" variant="outline" size={16} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
));

// ─── Campus Tab ──────────────────────────────────────────────────────────────

const CampusTab = React.memo(({ period, onPeriodChange, data }: {
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
          colors={['#437FFF', '#2B65F9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroIconCircle}>
            <EvaIcon name="heart" variant="outline" size={28} color="#FFFFFF" />
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
        <StatCard icon="thumbs-up" iconColor="#34C759" label="Votes Cast" value={d.total_votes_cast} index={0} />
        <StatCard icon="checkmark-circle" iconColor="#437FFF" label="Approval Rate" value={d.avg_approval_rate} suffix="%" index={1} />
        <StatCard icon="people" iconColor="#AF52DE" label="Active Voters" value={d.active_matchmakers} index={2} />
        <StatCard icon="document-text" iconColor="#FF9500" label="Proposals / Week" value={d.proposals_this_week} index={3} />
      </View>

      {/* Highlights */}
      <Animated.View entering={FadeInUp.delay(500).springify().damping(18)}>
        <Text style={s.sectionTitle}>Highlights</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(550).springify().damping(18)} style={s.highlightCard}>
        <HighlightRow icon="trophy" iconColor="#FFD700" label="Top Matchmaker" value={d.top_matchmaker_name} index={0} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="star" iconColor="#FF9500" label="Most Assists" value={d.top_matchmaker_assists} index={1} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="calendar" iconColor="#437FFF" label="Busiest Day" value={d.most_popular_day} index={2} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="flash" iconColor="#FF3B30" label="Streak Record" value={`${d.streak_record} days`} index={3} />
        <View style={s.highlightDivider} />
        <HighlightRow icon="analytics" iconColor="#34C759" label="Match Rate" value={`${d.match_rate}%`} index={4} />
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
});

// ─── Your Stats Tab ──────────────────────────────────────────────────────────

const YourStatsTab = React.memo(({ period, onPeriodChange, navigation, data, campusData }: {
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
        <EmptyState navigation={navigation} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={s.tabContentInner} showsVerticalScrollIndicator={false}>
      <PeriodToggle period={period} onToggle={onPeriodChange} />

      {/* Personality Archetype — always from all-time data */}
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

      {/* Impact hero — couples set up */}
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
            <EvaIcon name="heart" variant="outline" size={52} color="#FF6B6B" />
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
        <StatCard icon="thumbs-up" iconColor="#437FFF" label="Votes Cast" value={d.total_votes_cast} trend={showTrends ? weekData.votes_trend : undefined} index={0} />
        <StatCard icon="checkmark-done" iconColor="#34C759" label="Yes Rate" value={d.yes_rate} suffix="%" index={1} />
        <StatCard icon="people" iconColor="#AF52DE" label="Friends Helped" value={d.friends_helped} index={2} />
        <StatCard icon="diamond" iconColor="#FF9500" label="Karma" value={d.karma_points} trend={showTrends ? weekData.karma_trend : undefined} index={3} />
      </View>

      {/* Streaks */}
      <Animated.View entering={FadeInUp.delay(600).springify().damping(18)}>
        <Text style={s.sectionTitle}>Streaks</Text>
      </Animated.View>
      <View style={s.statGrid}>
        <StatCard icon="flash" iconColor="#FF3B30" label="Current Streak" value={d.current_streak} suffix="d" index={4} />
        <StatCard icon="ribbon" iconColor="#FF9500" label="Best Streak" value={d.longest_streak} suffix="d" index={5} />
      </View>

      {/* Rank card */}
      <Animated.View entering={FadeInUp.delay(700).springify().damping(16)} style={s.rankCard}>
        <LinearGradient
          colors={['#F0F4FF', '#E8EEFF']}
          style={s.rankGradient}
        >
          <View style={s.rankIconWrap}>
            <EvaIcon name="award" variant="outline" size={24} color="#437FFF" />
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

// ─── Shareable Card (rendered offscreen for capture) ─────────────────────────

const ShareCard = React.forwardRef<ViewShot, { data: UserStats; campusName: string }>((
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
          {/* Top badge */}
          <View style={shareStyles.topBadge}>
            <Text style={shareStyles.topBadgeText}>MY BRIDGE STATS</Text>
          </View>

          {/* Archetype */}
          <Text style={shareStyles.archetypeEmoji}>{archetype.emoji}</Text>
          <Text style={shareStyles.archetypeName}>{archetype.name}</Text>
          <Text style={shareStyles.archetypeDesc}>{archetype.description}</Text>

          {/* Divider */}
          <View style={shareStyles.divider} />

          {/* Stats grid */}
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

          {/* Campus */}
          <Text style={shareStyles.campusText}>{campusName}</Text>

          {/* Watermark */}
          <View style={shareStyles.watermark}>
            <Text style={shareStyles.watermarkText}>bridge</Text>
          </View>
        </LinearGradient>
      </View>
    </ViewShot>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<Tab>('you');
  const [period, setPeriod] = useState<Period>('week');
  const [userStats, setUserStats] = useState<UserStats>(EMPTY_USER_STATS);
  const [campusStats, setCampusStats] = useState<CampusStats>(EMPTY_CAMPUS_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shareCardRef = useRef<ViewShot>(null);
  const hasPlayedHaptic = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchStats();
    if (!isMountedRef.current) return;
    if (result.ok) {
      setUserStats(result.data.userStats);
      setCampusStats(result.data.campusStats);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // One-time haptic on first screen open
  useEffect(() => {
    if (!hasPlayedHaptic.current) {
      hasPlayedHaptic.current = true;
      const t = setTimeout(() => successHaptic(), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const handleTabSwitch = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    lightHaptic();
  }, [activeTab]);

  const handlePeriodChange = useCallback((p: Period) => {
    if (p === period) return;
    setPeriod(p);
    lightHaptic();
  }, [period]);

  const handleShare = useCallback(async () => {
    mediumHaptic();
    try {
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1920,
      });
      await Sharing.shareAsync(`file://${uri}`, {
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch {}
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <EvaIcon name="arrow-back" variant="outline" size={24} color="#101828" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Stats</Text>
        <TouchableOpacity onPress={handleShare} disabled={loading || !!error} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <EvaIcon name="share" variant="outline" size={22} color={loading || error ? '#D0D5DD' : '#437FFF'} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabButton, activeTab === 'campus' && s.tabButtonActive]}
          onPress={() => handleTabSwitch('campus')}
          activeOpacity={0.7}
        >
          <EvaIcon name="book" variant="outline" size={16} color={activeTab === 'campus' ? '#437FFF' : '#667085'} style={s.tabIcon} />
          <Text style={[s.tabText, activeTab === 'campus' && s.tabTextActive]}>Campus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabButton, activeTab === 'you' && s.tabButtonActive]}
          onPress={() => handleTabSwitch('you')}
          activeOpacity={0.7}
        >
          <EvaIcon name="person" variant="outline" size={16} color={activeTab === 'you' ? '#437FFF' : '#667085'} style={s.tabIcon} />
          <Text style={[s.tabText, activeTab === 'you' && s.tabTextActive]}>You</Text>
        </TouchableOpacity>
      </View>

      {/* Loading / Error / Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#437FFF" />
          <Text style={s.loadingText}>Loading your stats...</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <EvaIcon name="alert-circle" variant="outline" size={48} color="#F04438" />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryButton} onPress={loadStats} activeOpacity={0.7}>
            <EvaIcon name="refresh" variant="outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Content — both tabs rendered, inactive hidden to preserve animation state */}
          <View style={[s.tabContent, activeTab !== 'campus' && s.hidden]}>
            <CampusTab period={period} onPeriodChange={handlePeriodChange} data={campusStats} />
          </View>
          <View style={[s.tabContent, activeTab !== 'you' && s.hidden]}>
            <YourStatsTab period={period} onPeriodChange={handlePeriodChange} navigation={navigation} data={userStats} campusData={campusStats} />
          </View>

          {/* Offscreen share card */}
          <View style={s.offscreen} pointerEvents="none">
            <ShareCard ref={shareCardRef} data={userStats} campusName={campusStats.all_time.campus_name} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: '#667085',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: '#344054',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#437FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  hidden: {
    display: 'none',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#101828',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#437FFF',
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: '#667085',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingHorizontal: 20,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroValue: {
    fontSize: 52,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    lineHeight: 60,
  },
  heroLabel: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  heroSublabel: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Archetype card
  archetypeCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  archetypeEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  archetypeLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  archetypeName: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  archetypeDesc: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Impact card
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  impactLeft: {
    flex: 1,
  },
  impactLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: '#667085',
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 40,
    fontFamily: FONTS.bold,
    color: '#101828',
    lineHeight: 48,
  },
  impactSubtext: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    marginTop: 4,
  },
  impactRight: {
    marginLeft: 16,
  },

  // Accuracy card
  accuracyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accuracyRingWrap: {
    position: 'relative',
    width: 88,
    height: 88,
    marginRight: 16,
  },
  accuracyRingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyValue: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: '#34C759',
  },
  accuracyText: {
    flex: 1,
  },
  accuracyTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: '#101828',
    marginBottom: 4,
  },
  accuracyDesc: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#667085',
    lineHeight: 18,
    marginBottom: 8,
  },
  accuracyHint: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 6,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#101828',
    marginBottom: 12,
  },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 24,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: '#101828',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: '#667085',
  },

  // Highlight card
  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightIconDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#475569',
  },
  highlightValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#101828',
  },
  highlightDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // Rank card
  rankCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  rankIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(67, 127, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    flex: 1,
    marginLeft: 14,
  },
  rankTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#101828',
  },
  rankDesc: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#667085',
    marginTop: 2,
  },
  rankBadge: {
    backgroundColor: '#437FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rankValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});

// ─── Additional Styles (trend, period, fun facts, empty) ─────────────────────

const st = StyleSheet.create({
  // Trend arrows
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },

  // Period toggle
  periodBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#F0F4FF',
  },
  periodText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: '#94A3B8',
  },
  periodTextActive: {
    color: '#437FFF',
  },

  // Fun facts
  funFactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  funFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  funFactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funFactText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#475569',
    lineHeight: 20,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: '#101828',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#437FFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCtaText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
  },
});

// ─── Share Card Styles ───────────────────────────────────────────────────────

const shareStyles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,
  },
  gradient: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  topBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  archetypeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  archetypeName: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  archetypeDesc: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBlock: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  campusText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginTop: 8,
  },
  watermark: {
    position: 'absolute',
    bottom: 30,
  },
  watermarkText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
});
