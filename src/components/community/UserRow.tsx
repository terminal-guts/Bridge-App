import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FriendWithGridStatus } from '../../types/community';
import { FireIcon, StarIcon } from '../icons/Icons';
import { KarmaInfoModal } from './KarmaInfoModal';

interface UserRowProps {
    item: FriendWithGridStatus;
    index: number;
    onMatch?: () => void;
    onViewProfile?: () => void;
    onChat?: () => void;
}

export const UserRow: React.FC<UserRowProps> = React.memo(({ item, index, onMatch, onViewProfile, onChat }) => {
    const name = item.friend.firstName || 'User';
    const rawImageUrl = item.friend.photos?.[0]?.url || 'https://via.placeholder.com/150';
    const imageUrl = useMemo(() => getOptimizedImageUrl(rawImageUrl, 68), [rawImageUrl]);
    const streak = item.streakDays || 0;
    const friendProfileComplete = item.friend.profileCompleted === true;
    const actionType = item.hasCompletedGrid ? 'points' : 'match';
    const points = item.karmaScore?.karmaPoints || 0;
    const [showKarmaModal, setShowKarmaModal] = useState(false);

    return (
        <View style={styles.row}>
            <View style={styles.left}>
                <TouchableOpacity onPress={onViewProfile} activeOpacity={onViewProfile ? 0.8 : 1} disabled={!onViewProfile}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="disk"
                    />
                </TouchableOpacity>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        {item.isMatched && (
                            <Text style={styles.matchedTag}>(Matched)</Text>
                        )}
                    </View>
                    <View style={styles.streakRow}>
                        <FireIcon size={15} color="#2B65F9" />
                        <Text style={styles.streakText}>{streak} days</Text>
                    </View>
                </View>
            </View>

            {onChat && (
                <TouchableOpacity
                    onPress={onChat}
                    style={styles.chatBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubble-outline" size={20} color="#437FFF" />
                </TouchableOpacity>
            )}

            {actionType === 'match' ? (
                <TouchableOpacity
                    onPress={friendProfileComplete ? onMatch : undefined}
                    style={[styles.matchBtn, !friendProfileComplete && styles.matchBtnDisabled]}
                    activeOpacity={friendProfileComplete ? 0.75 : 1}
                >
                    <Text style={[styles.matchBtnText, !friendProfileComplete && styles.matchBtnTextDisabled]}>Match</Text>
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
    chatBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
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
    },
    pointsBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 15,
        color: '#3ECC62',
    },
});
