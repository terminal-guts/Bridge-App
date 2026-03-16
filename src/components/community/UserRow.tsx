import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FriendWithGridStatus } from '../../types/community';
import { FireIcon, StarIcon } from '../icons/Icons';
import { EvaIcon } from '../icons';
import { KarmaInfoModal } from './karma/KarmaInfoModal';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS, glowShadow } from '../../theme/shadows';

interface UserRowProps {
    item: FriendWithGridStatus;
    index: number;
    onMatch?: () => void;
    onViewProfile?: () => void;
    onChat?: () => void;
    rank?: number;
    onRankPress?: () => void;
    statusLine?: string;
    showVoteRing?: boolean;
    hasUnread?: boolean;
    onBadgePress?: () => void;
    onStreakMilestone?: (days: number, friendName: string) => void;
    previousStreakDays?: number;
}

// Streak tier — color & size intensify with streak length (4 tiers + default)
const STREAK_TIERS = [
    { min: 30, color: '#EF4444', ringColor: '#EF4444', size: 18, label: 'legendary' as const, sublabel: 'Legendary!' },
    { min: 14, color: '#F97316', ringColor: '#D97706', size: 17, label: 'hot' as const, sublabel: 'Hot streak!' },
    { min: 7,  color: '#F59E0B', ringColor: '#F59E0B', size: 16, label: 'warm' as const, sublabel: null },
    { min: 1,  color: COLORS.primaryButton, ringColor: COLORS.primaryButton, size: 15, label: 'new' as const, sublabel: null },
] as const;
const DEFAULT_STREAK_TIER = { color: COLORS.text.disabled, ringColor: '#F0F0F0', size: 14, label: 'none' as const, sublabel: null };

// Milestone thresholds for streak celebrations
const STREAK_MILESTONES = [30, 14, 7] as const;

function getStreakTier(days: number) {
    return STREAK_TIERS.find(t => days >= t.min) ?? DEFAULT_STREAK_TIER;
}

