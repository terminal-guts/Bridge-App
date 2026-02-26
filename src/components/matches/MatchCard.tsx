import React from 'react';
import { View, Text, Image, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckmarkIcon, HourglassIcon, ChatIcon, HeartsIcon, ArrowRightIcon, QuestionIcon } from '../icons/Icons';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export type MatchStatus =
    | 'active_match'
    | 'awaiting_you'
    | 'awaiting_them'
    | 'no_match'
    | 'new_match';

// Top-left badge (state pill in corner)
const TOP_BADGE_CONFIG: Record<MatchStatus, { label: string; bg: string; Icon?: React.FC<any> }> = {
    active_match:  { label: 'Active Match',            bg: '#34C759',                  Icon: CheckmarkIcon },
    awaiting_you:  { label: 'Awaiting your response',  bg: '#FF8D28',                  Icon: HourglassIcon },
    awaiting_them: { label: 'Awaiting their response', bg: '#D4AA01',                  Icon: HourglassIcon },
    no_match:      { label: 'No match',                bg: '#8E8E93',                  Icon: HourglassIcon },
    new_match:     { label: 'New match',               bg: '#2B65F9',                  Icon: undefined },
};

// Bottom pills — rendered top-to-bottom in the order listed
const BOTTOM_PILLS: Record<MatchStatus, Array<{ label: string; bg: string; Icon?: React.FC<any> }>> = {
    active_match:  [
        { label: 'Both voted yes',      bg: 'rgba(52, 199, 89, 0.55)',  Icon: CheckmarkIcon },
    ],
    awaiting_you:  [
        { label: "You haven't voted",   bg: 'rgba(20, 12, 4, 0.78)',    Icon: QuestionIcon },
        { label: 'They voted yes',      bg: 'rgba(52, 199, 89, 0.55)',  Icon: CheckmarkIcon },
    ],
    awaiting_them: [
        { label: 'You voted yes',       bg: 'rgba(52, 199, 89, 0.55)',  Icon: CheckmarkIcon },
        { label: "They haven't voted",  bg: 'rgba(20, 12, 4, 0.78)',    Icon: QuestionIcon },
    ],
    new_match:     [
        { label: 'Neither person voted', bg: 'rgba(20, 12, 4, 0.78)', Icon: QuestionIcon },
    ],
    no_match:      [
        { label: 'No match',            bg: 'rgba(142, 142, 147, 0.35)', Icon: HourglassIcon },
    ],
};

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────
interface MatchCardProps {
    status: MatchStatus;
    name: string;
    age?: number;
    matchDate?: string;
    imageUrl: string;
    matchedByAvatars: string[];
    onPress?: () => void;
    onDismiss?: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
export const MatchCard: React.FC<MatchCardProps> = ({
    status,
    name,
    age,
    matchDate,
    imageUrl,
    matchedByAvatars,
    onPress,
    onDismiss,
}) => {
    const topBadge = TOP_BADGE_CONFIG[status];
    const bottomPills = BOTTOM_PILLS[status];
    const isActiveMatch = status === 'active_match';

    return (
        <View style={styles.card}>
            <ImageBackground
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFillObject}
                imageStyle={styles.cardImage}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={[
                        'rgba(9, 18, 46, 0)',
                        'rgba(9, 18, 46, 0.3)',
                        'rgba(9, 18, 46, 0.55)',
                    ]}
                    locations={[0.4, 0.65, 1.0]}
                    style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.cardInner}>

                    {/* ── Top row: badge (left) + optional X dismiss button (right) ── */}
                    <View style={styles.topRow}>
                        <View style={[styles.topBadge, { backgroundColor: topBadge.bg }]}>
                            {topBadge.Icon && <topBadge.Icon size={18} color="#FFF" />}
                            <Text style={styles.topBadgeText}>{topBadge.label}</Text>
                        </View>
                        {isActiveMatch && onDismiss && (
                            <TouchableOpacity onPress={onDismiss} style={[styles.dismissButton, { backgroundColor: 'rgba(120,120,128,0.6)' }]} activeOpacity={0.8}>
                                <Text style={styles.dismissX}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── Bottom block ── */}
                    <View style={styles.bottomSection}>

                        {/* Status pills — rendered in order */}
                        {bottomPills.map((pill, i) => (
                            <View key={i} style={[styles.pill, { backgroundColor: pill.bg }]}>
                                {pill.Icon && <pill.Icon size={15} color="#FFF" />}
                                <Text style={styles.pillText}>{pill.label}</Text>
                            </View>
                        ))}

                        {/* Name + age */}
                        <Text style={styles.nameText}>{name}{age ? `, ${age}` : ''}</Text>

                        {/* Matched by row */}
                        {matchedByAvatars.length > 0 && (
                            <View style={styles.matchedByRow}>
                                <HeartsIcon size={18} color="#00C8B3" />
                                <Text style={styles.matchedByText}>Matched by :</Text>
                                <View style={styles.avatarRow}>
                                    {matchedByAvatars.slice(0, 3).map((url, i) => (
                                        <Image
                                            key={i}
                                            source={{ uri: url }}
                                            style={[styles.avatarCircle, { marginLeft: i === 0 ? 0 : -8 }]}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Date line */}
                        {matchDate && (
                            <Text style={styles.dateText}>{matchDate}</Text>
                        )}

                    </View>
                </View>
            </ImageBackground>

            {/* Action button — chat for active match, arrow for everything else */}
            <TouchableOpacity onPress={onPress} style={styles.actionButton} activeOpacity={0.85}>
                {isActiveMatch ? (
                    <ChatIcon size={24} color="#2563EB" />
                ) : (
                    <ArrowRightIcon size={22} color="#010101" />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    cardImage: {
        borderRadius: 16,
    },
    cardInner: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 12,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    topBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
    },
    topBadgeText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        lineHeight: 20,
    },
    dismissButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissX: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
    },
    bottomSection: {
        gap: 8,
        paddingBottom: 16,
        paddingRight: 80,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 8,
    },
    pillText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 15,
        lineHeight: 19,
    },
    nameText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_900Bold',
        fontWeight: '700',
        fontSize: 32,
        lineHeight: 38,
        letterSpacing: -0.5,
    },
    matchedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    matchedByText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        lineHeight: 20,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        backgroundColor: '#ccc',
    },
    dateText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        lineHeight: 20,
    },
    actionButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
        elevation: 8,
    },
});
