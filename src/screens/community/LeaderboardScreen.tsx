import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { FlashList, ViewToken as FlashViewToken } from '@shopify/flash-list';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { IconScoutIcon } from '../../components/icons/IconScoutIcon';
import { StaggerItem } from '../../hooks/useStaggeredList';
import { RootStackParamList } from '../../types';
import { Image } from 'expo-image';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';
import { ScreenWrapper, InfoModal } from '../../components/ui';
import { BackHeader } from '../../components/ui/BackHeader';
import { Body } from '../../components/ui/Typography';
import { LeaderboardSkeleton } from '../../components/ui/SkeletonLoader';
import { getCentralOffsetHours } from '../../utils/centralTime';
import {
  fetchLeaderboard,
  LeaderboardEntry,
  LeaderboardCurrentUser,
  LeaderboardResponse,
  invalidateLeaderboardCache,
} from '../../services/leaderboardService';
import { getBridgeUserCount } from '../../services/contactsService';

// Extracted
import { s } from './LeaderboardScreen.styles';
import { FriendBadge, InitialAvatar, RankChangeArrow } from './LeaderboardScreen.components';
import { KarmaPill } from '../../components/ui/KarmaPill';

const ListSeparator = () => <View style={s.listSeparator} />;

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
  avatarUrl: getOptimizedPhotoUrl(entry.photoUrl ?? undefined, 'avatar') ?? entry.photoUrl,
  isCurrentUser,
  isFriend: entry.isFriend,
  isAnonymous: isCurrentUser ? false : (entry.isAnonymous ?? false),
});

// ─── Podium Slot ────────────────────────────────────────────────────────────

