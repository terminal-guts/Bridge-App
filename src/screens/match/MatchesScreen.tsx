import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Modal, TextInput, Keyboard, TouchableWithoutFeedback, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import ReanimatedAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/matches/MatchCard';
import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal, MatchEndedEvent } from '../../types/community';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ClockIcon } from '../../components/icons/Icons';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { showToast } from '../../utils/toast';
import { lightHaptic, heavyHaptic, successHaptic } from '../../utils/haptics';
import { shareToMessages, shareGeneric } from '../../utils/shareMatch';
import { ShareMatchSheet } from '../../components/matches/ShareMatchSheet';
import { ShareableMatchCard } from '../../components/matches/ShareableMatchCard';
import { computeApprovalPercent } from '../../utils/matchCardGenerator';
import { getUnreadCount } from '../../services/messageService';
import { OVERLAYS } from '../../theme/shadows';
import { ScreenWrapper } from '../../components/ui';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { MatchesSkeleton } from '../../components/ui/SkeletonLoader';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { SPRINGS } from '../../constants/animations';
import { COLORS } from '../../theme/colors';

// Lottie animation for the empty-state illustration
const VALENTINE_COUPLE_ANIM = require('../../../assets/Icons/AnimatedIcons/valentine-couple.json');
const CONFETTI_ANIM = require('../../../assets/Icons/AnimatedIcons/confetti.json');

// One of five mutually exclusive states the screen can be in
type ScreenState =
    | 'active_match'    // Both said yes — show chat button
    | 'awaiting_you'    // They voted yes, you haven't responded
    | 'awaiting_them'   // You voted yes, waiting for them
    | 'neither_voted'   // Proposal exists, no one has voted yet
    | 'empty';          // Nothing at all

// Map screen state → MatchCard status prop
const CARD_STATUS: Record<Exclude<ScreenState, 'empty'>, import('../../components/matches/MatchCard').MatchStatus> = {
    active_match: 'active_match',
    awaiting_you: 'awaiting_you',
    awaiting_them: 'awaiting_them',
    neither_voted: 'new_match',
};

/** Pure helper — derive screen state from data (used in render + celebration check) */
function deriveScreenState(
    activeMatch: ActiveMatch | null,
    pendingProposals: MatchProposal[],
): ScreenState {
    if (activeMatch) return 'active_match';
    if (pendingProposals.length > 0) {
        const p = pendingProposals[0];
        const yours = p.yourDecision ?? 'pending';
        const theirs = p.partnerDecision ?? 'pending';
        if (yours === 'pending' && theirs !== 'pending') return 'awaiting_you';
        if (yours !== 'pending' && theirs === 'pending') return 'awaiting_them';
        return 'neither_voted';
    }
    return 'empty';
}

const END_MATCH_REASONS = [
    'Conversation fizzled',
    'No connection',
    'Not on same page',
    'Felt uncomfortable',
    'Bad timing',
    'Other',
];

function timerColor(hoursLeft: number): string {
    if (hoursLeft >= 24) return COLORS.success;
    if (hoursLeft >= 12) return COLORS.waitingAmber;
    if (hoursLeft >= 4)  return '#FF8D28';
    return '#FF3B30';
}

function timerBgColor(hoursLeft: number): string {
    if (hoursLeft >= 24) return 'rgba(52, 199, 89, 0.08)';
    if (hoursLeft >= 12) return 'rgba(212, 170, 1, 0.08)';
    if (hoursLeft >= 4)  return 'rgba(255, 141, 40, 0.08)';
    return 'rgba(255, 59, 48, 0.08)';
}

function timerBorderColor(hoursLeft: number): string {
    if (hoursLeft >= 24) return 'rgba(52, 199, 89, 0.25)';
    if (hoursLeft >= 12) return 'rgba(212, 170, 1, 0.25)';
    if (hoursLeft >= 4)  return 'rgba(255, 141, 40, 0.25)';
    return 'rgba(255, 59, 48, 0.25)';
}

function formatMatchDate(isoDate: string): string {
    return `Matched ${new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    })}`;
}

