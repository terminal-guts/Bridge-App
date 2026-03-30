/**
 * StatsScreen — main screen orchestrator
 * Components and styles extracted to StatsScreen.components.tsx and StatsScreen.styles.ts
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  Text,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { AnimatedPressable, BackHeader, LoadingState, ErrorState } from '../../components/ui';
import { RootStackParamList } from '../../types';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { lightHaptic, mediumHaptic, successHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import { COLORS } from '../../theme/colors';
import {
  fetchStats,
  type UserStats,
  type CampusStats,
  type PeriodStats,
  type WeekStats,
  type CampusPeriodStats,
} from '../../services/statsService';

import { s } from './StatsScreen.styles';
import {
  type Tab,
  type Period,
  CampusTab,
  YourStatsTab,
  ShareCard,
} from './StatsScreen.components';

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  navigation: NavigationProp<RootStackParamList>;
}

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
      // Guard against partial/null responses from edge function
      const u = result.data.userStats;
      const c = result.data.campusStats;
      setUserStats({
        all_time: { ...EMPTY_PERIOD, first_assist_date: null, ...u?.all_time },
        week: { ...EMPTY_WEEK, ...u?.week },
      });
      setCampusStats({
        all_time: { ...EMPTY_CAMPUS_PERIOD, ...c?.all_time },
        week: { ...EMPTY_CAMPUS_PERIOD, ...c?.week },
      });
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
    } catch (err: unknown) {
      // User cancelling the share sheet throws — don't toast for that
      const msg = err instanceof Error ? err.message : '';
      const isCancellation = msg.includes('cancel') || msg.includes('dismiss');
      if (!isCancellation) {
        showToast.error('Could not share', 'Something went wrong — try again');
      }
    }
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />

      <BackHeader
        title="Stats"
        titleAlign="center"
        right={
          <AnimatedPressable onPress={handleShare} disabled={loading || !!error} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Share stats" scale="pronounced">
            <EvaIcon name="share" variant="outline" size={22} color={loading || error ? COLORS.border : COLORS.primaryAccent} />
          </AnimatedPressable>
        }
      />

      {/* Tab Switcher */}
      <View style={s.tabBar}>
        <AnimatedPressable
          style={[s.tabButton, activeTab === 'campus' && s.tabButtonActive]}
          onPress={() => handleTabSwitch('campus')}
          scale="subtle"
        >
          <EvaIcon name="book" variant="outline" size={16} color={activeTab === 'campus' ? COLORS.primaryAccent : COLORS.navInactiveIcon} style={s.tabIcon} />
          <Text style={[s.tabText, activeTab === 'campus' && s.tabTextActive]}>Campus</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[s.tabButton, activeTab === 'you' && s.tabButtonActive]}
          onPress={() => handleTabSwitch('you')}
          scale="subtle"
        >
          <EvaIcon name="person" variant="outline" size={16} color={activeTab === 'you' ? COLORS.primaryAccent : COLORS.navInactiveIcon} style={s.tabIcon} />
          <Text style={[s.tabText, activeTab === 'you' && s.tabTextActive]}>You</Text>
        </AnimatedPressable>
      </View>

      {/* Loading / Error / Content */}
      {loading ? (
        <LoadingState fullScreen message="Loading your stats..." />
      ) : error ? (
        <ErrorState
          title="Couldn't load stats"
          message={error}
          onRetry={loadStats}
        />
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
