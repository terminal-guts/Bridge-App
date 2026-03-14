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
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { FriendWithGridStatus } from '../../types/community';
import { lightHaptic, warningHaptic } from '../../utils/haptics';
import {
    COLORS,
    STREAK_TIERS,
    KARMA_TIERS,
} from '../../constants/friendsArea';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SHADOWS } from '../../theme/shadows';
import { COLORS as THEME_COLORS } from '../../theme/colors';
import { EvaIcon } from '../icons';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = Image;
const StyledTouchable = styled(TouchableOpacity);


/**
 * Get streak visual treatment based on streak length
 */
const getStreakDisplay = (streakDays: number) => {
    if (streakDays >= STREAK_TIERS.CROWN) return { emoji: '', suffix: '' };
    if (streakDays >= STREAK_TIERS.DIAMOND) return { emoji: '', suffix: '' };
    if (streakDays >= STREAK_TIERS.STAR) return { emoji: '', suffix: '' };
    if (streakDays >= STREAK_TIERS.SPARKLE) return { emoji: '', suffix: '' };
    return { emoji: '', suffix: null };
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
    onStreakMilestone?: (days: number, friendName: string) => void;
    onBadgePress?: () => void;
    onRemoveFriend?: () => void;
}

export const FriendCard = React.memo<FriendCardProps>(({
    friend,
    variant = 'pending',
    onPress,
    onActionPress,
    onAvatarPress,
    onHelpMatch,
    onMessage,
    onViewProfile,
    onStreakMilestone,
    onBadgePress,
    onRemoveFriend,
}) => {
    // Normalize data
    const name = friend.friend?.firstName || friend.name || 'Friend';
    const photoUrl = friend.friend?.photos?.[0]?.url || friend.photoUrl || 'https://via.placeholder.com/100';
    const streak = friend.streakDays ?? friend.streak ?? 0;
    const points = friend.karmaScore?.karmaPoints ?? friend.karmaPoints ?? 0;

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

    const handleLongPress = () => {
        if (!onRemoveFriend) return;
        warningHaptic();
        Alert.alert(
            'Remove Friend',
            `Remove ${name}? They won't be notified.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemoveFriend },
            ],
        );
    };

    const streakDisplay = streak > 0 ? getStreakDisplay(streak) : null;

    return (
        <StyledTouchable
            activeOpacity={0.9}
            onLongPress={onRemoveFriend ? handleLongPress : undefined}
            delayLongPress={500}
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
                        cachePolicy="disk"
                        transition={200}
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

                </StyledView>
            </StyledTouchable>

            {/* Badge Button */}
            {onBadgePress && (
                <StyledTouchable
                    onPress={() => {
                        lightHaptic();
                        onBadgePress();
                    }}
                    activeOpacity={0.7}
                    style={styles.badgeButton}
                >
                    <EvaIcon name="award" variant="outline" size={20} color={THEME_COLORS.text.muted} />
                </StyledTouchable>
            )}

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
                        <StyledText style={[styles.karmaText, { color: THEME_COLORS.success }]}>
                            {points} pts
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>
        </StyledTouchable>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.borderSubtle,
        minHeight: 84,
    },
    avatarContainer: {
        ...SHADOWS.sm,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        backgroundColor: THEME_COLORS.backgroundGray,
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
        fontFamily: FONTS.bold,
        color: THEME_COLORS.text.primary,
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
        fontSize: FONT_SIZES.md,
    },
    streakCount: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        fontFamily: FONTS.semiBold,
        color: THEME_COLORS.text.muted,
        marginLeft: 3,
    },
    streakSuffix: {
        fontSize: FONT_SIZES.md,
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
        fontFamily: FONTS.bold,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    badgeButton: {
        padding: 6,
        marginLeft: 4,
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
        ...SHADOWS.accentBlue,
    },
    voteButtonText: {
        color: THEME_COLORS.card,
        fontSize: FONT_SIZES.base,
        fontWeight: '700',
        fontFamily: FONTS.bold,
    },
    karmaContainer: {
        alignItems: 'flex-end',
    },
    karmaText: {
        fontSize: FONT_SIZES['2xl'],
        fontWeight: '800',
        fontFamily: FONTS.extraBold,
        letterSpacing: -0.5,
    },
});

export default FriendCard;
