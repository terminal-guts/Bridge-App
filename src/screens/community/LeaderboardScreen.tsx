import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Text,
  Alert,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Mock Data (weekly karma gains) ─────────────────────────────────────────

interface LeaderboardUser {
  id: string;
  firstName: string;
  karma: number;
  avatarUrl: string;
  isCurrentUser: boolean;
  isFriend: boolean;
}

const MOCK_WEEKLY: LeaderboardUser[] = [
  { id: 'a1b2c3d4-0007', firstName: 'Mei', karma: 87, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0007', isCurrentUser: false, isFriend: true },
  { id: 'a1b2c3d4-0004', firstName: 'Ethan', karma: 74, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0004', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0001', firstName: 'Sophia', karma: 68, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0001', isCurrentUser: false, isFriend: true },
  { id: 'a1b2c3d4-0009', firstName: 'Fatima', karma: 62, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0009', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0011', firstName: 'Aisha', karma: 55, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0011', isCurrentUser: false, isFriend: true },
  { id: 'a1b2c3d4-0006', firstName: 'James', karma: 51, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0006', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0013', firstName: 'Yuki', karma: 48, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0013', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0020', firstName: 'You', karma: 44, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0020', isCurrentUser: true, isFriend: false },
  { id: 'a1b2c3d4-0002', firstName: 'Marcus', karma: 39, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0002', isCurrentUser: false, isFriend: true },
  { id: 'a1b2c3d4-0015', firstName: 'Andre', karma: 36, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0015', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0019', firstName: 'David', karma: 32, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0019', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0003', firstName: 'Priya', karma: 29, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0003', isCurrentUser: false, isFriend: true },
  { id: 'a1b2c3d4-0016', firstName: 'Jasmine', karma: 25, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0016', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0022', firstName: 'Tyler', karma: 21, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0022', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0025', firstName: 'Hana', karma: 18, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0025', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0010', firstName: 'Noah', karma: 14, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0010', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0027', firstName: 'Amara', karma: 11, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0027', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0030', firstName: 'Kai', karma: 8, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0030', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0024', firstName: 'Isaiah', karma: 5, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0024', isCurrentUser: false, isFriend: false },
  { id: 'a1b2c3d4-0029', firstName: 'Leila', karma: 3, avatarUrl: 'https://i.pravatar.cc/150?u=a1b2c3d4-0029', isCurrentUser: false, isFriend: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Compute time remaining until next Sunday 7 PM Central (the real cron reset time) */
const getTimeUntilReset = (): { days: number; hours: number; minutes: number } => {
  const now = new Date();
  // Approximate Central Time offset (UTC-6)
  const centralNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const dayOfWeek = centralNow.getUTCDay(); // 0 = Sunday
  // If it's Sunday before 7 PM Central, reset is today; otherwise next Sunday
  const isSundayBefore7PM = dayOfWeek === 0 && centralNow.getUTCHours() < 19;
  const daysUntilSunday = isSundayBefore7PM ? 0 : (dayOfWeek === 0 ? 7 : 7 - dayOfWeek);
  const nextSunday = new Date(centralNow);
  nextSunday.setUTCDate(centralNow.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(19, 0, 0, 0); // 7 PM Central
  const diff = nextSunday.getTime() - centralNow.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
};

// ─── Karma Pill Component ────────────────────────────────────────────────────

const KarmaPill = ({ karma, size = 'medium' }: { karma: number; size?: 'small' | 'medium' | 'large' }) => {
  const fontSize = size === 'large' ? 16 : size === 'medium' ? 14 : 13;
  const iconSize = size === 'large' ? 15 : size === 'medium' ? 13 : 12;
  const paddingV = size === 'large' ? 6 : 4;
  const paddingH = size === 'large' ? 14 : size === 'medium' ? 12 : 10;
  return (
    <View style={[styles.karmaPill, { paddingVertical: paddingV, paddingHorizontal: paddingH }]}>
      <EvaIcon name="star-outline" size={iconSize} color="#34C759" style={{ marginRight: 4 }} />
      <Text style={[styles.karmaPillText, { fontSize }]}>{karma} pts</Text>
    </View>
  );
};

// ─── Friend Badge ────────────────────────────────────────────────────────────

const FriendBadge = () => (
  <View style={styles.friendBadge}>
    <EvaIcon name="people" size={10} color="#FFFFFF" />
  </View>
);

// ─── Component ───────────────────────────────────────────────────────────────

interface LeaderboardScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const data = MOCK_WEEKLY;

  // 1 — Countdown timer
  const [countdown, setCountdown] = useState(getTimeUntilReset);
  useEffect(() => {
    const interval = setInterval(() => setCountdown(getTimeUntilReset()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentUserIndex = useMemo(() => data.findIndex(u => u.isCurrentUser), [data]);
  const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : data.length;
  const currentUser = data[currentUserIndex];

  // 7 — Banner: spots behind #1
  const spotsBehind = currentUserRank - 1;
  const ptsBehind = data[0].karma - (currentUser?.karma ?? 0);

  // 3 — Gap to person above in list
  const getGapAbove = useCallback((rankIndex: number) => {
    if (rankIndex <= 0) return 0;
    return data[rankIndex - 1].karma - data[rankIndex].karma;
  }, [data]);

  const top3 = useMemo(() => data.slice(0, 3), [data]);
  const rest = useMemo(() => data.slice(3), [data]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      'Weekly Leaderboard',
      'Each week, the #1 karma earner wins $100! Earn karma by voting on proposals, getting accurate votes, and helping friends find matches. Rankings reset every Sunday at 7 PM.',
    );
  }, []);

  const renderListItem = useCallback(({ item, index }: { item: LeaderboardUser; index: number }) => {
    const rank = index + 4;
    const isMe = item.isCurrentUser;
    const globalIndex = index + 3; // index in full data array
    const gap = getGapAbove(globalIndex);
    return (
      <View style={[styles.listRow, isMe && styles.listRowHighlighted]}>
        <View style={[styles.rankPill, isMe && styles.rankPillHighlighted]}>
          <Text style={[styles.rankPillText, isMe && styles.rankPillTextHighlighted]}>{rank}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatarUrl }} style={styles.listAvatar} />
          {item.isFriend && <FriendBadge />}
        </View>
        <View style={styles.listNameCol}>
          <Text style={[styles.listName, isMe && styles.listNameHighlighted]} numberOfLines={1}>
            {item.firstName}
          </Text>
          {isMe && gap > 0 && (
            <Text style={styles.gapText}>{gap} pts behind #{rank - 1}</Text>
          )}
        </View>
        <KarmaPill karma={item.karma} />
      </View>
    );
  }, [getGapAbove]);

  const keyExtractor = useCallback((item: LeaderboardUser) => item.id, []);

  if (data.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <EvaIcon name="arrow-back" size={24} color="#101828" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <EvaIcon name="award-outline" size={64} color="#D0D5DD" />
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptyBody}>Be the first to earn karma and climb the leaderboard!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <EvaIcon name="arrow-back" size={24} color="#101828" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={handleInfo} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <EvaIcon name="info-outline" size={24} color="#667085" />
        </TouchableOpacity>
      </View>

      {/* 7 — Prize Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.banner}>
          <Text style={styles.bannerText} numberOfLines={1}>
            <Text style={styles.bannerBold}>1st place wins $100!</Text>
            {spotsBehind > 0
              ? ` You're ${spotsBehind} spot${spotsBehind === 1 ? '' : 's'} behind`
              : ' You\'re in the lead!'}
          </Text>
        </View>
      </View>

      {/* 1 — Countdown timer */}
      <View style={styles.countdownRow}>
        <EvaIcon name="clock-outline" size={14} color="#667085" />
        <Text style={styles.countdownText}>
          Resets in {countdown.days}d {countdown.hours}h {countdown.minutes}m
        </Text>
      </View>

      {/* 5 — Top 3 Podium with gradient card */}
      <View style={styles.podiumCard}>
        <LinearGradient
          colors={['#F8FAFF', '#EEF3FF', '#F8FAFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.podiumGradient}
        >
          <View style={styles.podiumSection}>
            {/* 2nd place — left */}
            <View style={styles.podiumSide}>
              <View style={styles.avatarWrapperMedium}>
                <View style={[styles.avatarRing, { borderColor: '#C0C0C0' }]}>
                  <Image source={{ uri: top3[1]?.avatarUrl }} style={styles.avatarMedium} />
                  {top3[1]?.isFriend && <FriendBadge />}
                </View>
                <View style={[styles.rankBadge, { backgroundColor: '#C0C0C0' }]}>
                  <Text style={styles.rankBadgeText}>2</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{top3[1]?.firstName}</Text>
              <KarmaPill karma={top3[1]?.karma} size="small" />
            </View>

            {/* 1st place — center */}
            <View style={styles.podiumCenter}>
              <Text style={styles.crownEmoji}>👑</Text>
              <View style={styles.avatarWrapperLarge}>
                <View style={[styles.avatarRing, styles.avatarRingLarge, { borderColor: '#FFD700' }]}>
                  <Image source={{ uri: top3[0]?.avatarUrl }} style={styles.avatarLarge} />
                  {top3[0]?.isFriend && <FriendBadge />}
                </View>
                <View style={[styles.rankBadge, styles.rankBadgeLarge, { backgroundColor: '#FFD700' }]}>
                  <Text style={[styles.rankBadgeText, styles.rankBadgeTextLarge]}>1</Text>
                </View>
              </View>
              <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>{top3[0]?.firstName}</Text>
              <KarmaPill karma={top3[0]?.karma} size="large" />
            </View>

            {/* 3rd place — right */}
            <View style={styles.podiumSide}>
              <View style={styles.avatarWrapperSmall}>
                <View style={[styles.avatarRing, { borderColor: '#CD7F32' }]}>
                  <Image source={{ uri: top3[2]?.avatarUrl }} style={styles.avatarSmall} />
                  {top3[2]?.isFriend && <FriendBadge />}
                </View>
                <View style={[styles.rankBadge, { backgroundColor: '#CD7F32' }]}>
                  <Text style={styles.rankBadgeText}>3</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{top3[2]?.firstName}</Text>
              <KarmaPill karma={top3[2]?.karma} size="small" />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Divider dots */}
      <View style={styles.dotsRow}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Scrollable List */}
      <FlatList
        data={rest}
        keyExtractor={keyExtractor}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* 2 — Sticky "Your Position" bar */}
      {currentUserRank > 3 && (
        <View style={styles.stickyBar}>
          <View style={styles.stickyBarInner}>
            <View style={styles.stickyRankPill}>
              <Text style={styles.stickyRankText}>#{currentUserRank}</Text>
            </View>
            <Image source={{ uri: currentUser?.avatarUrl }} style={styles.stickyAvatar} />
            <Text style={styles.stickyName}>You</Text>
            <KarmaPill karma={currentUser?.karma ?? 0} size="small" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: '#101828',
  },

  // 7 — Prize Banner
  bannerContainer: {
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  banner: {
    backgroundColor: '#EEF3FF',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
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

  // 1 — Countdown
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

  // Karma pill (green outline style)
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

  // 6 — Friend badge
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
  },

  // 5 — Podium card with gradient
  podiumCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#437FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  podiumGradient: {
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: 20,
  },
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  podiumSide: {
    alignItems: 'center',
    flex: 1,
  },
  podiumCenter: {
    alignItems: 'center',
    flex: 1,
    marginBottom: 8,
  },
  crownEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },

  // Avatar wrappers
  avatarWrapperLarge: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarWrapperMedium: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarWrapperSmall: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: 999,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    backgroundColor: '#FFFFFF',
  },
  avatarRingLarge: {
    borderWidth: 4,
    padding: 3,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarMedium: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

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
  },
  rankBadgeLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  rankBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  rankBadgeTextLarge: {
    fontSize: 14,
  },

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

  // Dots divider
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0D5DD',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  listRowHighlighted: {
    backgroundColor: 'rgba(67, 127, 255, 0.10)',
    borderLeftWidth: 3,
    borderLeftColor: '#437FFF',
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
  },
  rankPillText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#667085',
  },
  rankPillTextHighlighted: {
    color: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  listNameCol: {
    flex: 1,
  },
  listName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#101828',
  },
  listNameHighlighted: {
    color: '#437FFF',
    fontFamily: 'Outfit_700Bold',
  },
  // 3 — Gap indicator
  gapText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F4F7',
    marginHorizontal: 4,
  },

  // 2 — Sticky "Your Position" bar
  stickyBar: {
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 5,
  },
  stickyBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 127, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(67, 127, 255, 0.2)',
  },
  stickyRankPill: {
    backgroundColor: '#437FFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
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
  stickyName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#437FFF',
    flex: 1,
  },

  // Empty state
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
});
