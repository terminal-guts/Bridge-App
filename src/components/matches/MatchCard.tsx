import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    cancelAnimation,
    Easing,
} from 'react-native-reanimated';
import { SPRINGS, DURATIONS, PRESS_SCALES } from '../../constants/animations';
import { Image, ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { CheckmarkIcon, HourglassIcon, HeartsIcon, ArrowRightIcon, GiftIcon } from '../icons/Icons';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS, glowShadow, DEPTH_PRESS_FACTOR } from '../../theme/shadows';
import { EvaIcon } from '../icons';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export type MatchStatus =
    | 'active_match'
    | 'awaiting_you'
    | 'awaiting_them'
    | 'no_match'
    | 'new_match';

// Top-left badge — always GREEN (state confirmation)
const TOP_BADGE_CONFIG: Record<MatchStatus, { label: string; bg: string; Icon?: React.FC<any> }> = {
    active_match:  { label: 'Active Match',   bg: COLORS.success, Icon: CheckmarkIcon },
    awaiting_you:  { label: 'They said yes!', bg: COLORS.success, Icon: CheckmarkIcon },
    awaiting_them: { label: 'You said yes',   bg: COLORS.success, Icon: CheckmarkIcon },
    new_match:     { label: 'New Match',      bg: COLORS.success, Icon: HeartsIcon },
    no_match:      { label: 'Still looking',   bg: COLORS.systemGray, Icon: HourglassIcon },
};

// Bottom pill — always BLUE (action/context)
const BOTTOM_PILLS: Record<MatchStatus, Array<{ label: string; bg: string; Icon?: React.FC<any> }>> = {
    active_match:  [
        { label: 'Start the conversation', bg: 'rgba(43, 101, 249, 0.75)', Icon: ({ size = 14, color = COLORS.card }: { size?: number; color?: string }) => <EvaIcon name="message-square" variant="outline" size={size} color={color} /> },
    ],
    awaiting_you:  [
        { label: "It's your turn to decide", bg: 'rgba(43, 101, 249, 0.75)', Icon: ({ size = 14, color = COLORS.card }: { size?: number; color?: string }) => <EvaIcon name="bulb" variant="outline" size={size} color={color} /> },
    ],
    awaiting_them: [
        { label: 'They\'re thinking it over', bg: 'rgba(43, 101, 249, 0.75)', Icon: HourglassIcon },
    ],
    new_match:     [
        { label: 'Your friends found someone for you', bg: 'rgba(43, 101, 249, 0.75)', Icon: GiftIcon },
    ],
    no_match:      [
        { label: 'Still looking', bg: 'rgba(142, 142, 147, 0.35)', Icon: HourglassIcon },
    ],
};

// #1 — Cinematic 4-stop gradient for all states
const GRADIENT_CONFIG = {
    active_match: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.08)', 'rgba(9, 18, 46, 0.48)', 'rgba(9, 18, 46, 0.78)'] as const,
        locations: [0.15, 0.4, 0.68, 1.0] as const,
    },
    awaiting_you: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.06)', 'rgba(9, 18, 46, 0.45)', 'rgba(9, 18, 46, 0.75)'] as const,
        locations: [0.15, 0.4, 0.68, 1.0] as const,
    },
    awaiting_them: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.06)', 'rgba(9, 18, 46, 0.42)', 'rgba(9, 18, 46, 0.72)'] as const,
        locations: [0.15, 0.4, 0.68, 1.0] as const,
    },
    new_match: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.06)', 'rgba(9, 18, 46, 0.45)', 'rgba(9, 18, 46, 0.75)'] as const,
        locations: [0.15, 0.4, 0.68, 1.0] as const,
    },
    no_match: {
        colors: ['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.1)', 'rgba(9, 18, 46, 0.45)', 'rgba(9, 18, 46, 0.7)'] as const,
        locations: [0.2, 0.45, 0.7, 1.0] as const,
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
    imageBlurhash?: string;
    matchedByAvatars: string[];
    hasUnread?: boolean;
    celebrate?: boolean;
    messagePreview?: string;
    onPress?: () => void;
    onDismiss?: () => void;
    onShare?: () => void;
}

