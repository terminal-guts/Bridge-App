/**
 * useMatchesScreen — data fetching, state management, and handlers for MatchesScreen.
 * Extracted from MatchesScreen.tsx for maintainability.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, Keyboard } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { DURATIONS, EASINGS } from '../../constants/animations';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getNext7PMCentral } from '../../utils/centralTime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';
import LottieView from 'lottie-react-native';
import { Image } from 'expo-image';

import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal, MatchEndedEvent } from '../../types/community';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
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
        return () => {
            isMountedRef.current = false;
            // Clean up any leftover share image file on unmount
            const uri = shareImageUriRef.current;
            if (uri) {
                FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
                shareImageUriRef.current = null;
            }
        };
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
    const shareImageUriRef = useRef<string | null>(null);
    const wasLockedRef = useRef(false);
    const cardEntrance = useSharedValue(0);
    const hasAnimatedEntrance = useRef(false);
    const cardEntranceStyle = useAnimatedStyle(() => ({
        opacity: cardEntrance.value,
        transform: [{ translateY: (1 - cardEntrance.value) * 24 }],
    }));

    // Trigger entrance animation AFTER loading resolves so the Animated.View is mounted.
    // Reanimated worklets don't reliably pick up shared value changes that happen
    // while the view is unmounted (behind the loading early-return).
    useEffect(() => {
        if (!loading && !hasAnimatedEntrance.current) {
            hasAnimatedEntrance.current = true;
            cardEntrance.value = 0;
            cardEntrance.value = withTiming(1, { duration: DURATIONS.slow, easing: EASINGS.enter });
        }
    }, [loading]);
    const navigation = useNavigation<any>();
    const [endMatchCustomReason, setEndMatchCustomReason] = useState('');

    // Tick every second for proposal/match timer badge AND empty countdown
    useFocusEffect(
        useCallback(() => {
            setNow(Date.now());
            const id = setInterval(() => setNow(Date.now()), 1000);
            return () => clearInterval(id);
        }, [])
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

    // Re-fetch match data when the app returns from background after 2+ minutes.
    // useFocusEffect only fires on navigation events, not AppState changes, so
    // without this the user would see stale data if they stayed on the Matches
    // tab while the app was backgrounded for hours.
    const lastActiveMatchesRef = useRef(Date.now());
    useEffect(() => {
        const sub = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                const elapsed = Date.now() - lastActiveMatchesRef.current;
                if (elapsed > 120_000 && isMountedRef.current) {
                    loadMatches();
                }
            } else if (nextState === 'background') {
                lastActiveMatchesRef.current = Date.now();
            }
        });
        return () => sub.remove();
    }, []);

    // Auto-refresh match data when connectivity is restored after being offline
    useNetworkStatus(useCallback(() => {
        setTimeout(() => {
            if (isMountedRef.current) loadMatches();
        }, 1500);
    }, []));

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
            // Clean up previous share image before generating a new one
            const prevUri = shareImageUriRef.current;
            if (prevUri) {
                FileSystem.deleteAsync(prevUri, { idempotent: true }).catch(() => {});
                shareImageUriRef.current = null;
            }

            // Prefetch every image rendered inside ShareableMatchCard before
            // capturing. Without this, captureRef races image loads on slow
            // networks and produces blank or partial exports. 3-second timeout
            // prevents an offline/flaky network from blocking the share flow.
            const photoUrls: string[] = [];
            const user1Photo = profile?.photos?.[0]?.url;
            const user2Photo = activeMatch?.partnerProfile?.photos?.[0]?.url;
            if (user1Photo) photoUrls.push(user1Photo);
            if (user2Photo) photoUrls.push(user2Photo);
            const endorserAvatars = (activeMatch?.endorsers ?? [])
                .map((e: any) => e.endorserProfile?.photos?.[0]?.url)
                .filter((u: any): u is string => typeof u === 'string' && u.length > 0);
            photoUrls.push(...endorserAvatars);

            if (photoUrls.length > 0) {
                const prefetchAll = Promise.all(
                    photoUrls.map((u) => Image.prefetch(u).catch(() => false))
                );
                const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
                await Promise.race([prefetchAll, timeout]);
                if (!isMountedRef.current) return;
            }

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
            if (isMountedRef.current) {
                shareImageUriRef.current = uri;
                setShareImageUri(uri);
            }
        } catch (error) {
            showToast.error('Could not generate card', 'Try again later');
            if (isMountedRef.current) setShareSheetVisible(false);
        } finally {
            if (isMountedRef.current) setShareLoading(false);
        }
    }, [activeMatch, profile, shareLoading, shareSheetVisible]);

    const handleCloseShareSheet = useCallback(() => {
        setShareSheetVisible(false);
        // Don't null shareImageUri or delete the file here — a share action
        // may still be in progress. Cleanup happens when a new card is generated
        // (in handleSharePress) or on unmount.
    }, []);

    const handleShareSnapchat = useCallback(() => {
        const uri = shareImageUriRef.current;
        if (uri) shareGeneric(uri);
    }, []);

    const handleShareMessages = useCallback(() => {
        const uri = shareImageUriRef.current;
        if (uri) shareToMessages(uri);
    }, []);

    const handleShareMore = useCallback(() => {
        const uri = shareImageUriRef.current;
        if (uri) shareGeneric(uri);
    }, []);

    const handleSaveToPhotos = useCallback(async () => {
        const uri = shareImageUriRef.current;
        if (!uri) return;
        try {
            const MediaLibrary = await import('expo-media-library');
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showToast.error('Permission needed', 'Allow photo access to save');
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            lightHaptic();
            showToast.success('Saved', 'Match card saved to your photos');
        } catch {
            showToast.error('Could not save', 'Try again later');
        }
    }, []);

    const emptyCountdown = useMemo(() => {
        const next7pmMs = getNext7PMCentral();
        const diffMs = next7pmMs - now;
        if (diffMs <= 0) return null;

        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    }, [now]);

    // Profile gate — single source of truth: profile_completed.
    // Set to true at the end of onboarding when at least one photo was uploaded
    // successfully, and re-evaluated by updateUserProfile's auto-promote whenever
    // the user edits. Strength score is cosmetic and lives in the profile
    // dashboard; it does NOT gate the matching pool.
    const isLocked = useMemo(() => {
      return !loading && !!profile && !profile.profileCompleted;
    }, [profile, loading]);

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