const PodiumSlot = ({
  user,
  rank,
  onPress,
}: {
  user: LeaderboardUser;
  rank: 1 | 2 | 3;
  onPress: (user: LeaderboardUser) => void;
}) => {
  const avatarStyle = rank === 1 ? s.avatarLarge : rank === 2 ? s.avatarMedium : s.avatarSmall;
  const avatarSize = rank === 1 ? 80 : rank === 2 ? 64 : 56;
  const wrapperStyle = rank === 1 ? s.avatarWrapperLarge : rank === 2 ? s.avatarWrapperMedium : s.avatarWrapperSmall;
  const ringStyle = rank === 1 ? s.avatarRingGold : rank === 2 ? s.avatarRingSilver : s.avatarRingBronze;
  const badgeColorStyle = rank === 1 ? s.rankBadgeGold : rank === 2 ? s.rankBadgeSilver : s.rankBadgeBronze;
  const containerStyle = rank === 1 ? s.podiumCenter : s.podiumSide;
  const isTappable = !user.isCurrentUser && !user.isAnonymous;

  const content = (
    <View style={containerStyle}>
      {rank === 1 && (
        <View style={s.crownIconWrap}>
          <IconScoutIcon name="olympic-5303267" size={36} />
        </View>
      )}
      <View style={wrapperStyle}>
        <View style={[s.avatarRing, ringStyle]}>
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={avatarStyle}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              recyclingKey={user.id}
            />
          ) : (
            <InitialAvatar name={user.firstName ?? ''} size={avatarSize} isAnonymous={user.isAnonymous} />
          )}
          {user.isFriend && <FriendBadge />}
        </View>
        <View style={[s.rankBadge, rank === 1 && s.rankBadgeLarge, badgeColorStyle]}>
          <Text style={[s.rankBadgeText, rank === 1 && s.rankBadgeTextLarge]}>{rank}</Text>
        </View>
      </View>
      <Text style={[s.podiumName, rank === 1 && s.podiumNameFirst]} numberOfLines={1}>{user.firstName}</Text>
      <KarmaPill karma={user.karma} size={rank === 1 ? 'large' : 'small'} />
    </View>
  );

  if (isTappable) {
    return (
      <TouchableOpacity
        onPress={() => onPress(user)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Rank ${rank}, ${user.firstName}, ${user.karma} karma points. View profile`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View accessibilityLabel={`Rank ${rank}, ${user.firstName}, ${user.karma} karma points`}>
      {content}
    </View>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

interface LeaderboardScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  // Stable avatar URL map: userId → optimized URL.
  // Signed URLs rotate every ~10 min (new token each API call), which would bust expo-image's
  // disk cache on every background refresh. By keeping the first URL we see per user and
  // reusing it across refreshes, the same token is passed to expo-image so its disk cache
  // always hits. URLs are valid for 24h (edge function TTL) and this ref lives for the session.
  const stableAvatarUrls = useRef<Map<string, string>>(new Map());

  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardCurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRowVisible, setUserRowVisible] = useState(false);
  const [bridgeUserCount, setBridgeUserCount] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [countdown, setCountdown] = useState(getTimeUntilReset);
  useFocusEffect(
    useCallback(() => {
      setCountdown(getTimeUntilReset());
      const interval = setInterval(() => setCountdown(getTimeUntilReset()), 60_000);
      return () => clearInterval(interval);
    }, [])
  );

  const applyData = useCallback((response: LeaderboardResponse) => {
    const currentUserId = response.currentUser?.userId;
    const rawUsers = response.leaderboard.map(entry =>
      toLeaderboardUser(entry, entry.userId === currentUserId)
    );
    if (currentUserId && !rawUsers.some(u => u.isCurrentUser) && response.currentUser) {
      rawUsers.push(toLeaderboardUser(response.currentUser, true));
    }

    // Stabilize avatar URLs: keep the first URL we've seen per user so expo-image's disk
    // cache is never invalidated by rotating signed tokens across background refreshes.
    const urlsToFetch: string[] = [];
    const users = rawUsers.map(u => {
      if (!u.avatarUrl) return u;
      const existing = stableAvatarUrls.current.get(u.id);
      if (existing) return { ...u, avatarUrl: existing };
      stableAvatarUrls.current.set(u.id, u.avatarUrl);
      urlsToFetch.push(u.avatarUrl);
      return u;
    });

    setData(users);
    setCurrentUserData(response.currentUser);
    // Prefetch only newly-seen URLs (already-stable ones are already in expo-image's cache)
    if (urlsToFetch.length > 0) Image.prefetch(urlsToFetch).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    const result = await fetchLeaderboard(50);
    if (result.ok) {
      applyData(result.data);
    } else {
      setError(result.error);
    }
    return result.ok;
  }, [applyData]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      // fetchLeaderboard returns cached data instantly if available (no spinner for repeat visits)
      const result = await fetchLeaderboard(50, (fresh) => {
        if (mounted) applyData(fresh);
      });
      if (result.ok) {
        if (mounted) applyData(result.data);
      } else {
        if (mounted) setError(result.error);
      }
      if (mounted) setLoading(false);
    };
    load();
    getBridgeUserCount().then((count) => { if (mounted) setBridgeUserCount(count); });
    return () => { mounted = false; };
  }, [applyData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateLeaderboardCache();
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

  const top3 = useMemo(() => data.slice(0, Math.min(3, data.length)), [data]);
  // Ranks 4–10 shown in list below the podium (top 10 max by design)
  const rest = useMemo(() => data.slice(3, 10), [data]);

  const currentUserListIndex = useMemo(() => {
    if (currentUserIndex < 3) return -1;
    return currentUserIndex - 3;
  }, [currentUserIndex]);

  const currentUserListIndexRef = useRef(currentUserListIndex);
  currentUserListIndexRef.current = currentUserListIndex;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: FlashViewToken<LeaderboardUser>[] }) => {
    const idx = currentUserListIndexRef.current;
    if (idx < 0) return;
    const isVisible = viewableItems.some(v => v.index === idx);
    setUserRowVisible(isVisible);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleInfo = useCallback(() => {
    setShowInfoModal(true);
  }, []);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadData();
    setLoading(false);
  }, [loadData]);

  const handleProfilePress = useCallback((user: LeaderboardUser) => {
    if (user.isCurrentUser || user.isAnonymous) return;
    navigation.navigate('ProfileView' as any, { profile: { userId: user.id } });
  }, [navigation]);

  const renderListItem = useCallback(({ item, index }: { item: LeaderboardUser; index: number }) => {
    const rank = index + 4;
    const isMe = item.isCurrentUser;
    const globalIndex = index + 3;
    const gap = getGapAbove(globalIndex);
    const isTappable = !isMe && !item.isAnonymous;
    // Only animate the first few items to keep list refresh cheap; the rest render plain.
    const shouldAnimate = index < 10;
    const rowContent = (
      <TouchableOpacity
        onPress={() => handleProfilePress(item)}
        disabled={!isTappable}
        activeOpacity={isTappable ? 0.7 : 1}
        accessibilityRole={isTappable ? 'button' : 'none'}
        accessibilityLabel={isTappable ? `View ${item.firstName}'s profile` : undefined}
      >
        <View style={[s.listCard, isMe && s.listCardHighlighted]}>
          <View style={[s.rankPill, isMe && s.rankPillHighlighted]}>
            <Text style={[s.rankPillText, isMe && s.rankPillTextHighlighted]}>{rank}</Text>
          </View>
          <View style={s.listAvatarWrap}>
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={s.listAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="normal"
                recyclingKey={item.id}
              />
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
              <Text style={s.gapText}>{gap} {gap === 1 ? 'pt' : 'pts'} behind #{rank - 1}</Text>
            )}
          </View>
          <KarmaPill karma={item.karma} />
        </View>
      </TouchableOpacity>
    );
    if (!shouldAnimate) return rowContent;
    return (
      <StaggerItem index={index} staggerDelay={40} maxAnimated={10}>
        {rowContent}
      </StaggerItem>
    );
  }, [getGapAbove, handleProfilePress]);

  const keyExtractor = useCallback((item: LeaderboardUser) => item.id, []);

  // ─── Header / List header ──────────────────────────────────────────────

  const renderHeader = (showInfo = false) => (
    <BackHeader
      title="Leaderboard"
      titleAlign="center"
      onBack={handleBack}
      showBorder={false}
      right={
        showInfo ? (
          <TouchableOpacity
            onPress={handleInfo}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Leaderboard info"
          >
            <EvaIcon name="info" variant="outline" size={24} color={COLORS.navInactiveIcon} />
          </TouchableOpacity>
        ) : undefined
      }
    />
  );

  const listHeader = useMemo(() => (
    <>
      {renderHeader(true)}

      <View style={s.bannerShadow}>
        <LinearGradient
          colors={['#EBF1FF', '#DFE9FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.banner}
        >
          <Text style={s.bannerText} numberOfLines={1}>
            <Text style={s.bannerBold}>1st place wins $50!</Text>
            {currentUserRank > 1
              ? ` ${ptsBehindFirst} ${ptsBehindFirst === 1 ? 'pt' : 'pts'} to go`
              : ' You\'re in the lead!'}
          </Text>
        </LinearGradient>
      </View>

      {top3.length > 0 && (
        <View style={s.podiumOuter}>
          <LinearGradient
            colors={['#FFFFFF', '#F0F4FF', '#E8EEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.podiumGradient}
          >
            <View style={s.podiumGlassEdge}>
              <View style={s.podiumSection}>
                {top3.length >= 2 && (
                  <PodiumSlot user={top3[1]} rank={2} onPress={handleProfilePress} />
                )}

                <PodiumSlot user={top3[0]} rank={1} onPress={handleProfilePress} />

                {top3.length >= 3 && (
                  <PodiumSlot user={top3[2]} rank={3} onPress={handleProfilePress} />
                )}
              </View>

              <View style={s.howToEarnInline}>
                <Text style={s.howToEarnItem}>
                  <Text style={s.howToEarnBold}>Vote</Text> +1
                </Text>
                <View style={s.howToEarnDot} />
                <Text style={s.howToEarnItem}>
                  <Text style={s.howToEarnBold}>Accurate vote</Text> +3
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Resets countdown + participants on one row */}
      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <EvaIcon name="clock" variant="outline" size={14} color={COLORS.navInactiveIcon} />
          <Text style={s.metaText}>
            Resets in {countdown.days}d {countdown.hours}h {countdown.minutes}m
          </Text>
        </View>
        {bridgeUserCount > 0 && (
          <>
            <View style={s.metaDot} />
            <View style={s.metaItem}>
              <EvaIcon name="people" variant="outline" size={14} color={COLORS.navInactiveIcon} />
              <Text style={s.metaText}>
                {bridgeUserCount} participants
              </Text>
            </View>
          </>
        )}
      </View>
    </>
  ), [top3, currentUserRank, ptsBehindFirst, countdown, bridgeUserCount, handleProfilePress]);

  // ─── Loading / Error / Empty states ──────────────────────────────────────

  if (loading) {
    return (
      <ScreenWrapper>
        <LeaderboardSkeleton />
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        {renderHeader()}
        <View style={s.emptyState}>
          <EvaIcon name="wifi-off" variant="outline" size={64} color={COLORS.border} />
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
          <EvaIcon name="award" variant="outline" size={64} color={COLORS.border} />
          <Text style={s.emptyTitle}>No Rankings Yet</Text>
          <Text style={s.emptyBody}>Be the first to earn karma and climb the leaderboard!</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const showStickyBar = currentUser && currentUserRank > 3 && !userRowVisible;

  return (
    <ScreenWrapper>
        {/* List — header/podium scroll with the list via ListHeaderComponent */}
        <FlashList
          data={rest}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          ListHeaderComponent={listHeader}
          estimatedItemSize={72}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={ListSeparator}
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
                <Image
                  source={{ uri: currentUser!.avatarUrl }}
                  style={s.stickyAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="normal"
                  recyclingKey={currentUser!.id}
                />
              ) : (
                <View style={s.stickyAvatarFallback}>
                  <InitialAvatar name={currentUser!.firstName} size={36} />
                </View>
              )}
              <View style={s.stickyNameCol}>
                <View style={s.nameRow}>
                  <Text style={s.stickyName}>You</Text>
                  <RankChangeArrow change={currentUser!.rankChange} />
                </View>
                {currentUserGap > 0 && (
                  <Text style={s.stickyGapText}>{currentUserGap} {currentUserGap === 1 ? 'pt' : 'pts'} behind #{currentUserRank - 1}</Text>
                )}
              </View>
              <KarmaPill karma={currentUser!.karma} size="small" />
            </View>
          </View>
        )}

        {/* Info modal — replaces Alert.alert per CLAUDE.md */}
        <InfoModal
          visible={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title="Weekly Karma"
          icon="award"
          iconColor={COLORS.success}
          iconBackground="rgba(52, 199, 89, 0.1)"
        >
          <Body className="text-neutral-600 leading-6">
            Tracks karma earned this week only. Resets every Sunday at 7 PM Central.
          </Body>
        </InfoModal>
    </ScreenWrapper>
  );
};