// Always "Matched by" — friends drove the match in every state
const ENDORSER_LABEL: Record<MatchStatus, string> = {
    active_match:  'Matched by',
    awaiting_you:  'Matched by',
    awaiting_them: 'Matched by',
    new_match:     'Matched by',
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
    imageBlurhash,
    matchedByAvatars,
    hasUnread,
    celebrate,
    messagePreview,
    onPress,
    onDismiss,
    onShare,
}) => {
    const topBadge = TOP_BADGE_CONFIG[status];
    const gradient = GRADIENT_CONFIG[status];
    const { height: windowHeight } = useWindowDimensions();

    // Responsive card internals -- scales proportionally from SE (667pt) to Pro Max (932pt)
    // Vignette: ~80px SE, ~120px Pro Max (protects badge legibility)
    const vignetteH = Math.round(Math.max(windowHeight * 0.13, 80));
    // Inner padding: ~14px SE, ~18px Pro Max
    const innerPadTop = Math.round(Math.max(windowHeight * 0.02, 12));
    // Bottom section: ~14px SE, ~18px Pro Max
    const bottomPadBottom = Math.round(Math.max(windowHeight * 0.02, 12));
    // Action button: ~48px SE, ~56px Pro Max (min 44px touch target)
    const actionSize = Math.round(Math.min(Math.max(windowHeight * 0.062, 44), 56));
    const actionRadius = Math.round(actionSize / 2);
    // Action button icon: proportional to button size
    const actionIconSize = Math.round(actionSize * 0.42);
    // Action button position: proportional bottom/right
    const actionBottom = Math.round(Math.max(windowHeight * 0.02, 14));
    const actionRight = Math.round(Math.max(windowHeight * 0.018, 12));
    // Bottom section right padding: clears the action button
    const bottomPadRight = actionSize + actionRight + 8;

    // For active matches with a message preview, replace the default pill label
    const bottomPills = (status === 'active_match' && messagePreview)
        ? [{ ...BOTTOM_PILLS.active_match[0], label: messagePreview.length > 40 ? messagePreview.slice(0, 40) + '…' : messagePreview }]
        : BOTTOM_PILLS[status];
    const isActiveMatch = status === 'active_match';
    const isAwaitingYou = status === 'awaiting_you';


    const endorserLabel = ENDORSER_LABEL[status];
    const optimizedImageUrl = useMemo(() => getOptimizedImageUrl(imageUrl, 400), [imageUrl]);

    // #5 — Slower pulse (1600ms) on the action button.
    // Only run when the card is in a state that requires user action; idle cards
    // (awaiting_them, no_match) don't need the animation and running it
    // unconditionally wastes CPU on every inactive card in the list.
    const requiresUserAction = status === 'awaiting_you' || status === 'new_match';
    const pulseAnim = useSharedValue(1);
    useEffect(() => {
        if (!requiresUserAction) {
            cancelAnimation(pulseAnim);
            pulseAnim.value = 1;
            return;
        }
        const pulseDuration = DURATIONS.emphasis * 2.5; // gentle, unhurried pulse
        pulseAnim.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) }),
            ), -1, false
        );
        return () => cancelAnimation(pulseAnim);
        // pulseAnim is a stable useSharedValue ref — intentionally omitted from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requiresUserAction]);

    // Entrance animation — fade + slide-up, only on status *changes* (not initial mount)
    const slideAnim = useSharedValue(0);
    const fadeAnim = useSharedValue(1);
    const prevStatusRef = useRef(status);
    useEffect(() => {
        if (prevStatusRef.current === status) return;
        prevStatusRef.current = status;
        slideAnim.value = 40;
        fadeAnim.value = 0;
        slideAnim.value = withSpring(0, SPRINGS.gentle);
        fadeAnim.value = withTiming(1, { duration: DURATIONS.slow });
    }, [status]);

    // #5 — Press scale with spring (snappy press-in, responsive release for depth spring-back)
    const pressScale = useSharedValue(1);
    const onPressIn = useCallback(() => {
        pressScale.value = withSpring(PRESS_SCALES.standard, SPRINGS.snappy);
    }, []);
    const onPressOut = useCallback(() => {
        pressScale.value = withSpring(1, SPRINGS.responsive);
    }, []);

    // #5 — Action button press scale (deeper bounce)
    const actionPressScale = useSharedValue(1);
    const onActionPressIn = useCallback(() => {
        actionPressScale.value = withSpring(PRESS_SCALES.pronounced, SPRINGS.bouncy);
    }, []);
    const onActionPressOut = useCallback(() => {
        actionPressScale.value = withSpring(1, SPRINGS.responsive);
    }, []);

    // Celebration bounce — compressed start, bouncy spring after entrance settles
    const celebrateScale = useSharedValue(1);
    useEffect(() => {
        if (celebrate) {
            celebrateScale.value = PRESS_SCALES.pronounced;
            const entranceDelay = DURATIONS.slow;
            const timer = setTimeout(() => {
                celebrateScale.value = withSpring(1, SPRINGS.bouncy);
            }, entranceDelay);
            return () => clearTimeout(timer);
        }
    }, [celebrate]);

    // Animated styles — includes shadow depth animation on press (iOS)
    const cardAnimStyle = useAnimatedStyle(() => {
        // Shadow sinks on press: reduce opacity and radius proportional to press
        const pressAmount = 1 - pressScale.value; // 0 at rest, ~0.04 when pressed
        const depthReduction = pressAmount * (DEPTH_PRESS_FACTOR / 0.04); // normalize to full factor
        const clampedReduction = Math.min(depthReduction, DEPTH_PRESS_FACTOR);
        return {
            opacity: fadeAnim.value,
            transform: [{ translateY: slideAnim.value }, { scale: pressScale.value * celebrateScale.value }],
            shadowOpacity: 0.18 * (1 - clampedReduction),
            shadowRadius: 24 * (1 - clampedReduction),
            shadowOffset: { width: 0, height: 8 * (1 - clampedReduction) },
        };
    });
    const actionBtnAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseAnim.value * actionPressScale.value }],
    }));

    // Top accent line color — matches the topBadge background
    const accentColor = topBadge.bg;

    return (
        <Animated.View style={[{ flex: 1 }, cardAnimStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={`${name}${age ? `, age ${age}` : ''}, ${topBadge.label}`}>
        <View style={[styles.card, isActiveMatch && styles.cardActive, isAwaitingYou && styles.cardAwaitingYou, status === 'new_match' && styles.cardNewMatch]}>
            {/* Top accent line — state color bar */}
            <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
            <ImageBackground
                source={{ uri: optimizedImageUrl }}
                placeholder={imageBlurhash ? { blurhash: imageBlurhash } : undefined}
                style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.backgroundGrayMedium }]}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={name}
            >
                {/* #3 — Top vignette for badge legibility on bright photos */}
                <LinearGradient
                    colors={['rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0.12)', 'rgba(0, 0, 0, 0)']}
                    locations={[0, 0.4, 1]}
                    style={[styles.topVignette, { height: vignetteH }]}
                />

                {/* #1 — Cinematic 4-stop bottom gradient */}
                <LinearGradient
                    colors={gradient.colors}
                    locations={gradient.locations}
                    style={StyleSheet.absoluteFillObject}
                />

                <View style={[styles.cardInner, { paddingTop: innerPadTop }]}>

                    {/* ── Top row: badge (left) + optional X dismiss button (right) ── */}
                    <View style={styles.topRow}>
                        {/* #7 — Frosted glass top badge (green tint) */}
                        <BlurView intensity={40} tint="dark" style={styles.topBadgeBlur}>
                            <View style={[styles.topBadgeInner, { backgroundColor: 'rgba(52, 199, 89, 0.55)' }]}>
                                {topBadge.Icon && <topBadge.Icon size={16} color={COLORS.card} />}
                                <Text style={styles.topBadgeText}>{topBadge.label}</Text>
                            </View>
                        </BlurView>
                        {isActiveMatch && (
                            <View style={styles.topActions}>
                                {onShare && (
                                    <TouchableOpacity onPress={onShare} style={styles.topActionBtn} activeOpacity={0.7} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel="Share match">
                                        <EvaIcon name="share" variant="outline" size={20} color={COLORS.card} />
                                    </TouchableOpacity>
                                )}
                                {onDismiss && (
                                    <TouchableOpacity onPress={onDismiss} style={styles.topActionBtn} activeOpacity={0.7} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel="End match">
                                        <EvaIcon name="close" variant="outline" size={18} color={COLORS.card} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Bottom block ── */}
                    <View style={[styles.bottomSection, { paddingBottom: bottomPadBottom, paddingRight: bottomPadRight }]}>

                        {/* #7 — Frosted glass bottom pills (blue tint) */}
                        {bottomPills.map((pill, i) => (
                            <BlurView key={i} intensity={35} tint="dark" style={styles.pillBlur}>
                                <View style={[styles.pillInner, { backgroundColor: 'rgba(43, 101, 249, 0.5)' }]}>
                                    {pill.Icon && <pill.Icon size={14} color={COLORS.card} />}
                                    <Text style={styles.pillText} numberOfLines={1}>{pill.label}</Text>
                                </View>
                            </BlurView>
                        ))}

                        {/* #2 — Name with tighter tracking */}
                        <View style={styles.nameRow}>
                            <Text style={styles.nameText} numberOfLines={1}>{name}{age ? `, ${age}` : ''}</Text>
                            {hasUnread && <View style={styles.unreadDot} />}
                        </View>

                        {/* #2 + #4 — Endorser row with polished avatars */}
                        <View style={styles.matchedByRow}>
                            <Text style={styles.matchedByText}>{endorserLabel}</Text>
                            <View style={styles.avatarRow}>
                                {matchedByAvatars.length > 0
                                    ? matchedByAvatars.slice(0, 3).map((url, i) => {
                                        const optimizedAvatarUrl = getOptimizedImageUrl(url, 28);
                                        return (
                                            <View key={i} style={[styles.avatarShadowWrap, { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }]}>
                                                <Image
                                                    source={{ uri: optimizedAvatarUrl }}
                                                    style={[styles.avatarCircle, { backgroundColor: COLORS.backgroundGrayMedium }]}
                                                    contentFit="cover"
                                                    transition={0}
                                                    cachePolicy="memory-disk"
                                                />
                                            </View>
                                        );
                                    })
                                    : [0, 1, 2].map((_, i) => (
                                        <View key={i} style={[styles.avatarShadowWrap, styles.avatarCircle, { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i, backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                                    ))
                                }
                            </View>
                        </View>

                        {/* #2 — Date in smaller, lighter style */}
                        {matchDate && (
                            <Text style={styles.dateText}>{matchDate}</Text>
                        )}

                    </View>
                </View>
            </ImageBackground>

            {/* #5 + #6 — Action button with press state, neutral shadow, slow pulse */}
            <Animated.View style={[
                styles.actionButtonWrap,
                { right: actionRight, bottom: actionBottom },
                actionBtnAnimStyle,
            ]}>
                <Pressable onPress={onPress} onPressIn={onActionPressIn} onPressOut={onActionPressOut}>
                    <View style={[styles.actionButton, styles.actionButtonBlue, { width: actionSize, height: actionSize, borderRadius: actionRadius }]}>
                        {isActiveMatch ? (
                            <EvaIcon name="paper-plane" variant="outline" size={actionIconSize} color={COLORS.card} />
                        ) : (
                            <ArrowRightIcon size={Math.round(actionIconSize * 0.92)} color={COLORS.card} />
                        )}
                    </View>
                </Pressable>
            </Animated.View>
        </View>
        </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#000',
        // #6 — Neutral black shadow (replaces warm brown SHADOWS.xl)
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
    // Active match gets a colored glow
    cardActive: {
        ...glowShadow(COLORS.success, 'strong'),
    },
    // Awaiting you — blue glow to draw attention
    cardAwaitingYou: {
        ...glowShadow(COLORS.primaryButton, 'medium'),
    },
    // New match — subtle blue glow
    cardNewMatch: {
        ...glowShadow(COLORS.primaryButton, 'subtle'),
    },
    // Top accent line — 3px state color bar
    accentLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10,
    },
    // #3 — Top vignette overlay for badge legibility
    topVignette: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        zIndex: 1,
    },
    cardInner: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 18,
        justifyContent: 'space-between',
        zIndex: 2,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    // #7 — Frosted glass badge wrapper
    topBadgeBlur: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    topBadgeInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 5,
    },
    topBadgeText: {
        color: COLORS.card,
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.base,
        lineHeight: LINE_HEIGHTS.base,
    },
    // Grouped share + dismiss buttons for active match
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    topActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.overlay.light,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    bottomSection: {
        gap: 6,
        paddingBottom: 18,
        paddingRight: 80,
    },
    // #7 — Frosted glass pill wrapper
    pillBlur: {
        alignSelf: 'flex-start',
        borderRadius: 10,
        overflow: 'hidden',
    },
    pillInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 6,
    },
    // #2 — Pill text: 13px for visual hierarchy
    pillText: {
        color: COLORS.card,
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.md,
        lineHeight: LINE_HEIGHTS.md,
    },
    // #2 — Name: tighter letter spacing (-0.8), strong shadow
    nameText: {
        color: COLORS.card,
        fontFamily: FONTS.extraBold,
        fontSize: FONT_SIZES['6xl'],
        lineHeight: 36,
        letterSpacing: -0.8,
        textShadowColor: 'rgba(0, 0, 0, 0.45)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    matchedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    // #2 — "Picked by" text: 13px medium
    matchedByText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.md,
        lineHeight: LINE_HEIGHTS.md,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // #4 — Avatar shadow wrap for lift effect
    avatarShadowWrap: {
        ...SHADOWS.md,
    },
    // #4 — Avatars: 28px with tighter -8 overlap, 1.5px border
    avatarCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.9)',
        overflow: 'hidden',
        backgroundColor: COLORS.navInactiveIcon,
    },
    // #2 — Date: 12px, lighter opacity
    dateText: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        lineHeight: LINE_HEIGHTS.sm,
    },
    actionButtonWrap: {
        position: 'absolute',
        right: 16,
        bottom: 18,
    },
    // #6 — Neutral black shadow on action button
    actionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.xl,
    },
    // Unified blue action button with glow — all states
    actionButtonBlue: {
        backgroundColor: COLORS.primaryButton,
        ...SHADOWS.accentBlue,
    },
    nameRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primaryAccent,
        marginBottom: 4,
    },
});
