import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, Image, TouchableOpacity, StyleSheet, StatusBar, useWindowDimensions, Modal, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/matches/MatchCard';
import { communityService, MatchEndedEvent } from '../../services/communityService';
import { ActiveMatch, MatchProposal } from '../../types/community';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineBanner } from '../../components/OfflineBanner';
import { ClockIcon } from '../../components/icons/Icons';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/ProfileCompletionBanner';

// Pre-register the illustration asset at module load time so it is available
// before the screen mounts (avoids a first-render blank on fresh installs).
const NO_MATCH_ILLUSTRATION = require('../../../assets/no_match_illustration.png');

// One of five mutually exclusive states the screen can be in
type ScreenState =
    | 'active_match'    // Both said yes — show chat button
    | 'awaiting_you'    // They voted yes, you haven't responded
    | 'awaiting_them'   // You voted yes, waiting for them
    | 'neither_voted'   // Proposal exists, no one has voted yet
    | 'empty';          // Nothing at all

const END_MATCH_MIN_CHARS = 50;

function timerColor(hoursLeft: number): string {
    if (hoursLeft >= 24) return '#34C759';
    if (hoursLeft >= 12) return '#D4AA01';
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
            icon: '⏰',
            headline: 'Your match expired',
            body: 'The proposal timed out before anyone decided. Stay active — your next match could come soon.',
        },
        you_rejected: {
            icon: '👋',
            headline: 'You passed',
            body: "That's totally okay — trust your instincts. Keep at it, the right fit is worth waiting for. Every pass brings you closer to someone great.",
        },
        they_rejected: {
            icon: '💔',
            headline: "They passed",
            body: "Not every connection clicks, and that's okay. Your community is still working to find your person.",
        },
        match_ended: {
            icon: '🔚',
            headline: 'Match ended',
            body: 'This match has been moved to your Past Matches.',
        },
    };

    const { icon, headline, body } = config[type];

    return (
        <View style={popupStyles.content}>
            {partnerPhotoUrl ? (
                <Image source={{ uri: partnerPhotoUrl }} style={popupStyles.avatar} />
            ) : (
                <View style={[popupStyles.avatar, popupStyles.avatarFallback]}>
                    <Text style={popupStyles.avatarFallbackText}>{partnerName.charAt(0)}</Text>
                </View>
            )}
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
    content: { alignItems: 'center', paddingBottom: 24 },
    avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
    avatarFallback: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    avatarFallbackText: { fontSize: 28, fontWeight: '700', color: '#6B7280' },
    icon: { fontSize: 32, marginBottom: 10 },
    headline: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#101828',
        textAlign: 'center',
        marginBottom: 12,
    },
    reasonBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E4E7EC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
        marginBottom: 14,
    },
    reasonLabel: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#98A2B3',
        marginBottom: 4,
        letterSpacing: 0.4,
    },
    reasonText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#344054',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    body: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#667085',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
    },
});

