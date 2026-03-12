import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FriendWithGridStatus } from '../../types/community';
import { FireIcon, StarIcon } from '../icons/Icons';
import { KarmaInfoModal } from './karma/KarmaInfoModal';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';

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
}

// Streak tier — color & size intensify with streak length
const STREAK_TIERS = [
    { min: 30, color: '#EF4444', ringColor: '#EF4444', size: 17, label: 'blazing' as const },
    { min: 7,  color: '#F59E0B', ringColor: '#F59E0B', size: 16, label: 'warm' as const },
    { min: 1,  color: '#2B65F9', ringColor: '#2B65F9', size: 15, label: 'new' as const },
] as const;
const DEFAULT_STREAK_TIER = { color: '#9CA3AF', ringColor: '#F0F0F0', size: 14, label: 'none' as const };

function getStreakTier(days: number) {
    return STREAK_TIERS.find(t => days >= t.min) ?? DEFAULT_STREAK_TIER;
}

export const UserRow: React.FC<UserRowProps> = React.memo(({ item, index, onMatch, onViewProfile, onChat, rank, onRankPress, statusLine, showVoteRing, hasUnread }) => {
    const name = item.friend.firstName || 'User';
    const rawImageUrl = item.friend.photos?.[0]?.url || 'https://via.placeholder.com/150';
    const imageUrl = useMemo(() => getOptimizedImageUrl(rawImageUrl, 68), [rawImageUrl]);
    const streak = item.streakDays || 0;
    const friendProfileComplete = item.friend.profileCompleted === true;
    const actionType = item.hasCompletedGrid ? 'points' : 'match';
    const points = item.karmaScore?.karmaPoints || 0;
    const [showKarmaModal, setShowKarmaModal] = useState(false);
    const streakTier = useMemo(() => getStreakTier(streak), [streak]);

    // #3+#7: Vote button pulse glow animation
    const voteScale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!showVoteRing) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(voteScale, { toValue: 1.07, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(voteScale, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => { loop.stop(); voteScale.setValue(1); };
    }, [showVoteRing, voteScale]);
    const handleVotePress = useCallback(() => {
        if (!friendProfileComplete || !onMatch) return;
        mediumHaptic();
        Animated.sequence([
            Animated.timing(voteScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
            Animated.timing(voteScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start(() => onMatch());
    }, [friendProfileComplete, onMatch, voteScale]);

    // #7: Karma tap haptic
    const handleKarmaTap = useCallback(() => {
        lightHaptic();
        setShowKarmaModal(true);
    }, []);

    const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#2B65F9';

    const avatarShadow = useMemo(() => streak >= 7 ? {
        shadowColor: streakTier.ringColor,
        shadowOffset: { width: 0, height: 0 } as const,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    } : {}, [streak, streakTier.ringColor]);

    const avatarContent = (
        <TouchableOpacity onPress={onViewProfile} activeOpacity={onViewProfile ? 0.8 : 1} disabled={!onViewProfile} accessibilityLabel={`View ${name}'s profile`} accessibilityRole="button" style={avatarShadow}>
            <Image
                source={{ uri: imageUrl }}
                style={[styles.avatar, { borderColor: streakTier.ringColor }]}
                contentFit="cover"
                transition={200}
                cachePolicy="disk"
            />
        </TouchableOpacity>
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
                <Text style={[styles.streakText, streak >= 30 && styles.streakTextHot, streak >= 7 && streak < 30 && styles.streakTextWarm]}>
                    {streak} day{streak !== 1 ? 's' : ''}
                </Text>
            </View>
            {statusLine ? (
                <Text style={[
                    styles.statusLine,
                    statusLine === 'Has a match!' && styles.statusLineActive,
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
                    { transform: [{ scale: voteScale }] },
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
            <TouchableOpacity style={styles.pointsBtn} activeOpacity={0.75} onPress={handleKarmaTap} accessibilityLabel={`${name}'s karma: ${points} points`} accessibilityRole="button">
                <StarIcon size={15} color="#3ECC62" />
                <Text style={styles.pointsBtnText}>{points} pts</Text>
            </TouchableOpacity>
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
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E8EDFB',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    rankText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 12,
    },
    // #3: Glowing vote button styles
    voteBtnGlow: {
        shadowColor: '#2B65F9',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
    },
    matchBtnGlow: {
        backgroundColor: '#2B65F9',
        borderColor: '#2B65F9',
    },
    matchBtnTextGlow: {
        color: '#FFFFFF',
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#E5E7EB',
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
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 23,
        color: '#111111',
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    streakText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        lineHeight: 18,
        color: '#737373',
    },
    // #1: Streak text color upgrades at tiers
    streakTextWarm: {
        color: '#D97706',
        fontFamily: 'Outfit_500Medium',
    },
    streakTextHot: {
        color: '#DC2626',
        fontFamily: 'Outfit_600SemiBold',
    },
    // #2: Contextual status line
    statusLine: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#667085',
        marginTop: 2,
    },
    statusLineActive: {
        color: '#3ECC62',
        fontFamily: 'Outfit_500Medium',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2B65F9',
        marginLeft: 2,
    },
    matchBtn: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#2B65F9',
        backgroundColor: '#EEF3FF',
    },
    matchBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 15,
        color: '#2B65F9',
    },
    matchBtnDisabled: {
        borderColor: '#D1D5DB',
        backgroundColor: '#F3F4F6',
    },
    matchBtnTextDisabled: {
        color: '#9CA3AF',
    },
    pointsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#3ECC62',
        backgroundColor: '#EDFCF2',
        gap: 6,
        shadowColor: '#3ECC62',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    pointsBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 15,
        color: '#3ECC62',
    },
});