// ── Per-variant popup content ────────────────────────────────────────────────
function EndedMatchPopupContent({ event }: { event: MatchEndedEvent }) {
    const { type, partnerName, partnerPhotoUrl, endReason } = event;

    const config: Record<MatchEndedEvent['type'], { icon: string; headline: string; body: string }> = {
        expired: {
            icon: 'clock',
            headline: 'Your match expired',
            body: 'The proposal timed out before anyone decided. Stay active — your next match could come soon.',
        },
        you_rejected: {
            icon: 'smiling-face',
            headline: 'You passed',
            body: "That's totally okay — trust your instincts. Keep at it, the right fit is worth waiting for. Every pass brings you closer to someone great.",
        },
        they_rejected: {
            icon: 'heart',
            headline: "It didn't work out this time",
            body: "They decided to go a different direction. Your friends are still out there finding the right match for you.",
        },
        match_ended: {
            icon: 'activity',
            headline: 'A Fresh Start',
            body: "You're back in the matching pool. Your community is still here to help you find your next great connection.",
        },
    };

    const { icon, headline, body } = config[type];

    return (
        <View style={popupStyles.content}>
            <Text style={popupStyles.icon}>{icon}</Text>
            <Text style={popupStyles.headline}>{headline}</Text>
            {type === 'match_ended' && endReason ? (
                <View style={popupStyles.reasonBox}>
                    <Text style={popupStyles.reasonLabel}>{partnerName} wrote:</Text>
                    <Text style={popupStyles.reasonText}>"{endReason}"</Text>
                </View>
            ) : null}
            <Text style={popupStyles.body}>{body}</Text>
        </View>
    );
}

const popupStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 22,
        marginHorizontal: 32,
    },
    content: { alignItems: 'center' },
    icon: { fontSize: FONT_SIZES['6xl'], marginBottom: 10 },
    headline: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES['3xl'],
        color: '#101828',
        textAlign: 'center',
        marginBottom: 12,
    },
    reasonBox: {
        backgroundColor: COLORS.backgroundSubtle,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E4E7EC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
        marginBottom: 14,
    },
    reasonLabel: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.placeholder,
        marginBottom: 4,
        letterSpacing: 0.4,
    },
    reasonText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#344054',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    body: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#667085',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
        marginBottom: 20,
    },
    continueBtn: {
        backgroundColor: COLORS.primaryButton,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    continueBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.card,
    },
});

