import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Modal, TextInput, Keyboard, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import ReanimatedAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';

import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/matches/MatchCard';
import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal, MatchEndedEvent } from '../../types/community';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ClockIcon } from '../../components/icons/Icons';
import { EvaIcon } from '../../components/icons';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { MatchPoolLockedView } from '../../components/matches/MatchPoolLockedView';
import { calculateOverallProfileStrength } from '../../utils/profileCompleteness';
import { showToast } from '../../utils/toast';
import { lightHaptic, heavyHaptic, successHaptic } from '../../utils/haptics';
import { shareToMessages, shareGeneric } from '../../utils/shareMatch';
import { ShareMatchSheet } from '../../components/matches/ShareMatchSheet';
import { ShareableMatchCard } from '../../components/matches/ShareableMatchCard';
import { computeApprovalPercent } from '../../utils/matchCardGenerator';
import { getUnreadCount } from '../../services/messageService';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';
import { ScreenWrapper } from '../../components/ui';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { MatchesSkeleton } from '../../components/ui/SkeletonLoader';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { SPRINGS } from '../../constants/animations';
import { COLORS } from '../../theme/colors';

// Lottie animation for confetti celebration
const CONFETTI_ANIM = require('../../../assets/Icons/AnimatedIcons/confetti.json');

import {
    type ScreenState,
    deriveScreenState,
    CARD_STATUS,
    END_MATCH_REASONS,
    computeApprovalPercent as computeApprovalPercentLocal,
    timerColor,
    timerBgColor,
    timerBorderColor,
    formatMatchDate,
    EndedMatchPopupContent,
    IllustrationAnimation,
    popupStyles,
    styles,
    tsStyles,
    stateStyles,
} from './MatchesScreen.components';

// Timer helpers, formatMatchDate, EndedMatchPopupContent, IllustrationAnimation — imported from MatchesScreen.components

// EndedMatchPopupContent, popupStyles, IllustrationAnimation — imported from MatchesScreen.components

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
    const wasLockedRef = useRef(false);
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

    // ── Profile incomplete gate — show locked state ─────────────────────────
    // One-way gate: once profileCompleted is true, user is permanently in the pool
    const profileStrength = profile ? calculateOverallProfileStrength(profile) : 0;
    const isLocked = !loading && profileStrength < 100 && !profile?.profileCompleted;

    if (isLocked) {
        wasLockedRef.current = true;
        return (
            <ScreenWrapper>
                <ReanimatedAnimated.View style={{ flex: 1 }} exiting={FadeOut.duration(300)}>
                    <MatchPoolLockedView
                        profile={profile}
                        onNavigateToSection={(section) => {
                            switch (section) {
                                case 'Match Preferences':
                                    navigation.navigate('MatchPreferences');
                                    break;
                                case 'Questions':
                                    navigation.navigate('MainTabs', { screen: 'Profile', params: { initialTab: 'questions' } });
                                    break;
                                case 'Photos':
                                case 'About Me':
                                default:
                                    navigation.navigate('ProfileEdit');
                                    break;
                            }
                        }}
                        onRingPress={() => navigation.navigate('Profile')}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                    />
                </ReanimatedAnimated.View>
            </ScreenWrapper>
        );
    }

    // Check if we just transitioned from locked state
    const animateEntrance = wasLockedRef.current;
    if (wasLockedRef.current) wasLockedRef.current = false;

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
        const emptyContent = (
            <>
                <ProfileCompletionBanner
                    profile={profile}
                    onPress={() => navigation.navigate('Profile')}
                />
                <View style={styles.header}>
                    <Text style={styles.headerTitle} accessibilityRole="header">Match</Text>
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
                        accessibilityRole="button"
                        accessibilityLabel="Vote for your friends"
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
            </>
        );

        return (
            <ScreenWrapper>
                {animateEntrance ? (
                    <ReanimatedAnimated.View style={{ flex: 1 }} entering={FadeIn.duration(400).delay(200)}>
                        {emptyContent}
                    </ReanimatedAnimated.View>
                ) : (
                    emptyContent
                )}

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
                <Text style={styles.headerTitle} accessibilityRole="header">Match</Text>
                {timerLabel && screenState !== 'active_match' && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setTimerInfoVisible(true)} accessibilityRole="button" accessibilityLabel={`Timer: ${timerLabel}`}>
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
                            <Text style={{ fontSize: FONT_SIZES['2xl'], color: COLORS.navInactiveIcon }}>✕</Text>
                        </TouchableOpacity>

                        <View style={[tsStyles.iconWrap, { backgroundColor: COLORS.backgroundWarmPeach }]}>
                            <EvaIcon name="close-circle" variant="outline" size={40} color={COLORS.error} />
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

// Styles defined in MatchesScreen.components.tsx — imported at top of file

export default MatchesScreen;