export const UserRow: React.FC<UserRowProps> = React.memo(({ item, index, onMatch, onViewProfile, onChat, rank, onRankPress, statusLine, showVoteRing, hasUnread, onBadgePress, onStreakMilestone, previousStreakDays }) => {
    const name = item.friend.firstName || 'User';
    const rawImageUrl = item.friend.photos?.[0]?.url || undefined;
    const imageUrl = useMemo(() => getOptimizedImageUrl(rawImageUrl, 68), [rawImageUrl]);
    const streak = item.streakDays || 0;
    const friendProfileComplete = item.friend.profileCompleted === true;
    const actionType = item.hasCompletedGrid ? 'points' : 'match';
    const points = item.karmaScore?.karmaPoints || 0;
    const [showKarmaModal, setShowKarmaModal] = useState(false);
    const streakTier = useMemo(() => getStreakTier(streak), [streak]);

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
                withTiming(1.07, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            ), -1, false
        );
        return () => cancelAnimation(voteScale);
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
    }, [friendProfileComplete, onMatch]);

    // #7: Karma tap haptic
    const handleKarmaTap = useCallback(() => {
        lightHaptic();
        setShowKarmaModal(true);
    }, []);

    const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : COLORS.primaryButton;

    const avatarShadow = useMemo(() => streak >= 14
        ? glowShadow(streakTier.ringColor, 'strong')
        : streak >= 7
            ? glowShadow(streakTier.ringColor, 'medium')
            : {}, [streak, streakTier.ringColor]);

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
    }, [streak]);

    const pulseAnimStyle = useAnimatedStyle(() => streak >= 30 ? { transform: [{ scale: pulseAnim.value }] } : {});
    const avatarContent = (
        <Animated.View style={pulseAnimStyle}>
            <TouchableOpacity onPress={onViewProfile} activeOpacity={onViewProfile ? 0.8 : 1} disabled={!onViewProfile} accessibilityLabel={`View ${name}'s profile`} accessibilityRole="button" style={avatarShadow}>
                <Image
                    source={{ uri: imageUrl }}
                    style={[
                        styles.avatar,
                        { borderColor: streakTier.ringColor, backgroundColor: '#E5E7EB' },
                        streak >= 14 && { borderWidth: 2.5, borderColor: '#D97706' },
                        streak >= 30 && { borderColor: '#EF4444' },
                    ]}
                    contentFit="cover"
                    transition={0}
                    cachePolicy="disk"
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
                <View>
                    <Text style={[
                        styles.streakText,
                        streak >= 30 && styles.streakTextHot,
                        streak >= 14 && streak < 30 && styles.streakTextHot14,
                        streak >= 7 && streak < 14 && styles.streakTextWarm,
                    ]}>
                        {streak} day{streak !== 1 ? 's' : ''}
                    </Text>
                    {streakTier.sublabel && (
                        <Text style={[styles.streakSublabel, { color: streakTier.color }]}>{streakTier.sublabel}</Text>
                    )}
                </View>
            </View>
            {statusLine ? (
                <Text style={[
                    styles.statusLine,
                    statusLine === 'Has a match!' && styles.statusLineActive,
                    statusLine.startsWith('Suggested for') && styles.statusLineSuggestion,
                ]} numberOfLines={1}>{statusLine}</Text>
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
                        <Text style={[
                            styles.matchBtnText,
                            showVoteRing && friendProfileComplete && styles.matchBtnTextGlow,
                            !friendProfileComplete && styles.matchBtnTextDisabled,
                        ]}>Vote</Text>
                    </TouchableOpacity>
                </Animated.View>
                <KarmaInfoModal visible={showKarmaModal} onClose={() => setShowKarmaModal(false)} />
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
                {onBadgePress && (
                    <TouchableOpacity
                        onPress={() => { lightHaptic(); onBadgePress(); }}
                        activeOpacity={0.7}
                        style={styles.badgeBtn}
                        accessibilityLabel={`Award badge to ${name}`}
                        accessibilityRole="button"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <EvaIcon name="award" variant="outline" size={20} color={COLORS.text.muted} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.pointsBtn} activeOpacity={0.75} onPress={handleKarmaTap} accessibilityLabel={`${name}'s karma: ${points} points`} accessibilityRole="button">
                    <StarIcon size={15} color={COLORS.successAlt} />
                    <Text style={styles.pointsBtnText}>{points} pts</Text>
                </TouchableOpacity>
            </View>
            <KarmaInfoModal visible={showKarmaModal} onClose={() => setShowKarmaModal(false)} />
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E8EDFB',
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
        fontWeight: '700',
        fontSize: FONT_SIZES.sm,
    },
    // #3: Glowing vote button styles
    voteBtnGlow: {
        ...SHADOWS.accentBlue,
    },
    matchBtnGlow: {
        backgroundColor: COLORS.primaryButton,
        borderColor: COLORS.primaryButton,
    },
    matchBtnTextGlow: {
        color: COLORS.card,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: COLORS.backgroundGrayMedium,
        borderWidth: 2,
        borderColor: '#F0F0F0',
    },
    info: {
        marginLeft: 16,
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
        fontFamily: FONTS.bold,
        fontWeight: '700',
        fontSize: FONT_SIZES['2xl'],
        lineHeight: 23,
        color: COLORS.text.dark,
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    streakText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        lineHeight: 18,
        color: COLORS.text.dimmed,
    },
    // #1: Streak text color upgrades at tiers
    streakTextWarm: {
        color: '#D97706',
        fontFamily: FONTS.medium,
    },
    streakTextHot14: {
        color: '#F97316',
        fontFamily: FONTS.semiBold,
    },
    streakTextHot: {
        color: '#DC2626',
        fontFamily: FONTS.bold,
    },
    streakSublabel: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xs,
        marginTop: 1,
    },
    // #2: Contextual status line
    statusLine: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: '#667085',
        marginTop: 2,
    },
    statusLineActive: {
        color: COLORS.successAlt,
        fontFamily: FONTS.medium,
    },
    statusLineSuggestion: {
        color: COLORS.primaryAccent,
        fontFamily: FONTS.medium,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primaryButton,
        marginLeft: 2,
    },
    matchBtn: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: COLORS.primaryButton,
        backgroundColor: COLORS.backgroundFriendActive,
    },
    matchBtnText: {
        fontFamily: FONTS.bold,
        fontWeight: '700',
        fontSize: FONT_SIZES.lg,
        color: COLORS.primaryButton,
    },
    matchBtnDisabled: {
        borderColor: COLORS.borderGray,
        backgroundColor: COLORS.backgroundGray,
    },
    matchBtnTextDisabled: {
        color: COLORS.text.disabled,
    },
    pointsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: COLORS.successAlt,
        backgroundColor: COLORS.backgroundSuccessBadge,
        gap: 6,
        ...SHADOWS.accentGreen,
    },
    badgeBtn: {
        padding: 6,
    },
    pointsBtnText: {
        fontFamily: FONTS.bold,
        fontWeight: '700',
        fontSize: FONT_SIZES.lg,
        color: COLORS.successAlt,
    },
});
