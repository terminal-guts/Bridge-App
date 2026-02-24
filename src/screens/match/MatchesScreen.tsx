import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, Image, TouchableOpacity, StyleSheet, StatusBar, useWindowDimensions, Modal, TextInput, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/matches/MatchCard';
import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal } from '../../types/community';
import { useNavigation } from '@react-navigation/native';
import { ClockIcon } from '../../components/icons/Icons';

// One of five mutually exclusive states the screen can be in
type ScreenState =
    | 'active_match'    // Both said yes — show chat button
    | 'awaiting_you'    // They voted yes, you haven't responded
    | 'awaiting_them'   // You voted yes, waiting for them
    | 'neither_voted'   // Proposal exists, no one has voted yet
    | 'empty';          // Nothing at all

const END_MATCH_MIN_CHARS = 100;

function timerColor(hoursLeft: number): string {
    if (hoursLeft >= 24) return '#34C759';
    if (hoursLeft >= 12) return '#D4AA01';
    if (hoursLeft >= 4)  return '#FF8D28';
    return '#FF3B30';
}

function timerBgColor(hoursLeft: number): string {
    if (hoursLeft >= 24) return 'rgba(52, 199, 89, 0.10)';
    if (hoursLeft >= 12) return 'rgba(212, 170, 1, 0.10)';
    if (hoursLeft >= 4)  return 'rgba(255, 141, 40, 0.10)';
    return 'rgba(255, 59, 48, 0.10)';
}

function formatMatchDate(isoDate: string): string {
    return `Matched ${new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    })}`;
}

export function MatchesScreen() {
    const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
    const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const [endMatchModalVisible, setEndMatchModalVisible] = useState(false);
    const [endMatchReason, setEndMatchReason] = useState('');
    const navigation = useNavigation<any>();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    // Header: insets.top + 16 (extra top pad) + lineHeight(38) + paddingBottom(8) + scrollMarginTop(20) = insets.top + 82
    // Tab bar: 54 (navigator handles insets.bottom separately), card marginBottom: 56
    const activeCardHeight = windowHeight - insets.top - 82 - 54 - 56;

    // Tick every minute so the timer display stays fresh
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    const loadMatches = async () => {
        try {
            const data = await communityService.getFriendsAreaData();
            setActiveMatch(data.activeMatch);
            setPendingProposals(data.pendingProposals || []);
        } catch (error) {
            console.error('Failed to load match data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMatches();
        return communityService.onStateChange(() => {
            setLoading(true);
            loadMatches();
        });
    }, []);

    const handleEndMatchConfirm = () => {
        if (endMatchReason.trim().length < END_MATCH_MIN_CHARS) return;
        setEndMatchModalVisible(false);
        setEndMatchReason('');
        Alert.alert('Match Ended', 'Your match has been ended.', [
            { text: 'OK', onPress: () => {} },
        ]);
    };

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
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Match</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.tagline}>Real connections take a little time</Text>
                    <Image
                        source={require('../../../assets/no_match_illustration.png')}
                        style={styles.illustration}
                        resizeMode="contain"
                    />
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
            const exp = (activeMatch as any)?.expiresAt;
            return exp ? new Date(exp).getTime() : null;
        }
        return currentProposal?.expiresAt ? new Date(currentProposal.expiresAt).getTime() : null;
    })();

    let timerLabel: string | null = null;
    let timerClr = '#34C759';
    let timerBg = 'rgba(52, 199, 89, 0.10)';
    if (expiryTs) {
        const diffMs = expiryTs - now;
        if (diffMs > 0) {
            const totalHours = diffMs / 3600000;
            const h = Math.floor(totalHours);
            const m = Math.floor((diffMs % 3600000) / 60000);
            timerLabel = `${h}h ${m}m`;
            timerClr = timerColor(totalHours);
            timerBg = timerBgColor(totalHours);
        }
    }

    // ── Build card props ────────────────────────────────────────────────────
    const partner =
        screenState === 'active_match'
            ? activeMatch!.partnerProfile
            : currentProposal!.partnerProfile;

    const partnerPhoto = partner?.photos?.[0]?.url || '';
    const partnerName = partner?.firstName || 'Unknown';
    const partnerAge = partner?.age || 0;

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
                recipientId: partner?.id,
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
            {/* Header row: title left, countdown timer right */}
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.headerTitle}>Match</Text>
                {timerLabel && (
                    <View style={[styles.timerBadge, { backgroundColor: timerBg, borderWidth: 1.5, borderColor: timerClr }]}>
                        <ClockIcon size={12} color={timerClr} />
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
        borderRadius: 100,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    timerText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 13,
        lineHeight: 16,
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
});

export default MatchesScreen;