// Wraps the illustration so it can retry on error (handles first-mount blank)
function IllustrationImage() {
    const [key, setKey] = React.useState(0);
    return (
        <Image
            key={key}
            source={NO_MATCH_ILLUSTRATION}
            style={styles.illustration}
            resizeMode="contain"
            onError={() => setKey(k => k + 1)}
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

    useEffect(() => {
        getUserProfile().then(result => {
            if (isMountedRef.current && result.ok && result.data) setProfile(result.data);
        });
    }, []);
    const [now, setNow] = useState(Date.now());
    const [endMatchModalVisible, setEndMatchModalVisible] = useState(false);
    const [endMatchReason, setEndMatchReason] = useState('');
    const [popupEvent, setPopupEvent] = useState<MatchEndedEvent | null>(null);
    const navigation = useNavigation<any>();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    // Header: insets.top + 16 (extra top pad) + lineHeight(38) + paddingBottom(8) + scrollMarginTop(20) = insets.top + 82
    // Tab bar: 54 (navigator handles insets.bottom separately), card marginBottom: 56
    const activeCardHeight = windowHeight - insets.top - 82 - 54 - 56;

    // Tick every second so the timer display stays fresh and counts down in real time
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const loadMatches = async () => {
        try {
            const data = await communityService.getFriendsAreaData();
            if (!isMountedRef.current) return;
            setActiveMatch(data.activeMatch);
            setPendingProposals(data.pendingProposals || []);
        } catch (error) {
            console.error('Failed to load match data', error);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        loadMatches();
        return communityService.onStateChange(() => {
            setLoading(true);
            loadMatches();
        });
    }, []);

    // Check for a pending ended-match event each time the tab is focused
    useFocusEffect(
        useCallback(() => {
            const event = communityService.getEndedMatchEvent();
            if (!event) return;
            AsyncStorage.getItem(`match_popup_seen_${event.eventId}`).then(seen => {
                if (!seen) {
                    setPopupEvent(event);
                } else {
                    communityService.clearEndedMatchEvent();
                }
            });
        }, []),
    );

    const handlePopupContinue = useCallback(async () => {
        if (!popupEvent) return;
        await AsyncStorage.setItem(`match_popup_seen_${popupEvent.eventId}`, '1');
        communityService.clearEndedMatchEvent();
        setPopupEvent(null);
    }, [popupEvent]);

    const handleEndMatchConfirm = useCallback(() => {
        if (endMatchReason.trim().length < END_MATCH_MIN_CHARS) return;
        Keyboard.dismiss();
        setEndMatchModalVisible(false);
        setEndMatchReason('');
        const matchId = activeMatch?.matchId ?? activeMatch?.id ?? '';
        communityService.endActiveMatch(matchId, endMatchReason.trim());
    }, [endMatchReason, activeMatch]);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2B65F9" />
            </SafeAreaView>
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
            <SafeAreaView style={styles.root}>
                <StatusBar barStyle="dark-content" />
                <ProfileCompletionBanner
                    profile={profile}
                    onPress={() => navigation.navigate('Profile')}
                />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Match</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.tagline}>Real connections take a little time</Text>
                    <IllustrationImage />
                    <Text style={styles.subtitle}>
                        We're looking for your best match! Why not help friends in the meantime?
                    </Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('Community')}
                    >
                        <Text style={styles.ctaText}>Help Others Find a Match</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
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
    let timerClr = '#34C759';
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

    // ── Build card props ────────────────────────────────────────────────────
    const partner =
        screenState === 'active_match'
            ? activeMatch!.partnerProfile
            : currentProposal!.partnerProfile;

    const partnerPhoto = partner?.photos?.[0]?.url || '';
    const partnerName = partner?.firstName || 'Unknown';
    const partnerAge = partner?.age;

    const endorserAvatars =
        (screenState === 'active_match'
            ? activeMatch?.endorsers
            : currentProposal?.endorsers
        )?.map((e: any) => e.endorserProfile?.photos?.[0]?.url)
            .filter(Boolean) ?? [];

    // Date label for each state
    const matchDate: string = (() => {
        if (screenState === 'active_match') {
            return formatMatchDate(activeMatch!.matchedAt);
        }
        const ref = (currentProposal as any)?.approvedAt || currentProposal?.expiresAt;
        return ref ? formatMatchDate(ref) : '';
    })();

    const handleCardPress = () => {
        if (screenState === 'active_match') {
            const match = activeMatch!;
            navigation.navigate('Chat', {
                matchId: match.matchId ?? match.id,
                recipientName: partnerName,
                recipientId: partner?.userId ?? partner?.id,
            });
        } else {
            navigation.navigate('ProposalProfile', {
                partnerProfile: currentProposal!.partnerProfile,
                communityScore: currentProposal!.communityScore,
                endorsers: currentProposal!.endorsers ?? [],
                screenState,
                proposalId: currentProposal!.proposalId,
            });
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <OfflineBanner />
            <ProfileCompletionBanner
                profile={profile}
                onPress={() => navigation.navigate('Profile')}
            />
            {/* Header row: title left, countdown timer right */}
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.headerTitle}>Match</Text>
                {timerLabel && (
                    <View style={[styles.timerBadge, { backgroundColor: timerBg, borderColor: timerBdrClr }]}>
                        <ClockIcon size={13} color={timerClr} />
                        <Text style={[styles.timerText, { color: timerClr }]}>{timerLabel}</Text>
                    </View>
                )}
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 20 }}>
                <View style={{ marginBottom: 56, height: activeCardHeight }}>
                    {screenState === 'active_match' && (
                        <MatchCard
                            status="active_match"
                            name={partnerName}
                            age={partnerAge}
                            matchDate={matchDate}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            onPress={handleCardPress}
                            onDismiss={() => setEndMatchModalVisible(true)}
                        />
                    )}

                    {screenState === 'awaiting_you' && (
                        <MatchCard
                            status="awaiting_you"
                            name={partnerName}
                            age={partnerAge}
                            matchDate={matchDate}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            onPress={handleCardPress}
                        />
                    )}

                    {screenState === 'awaiting_them' && (
                        <MatchCard
                            status="awaiting_them"
                            name={partnerName}
                            age={partnerAge}
                            matchDate={matchDate}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            onPress={handleCardPress}
                        />
                    )}

                    {screenState === 'neither_voted' && (
                        <MatchCard
                            status="new_match"
                            name={partnerName}
                            age={partnerAge}
                            matchDate={matchDate}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            onPress={handleCardPress}
                        />
                    )}
                </View>
            </ScrollView>

            {/* ── Ended Match Popup ────────────────────────────────────────── */}
            <Modal
                visible={!!popupEvent}
                transparent
                animationType="fade"
                onRequestClose={handlePopupContinue}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {popupEvent && <EndedMatchPopupContent event={popupEvent} />}
                        <TouchableOpacity style={styles.continueBtn} onPress={handlePopupContinue} activeOpacity={0.85}>
                            <Text style={styles.continueBtnText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── End Match Modal ──────────────────────────────────────────── */}
            <Modal
                visible={endMatchModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => { setEndMatchModalVisible(false); setEndMatchReason(''); }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>End this match?</Text>
                                <Text style={styles.modalSubtitle}>
                                    Help us improve — tell us why
                                </Text>

                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Let us know why you'd like to end this match..."
                                    placeholderTextColor="#98A2B3"
                                    value={endMatchReason}
                                    onChangeText={setEndMatchReason}
                                    multiline
                                    maxLength={500}
                                    autoFocus
                                />
                                <Text style={styles.charCount}>
                                    {endMatchReason.trim().length} / {END_MATCH_MIN_CHARS} min
                                </Text>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setEndMatchModalVisible(false);
                                            setEndMatchReason('');
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.destructiveBtn, endMatchReason.trim().length < END_MATCH_MIN_CHARS && styles.btnDisabled]}
                                        onPress={handleEndMatchConfirm}
                                        disabled={endMatchReason.trim().length < END_MATCH_MIN_CHARS}
                                    >
                                        <Text style={styles.destructiveBtnText}>End Match</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 8 },
    headerRow: {
        paddingHorizontal: 24,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 32, lineHeight: 38, color: '#010101', letterSpacing: -0.5 },
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
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    tagline: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 26, color: '#0B1226', textAlign: 'center', marginBottom: 12 },
    illustration: { width: 300, height: 300, marginBottom: 32 },
    subtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, lineHeight: 17, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
    ctaButton: {
        backgroundColor: '#007AFF',
        width: 250,
        height: 47,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(0, 122, 255, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
    },
    ctaText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#FFFFFF' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-start',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 28,
    },
    modalTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
        color: '#101828',
        marginBottom: 6,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
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
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#101828',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 6,
    },
    charCount: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#98A2B3',
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
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 15,
        color: '#344054',
    },
    destructiveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    destructiveBtnText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 15,
        color: '#FFFFFF',
    },
    btnDisabled: {
        opacity: 0.4,
    },
    continueBtn: {
        backgroundColor: '#437FFF',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    continueBtnText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
});

export default MatchesScreen;
