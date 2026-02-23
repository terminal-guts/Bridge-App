import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
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

const STATUS_CONFIG: Record<
    MatchStatus,
    { label: string; topBgColor?: string; bottomBgColor?: string; Icon?: React.FC<any> }
> = {
    active_match: {
        label: 'Active match',
        topBgColor: '#34C759',
        bottomBgColor: 'rgba(52, 199, 89, 0.2)',
        Icon: CheckmarkIcon,
    },
    awaiting_you: {
        label: 'Awaiting your response',
        topBgColor: '#FF8D28',
        Icon: HourglassIcon,
    },
    awaiting_them: {
        label: 'Awaiting their response',
        // Figma CSS: #D4AA01
        topBgColor: '#D4AA01',
        Icon: HourglassIcon,
    },
    no_match: {
        label: 'No match',
        topBgColor: '#8E8E93',
        Icon: HourglassIcon,
    },
    new_match: {
        label: 'New match',
        topBgColor: 'rgba(255, 255, 255, 0.2)',
        bottomBgColor: undefined,
    },
};

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────
interface MatchCardProps {
    status: MatchStatus;
    name: string;
    age: number;
    /** For active_match shows "Matched {date}"; for awaiting_you shows "Expires in {expiresIn}" */
    expiresIn?: string;
    matchDate?: string;
    imageUrl: string;
    matchedByAvatars: string[];
    /** Whether the other person already voted yes — shows the voted banner */
    theyVotedYes?: boolean;
    /** For the awaiting_them variant: shows "You voted yes" banner */
    youVotedYes?: boolean;
    /** For the awaiting_them variant: shows "Expires X hours" banner */
    expiresXHours?: string;
    onPress?: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
export const MatchCard: React.FC<MatchCardProps> = ({
    status,
    name,
    age,
    expiresIn,
    matchDate,
    imageUrl,
    matchedByAvatars,
    theyVotedYes = false,
    youVotedYes = false,
    expiresXHours,
    onPress,
}) => {
    const config = STATUS_CONFIG[status];
    const isAwaitingYou = status === 'awaiting_you';
    const isAwaitingThem = status === 'awaiting_them';
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
                        'rgba(9, 18, 46, 0.2)',
                        'rgba(9, 18, 46, 0.5)',
                    ]}
                    locations={[0.6313, 0.7505, 1.0]}
                    style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.cardInner}>
                    <View style={styles.topRow}>
                        {config.topBgColor && (
                            <View style={[styles.statusBadge, { backgroundColor: config.topBgColor }]}>
                                {config.Icon && <config.Icon size={18} color="#FFF" />}
                                <Text style={styles.statusBadgeText}>
                                    {config.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.bottomSection}>
                        {/* Status Banners */}
                        {isAwaitingYou && theyVotedYes && (
                            <View style={styles.votedBanner}>
                                <CheckmarkIcon size={18} color="#FFFFFF" />
                                <Text style={styles.votedBannerText}>
                                    They voted yes – Awaiting your vote
                                </Text>
                            </View>
                        )}

                        {isAwaitingThem && (
                            <View style={{ gap: 10 }}>
                                {youVotedYes && (
                                    <View style={[styles.statusBanner, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
                                        <CheckmarkIcon size={18} color="#FFFFFF" />
                                        <Text style={styles.votedBannerText}>You voted yes</Text>
                                    </View>
                                )}
                                {expiresXHours && (
                                    <View style={[styles.statusBanner, { backgroundColor: 'rgba(255, 141, 40, 0.2)' }]}>
                                        <QuestionIcon size={18} color="#FFFFFF" />
                                        <Text style={styles.votedBannerText}>{expiresXHours}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.nameBlock}>
                            {isActiveMatch && config.bottomBgColor && (
                                <View style={[styles.activeMatchBadge, { backgroundColor: config.bottomBgColor }]}>
                                    <CheckmarkIcon size={14} color="#FFF" />
                                    <Text style={styles.activeMatchBadgeText}>Match complete</Text>
                                </View>
                            )}

                            <Text style={styles.nameText}>
                                {name}, {age}
                            </Text>

                            {isAwaitingYou && expiresIn ? (
                                <Text style={styles.expiryText}>Expires in {expiresIn}</Text>
                            ) : matchDate ? (
                                <Text style={styles.expiryText}>{matchDate}</Text>
                            ) : null}
                        </View>
                    </View>
                </View>
            </ImageBackground>

            <TouchableOpacity onPress={onPress} style={styles.actionButton} activeOpacity={0.85}>
                {(isAwaitingYou || isAwaitingThem || status === 'new_match') ? (
                    <ArrowRightIcon size={24} color="#010101" />
                ) : (
                    <ChatIcon size={24} color="#2563EB" />
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
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
    },
    statusBadgeText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        lineHeight: 18,
    },
    bottomSection: {
        gap: 12,
        paddingBottom: 16,
        paddingRight: 70,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    votedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(132, 132, 132, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 6,
    },
    votedBannerText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        lineHeight: 18,
    },
    nameBlock: {
        gap: 8,
    },
    activeMatchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        gap: 6,
        alignSelf: 'flex-start',
    },
    activeMatchBadgeText: {
        color: 'white',
        fontSize: 13,
        fontFamily: 'Outfit_400Regular',
    },
    nameText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 24,
        lineHeight: 30,
    },
    matchedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    matchedByText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        lineHeight: 18,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
    },
    expiryText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        lineHeight: 18,
    },
    actionButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
});