// Animated illustration for the empty state
function IllustrationAnimation() {
    return (
        <LottieView
            source={VALENTINE_COUPLE_ANIM}
            autoPlay
            loop
            style={styles.illustration}
        />
    );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export function MatchesScreen() {
    const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
    const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const [now, setNow] = useState(Date.now());
    const [endMatchModalVisible, setEndMatchModalVisible] = useState(false);
    const [timerInfoVisible, setTimerInfoVisible] = useState(false);
    const [endMatchReason, setEndMatchReason] = useState('');
    const [endMatchSubmitting, setEndMatchSubmitting] = useState(false);
    const [popupEvent, setPopupEvent] = useState<MatchEndedEvent | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [shareSheetVisible, setShareSheetVisible] = useState(false);
    const [shareImageUri, setShareImageUri] = useState<string | null>(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [hasUnreadMatch, setHasUnreadMatch] = useState(false);
    const [celebrationActive, setCelebrationActive] = useState(false);
    const confettiRef = useRef<LottieView>(null);
    const viewShotRef = useRef<ViewShot>(null);
    const cardEntrance = useSharedValue(0);
    const hasAnimatedEntrance = useRef(false);
    const cardEntranceStyle = useAnimatedStyle(() => ({
        opacity: cardEntrance.value,
        transform: [{ translateY: (1 - cardEntrance.value) * 24 }],
    }));
    const navigation = useNavigation<any>();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // All spacing proportional to screen height — scales across iPhone SE to Pro Max
    const headerPad = Math.round(windowHeight * 0.011);     // ~10pt — top breathing room
    const scrollMargin = Math.round(windowHeight * 0.009);  // ~8pt — gap between header and card
    const cardMB = Math.round(windowHeight * 0.018);        // ~16pt — card bottom to tab bar
    // Tab bar: matches locked CustomTabBar formula exactly (contentHeight + bottom safe area)
    const tabBarH = Math.round(windowHeight * 0.057) + insets.bottom;

    const headerTotal = headerPad + 38 + 8 + scrollMargin;  // headerPad + title lineHeight + paddingBottom + scrollMargin
    const activeCardHeight = windowHeight - insets.top - headerTotal - tabBarH - cardMB;

    // Tick every second only when showing the empty countdown — avoids re-renders during active match/proposal
    const needsTimer = !activeMatch && pendingProposals.length === 0;
    useFocusEffect(
        useCallback(() => {
            if (!needsTimer) return;
            setNow(Date.now());
            const id = setInterval(() => setNow(Date.now()), 1000);
            return () => clearInterval(id);
        }, [needsTimer])
    );

    const loadMatches = async () => {
        let data: Awaited<ReturnType<typeof communityService.getFriendsAreaData>> | null = null;
        try {
            // Fetch match data and profile in parallel
            const [fetchedData, profileResult] = await Promise.all([
                communityService.getFriendsAreaData(),
                getUserProfile(),
            ]);
            data = fetchedData;
            const currentUserId = profileResult.ok && profileResult.data ? profileResult.data.userId : null;
            if (isMountedRef.current && profileResult.ok && profileResult.data) setProfile(profileResult.data);
            if (!isMountedRef.current) return;
            setActiveMatch(data.activeMatch);
            setPendingProposals(data.pendingProposals || []);

            // Check for unread messages on active match
            if (data.activeMatch && currentUserId) {
                const matchId = data.activeMatch.matchId ?? data.activeMatch.id;
                if (matchId) {
                    getUnreadCount(matchId, currentUserId).then(result => {
                        if (isMountedRef.current) setHasUnreadMatch(result.ok && (result.data ?? 0) > 0);
                    }).catch(() => {});
                }
            } else {
                setHasUnreadMatch(false);
            }

            // Check for ended-match event after data load (detection runs inside getFriendsAreaData)
            const event = communityService.getEndedMatchEvent();
            if (event) {
                const seen = await AsyncStorage.getItem(`match_popup_seen_${event.eventId}`);
                if (!seen) {
                    setPopupEvent(event);
                } else {
                    communityService.clearEndedMatchEvent();
                }
            }
        } catch (error) {
            console.error('Failed to load match data', error);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                if (!hasAnimatedEntrance.current) {
                    hasAnimatedEntrance.current = true;
                    cardEntrance.value = 0;
                    cardEntrance.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
                }

                // ── Celebration check ────────────────────────────────
                if (!data) return;
                const state = deriveScreenState(data.activeMatch, data.pendingProposals || []);
                let celebrationKey: string | null = null;
                if (state === 'neither_voted' && data.pendingProposals?.[0]?.proposalId) {
                    celebrationKey = `celebration_new_match_${data.pendingProposals[0].proposalId}`;
                } else if (state === 'active_match' && data.activeMatch) {
                    const mId = data.activeMatch.matchId ?? data.activeMatch.id;
                    if (mId) celebrationKey = `celebration_active_match_${mId}`;
                }
                if (celebrationKey) {
                    const seen = await AsyncStorage.getItem(celebrationKey);
                    if (!seen) {
                        await AsyncStorage.setItem(celebrationKey, '1');
                        setCelebrationActive(true);
                        successHaptic();
                        if (state === 'neither_voted') {
                            setTimeout(() => heavyHaptic(), 200);
                        } else {
                            setTimeout(() => heavyHaptic(), 150);
                            setTimeout(() => heavyHaptic(), 300);
                        }
                        setTimeout(() => {
                            if (isMountedRef.current) setCelebrationActive(false);
                        }, 2800);
                    }
                }
            }
        }
    };

    useEffect(() => {
        loadMatches();
        return communityService.onStateChange(() => {
            setLoading(true);
            loadMatches();
        });
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadMatches();
        } finally {
            if (isMountedRef.current) setRefreshing(false);
        }
    }, []);

    // Reload match data + profile on each tab focus — skip if recently loaded
    useFocusEffect(
        useCallback(() => {
            const lastLoad = 'getLastFriendsAreaLoadTime' in communityService
                ? (communityService as any).getLastFriendsAreaLoadTime() : 0;
            if (Date.now() - lastLoad < 10_000) return; // data is fresh, skip
            loadMatches();
        }, []),
    );

    const handlePopupContinue = useCallback(async () => {
        if (!popupEvent) return;
        await AsyncStorage.setItem(`match_popup_seen_${popupEvent.eventId}`, '1');
        communityService.clearEndedMatchEvent();
        setPopupEvent(null);
    }, [popupEvent]);

    const [endMatchCustomReason, setEndMatchCustomReason] = useState('');

    const handleEndMatchConfirm = useCallback(async () => {
        if (!endMatchReason || endMatchSubmitting) return;
        const reason = endMatchReason === 'Other' ? endMatchCustomReason.trim() || 'Other' : endMatchReason;
        Keyboard.dismiss();
        setEndMatchSubmitting(true);
        const matchId = activeMatch?.matchId ?? activeMatch?.id ?? '';
        try {
            const partner = activeMatch?.partnerProfile;
            await communityService.endActiveMatch(matchId, reason, {
                name: partner?.firstName || 'Unknown',
                photoUrl: partner?.photos?.[0]?.url,
            });
            setEndMatchModalVisible(false);
            setEndMatchReason('');
            setEndMatchCustomReason('');
            // Show the ended-match popup immediately (useFocusEffect won't re-fire since we're already on this tab)
            const event = communityService.getEndedMatchEvent();
            if (event) setPopupEvent(event);
        } catch (error) {
            showToast.error('Could not end match', 'Check your connection and try again.');
        } finally {
            setEndMatchSubmitting(false);
        }
    }, [endMatchReason, endMatchCustomReason, endMatchSubmitting, activeMatch]);

    const handleSharePress = useCallback(async () => {
        // Debounce: ignore if already generating
        if (shareLoading || shareSheetVisible) return;
        heavyHaptic();
        setShareSheetVisible(true);
        setShareLoading(true);
        try {
            // Retry-based capture: wait for ViewShot to be ready (up to 2s)
            let uri: string | null = null;
            for (let attempt = 0; attempt < 8; attempt++) {
                if (!isMountedRef.current) return;
                if (viewShotRef.current?.capture) {
                    uri = await viewShotRef.current.capture();
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 250));
            }
            if (!uri) throw new Error('Card not ready');
            if (isMountedRef.current) setShareImageUri(uri);
        } catch (error) {
            showToast.error('Could not generate card', 'Try again later');
            if (isMountedRef.current) setShareSheetVisible(false);
        } finally {
            if (isMountedRef.current) setShareLoading(false);
        }
    }, [activeMatch, shareLoading, shareSheetVisible]);

    const handleCloseShareSheet = useCallback(() => {
        // Clean up temp image file after a delay — user may still be in a system share sheet
        const uri = shareImageUri;
        setShareSheetVisible(false);
        setShareImageUri(null);
        if (uri) {
            setTimeout(async () => {
                try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
            }, 10000);
        }
    }, [shareImageUri]);



    const handleShareSnapchat = useCallback(() => {
        // Snapchat doesn't have a reliable deep-link for stickers — use system share
        if (shareImageUri) shareGeneric(shareImageUri);
    }, [shareImageUri]);

    const handleShareMessages = useCallback(() => {
        if (shareImageUri) shareToMessages(shareImageUri);
    }, [shareImageUri]);

    const handleShareMore = useCallback(() => {
        if (shareImageUri) shareGeneric(shareImageUri);
    }, [shareImageUri]);

    const handleSaveToPhotos = useCallback(async () => {
        if (!shareImageUri) return;
        try {
            const MediaLibrary = await import('expo-media-library');
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showToast.error('Permission needed', 'Allow photo access to save');
                return;
            }
            await MediaLibrary.saveToLibraryAsync(shareImageUri);
            lightHaptic();
            showToast.success('Saved', 'Match card saved to your photos');
        } catch {
            showToast.error('Could not save', 'Try again later');
        }
    }, [shareImageUri]);

    // ── Empty state countdown — time until next 7 PM Central ────────────────
    // NOTE: Must be above the early return to preserve hook order
    // DST offset only changes twice a year — compute once on mount
    const centralOffsetMs = useMemo(() => {
        const year = new Date().getUTCFullYear();
        const marchSecondSun = new Date(Date.UTC(year, 2, 8));
        marchSecondSun.setUTCDate(8 + (7 - marchSecondSun.getUTCDay()) % 7);
        const novFirstSun = new Date(Date.UTC(year, 10, 1));
        novFirstSun.setUTCDate(1 + (7 - novFirstSun.getUTCDay()) % 7);
        const isDST = Date.now() >= marchSecondSun.getTime() && Date.now() < novFirstSun.getTime();
        return isDST ? -5 * 3600000 : -6 * 3600000;
    }, []);

    const emptyCountdown = useMemo(() => {
        const centralNow = new Date(now + centralOffsetMs);
        const centralHour = centralNow.getUTCHours();

        // Next 7 PM Central in UTC
        const next7pm = new Date(centralNow);
        next7pm.setUTCHours(19, 0, 0, 0);
        if (centralHour >= 19) {
            next7pm.setUTCDate(next7pm.getUTCDate() + 1);
        }
        const diffMs = next7pm.getTime() - centralOffsetMs - now;
        if (diffMs <= 0) return null;

        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    }, [now, centralOffsetMs]);

    if (loading && !popupEvent) {
        return (
            <ScreenWrapper>
                <MatchesSkeleton />
            </ScreenWrapper>
        );
    }

    // ── Determine the single current state ─────────────────────────────────
    let screenState: ScreenState = 'empty';
    let currentProposal: MatchProposal | null = null;

    if (activeMatch) {
        screenState = 'active_match';
    } else if (pendingProposals.length > 0) {
        currentProposal = pendingProposals[0];
        const yourDecision = currentProposal.yourDecision ?? 'pending';
        const partnerDecision = currentProposal.partnerDecision ?? 'pending';

        if (yourDecision === 'pending' && partnerDecision !== 'pending') {
            screenState = 'awaiting_you';
        } else if (yourDecision !== 'pending' && partnerDecision === 'pending') {
            screenState = 'awaiting_them';
        } else {
            screenState = 'neither_voted';
        }
    }

    // ── Empty state ─────────────────────────────────────────────────────────
    if (screenState === 'empty') {
        return (
            <ScreenWrapper>
                <ProfileCompletionBanner
                    profile={profile}
                    onPress={() => navigation.navigate('Profile')}
                />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Match</Text>
                </View>
                <ScrollView
                    contentContainerStyle={styles.emptyContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primaryButton} />
                    }
                >
                    <IllustrationAnimation />
                    <Text style={styles.tagline}>Your friends are on it</Text>
                    <Text style={styles.subtitle}>Help them out and they'll return the favor</Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('Community')}
                    >
                        <Text style={styles.ctaText}>Vote for Your Friends</Text>
                    </TouchableOpacity>
                    {emptyCountdown && (
                        <View style={stateStyles.countdownRow}>
                            <ClockIcon size={13} color={COLORS.text.light} />
                            <Text style={stateStyles.countdownText}>New proposals in {emptyCountdown}</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Ended Match Popup — must render here so it persists over empty state */}
                <Modal
                    visible={!!popupEvent}
                    transparent
                    animationType="fade"
                    onRequestClose={handlePopupContinue}
                >
                    <View style={popupStyles.overlay}>
                        <View style={popupStyles.card}>
                            {popupEvent && <EndedMatchPopupContent event={popupEvent} />}
                            <TouchableOpacity style={popupStyles.continueBtn} onPress={handlePopupContinue} activeOpacity={0.85}>
                                <Text style={popupStyles.continueBtnText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScreenWrapper>
        );
    }

    // ── Countdown timer ─────────────────────────────────────────────────────
    const expiryTs: number | null = (() => {
        if (screenState === 'active_match') {
            const exp = activeMatch?.expiresAt;
            return exp ? new Date(exp).getTime() : null;
        }
        return currentProposal?.expiresAt ? new Date(currentProposal.expiresAt).getTime() : null;
    })();

    let timerLabel: string | null = null;
    let timerClr = COLORS.success;
    let timerBg = 'rgba(52, 199, 89, 0.08)';
    let timerBdrClr = 'rgba(52, 199, 89, 0.25)';
    if (expiryTs) {
        const diffMs = expiryTs - now;
        if (diffMs > 0) {
            const totalHours = diffMs / 3600000;
            const h = Math.floor(totalHours);
            const m = Math.floor((diffMs % 3600000) / 60000);
            const s = Math.floor((diffMs % 60000) / 1000);
            timerLabel = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
            timerClr = timerColor(totalHours);
            timerBg = timerBgColor(totalHours);
            timerBdrClr = timerBorderColor(totalHours);
        }
    }

    // Card communicates all state info — no subtitle or badge needed in header
    const adjustedCardHeight = activeCardHeight;

    // ── Build card props ────────────────────────────────────────────────────
    const partner =
        screenState === 'active_match'
            ? activeMatch!.partnerProfile
            : currentProposal!.partnerProfile;

    const partnerPhoto = partner?.photos?.[0]?.url || '';
    const partnerName = partner?.firstName || 'Unknown';
    const partnerAge = partner?.age;

    const endorsers = screenState === 'active_match'
        ? activeMatch?.endorsers
        : currentProposal?.endorsers;

    const endorserAvatars = endorsers
        ?.map((e: any) => e.endorserProfile?.photos?.[0]?.url)
        .filter(Boolean) ?? [];

    const endorserNames = endorsers
        ?.map((e: any) => e.endorserProfile?.firstName)
        .filter(Boolean) ?? [];

    // Date label — context-appropriate per state
    const matchDate: string = (() => {
        if (screenState === 'active_match') {
            return formatMatchDate(activeMatch!.matchedAt);
        }
        const ref = currentProposal?.approvedAt || currentProposal?.expiresAt;
        if (!ref) return '';
        const dateStr = new Date(ref).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `Proposed ${dateStr}`;
    })();

    const handleCardPress = () => {
        if (screenState === 'active_match') {
            const match = activeMatch!;
            navigation.navigate('Chat', {
                matchId: match.matchId ?? match.id,
                recipientName: partnerName,
                recipientId: partner?.userId ?? partner?.id,
                recipientPhoto: partnerPhoto,
            });
        } else {
            navigation.navigate('ProposalProfile', {
                partnerProfile: currentProposal!.partnerProfile,
                communityScore: computeApprovalPercent(currentProposal!.proposalId || ''),
                endorsers: currentProposal!.endorsers ?? [],
                screenState,
                proposalId: currentProposal!.proposalId,
            });
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
            {/* Safe area spacer so OfflineBanner sits below the status bar */}
            <View style={{ paddingTop: insets.top, backgroundColor: COLORS.screenBackground }}>
                <OfflineBanner />
            </View>
            {screenState !== 'active_match' && (
                <ProfileCompletionBanner
                    profile={profile}
                    onPress={() => navigation.navigate('Profile')}
                />
            )}
            {/* Header: "Match" + timer on one row, subtitle below */}
            <View style={[styles.headerRow, { paddingTop: headerPad }]}>
                <Text style={styles.headerTitle}>Match</Text>
                {timerLabel && screenState !== 'active_match' && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setTimerInfoVisible(true)}>
                        <View style={[styles.timerBadge, { backgroundColor: timerBg, borderColor: timerBdrClr }]}>
                            <ClockIcon size={13} color={timerClr} />
                            <Text style={[styles.timerText, { color: timerClr }]}>{timerLabel}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={{ flex: 1, paddingHorizontal: 16, marginTop: scrollMargin }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primaryButton} />
                }
            >
                <ReanimatedAnimated.View style={[{ marginBottom: cardMB, height: adjustedCardHeight }, cardEntranceStyle]}>
                    <MatchCard
                        status={CARD_STATUS[screenState as Exclude<ScreenState, 'empty'>]}
                        name={partnerName}
                        age={partnerAge}
                        matchDate={matchDate}
                        imageUrl={partnerPhoto}
                        matchedByAvatars={endorserAvatars}
                        hasUnread={hasUnreadMatch}
                        celebrate={celebrationActive}
                        onPress={handleCardPress}
                        onDismiss={screenState === 'active_match' ? () => setEndMatchModalVisible(true) : undefined}
                        onShare={screenState === 'active_match' ? handleSharePress : undefined}
                    />
                </ReanimatedAnimated.View>
            </ScrollView>

            {/* ── Confetti celebration overlay ─────────────────────────────── */}
            {celebrationActive && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <LottieView
                        ref={confettiRef}
                        source={CONFETTI_ANIM}
                        autoPlay
                        loop={false}
                        style={{ flex: 1 }}
                        speed={1}
                    />
                </View>
            )}

            {/* ── Ended Match Popup ────────────────────────────────────────── */}
            <Modal
                visible={!!popupEvent}
                transparent
                animationType="fade"
                onRequestClose={handlePopupContinue}
            >
                <View style={popupStyles.overlay}>
                    <View style={popupStyles.card}>
                        {popupEvent && <EndedMatchPopupContent event={popupEvent} />}
                        <TouchableOpacity style={popupStyles.continueBtn} onPress={handlePopupContinue} activeOpacity={0.85}>
                            <Text style={popupStyles.continueBtnText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── End Match Modal (top-sheet style) ─────────────────────── */}
            <Modal
                visible={endMatchModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={tsStyles.overlay}
                >
                    <View style={tsStyles.card}>
                        <TouchableOpacity
                            style={tsStyles.closeBtn}
                            onPress={() => {
                                Keyboard.dismiss();
                                setEndMatchModalVisible(false);
                                setEndMatchReason('');
                                setEndMatchCustomReason('');
                            }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={{ fontSize: FONT_SIZES['2xl'], color: '#667085' }}>✕</Text>
                        </TouchableOpacity>

                        <View style={[tsStyles.iconWrap, { backgroundColor: '#FFF4ED' }]}>
                            <Text style={{ fontSize: FONT_SIZES['5xl'] }}>close-circle</Text>
                        </View>
                        <Text style={tsStyles.title}>End this match?</Text>
                        <Text style={tsStyles.subtitle}>
                            You'll re-enter the matchmaking pool.{'\n'}Your reason will be shared with them.
                        </Text>

                        <View style={tsStyles.pillRow}>
                            {END_MATCH_REASONS.map(reason => (
                                <TouchableOpacity
                                    key={reason}
                                    style={[tsStyles.pill, endMatchReason === reason && tsStyles.pillActive]}
                                    onPress={() => setEndMatchReason(reason)}
                                >
                                    <Text style={[tsStyles.pillText, endMatchReason === reason && tsStyles.pillTextActive]}>
                                        {reason}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={tsStyles.textArea}
                            placeholder={endMatchReason === 'Other' ? 'Tell us a bit more...' : 'Additional details (optional)'}
                            placeholderTextColor={COLORS.text.placeholder}
                            value={endMatchCustomReason}
                            onChangeText={setEndMatchCustomReason}
                            multiline
                            maxLength={300}
                        />

                        <TouchableOpacity
                            style={[tsStyles.submitBtn, { backgroundColor: COLORS.error }, (!endMatchReason || endMatchSubmitting) && tsStyles.submitBtnDisabled]}
                            onPress={handleEndMatchConfirm}
                            disabled={!endMatchReason || endMatchSubmitting}
                        >
                            <Text style={tsStyles.submitBtnText}>{endMatchSubmitting ? 'Ending...' : 'End Match'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        activeOpacity={1}
                        style={{ flex: 1 }}
                        onPress={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }}
                    />
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Offscreen shareable card (mounted for ViewShot capture) ── */}
            {screenState === 'active_match' && activeMatch && (
                <ShareableMatchCard
                    ref={viewShotRef}
                    user1Photo={profile?.photos?.[0]?.url ?? null}
                    user1Name={profile?.firstName ?? 'You'}
                    user2Photo={activeMatch.partnerProfile?.photos?.[0]?.url ?? null}
                    user2Name={activeMatch.partnerProfile?.firstName ?? 'Match'}
                    approvalPercent={computeApprovalPercent(activeMatch.proposalId ?? activeMatch.matchId ?? activeMatch.id ?? '')}
                    matchedByCount={endorserAvatars.length}
                    matchedByAvatars={endorserAvatars}
                    matchedByNames={endorserNames}
                />
            )}

            {/* ── Share Match Sheet ──────────────────────────────────────── */}
            <ShareMatchSheet
                visible={shareSheetVisible}
                imageUri={shareImageUri}
                loading={shareLoading}
                onShareSnapchat={handleShareSnapchat}
                onShareMessages={handleShareMessages}
                onShareMore={handleShareMore}
                onSaveToPhotos={handleSaveToPhotos}
                onClose={handleCloseShareSheet}
            />

            {/* ── Timer Info Modal ─────────────────────────────────────────── */}
            <Modal visible={timerInfoVisible} transparent animationType="fade" onRequestClose={() => setTimerInfoVisible(false)}>
                <TouchableOpacity style={styles.timerInfoOverlay} activeOpacity={1} onPress={() => setTimerInfoVisible(false)}>
                    <View style={styles.timerInfoCard}>
                        <Text style={styles.timerInfoTitle}>
                            {screenState === 'active_match' ? 'Match Timer' : 'Time to Decide'}
                        </Text>
                        <Text style={styles.timerInfoBody}>
                            {screenState === 'active_match'
                                ? 'Your match window is ticking. Make the most of it — start a conversation!'
                                : screenState === 'awaiting_you'
                                ? "They already said yes. Decide before time runs out — you don't want to miss this."
                                : screenState === 'awaiting_them'
                                ? "You've made your move. They have until the timer runs out to decide."
                                : 'Both of you have a window to decide. If time runs out, the proposal expires.'}
                        </Text>
                        <TouchableOpacity style={styles.timerInfoBtn} onPress={() => setTimerInfoVisible(false)} activeOpacity={0.85}>
                            <Text style={styles.timerInfoBtnText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.screenBackground },
    header: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 8 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 4,
    },
    headerTitle: { fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONT_SIZES['6xl'], lineHeight: 38, color: COLORS.text.black, letterSpacing: -0.5 },
    headerSubtitle: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.base, lineHeight: 18, color: '#667085', paddingHorizontal: 24, paddingBottom: 4 },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 16,
        height: 34,
    },
    timerText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 24 },
    illustration: { width: 260, height: 260, marginBottom: 2 },
    tagline: { fontFamily: FONTS.bold, fontSize: FONT_SIZES['4xl'], lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.text.heading, textAlign: 'center', marginBottom: 6, letterSpacing: -0.3 },
    subtitle: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.base, lineHeight: LINE_HEIGHTS.base, color: COLORS.text.light, textAlign: 'center', marginBottom: 28 },
    ctaButton: {
        backgroundColor: COLORS.primaryButton,
        width: 260,
        height: 50,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primaryButton,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 4,
    },
    ctaText: { fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.xl, color: COLORS.card },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'flex-start',
    },
    modalCard: {
        backgroundColor: COLORS.card,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 28,
    },
    modalTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES['3xl'],
        color: '#101828',
        marginBottom: 6,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#667085',
        textAlign: 'center',
        marginBottom: 20,
    },
    textArea: {
        borderWidth: 1.5,
        borderColor: '#E4E7EC',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#101828',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 6,
    },
    charCount: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.placeholder,
        textAlign: 'right',
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E4E7EC',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: '#344054',
    },
    destructiveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.error,
        alignItems: 'center',
    },
    destructiveBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.card,
    },
    btnDisabled: {
        opacity: 0.4,
    },
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    centeredModalCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        width: '100%' as any,
    },
    reasonList: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: 6,
        marginBottom: 16,
    },
    reasonPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#E4E7EC',
        backgroundColor: COLORS.card,
    },
    reasonPillActive: {
        borderColor: COLORS.primaryAccent,
        backgroundColor: COLORS.backgroundFriendActive,
    },
    reasonText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: '#667085',
    },
    reasonTextActive: {
        fontFamily: FONTS.semiBold,
        color: COLORS.primaryAccent,
    },
    continueBtn: {
        backgroundColor: COLORS.primaryAccent,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    continueBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.card,
    },

    // Timer info modal
    timerInfoOverlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerInfoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 22,
        marginHorizontal: 32,
        alignItems: 'center',
    },
    timerInfoTitle: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES['2xl'],
        color: '#101828',
        marginBottom: 8,
        textAlign: 'center',
    },
    timerInfoBody: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#667085',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    timerInfoBtn: {
        backgroundColor: COLORS.primaryButton,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    timerInfoBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.card,
    },
});

