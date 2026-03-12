import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import { CheckmarkIcon, HourglassIcon, ChatIcon, HeartsIcon, ArrowRightIcon, QuestionIcon } from '../icons/Icons';
import { FONTS } from '../../constants/typography';
import { SHADOWS, glowShadow } from '../../theme/shadows';

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
    active_match:  { label: 'Active Match',       bg: '#34C759',  Icon: CheckmarkIcon },
    awaiting_you:  { label: 'They said yes!',     bg: '#34C759',  Icon: CheckmarkIcon },
    awaiting_them: { label: 'You said yes',       bg: '#2B65F9',  Icon: CheckmarkIcon },
    no_match:      { label: 'No match',           bg: '#8E8E93',  Icon: HourglassIcon },
    new_match:     { label: 'New Match',          bg: '#2B65F9',  Icon: HeartsIcon },
};

// Bottom pills — rendered top-to-bottom in the order listed
const BOTTOM_PILLS: Record<MatchStatus, Array<{ label: string; bg: string; Icon?: React.FC<any> }>> = {
    active_match:  [],
    awaiting_you:  [
        { label: "They're interested",       bg: 'rgba(52, 199, 89, 0.55)',  Icon: CheckmarkIcon },
        { label: "It's your turn to decide", bg: 'rgba(43, 101, 249, 0.75)', Icon: ArrowRightIcon },
    ],
    awaiting_them: [
        { label: 'You voted yes',            bg: 'rgba(52, 199, 89, 0.55)',  Icon: CheckmarkIcon },
        { label: 'Waiting on their answer',  bg: 'rgba(255, 255, 255, 0.18)', Icon: HourglassIcon },
    ],
    new_match:     [
        { label: 'Your friends picked someone', bg: 'rgba(43, 101, 249, 0.75)', Icon: HeartsIcon },
    ],
    no_match:      [
        { label: 'No match',                bg: 'rgba(142, 142, 147, 0.35)', Icon: HourglassIcon },
    ],
};

// Per-state gradient — richer for active match, subtler for others
const GRADIENT_CONFIG = {
    active_match: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.15)', 'rgba(9, 18, 46, 0.5)', 'rgba(9, 18, 46, 0.72)'] as const,
        locations: [0.25, 0.5, 0.72, 1.0] as const,
    },
    awaiting_you: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.2)', 'rgba(9, 18, 46, 0.55)'] as const,
        locations: [0.35, 0.65, 1.0] as const,
    },
    awaiting_them: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.18)', 'rgba(9, 18, 46, 0.5)'] as const,
        locations: [0.35, 0.65, 1.0] as const,
    },
    new_match: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.2)', 'rgba(9, 18, 46, 0.55)'] as const,
        locations: [0.35, 0.65, 1.0] as const,
    },
    no_match: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.3)', 'rgba(9, 18, 46, 0.55)'] as const,
        locations: [0.4, 0.65, 1.0] as const,
    },
} as const;

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
    onShare?: () => void;
}

