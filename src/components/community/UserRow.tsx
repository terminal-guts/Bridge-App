import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { FriendWithGridStatus, KarmaTier } from '../../types/community';
import { FireIcon, StarIcon } from '../icons/Icons';

interface UserRowProps {
    item: FriendWithGridStatus;
    index: number;
    onMatch?: () => void;
}

const stableRandom = (seed: string, min: number, max: number): number => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    return min + (Math.abs(h) % (max - min));
};

/**
 * Derive the karma tier from the number of assists so the badge renders
 * consistently whether karmaScore is populated or not.
 */
function deriveKarmaTier(assists: number): KarmaTier {
    if (assists >= 25) return 'elite';
    if (assists >= 10) return 'trusted';
    if (assists >= 3) return 'solid';
    return 'new';
}

/**
 * Karma tier labels with emoji icons matching the audit spec:
 *   New Matchmaker (0 assists)     🌱
 *   Solid Matchmaker (3+ assists)  ⭐
 *   Trusted Matchmaker (10+)       💎
 *   Elite Matchmaker (25+)         👑
 */
const KARMA_TIER_DISPLAY: Record<KarmaTier, { label: string; emoji: string; color: string; bgColor: string }> = {
    new:     { label: 'New Matchmaker',     emoji: '🌱', color: '#94A3B8', bgColor: '#F1F5F9' },
    solid:   { label: 'Solid Matchmaker',   emoji: '⭐', color: '#10B981', bgColor: '#ECFDF5' },
    trusted: { label: 'Trusted Matchmaker', emoji: '💎', color: '#8B5CF6', bgColor: '#F5F3FF' },
    elite:   { label: 'Elite Matchmaker',   emoji: '👑', color: '#F59E0B', bgColor: '#FFFBEB' },
};

export const UserRow: React.FC<UserRowProps> = React.memo(({ item, index, onMatch }) => {
    const name = item.friend.firstName || 'Unknown';
    const imageUrl = item.friend.photos?.[0]?.url || 'https://via.placeholder.com/150';
    const streak = item.streakDays || 0;
    const actionType = item.hasCompletedGrid ? 'points' : 'match';
    const points = item.assistsCount > 0
        ? item.assistsCount * 10
        : stableRandom(item.friendId, 40, 180);

    // Karma badge derived from assistsCount (real karma) or karmaScore if available
    const assists = item.karmaScore?.totalAssists ?? item.assistsCount ?? 0;
    const karmaTier = deriveKarmaTier(assists);
    const karmaDisplay = KARMA_TIER_DISPLAY[karmaTier];

    return (
        <View style={styles.row}>
            <View style={styles.left}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.avatar}
                />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        {item.isMatched && (
                            <Text style={styles.matchedTag}>(Matched)</Text>
                        )}
                    </View>
                    <View style={styles.streakRow}>
                        <FireIcon size={15} color="#2B65F9" />
                        <Text style={styles.streakText}>{streak}-day streak</Text>
                    </View>
                    {/* Karma tier badge */}
                    <View style={[styles.karmaBadge, { backgroundColor: karmaDisplay.bgColor }]}>
                        <Text style={styles.karmaBadgeEmoji}>{karmaDisplay.emoji}</Text>
                        <Text style={[styles.karmaBadgeLabel, { color: karmaDisplay.color }]}>
                            {karmaDisplay.label}
                        </Text>
                    </View>
                </View>
            </View>

            {actionType === 'match' ? (
                <TouchableOpacity onPress={onMatch} style={styles.matchBtn} activeOpacity={0.75}>
                    <Text style={styles.matchBtnText}>Match</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.pointsBtn} activeOpacity={0.75}>
                    <StarIcon size={15} color="#3ECC62" />
                    <Text style={styles.pointsBtnText}>{points} pts</Text>
                </TouchableOpacity>
            )}
        </View>
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
        borderBottomWidth: 1,
        borderBottomColor: '#E0EAFF',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#E5E7EB',
    },
    info: {
        marginLeft: 16,
        justifyContent: 'center',
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
    matchedTag: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12,
        color: '#3ECC62',
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    streakText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        lineHeight: 18,
        color: '#737373',
    },
    karmaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
        marginTop: 2,
    },
    karmaBadgeEmoji: {
        fontSize: 11,
    },
    karmaBadgeLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 11,
        fontWeight: '600',
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
    },
    pointsBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 15,
        color: '#3ECC62',
    },
});
