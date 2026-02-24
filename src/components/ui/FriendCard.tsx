/**
 * FriendCard Component
 *
 * Consolidated friend card with unified design for both general and community use.
 *
 * Features:
 * - Circular avatar (tappable)
 * - Name + verified badge
 * - Streak display (fire emoji + count)
 * - Friendship tier badge (New, Good, Great, Best)
 * - Action button (Vote/Help) or Karma Score + Stars
 * - Support for both FriendWithGridStatus and legacy FriendData
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { FriendWithGridStatus, FriendshipTier } from '../../types/community';
import { lightHaptic } from '../../utils/haptics';
import {
    COLORS,
    STREAK_TIERS,
    KARMA_TIERS,
} from '../../constants/friendsArea';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchable = styled(TouchableOpacity);

// Friendship tier label mapping
const TIER_LABELS: Record<string, string> = {
    new: 'New friend',
    good: 'Good friends',
    great: 'Great friends',
    best: 'Best friends',
};

// Friendship tier colors
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
    new: { bg: '#F1F5F9', text: '#64748B' },
    good: { bg: '#E0F2FE', text: '#0284C7' },
    great: { bg: '#DDD6FE', text: '#7C3AED' },
    best: { bg: '#FEF3C7', text: '#D97706' },
};

/**
 * Get streak visual treatment based on streak length
 */
const getStreakDisplay = (streakDays: number) => {
    if (streakDays >= STREAK_TIERS.CROWN) return { emoji: '🔥', suffix: '👑' };
    if (streakDays >= STREAK_TIERS.DIAMOND) return { emoji: '🔥', suffix: '💎' };
    if (streakDays >= STREAK_TIERS.STAR) return { emoji: '🔥', suffix: '💫' };
    if (streakDays >= STREAK_TIERS.SPARKLE) return { emoji: '🔥', suffix: '✨' };
    return { emoji: '🔥', suffix: null };
};

/**
 * Get karma stars based on assist count
 */
const getKarmaStars = (assists: number): string => {
    if (assists >= KARMA_TIERS.THREE_STARS_SPARKLE) return '⭐⭐⭐✨';
    if (assists >= KARMA_TIERS.THREE_STARS) return '⭐⭐⭐';
    if (assists >= KARMA_TIERS.TWO_STARS) return '⭐⭐';
    if (assists >= KARMA_TIERS.ONE_STAR) return '⭐';
    return '';
};

/**
 * Get karma color based on assist count
 */
const getKarmaColor = (assists: number): string => {
    if (assists >= KARMA_TIERS.THREE_STARS_SPARKLE) return COLORS.KARMA_DIAMOND;
    if (assists >= KARMA_TIERS.THREE_STARS) return COLORS.KARMA_GOLD;
    if (assists >= KARMA_TIERS.TWO_STARS) return COLORS.KARMA_SILVER;
    if (assists >= KARMA_TIERS.ONE_STAR) return COLORS.KARMA_BRONZE;
    return COLORS.KARMA_GRAY;
};

interface FriendCardProps {
    friend: FriendWithGridStatus | any; // Support both types
    variant?: 'pending' | 'completed';
    onPress?: () => void;
    onActionPress?: () => void;
    onAvatarPress?: () => void;
    // Compatibility props
    onHelpMatch?: () => void;
    onMessage?: () => void;
    onViewProfile?: () => void;
}