// "Matched by" for active, "Picked by" for proposals
const ENDORSER_LABEL: Record<MatchStatus, string> = {
    active_match:  'Matched by',
    awaiting_you:  'Picked by',
    awaiting_them: 'Picked by',
    new_match:     'Picked by',
    no_match:      'Matched by',
};

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
    onShare,
}) => {
    const topBadge = TOP_BADGE_CONFIG[status];
    const bottomPills = BOTTOM_PILLS[status];
    const gradient = GRADIENT_CONFIG[status];
    const isActiveMatch = status === 'active_match';
    const isAwaitingYou = status === 'awaiting_you';
    const endorserLabel = ENDORSER_LABEL[status];
    const optimizedImageUrl = useMemo(() => getOptimizedImageUrl(imageUrl, 400), [imageUrl]);

    // Gentle pulse on the action button for active match — draws the eye to chat
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!isActiveMatch) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => { loop.stop(); pulseAnim.setValue(1); };
    }, [isActiveMatch, pulseAnim]);

    return (
        <View style={[styles.card, isActiveMatch && styles.cardActive]}>
            <ImageBackground
                source={{ uri: optimizedImageUrl }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={200}
                cachePolicy="disk"
            >
                <LinearGradient
                    colors={gradient.colors}
                    locations={gradient.locations}
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
                            <TouchableOpacity onPress={onDismiss} style={styles.dismissButton} activeOpacity={0.8}>
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

                        {/* Endorser / matched-by row */}
                        {matchedByAvatars.length > 0 && (
                            <View style={styles.matchedByRow}>
                                <HeartsIcon size={18} color="#00C8B3" />
                                <Text style={styles.matchedByText}>{endorserLabel}</Text>
                                <View style={styles.avatarRow}>
                                    {matchedByAvatars.slice(0, 3).map((url, i) => {
                                        const optimizedAvatarUrl = getOptimizedImageUrl(url, 26);
                                        return (
                                            <Image
                                                key={i}
                                                source={{ uri: optimizedAvatarUrl }}
                                                style={[styles.avatarCircle, { marginLeft: i === 0 ? 0 : -8 }]}
                                                contentFit="cover"
                                                transition={200}
                                                cachePolicy="disk"
                                            />
                                        );
                                    })}
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

            {/* Share button — only for active match */}
            {isActiveMatch && onShare && (
                <TouchableOpacity
                    onPress={onShare}
                    style={styles.shareButton}
                    activeOpacity={0.8}
                >
                    <Ionicons name="share-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {/* Action button — contextual per state */}
            <Animated.View style={[
                styles.actionButtonWrap,
                isActiveMatch && { transform: [{ scale: pulseAnim }] },
            ]}>
                <TouchableOpacity
                    onPress={onPress}
                    style={[
                        styles.actionButton,
                        isActiveMatch && styles.actionButtonChat,
                        isAwaitingYou && styles.actionButtonHighlight,
                    ]}
                    activeOpacity={0.85}
                >
                    {isActiveMatch ? (
                        <ChatIcon size={24} color="#FFFFFF" />
                    ) : (
                        <ArrowRightIcon size={22} color={isAwaitingYou ? '#FFFFFF' : '#010101'} />
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
        ...SHADOWS.xl,
    },
    // Active match gets a colored glow
    cardActive: {
        ...glowShadow('#34C759', 'strong'),
    },
    cardInner: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 14,
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
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
    },
    topBadgeText: {
        color: '#FFFFFF',
        fontFamily: FONTS.bold,
        fontSize: 16,
        lineHeight: 20,
    },
    dismissButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.18)',
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
        paddingBottom: 18,
        paddingRight: 80,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 8,
    },
    pillText: {
        color: '#FFFFFF',
        fontFamily: FONTS.semiBold,
        fontSize: 15,
        lineHeight: 19,
    },
    nameText: {
        color: '#FFFFFF',
        fontFamily: FONTS.extraBold,
        fontWeight: '700',
        fontSize: 32,
        lineHeight: 38,
        letterSpacing: -0.5,
        // Subtle text shadow so name pops off any photo
        textShadowColor: 'rgba(0, 0, 0, 0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    matchedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    matchedByText: {
        color: '#FFFFFF',
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.medium,
        fontSize: 16,
        lineHeight: 20,
    },
    // Share button — top-right, next to dismiss (right: 16 + 32 dismiss + 10 gap = 58)
    shareButton: {
        position: 'absolute',
        right: 58,
        top: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    // Wrapper for positioning (Animated.View needs this separate from the button)
    actionButtonWrap: {
        position: 'absolute',
        right: 16,
        bottom: 18,
    },
    // Default action button
    actionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.xl,
    },
    // Active match — blue chat button with glow
    actionButtonChat: {
        backgroundColor: '#2B65F9',
        shadowColor: '#2B65F9',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    // Awaiting you — highlighted blue CTA
    actionButtonHighlight: {
        backgroundColor: '#2B65F9',
        shadowColor: '#2B65F9',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
    },
});
