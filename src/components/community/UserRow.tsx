import React, { useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { SPRINGS } from '../../constants/animations';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FriendWithGridStatus } from '../../types/community';
import { FireIcon } from '../icons/Icons';
import { EvaIcon } from '../icons';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { KarmaPill } from '../ui/KarmaPill';

// ── Responsive sizing ────────────────────────────────────────────────────────
// iPhone SE / 8 = 375pt, standard iPhones = 390-393pt, Plus/Max = 428-430pt
const SCREEN_WIDTH = Dimensions.get('window').width;
const isCompact = SCREEN_WIDTH < 380; // SE, iPod touch, iPhone 8
const AVATAR_SIZE = isCompact ? 56 : 68;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const ROW_HORIZONTAL_PADDING = isCompact ? 16 : 24;
const INFO_MARGIN_LEFT = isCompact ? 12 : 16;

interface UserRowProps {
    item: FriendWithGridStatus;
    index: number;
    onMatch?: () => void;
    onViewProfile?: () => void;
    onChat?: () => void;
    rank?: number;
    onRankPress?: () => void;
    statusLine?: string | { text: string; color?: string };
    showVoteRing?: boolean;
    hasUnread?: boolean;
    onBadgePress?: () => void;
    onCrushPress?: () => void; // DEFERRED: Crush feature — dormant by product decision
    onStreakMilestone?: (days: number, friendName: string) => void;
    previousStreakDays?: number;
    onKarmaPress?: () => void;
}

// Streak tier — flame color gradually heats up to reward longer streaks.
// Size stays constant; only color intensifies from cool gray → warm orange → hot red-orange.
const STREAK_TIERS = [
    { min: 30, color: '#E8450E', ringColor: COLORS.border, size: 15, label: 'legendary' as const, sublabel: null },
    { min: 14, color: '#EF6820', ringColor: COLORS.border, size: 15, label: 'hot' as const, sublabel: null },
    { min: 7,  color: '#F59E0B', ringColor: COLORS.border, size: 15, label: 'warm' as const, sublabel: null },
    { min: 3,  color: '#D4A054', ringColor: COLORS.borderLight, size: 15, label: 'kindling' as const, sublabel: null },
    { min: 1,  color: COLORS.text.tertiary, ringColor: COLORS.borderLight, size: 15, label: 'new' as const, sublabel: null },
] as const;
const DEFAULT_STREAK_TIER = { color: COLORS.text.tertiary, ringColor: COLORS.borderLight, size: 15, label: 'none' as const, sublabel: null };

// Milestone thresholds for streak celebrations
const STREAK_MILESTONES = [30, 14, 7] as const;

function getStreakTier(days: number) {
    return STREAK_TIERS.find(t => days >= t.min) ?? DEFAULT_STREAK_TIER;
}

