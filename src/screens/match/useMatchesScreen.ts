/**
 * useMatchesScreen — data fetching, state management, and handlers for MatchesScreen.
 * Extracted from MatchesScreen.tsx for maintainability.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Keyboard } from 'react-native';
import {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';
import LottieView from 'lottie-react-native';

import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal, MatchEndedEvent } from '../../types/community';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { calculateOverallProfileStrength } from '../../utils/profileCompleteness';
import { showToast } from '../../utils/toast';
import { lightHaptic, heavyHaptic, successHaptic } from '../../utils/haptics';
import { shareToMessages, shareGeneric } from '../../utils/shareMatch';
import { getUnreadCount, getMatchMessages } from '../../services/messageService';
import { deriveScreenState, type ScreenState } from './MatchesScreen.components';

export function useMatchesScreen() {
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
    const [firstMatchMessage, setFirstMatchMessage] = useState<string | null>(null);
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
    const [endMatchCustomReason, setEndMatchCustomReason] = useState('');

    // Tick every second only when showing the empty countdown
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

            if (data.activeMatch && currentUserId) {
                const matchId = data.activeMatch.matchId ?? data.activeMatch.id;
                if (matchId) {
                    getUnreadCount(matchId, currentUserId).then(result => {
                        if (isMountedRef.current) setHasUnreadMatch(result.ok && (result.data ?? 0) > 0);
                    }).catch(() => {});
                    getMatchMessages(matchId).then(result => {
                        if (!isMountedRef.current) return;
                        const firstText = result.ok && result.data
                            ? result.data.find(m => m.type === 'text')
                            : undefined;
                        setFirstMatchMessage(firstText?.content ?? null);
                    }).catch(() => {});
                }
            } else {
                setHasUnreadMatch(false);
                setFirstMatchMessage(null);
            }

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

    useFocusEffect(
        useCallback(() => {
            const lastLoad = 'getLastFriendsAreaLoadTime' in communityService
                ? (communityService as any).getLastFriendsAreaLoadTime() : 0;
            if (Date.now() - lastLoad < 10_000) return;
            loadMatches();
        }, []),
    );

    const handlePopupContinue = useCallback(async () => {
        if (!popupEvent) return;
        await AsyncStorage.setItem(`match_popup_seen_${popupEvent.eventId}`, '1');
        communityService.clearEndedMatchEvent();
        setPopupEvent(null);
    }, [popupEvent]);

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
            const event = communityService.getEndedMatchEvent();
            if (event) setPopupEvent(event);
        } catch (error) {
            showToast.error('Could not end match', 'Check your connection and try again.');
        } finally {
            setEndMatchSubmitting(false);
        }
    }, [endMatchReason, endMatchCustomReason, endMatchSubmitting, activeMatch]);

    const handleSharePress = useCallback(async () => {
        if (shareLoading || shareSheetVisible) return;
        heavyHaptic();
        setShareSheetVisible(true);
        setShareLoading(true);
        try {
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

    // DST offset — compute once on mount
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

    // Profile gate
    const profileStrength = profile ? calculateOverallProfileStrength(profile) : 0;
    const isLocked = !loading && profileStrength < 100 && !profile?.profileCompleted;

    // Derive screen state
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

    // End match modal dismiss handler
    const handleEndMatchDismiss = useCallback(() => {
        Keyboard.dismiss();
        setEndMatchModalVisible(false);
        setEndMatchReason('');
        setEndMatchCustomReason('');
    }, []);

    return {
        // State
        activeMatch,
        pendingProposals,
        loading,
        profile,
        now,
        endMatchModalVisible,
        timerInfoVisible,
        endMatchReason,
        endMatchSubmitting,
        popupEvent,
        refreshing,
        shareSheetVisible,
        shareImageUri,
        shareLoading,
        hasUnreadMatch,
        firstMatchMessage,
        celebrationActive,
        endMatchCustomReason,
        screenState,
        currentProposal,
        isLocked,
        emptyCountdown,

        // Setters
        setEndMatchModalVisible,
        setTimerInfoVisible,
        setEndMatchReason,
        setEndMatchCustomReason,

        // Refs
        confettiRef,
        viewShotRef,
        wasLockedRef,
        cardEntranceStyle,

        // Navigation
        navigation,

        // Handlers
        handleRefresh,
        handlePopupContinue,
        handleEndMatchConfirm,
        handleEndMatchDismiss,
        handleSharePress,
        handleCloseShareSheet,
        handleShareSnapchat,
        handleShareMessages,
        handleShareMore,
        handleSaveToPhotos,
    };
}
