import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getCentralOffsetHours } from '../../utils/centralTime';
import {
  fetchLeaderboard,
  LeaderboardEntry,
  LeaderboardCurrentUser,
} from '../../services/leaderboardService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardUser {
  id: string;
  firstName: string;
  karma: number;
  rankChange: number;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  isFriend: boolean;
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
});

const INITIAL_COLORS = ['#437FFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA', '#FF2D55', '#667085'];
const getInitialColor = (name: string): string => {
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return INITIAL_COLORS[code % INITIAL_COLORS.length];
};

// ─── Karma Pill ──────────────────────────────────────────────────────────────

const KarmaPill = ({ karma, size = 'medium' }: { karma: number; size?: 'small' | 'medium' | 'large' }) => {
  const fontSize = size === 'large' ? 16 : size === 'medium' ? 14 : 13;
  const iconSize = size === 'large' ? 15 : size === 'medium' ? 13 : 12;
  const paddingV = size === 'large' ? 6 : 4;
  const paddingH = size === 'large' ? 14 : size === 'medium' ? 12 : 10;
  return (
    <View style={[s.karmaPillShadow, size === 'large' && s.karmaPillShadowLarge]}>
      <View style={[s.karmaPill, { paddingVertical: paddingV, paddingHorizontal: paddingH }]}>
        <Ionicons name="star-outline" size={iconSize} color="#34C759" style={{ marginRight: 4 }} />
        <Text style={[s.karmaPillText, { fontSize }]}>{karma} pts</Text>
      </View>
    </View>
  );
};

// ─── Friend Badge ────────────────────────────────────────────────────────────

const FriendBadge = () => (
  <View style={s.friendBadge}>
    <Ionicons name="people" size={10} color="#FFFFFF" />
  </View>
);

// ─── Initial Avatar ──────────────────────────────────────────────────────────