export const UserRow: React.FC<UserRowProps> = React.memo(({ item, index, onMatch, onViewProfile, onChat, rank, onRankPress, statusLine, showVoteRing, hasUnread, onBadgePress, onCrushPress, onStreakMilestone, previousStreakDays, onKarmaPress }) => {
    const name = item.friend.firstName || 'User';
    const rawImageUrl = item.friend.photos?.[0]?.url || undefined;
    const photoBlurhash = item.friend.photos?.[0]?.blurhash || undefined;
    const imageUrl = useMemo(() => getOptimizedImageUrl(rawImageUrl, AVATAR_SIZE), [rawImageUrl]);
    const streak = item.streakDays || 0;
    const friendProfileComplete = item.friend.profileCompleted === true;
    const isFriendMatchmaker = item.friend.role === 'matchmaker';
    // Matchmakers are not in the dating pool — show points row instead of Vote button
    const actionType = (item.hasCompletedGrid || isFriendMatchmaker) ? 'points' : 'match';
    const points = item.karmaScore?.karmaPoints || 0;
    const streakTier = useMemo(() => getStreakTier(streak), [streak]);
    const avatarStyle = useMemo(() => [
        styles.avatar,
        { borderColor: streakTier.ringColor, backgroundColor: '#E5E7EB' },
    ], [streakTier.ringColor]);

    // Streak milestone / death detection
    useEffect(() => {
        if (previousStreakDays == null || !onStreakMilestone) return;
        for (const milestone of STREAK_MILESTONES) {
            if (streak >= milestone && previousStreakDays < milestone) {
                onStreakMilestone(streak, name);
                break;
            }
        }
    }, [streak, previousStreakDays, onStreakMilestone, name]);

    // #3+#7: Vote button pulse glow animation
    const voteScale = useSharedValue(1);
    useEffect(() => {
        if (!showVoteRing) { voteScale.value = 1; return; }
        voteScale.value = withRepeat(
            withSequence(
                withTiming(1.07, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            ), -1, false
        );
        return () => cancelAnimation(voteScale);
        // voteScale is a stable useSharedValue ref — intentionally omitted from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showVoteRing]);
    const voteAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: voteScale.value }] }));

    const handleVotePress = useCallback(() => {
        if (!friendProfileComplete || !onMatch) return;
        mediumHaptic();
        voteScale.value = withSequence(
            withTiming(0.92, { duration: 80 }),
            withSpring(1, SPRINGS.snappy),
        );
        onMatch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendProfileComplete, onMatch]);

    // Vote button shimmer sweep animation
    const shimmerX = useSharedValue(-1);
    useEffect(() => {
        if (!showVoteRing || !friendProfileComplete) { shimmerX.value = -1; return; }
        const runShimmer = () => {
            shimmerX.value = -1;
            shimmerX.value = withSequence(
                withTiming(-1, { duration: 4000 }), // longer pause between sweeps
                withTiming(1.5, { duration: 900, easing: Easing.inOut(Easing.ease) }),
            );
        };
        runShimmer();
        const interval = setInterval(runShimmer, 4900);
        return () => { clearInterval(interval); cancelAnimation(shimmerX); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showVoteRing, friendProfileComplete]);
    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shimmerX.value * 80 }],
    }));

    // Badge press animation
    const badgeScale = useSharedValue(1);
    const handleBadgeTap = useCallback(() => {
        lightHaptic();
        badgeScale.value = withSequence(
            withTiming(0.8, { duration: 80 }),
            withSpring(1, SPRINGS.snappy),
        );
        onBadgePress?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onBadgePress]);
    const badgeAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: badgeScale.value }],
    }));

    // #7: Karma tap haptic
    const handleKarmaTap = useCallback(() => {
        lightHaptic();
        onKarmaPress?.();
    }, [onKarmaPress]);

    const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : COLORS.primaryAccent;

    // No colored glow on avatars — streaks are persistent info, not status events
    const avatarShadow = useMemo(() => ({}), []);

    // Legendary pulse animation (30+ day streaks)
    const pulseAnim = useSharedValue(1);
    useEffect(() => {
        if (streak < 30) { pulseAnim.value = 1; return; }
        pulseAnim.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            ), -1, false
        );
        return () => cancelAnimation(pulseAnim);
        // pulseAnim is a stable useSharedValue ref — intentionally omitted from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streak]);

    const pulseAnimStyle = useAnimatedStyle(() => streak >= 30 ? { transform: [{ scale: pulseAnim.value }] } : {});
    const avatarContent = (
        <Animated.View style={pulseAnimStyle}>
            <TouchableOpacity onPress={onViewProfile} activeOpacity={onViewProfile ? 0.8 : 1} disabled={!onViewProfile} accessibilityLabel={`View ${name}'s profile`} accessibilityRole="button" style={avatarShadow}>
                <Image
                    source={{ uri: imageUrl }}
                    placeholder={photoBlurhash ? { blurhash: photoBlurhash } : undefined}
                    style={avatarStyle}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                    recyclingKey={item.friendId}
                />
            </TouchableOpacity>
        </Animated.View>
    );

    // Shared info block used in both vote and chat rows
    const infoBlock = (
        <View style={styles.info}>
            <View style={styles.nameRow}>
                <Text style={styles.name}>{name}</Text>
                {hasUnread && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.streakRow}>
                <FireIcon size={streakTier.size} color={streakTier.color} />
                <Text style={styles.streakText}>
                    {streak} day{streak !== 1 ? 's' : ''}
                </Text>
            </View>
            {statusLine ? (
                <Text style={[styles.statusLine, typeof statusLine === 'object' && statusLine.color ? { color: statusLine.color } : undefined]} numberOfLines={1}>
                    {typeof statusLine === 'string' ? statusLine : statusLine.text}
                </Text>
            ) : null}
        </View>
    );

    // Vote row — avatar + info are static, Vote button is the action
    if (actionType === 'match') {
        return (
            <View style={styles.row}>
                <View style={styles.left}>
                    {avatarContent}
                    {infoBlock}
                </View>
                <Animated.View style={[
                    voteAnimStyle,
                    showVoteRing && friendProfileComplete && styles.voteBtnGlow,
                ]}>
                    <TouchableOpacity
                        onPress={handleVotePress}
                        style={[
                            styles.matchBtn,
                            showVoteRing && friendProfileComplete && styles.matchBtnGlow,
                            !friendProfileComplete && styles.matchBtnDisabled,
                        ]}
                        activeOpacity={friendProfileComplete ? 0.75 : 1}
                        accessibilityLabel={`Vote for ${name}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !friendProfileComplete }}
                    >
                        {showVoteRing && friendProfileComplete && (
                            <Animated.View style={[styles.shimmerContainer, shimmerStyle]} pointerEvents="none">
                                <LinearGradient
                                    colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.shimmerGradient}
                                />
                            </Animated.View>
                        )}
                        <Text style={[
                            styles.matchBtnText,
                            showVoteRing && friendProfileComplete && styles.matchBtnTextGlow,
                            !friendProfileComplete && styles.matchBtnTextDisabled,
                        ]}>Vote</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    // Chat row — entire row is tappable for chat, avatar & karma are separate targets on top
    return (
        <TouchableOpacity
            style={styles.row}
            activeOpacity={0.6}
            onPress={onChat}
            accessibilityLabel={`Chat with ${name}`}
            accessibilityRole="button"
        >
            <View style={styles.left}>
                {rank != null && (
                    <TouchableOpacity
                        onPress={onRankPress}
                        activeOpacity={0.7}
                        style={[styles.rankBadge, { borderColor: rankColor }]}
                        accessibilityLabel={`Rank ${rank}, tap for leaderboard`}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.rankText, { color: rankColor }]}>#{rank}</Text>
                    </TouchableOpacity>
                )}
                {avatarContent}
                {infoBlock}
            </View>
            <View style={styles.rightActions}>
                {onCrushPress && (
                    <TouchableOpacity
                        onPress={() => { lightHaptic(); onCrushPress(); }}
                        activeOpacity={0.7}
                        style={styles.crushBtn}
                        accessibilityLabel={item.hasCrushed ? `Remove crush on ${name}` : `Crush on ${name}`}
                        accessibilityRole="button"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <EvaIcon
                            name="heart"
                            variant={item.hasCrushed ? 'fill' : 'outline'}
                            size={20}
                            color={item.hasCrushed ? COLORS.error : COLORS.text.secondary}
                        />
                    </TouchableOpacity>
                )}
                {onBadgePress && (
                    <Animated.View style={badgeAnimStyle}>
                        <TouchableOpacity
                            onPress={handleBadgeTap}
                            activeOpacity={0.7}
                            style={styles.badgeBtn}
                            accessibilityLabel={`Award badge to ${name}`}
                            accessibilityRole="button"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <EvaIcon name="award" variant="outline" size={18} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}
                <TouchableOpacity activeOpacity={0.75} onPress={handleKarmaTap} accessibilityLabel={`${name}'s karma: ${points} points`} accessibilityRole="button">
                    <KarmaPill karma={points} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: ROW_HORIZONTAL_PADDING,
        paddingVertical: isCompact ? 12 : 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    rankText: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.sm,
    },
    // #3: Glowing vote button styles
    voteBtnGlow: {
        ...SHADOWS.accentBlue,
    },
    matchBtnGlow: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    matchBtnTextGlow: {
        color: COLORS.card,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_RADIUS,
        backgroundColor: '#E5E7EB',
        borderWidth: 2,
        borderColor: COLORS.borderLight,
    },
    info: {
        marginLeft: INFO_MARGIN_LEFT,
        justifyContent: 'center',
        flexShrink: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: 4,
    },
    name: {
        fontFamily: FONTS.extraBold,
        fontSize: isCompact ? FONT_SIZES.xl : FONT_SIZES['2xl'],
        lineHeight: isCompact ? LINE_HEIGHTS.lg : LINE_HEIGHTS['2xl'],
        color: COLORS.text.primary,
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    streakText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        lineHeight: LINE_HEIGHTS.base,
        color: COLORS.text.secondary,
    },
    // Status line — always neutral; status is persistent info, not a success event
    statusLine: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primaryAccent,
        marginLeft: 2,
    },
    shimmerContainer: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        borderRadius: 999,
    },
    shimmerGradient: {
        width: 40,
        height: '100%' as unknown as number,
    },
    matchBtn: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: COLORS.primaryAccent,
        backgroundColor: COLORS.card,
        overflow: 'hidden' as const,
    },
    matchBtnText: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.primaryAccent,
    },
    matchBtnDisabled: {
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
    },
    matchBtnTextDisabled: {
        color: COLORS.text.tertiary,
    },
    crushBtn: {
        padding: 6,
    },
    badgeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.screenBackground,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
});
