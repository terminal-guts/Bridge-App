import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FriendWithGridStatus } from '../../types/community';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FireIcon, StarIcon } from '../icons/Icons';
import { KarmaInfoModal } from './KarmaInfoModal';

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

export const UserRow: React.FC<UserRowProps> = React.memo(({ item, index, onMatch }) => {
    const name = item.friend.firstName || 'User';
    const imageUrl = item.friend.photos?.[0]?.url || 'https://via.placeholder.com/150';
    const optimizedImageUrl = useMemo(() => getOptimizedImageUrl(imageUrl, 68), [imageUrl]);
    const streak = item.streakDays || 0;
    const actionType = item.hasCompletedGrid ? 'points' : 'match';
    const points = item.assistsCount > 0
        ? item.assistsCount * 10
        : stableRandom(item.friendId, 40, 180);
    const [showKarmaModal, setShowKarmaModal] = useState(false);

    return (
        <View style={styles.row}>
            <View style={styles.left}>
                <Image
                    source={{ uri: optimizedImageUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
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
                </View>
            </View>

            {actionType === 'match' ? (
                <TouchableOpacity onPress={onMatch} style={styles.matchBtn} activeOpacity={0.75}>
                    <Text style={styles.matchBtnText}>Match</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.pointsBtn} activeOpacity={0.75} onPress={() => setShowKarmaModal(true)}>
                    <StarIcon size={15} color="#3ECC62" />
                    <Text style={styles.pointsBtnText}>{points} pts</Text>
                </TouchableOpacity>
            )}
            <KarmaInfoModal visible={showKarmaModal} onClose={() => setShowKarmaModal(false)} />
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
    },
    streakText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        lineHeight: 18,
        color: '#737373',
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
