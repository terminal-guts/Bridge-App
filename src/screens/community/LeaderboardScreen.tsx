import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { IconScoutIcon } from '../../components/icons/IconScoutIcon';
import { StaggerItem } from '../../hooks/useStaggeredList';
import { RootStackParamList } from '../../types';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';
import { ScreenWrapper } from '../../components/ui';
import { getCentralOffsetHours } from '../../utils/centralTime';
import {
  fetchLeaderboard,
  LeaderboardEntry,
  LeaderboardCurrentUser,
} from '../../services/leaderboardService';

// Extracted
import { s } from './LeaderboardScreen.styles';
import { KarmaPill, FriendBadge, InitialAvatar, RankChangeArrow } from './LeaderboardScreen.components';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardUser {
  id: string;
  firstName: string;
  karma: number;
  rankChange: number;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  isFriend: boolean;
  isAnonymous: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTimeUntilReset = (): { days: number; hours: number; minutes: number } => {
  const nowMs = Date.now();
  const offsetHours = getCentralOffsetHours(nowMs);
  const centralNow = new Date(nowMs - offsetHours * 60 * 60 * 1000);
  const dayOfWeek = centralNow.getUTCDay();
  const isSundayBefore7PM = dayOfWeek === 0 && centralNow.getUTCHours() < 19;
  const daysUntilSunday = isSundayBefore7PM ? 0 : (dayOfWeek === 0 ? 7 : 7 - dayOfWeek);
  const nextSunday = new Date(centralNow);
  nextSunday.setUTCDate(centralNow.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(19, 0, 0, 0);
  const diff = nextSunday.getTime() - centralNow.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
};

const toLeaderboardUser = (
  entry: LeaderboardEntry,
  isCurrentUser: boolean,
): LeaderboardUser => ({
  id: entry.userId,
  firstName: isCurrentUser ? 'You' : entry.firstName,
  karma: entry.weeklyKarma,
  rankChange: entry.rankChange ?? 0,
  avatarUrl: entry.photoUrl,
  isCurrentUser,
  isFriend: entry.isFriend,
  isAnonymous: isCurrentUser ? false : (entry.isAnonymous ?? false),
});

// ─── Component ───────────────────────────────────────────────────────────────

interface LeaderboardScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardCurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRowVisible, setUserRowVisible] = useState(false);

  const [countdown, setCountdown] = useState(getTimeUntilReset);
  useFocusEffect(
    useCallback(() => {
      setCountdown(getTimeUntilReset());
      const interval = setInterval(() => setCountdown(getTimeUntilReset()), 60_000);
      return () => clearInterval(interval);
    }, [])
  );

  const loadData = useCallback(async () => {
    const result = await fetchLeaderboard();
    if (result.ok) {
      const currentUserId = result.data.currentUser?.userId;
      const users = result.data.leaderboard.map(entry =>
        toLeaderboardUser(entry, entry.userId === currentUserId)
      );
      if (currentUserId && !users.some(u => u.isCurrentUser) && result.data.currentUser) {
        users.push(toLeaderboardUser(result.data.currentUser, true));
      }
      setData(users);
      setCurrentUserData(result.data.currentUser);
    } else {
      setError(result.error);
    }
    return result.ok;
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      await loadData();
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const currentUserIndex = useMemo(() => data.findIndex(u => u.isCurrentUser), [data]);
  const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : (currentUserData?.rank ?? data.length);
  const currentUser = currentUserIndex >= 0 ? data[currentUserIndex] : null;
  const ptsBehindFirst = currentUserData?.spotsBehindFirst ?? 0;

  const getGapAbove = useCallback((rankIndex: number) => {
    if (rankIndex <= 0) return 0;
    return data[rankIndex - 1].karma - data[rankIndex].karma;
  }, [data]);

  const currentUserGap = useMemo(() => {
    if (currentUserIndex <= 0) return 0;
    return data[currentUserIndex - 1].karma - data[currentUserIndex].karma;
  }, [data, currentUserIndex]);

  const top3 = useMemo(() => data.slice(0, 3), [data]);
  const rest = useMemo(() => data.slice(3), [data]);

  const currentUserListIndex = useMemo(() => {
    if (currentUserIndex < 3) return -1;
    return currentUserIndex - 3;
  }, [currentUserIndex]);

  const currentUserListIndexRef = useRef(currentUserListIndex);
  currentUserListIndexRef.current = currentUserListIndex;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const idx = currentUserListIndexRef.current;
    if (idx < 0) return;
    const isVisible = viewableItems.some(v => v.index === idx);
    setUserRowVisible(isVisible);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      'Weekly Karma',
      'Tracks karma earned this week only. Resets every Sunday at 7 PM.',
    );
  }, []);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadData();
    setLoading(false);
  }, [loadData]);

  const renderListItem = useCallback(({ item, index }: { item: LeaderboardUser; index: number }) => {
    const rank = index + 4;
    const isMe = item.isCurrentUser;
    const globalIndex = index + 3;
    const gap = getGapAbove(globalIndex);
    return (
      <StaggerItem index={index} staggerDelay={40} maxAnimated={20}>
        <View style={[s.listCard, isMe && s.listCardHighlighted]}>
          <View style={[s.rankPill, isMe && s.rankPillHighlighted]}>
            <Text style={[s.rankPillText, isMe && s.rankPillTextHighlighted]}>{rank}</Text>
          </View>
          <View style={s.listAvatarWrap}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={s.listAvatar} />
            ) : (
              <InitialAvatar name={item.firstName} size={48} isAnonymous={item.isAnonymous} />
            )}
            {item.isFriend && <FriendBadge />}
          </View>
          <View style={s.listNameCol}>
            <View style={s.nameRow}>
              <Text style={[s.listName, isMe && s.listNameHighlighted]} numberOfLines={1}>
                {item.firstName}
              </Text>
              <RankChangeArrow change={item.rankChange} />
            </View>
            {isMe && gap > 0 && (
              <Text style={s.gapText}>{gap} pts behind #{rank - 1}</Text>
            )}
          </View>
          <KarmaPill karma={item.karma} />
        </View>
      </StaggerItem>
    );
  }, [getGapAbove]);

  const keyExtractor = useCallback((item: LeaderboardUser) => item.id, []);

  // ─── Loading / Error / Empty states ──────────────────────────────────────

  const renderHeader = (showInfo = false) => (
    <View style={s.header}>
      <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Go back">
        <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.textDarkHeading} />
      </TouchableOpacity>
      <Text style={s.headerTitle} accessibilityRole="header">Leaderboard</Text>
      {showInfo ? (
        <TouchableOpacity onPress={handleInfo} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Leaderboard info">
          <EvaIcon name="info" variant="outline" size={24} color={COLORS.navInactiveIcon} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 24 }} />
      )}
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper>
        {renderHeader()}
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        {renderHeader()}
        <View style={s.emptyState}>
          <EvaIcon name="wifi-off" variant="outline" size={64} color={COLORS.borderDivider} />
          <Text style={s.emptyTitle}>Something went wrong</Text>
          <Text style={s.emptyBody}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={handleRetry} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (data.length === 0) {
    return (
      <ScreenWrapper>
        {renderHeader()}
        <View style={s.emptyState}>
          <EvaIcon name="award" variant="outline" size={64} color={COLORS.borderDivider} />
          <Text style={s.emptyTitle}>No Rankings Yet</Text>
          <Text style={s.emptyBody}>Be the first to earn karma and climb the leaderboard!</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const showStickyBar = currentUser && currentUserRank > 3 && !userRowVisible;

  return (
    <ScreenWrapper>

        {/* Header */}
        {renderHeader(true)}

        {/* Prize Banner — floating card */}
        <View style={s.bannerShadow}>
          <LinearGradient
            colors={['#EBF1FF', '#DFE9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.banner}
          >
            <Text style={s.bannerText} numberOfLines={1}>
              <Text style={s.bannerBold}>1st place wins $100!</Text>
              {currentUserRank > 1
                ? ` ${ptsBehindFirst} pts to go`
                : ' You\'re in the lead!'}
            </Text>
          </LinearGradient>
        </View>

        {/* Countdown */}
        <View style={s.countdownRow}>
          <EvaIcon name="clock" variant="outline" size={14} color={COLORS.navInactiveIcon} />
          <Text style={s.countdownText}>
            Resets in {countdown.days}d {countdown.hours}h {countdown.minutes}m
          </Text>
        </View>

        {/* Top 3 Podium — hero card */}
        {top3.length >= 3 && (
          <View style={s.podiumOuter}>
            <LinearGradient
              colors={['#FFFFFF', '#F0F4FF', '#E8EEFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={s.podiumGradient}
            >
              {/* Glass edge border */}
              <View style={s.podiumGlassEdge}>
                <View style={s.podiumSection}>
                  {/* 2nd place */}
                  <View style={s.podiumSide}>
                    <View style={s.avatarWrapperMedium}>
                      <View style={[s.avatarRing, s.avatarRingSilver]}>
                        {top3[1]?.avatarUrl ? (
                          <Image source={{ uri: top3[1].avatarUrl }} style={s.avatarMedium} />
                        ) : (
                          <InitialAvatar name={top3[1]?.firstName ?? ''} size={72} isAnonymous={top3[1]?.isAnonymous} />
                        )}
                        {top3[1]?.isFriend && <FriendBadge />}
                      </View>
                      <View style={[s.rankBadge, { backgroundColor: '#C0C0C0' }]}>
                        <Text style={s.rankBadgeText}>2</Text>
                      </View>
                    </View>
                    <Text style={s.podiumName} numberOfLines={1}>{top3[1]?.firstName}</Text>
                    <KarmaPill karma={top3[1]?.karma ?? 0} size="small" />
                  </View>

                  {/* 1st place */}
                  <View style={s.podiumCenter}>
                    <View style={s.crownIconWrap}>
                      <IconScoutIcon name="olympic-5303267" size={36} />
                    </View>
                    <View style={s.avatarWrapperLarge}>
                      <View style={[s.avatarRing, s.avatarRingGold]}>
                        {top3[0]?.avatarUrl ? (
                          <Image source={{ uri: top3[0].avatarUrl }} style={s.avatarLarge} />
                        ) : (
                          <InitialAvatar name={top3[0]?.firstName ?? ''} size={88} isAnonymous={top3[0]?.isAnonymous} />
                        )}
                        {top3[0]?.isFriend && <FriendBadge />}
                      </View>
                      <View style={[s.rankBadge, s.rankBadgeLarge, { backgroundColor: '#FFD700' }]}>
                        <Text style={[s.rankBadgeText, s.rankBadgeTextLarge]}>1</Text>
                      </View>
                    </View>
                    <Text style={[s.podiumName, s.podiumNameFirst]} numberOfLines={1}>{top3[0]?.firstName}</Text>
                    <KarmaPill karma={top3[0]?.karma ?? 0} size="large" />
                  </View>

                  {/* 3rd place */}
                  <View style={s.podiumSide}>
                    <View style={s.avatarWrapperSmall}>
                      <View style={[s.avatarRing, s.avatarRingBronze]}>
                        {top3[2]?.avatarUrl ? (
                          <Image source={{ uri: top3[2].avatarUrl }} style={s.avatarSmall} />
                        ) : (
                          <InitialAvatar name={top3[2]?.firstName ?? ''} size={64} isAnonymous={top3[2]?.isAnonymous} />
                        )}
                        {top3[2]?.isFriend && <FriendBadge />}
                      </View>
                      <View style={[s.rankBadge, { backgroundColor: '#CD7F32' }]}>
                        <Text style={s.rankBadgeText}>3</Text>
                      </View>
                    </View>
                    <Text style={s.podiumName} numberOfLines={1}>{top3[2]?.firstName}</Text>
                    <KarmaPill karma={top3[2]?.karma ?? 0} size="small" />
                  </View>
                </View>

                {/* How to Earn — inside podium card */}
                <View style={s.howToEarnInline}>
                  <Text style={s.howToEarnItem}>
                    <Text style={s.howToEarnBold}>Vote</Text> +1
                  </Text>
                  <View style={s.howToEarnDot} />
                  <Text style={s.howToEarnItem}>
                    <Text style={s.howToEarnBold}>Accurate</Text> +3
                  </Text>
                  <View style={s.howToEarnDot} />
                  <Text style={s.howToEarnItem}>
                    <Text style={s.howToEarnBold}>Assist</Text> +10
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* List */}
        <FlatList
          data={rest}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primaryAccent}
              colors={[COLORS.primaryAccent]}
            />
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Sticky bar */}
        {showStickyBar && (
          <View style={s.stickyBar}>
            <View style={s.stickyBarInner}>
              <View style={s.stickyRankPill}>
                <Text style={s.stickyRankText}>#{currentUserRank}</Text>
              </View>
              {currentUser!.avatarUrl ? (
                <Image source={{ uri: currentUser!.avatarUrl }} style={s.stickyAvatar} />
              ) : (
                <View style={{ marginRight: 12 }}>
                  <InitialAvatar name={currentUser!.firstName} size={36} />
                </View>
              )}
              <View style={s.stickyNameCol}>
                <View style={s.nameRow}>
                  <Text style={s.stickyName}>You</Text>
                  <RankChangeArrow change={currentUser!.rankChange} />
                </View>
                {currentUserGap > 0 && (
                  <Text style={s.stickyGapText}>{currentUserGap} pts behind #{currentUserRank - 1}</Text>
                )}
              </View>
              <KarmaPill karma={currentUser!.karma} size="small" />
            </View>
          </View>
        )}
    </ScreenWrapper>
  );
};