// ── Top-sheet modal styles (matches ChatScreen style) ───────────────────────
const tsStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'flex-start',
    },
    card: {
        backgroundColor: COLORS.card,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 12,
    },
    closeBtn: {
        position: 'absolute',
        top: 58,
        left: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.backgroundProgressTrack,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    iconWrap: {
        alignSelf: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES['3xl'],
        color: '#101828',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#667085',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#E4E7EC',
        backgroundColor: COLORS.card,
    },
    pillActive: {
        borderColor: COLORS.primaryAccent,
        backgroundColor: COLORS.backgroundFriendActive,
    },
    pillText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.md,
        color: '#667085',
    },
    pillTextActive: {
        fontFamily: FONTS.semiBold,
        color: COLORS.primaryAccent,
    },
    textArea: {
        borderWidth: 1.5,
        borderColor: '#E4E7EC',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.lg,
        color: '#101828',
        minHeight: 64,
        textAlignVertical: 'top',
        marginBottom: 20,
        backgroundColor: '#FAFBFC',
    },
    submitBtn: {
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: COLORS.primaryAccent,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.35,
    },
    submitBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.card,
    },
});

// ── State-specific layout styles ─────────────────────────────────────────────
const stateStyles = StyleSheet.create({
    // awaiting_them — "You voted yes" confirmation badge
    votedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 24,
        marginBottom: 4,
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    votedCheckmark: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.success,
        marginRight: 4,
    },
    votedText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.success,
    },
    // empty state — countdown below CTA
    countdownRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginTop: 16,
        gap: 5,
    },
    countdownText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.light,
    },
});

export default MatchesScreen;