const InitialAvatar = ({ name, size }: { name: string; size: number }) => {
  const initial = (name && name !== 'You' ? name[0] : '?').toUpperCase();
  const bg = getInitialColor(name);
  const fontSize = size * 0.42;
  return (
    <View style={[s.initialAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[s.initialAvatarText, { fontSize }]}>{initial}</Text>
    </View>
  );
};

// ─── Rank Change Arrow ───────────────────────────────────────────────────────

const RankChangeArrow = ({ change }: { change: number }) => {
  if (change === 0) return null;
  const isUp = change > 0;
  return (
    <View style={[s.rankChangeWrap, isUp ? s.rankChangeUp : s.rankChangeDown]}>
      <Ionicons
        name={isUp ? 'caret-up' : 'caret-down'}
        size={10}
        color={isUp ? '#16A34A' : '#DC2626'}
      />
      <Text style={[s.rankChangeText, { color: isUp ? '#16A34A' : '#DC2626' }]}>
        {Math.abs(change)}
      </Text>
    </View>
  );
};

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
  const currentUserRank = currentUserData?.rank ?? (currentUserIndex >= 0 ? currentUserIndex + 1 : data.length);
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
      'This page tracks karma earned this week only. Your total karma stays the same — this resets every Sunday at 7 PM.',
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
      <View style={[s.listCard, isMe && s.listCardHighlighted]}>
        <View style={[s.rankPill, isMe && s.rankPillHighlighted]}>
          <Text style={[s.rankPillText, isMe && s.rankPillTextHighlighted]}>{rank}</Text>
        </View>
        <View style={s.listAvatarWrap}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={s.listAvatar} />
          ) : (
            <InitialAvatar name={item.firstName} size={48} />
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
    );
  }, [getGapAbove]);

  const keyExtractor = useCallback((item: LeaderboardUser) => item.id, []);

  // ─── Loading / Error / Empty states ──────────────────────────────────────

  const renderHeader = (showInfo = false) => (
    <View style={s.header}>
      <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={24} color="#101828" />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Leaderboard</Text>
      {showInfo ? (
        <TouchableOpacity onPress={handleInfo} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="information-circle-outline" size={24} color="#667085" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 24 }} />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={s.screenBg}>
        <SafeAreaView style={s.flex1}>
          <StatusBar barStyle="dark-content" />
          {renderHeader()}
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#437FFF" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.screenBg}>
        <SafeAreaView style={s.flex1}>
          <StatusBar barStyle="dark-content" />
          {renderHeader()}
          <View style={s.emptyState}>
            <Ionicons name="cloud-offline-outline" size={64} color="#D0D5DD" />
            <Text style={s.emptyTitle}>Something went wrong</Text>
            <Text style={s.emptyBody}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
              <Text style={s.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={s.screenBg}>
        <SafeAreaView style={s.flex1}>
          <StatusBar barStyle="dark-content" />
          {renderHeader()}
          <View style={s.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#D0D5DD" />
            <Text style={s.emptyTitle}>No Rankings Yet</Text>
            <Text style={s.emptyBody}>Be the first to earn karma and climb the leaderboard!</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const showStickyBar = currentUser && currentUserRank > 3 && !userRowVisible;

  return (
    <View style={s.screenBg}>
      <SafeAreaView style={s.flex1}>
        <StatusBar barStyle="dark-content" />

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
          <Ionicons name="time-outline" size={14} color="#667085" />
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
                          <InitialAvatar name={top3[1]?.firstName ?? ''} size={72} />
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
                    <Text style={s.crownEmoji}>👑</Text>
                    <View style={s.avatarWrapperLarge}>
                      <View style={[s.avatarRing, s.avatarRingGold]}>
                        {top3[0]?.avatarUrl ? (
                          <Image source={{ uri: top3[0].avatarUrl }} style={s.avatarLarge} />
                        ) : (
                          <InitialAvatar name={top3[0]?.firstName ?? ''} size={88} />
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
                          <InitialAvatar name={top3[2]?.firstName ?? ''} size={64} />
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
              tintColor="#437FFF"
              colors={['#437FFF']}
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
                <View style={{ marginRight: 10 }}>
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
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Layer 1 — Background
  screenBg: { flex: 1, backgroundColor: '#FFFFFF' },
  flex1: { flex: 1 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: '#101828',
  },

  // Layer 2 — Banner (floating)
  bannerShadow: {
    paddingHorizontal: 20,
    marginBottom: 6,
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  banner: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67, 127, 255, 0.12)',
  },
  bannerText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: '#437FFF',
    textAlign: 'center',
  },
  bannerBold: {
    fontFamily: 'Outfit_700Bold',
  },

  // Countdown
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  countdownText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#667085',
  },

  // Layer 6 — Karma pill with shadow
  karmaPillShadow: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  karmaPillShadowLarge: {
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  karmaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#34C759',
    borderRadius: 999,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  karmaPillText: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#34C759',
  },

  // Friend badge
  friendBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#437FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 1,
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },

  // Initial avatar fallback
  initialAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialAvatarText: {
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },

  // Layer 3 — Podium (hero card)
  podiumOuter: {
    marginHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#3B6BDF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  podiumGradient: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  podiumGlassEdge: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingTop: 24,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  podiumSide: { alignItems: 'center', flex: 1 },
  podiumCenter: { alignItems: 'center', flex: 1, marginBottom: 8 },
  crownEmoji: { fontSize: 32, marginBottom: 6 },

  // Avatar wrappers
  avatarWrapperLarge: { position: 'relative', marginBottom: 10 },
  avatarWrapperMedium: { position: 'relative', marginBottom: 10 },
  avatarWrapperSmall: { position: 'relative', marginBottom: 10 },

  avatarRing: {
    borderWidth: 3,
    borderRadius: 999,
    padding: 3,
    backgroundColor: '#FFFFFF',
  },
  avatarRingGold: {
    borderWidth: 4,
    padding: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarRingSilver: {
    borderColor: '#C0C0C0',
    shadowColor: '#8A8A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarRingBronze: {
    borderColor: '#CD7F32',
    shadowColor: '#CD7F32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  avatarLarge: { width: 88, height: 88, borderRadius: 44 },
  avatarMedium: { width: 72, height: 72, borderRadius: 36 },
  avatarSmall: { width: 64, height: 64, borderRadius: 32 },

  // Rank badges
  rankBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  rankBadgeLarge: { width: 30, height: 30, borderRadius: 15 },
  rankBadgeText: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: '#FFFFFF' },
  rankBadgeTextLarge: { fontSize: 14 },

  // Podium text
  podiumName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#101828',
    maxWidth: 100,
    textAlign: 'center',
    marginBottom: 6,
  },
  podiumNameFirst: {
    color: '#437FFF',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },

  // Layer 4 — How to Earn (inline in podium)
  howToEarnInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(67, 127, 255, 0.12)',
    gap: 8,
  },
  howToEarnItem: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#667085',
  },
  howToEarnBold: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#437FFF',
  },
  howToEarnDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D0D5DD',
  },

  // Layer 5 — List (card-style rows)
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 6,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1B2B5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  listCardHighlighted: {
    backgroundColor: 'rgba(67, 127, 255, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#437FFF',
    borderColor: 'rgba(67, 127, 255, 0.15)',
    shadowColor: '#437FFF',
    shadowOpacity: 0.12,
  },
  rankPill: {
    width: 36,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankPillHighlighted: {
    backgroundColor: '#437FFF',
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rankPillText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#667085',
  },
  rankPillTextHighlighted: {
    color: '#FFFFFF',
  },

  // Layer 8 — List avatars with ring shadow
  listAvatarWrap: {
    position: 'relative',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  listNameCol: { flex: 1 },
  listName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#101828',
  },
  listNameHighlighted: {
    color: '#437FFF',
    fontFamily: 'Outfit_700Bold',
  },
  gapText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },

  // Layer 7 — Sticky bar (seamless with page gradient)
  stickyBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  stickyBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stickyRankPill: {
    backgroundColor: '#437FFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stickyRankText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  stickyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  stickyNameCol: { flex: 1 },
  stickyName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#437FFF',
  },
  stickyGapText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: '#667085',
    marginTop: 1,
  },

  // Empty / Error
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: '#101828',
    marginTop: 16,
  },
  emptyBody: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: '#667085',
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#437FFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Rank change arrows
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankChangeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  rankChangeUp: {},
  rankChangeDown: {},
  rankChangeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    lineHeight: 12,
  },
});