export const FriendCard = React.memo<FriendCardProps>(({
    friend,
    variant = 'pending',
    onPress,
    onActionPress,
    onAvatarPress,
    onHelpMatch,
    onMessage,
    onViewProfile
}) => {
    // Normalize data
    const name = friend.friend?.firstName || friend.name || 'Friend';
    const photoUrl = friend.friend?.photos?.[0]?.url || friend.photoUrl || 'https://via.placeholder.com/100';
    const streak = friend.streakDays ?? friend.streak ?? 0;
    const tier = friend.friendshipTier || 'new';
    const assists = friend.karmaScore?.totalAssists ?? friend.assistsCount ?? 0;

    const handleAvatarPress = () => {
        lightHaptic();
        if (onAvatarPress) onAvatarPress();
        else if (onViewProfile) onViewProfile();
    };

    const handleMainPress = () => {
        lightHaptic();
        if (onPress) onPress();
        else if (onMessage) onMessage();
    };

    const handleActionPress = () => {
        lightHaptic();
        if (onActionPress) onActionPress();
        else if (onHelpMatch) onHelpMatch();
    };

    const tierColors = TIER_COLORS[tier] || TIER_COLORS.new;
    const streakDisplay = streak > 0 ? getStreakDisplay(streak) : null;
    const karmaStars = variant === 'completed' ? getKarmaStars(assists) : null;
    const karmaColor = variant === 'completed' ? getKarmaColor(assists) : undefined;

    return (
        <StyledView
            style={[
                styles.container,
                { backgroundColor: variant === 'completed' ? COLORS.COMPLETED_BG : COLORS.PENDING_BG }
            ]}
        >
            {/* Avatar */}
            <StyledTouchable onPress={handleAvatarPress} activeOpacity={0.7}>
                <StyledView style={styles.avatarContainer}>
                    <StyledImage
                        source={{ uri: photoUrl }}
                        style={[
                            styles.avatar,
                            { borderColor: variant === 'pending' ? '#EFF6FF' : '#F0FDF4' }
                        ]}
                    />
                </StyledView>
            </StyledTouchable>

            {/* Info Content */}
            <StyledTouchable
                onPress={handleMainPress}
                activeOpacity={0.7}
                style={styles.infoContainer}
            >
                <StyledView style={styles.nameRow}>
                    <StyledText numberOfLines={1} style={styles.nameText}>
                        {name}
                    </StyledText>
                </StyledView>

                <StyledView style={styles.metaRow}>
                    {streakDisplay && (
                        <StyledView style={styles.streakContainer}>
                            <StyledText style={styles.streakEmoji}>{streakDisplay.emoji}</StyledText>
                            <StyledText style={styles.streakCount}>{streak}</StyledText>
                            {streakDisplay.suffix && (
                                <StyledText style={styles.streakSuffix}>{streakDisplay.suffix}</StyledText>
                            )}
                        </StyledView>
                    )}

                    <StyledView
                        style={[
                            styles.tierBadge,
                            { backgroundColor: tierColors.bg, borderColor: tierColors.text + '20' }
                        ]}
                    >
                        <StyledText style={[styles.tierText, { color: tierColors.text }]}>
                            {TIER_LABELS[tier] || tier}
                        </StyledText>
                    </StyledView>
                </StyledView>
            </StyledTouchable>

            {/* Action/Score Area */}
            <StyledView style={styles.actionContainer}>
                {variant === 'pending' ? (
                    <StyledTouchable
                        onPress={handleActionPress}
                        activeOpacity={0.75}
                        style={styles.voteButton}
                    >
                        <StyledText style={styles.voteButtonText}>Vote</StyledText>
                    </StyledTouchable>
                ) : (
                    <StyledView style={styles.karmaContainer}>
                        <StyledText style={[styles.karmaText, { color: karmaColor }]}>
                            {assists}
                        </StyledText>
                        {karmaStars && (
                            <StyledText style={styles.starsText}>{karmaStars}</StyledText>
                        )}
                    </StyledView>
                )}
            </StyledView>
        </StyledView>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        minHeight: 84,
    },
    avatarContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        backgroundColor: '#F3F4F6',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 14,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    streakEmoji: {
        fontSize: 13,
    },
    streakCount: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginLeft: 3,
    },
    streakSuffix: {
        fontSize: 13,
        marginLeft: 2,
    },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    actionContainer: {
        marginLeft: 12,
        minWidth: 70,
        alignItems: 'flex-end',
    },
    voteButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    voteButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    karmaContainer: {
        alignItems: 'flex-end',
    },
    karmaText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    starsText: {
        fontSize: 14,
        marginTop: 1,
        letterSpacing: -1,
    },
});

export default FriendCard;
