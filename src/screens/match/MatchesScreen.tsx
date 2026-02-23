import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, Image, TouchableOpacity, StyleSheet, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/matches/MatchCard';
import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal } from '../../types/community';
import { useNavigation } from '@react-navigation/native';

// One of five mutually exclusive states the screen can be in
type ScreenState =
    | 'active_match'    // Both said yes — show chat button
    | 'awaiting_you'    // They voted yes, you haven't responded
    | 'awaiting_them'   // You voted yes, waiting for them
    | 'neither_voted'   // Proposal exists, no one has voted yet
    | 'empty';          // Nothing at all

function getExpiresIn(expiresAt: string): string {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.floor(diffMs / 3600000);
    if (hours > 48) return `${Math.floor(hours / 24)} days`;
    if (hours > 0) return `${hours} hours`;
    return 'soon';
}

export function MatchesScreen() {
    const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
    const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<any>();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    // Header: paddingTop(48) + text(28) + paddingBottom(12) + scrollMarginTop(8) = 96
    // Tab bar height: 75, card marginBottom: 16, small buffer: 8
    const activeCardHeight = windowHeight - insets.top - 96 - 75 - 16 - 8;

    useEffect(() => {
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

        loadMatches();
    }, []);

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
            // They voted, you haven't
            screenState = 'awaiting_you';
        } else if (yourDecision !== 'pending' && partnerDecision === 'pending') {
            // You voted, they haven't
            screenState = 'awaiting_them';
        } else {
            // Neither has voted yet
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

    // ── Build card props for the single visible card ────────────────────────
    const partner =
        screenState === 'active_match'
            ? activeMatch!.partnerProfile
            : currentProposal!.partnerProfile;

    const partnerPhoto = partner?.photos?.[0]?.url || '';
    const partnerName = partner?.firstName || 'Unknown';
    const partnerAge = partner?.age || 0;

    const endorserAvatars =
        currentProposal?.endorsers
            ?.map((e: any) => e.endorserProfile?.photos?.[0]?.url)
            .filter(Boolean) ?? [];

    const handleCardPress = () => {
        if (screenState === 'active_match') {
            // Chat button — go directly to the conversation
            const match = activeMatch!;
            navigation.navigate('Chat', {
                matchId: match.matchId ?? match.id,
                recipientName: partnerName,
                recipientId: partner?.id,
            });
        } else {
            // Arrow button — show the partner's profile with pass/accept actions
            navigation.navigate('ProposalProfile', {
                partnerProfile: currentProposal!.partnerProfile,
                communityScore: currentProposal!.communityScore,
                endorsers: currentProposal!.endorsers ?? [],
                screenState,
                proposalId: currentProposal!.proposalId,
            });
        }
    };

    const cardHeight = screenState === 'active_match' ? activeCardHeight : 420;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 }}>
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 22, lineHeight: 28, color: '#010101' }}>
                    Match
                </Text>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 8 }}>
                <View style={{ marginBottom: 16, height: cardHeight }}>
                    {screenState === 'active_match' && (
                        <MatchCard
                            status="active_match"
                            name={partnerName}
                            age={partnerAge}
                            matchDate={new Date(activeMatch!.matchedAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                            })}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={[]}
                            onPress={handleCardPress}
                        />
                    )}

                    {screenState === 'awaiting_you' && (
                        <MatchCard
                            status="awaiting_you"
                            name={partnerName}
                            age={partnerAge}
                            expiresIn={getExpiresIn(currentProposal!.expiresAt)}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            theyVotedYes={true}
                            onPress={handleCardPress}
                        />
                    )}

                    {screenState === 'awaiting_them' && (
                        <MatchCard
                            status="awaiting_them"
                            name={partnerName}
                            age={partnerAge}
                            expiresXHours={`Expires in ${getExpiresIn(currentProposal!.expiresAt)}`}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            youVotedYes={true}
                            onPress={handleCardPress}
                        />
                    )}

                    {screenState === 'neither_voted' && (
                        <MatchCard
                            status="new_match"
                            name={partnerName}
                            age={partnerAge}
                            imageUrl={partnerPhoto}
                            matchedByAvatars={endorserAvatars}
                            onPress={handleCardPress}
                        />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 },
    headerTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 22, lineHeight: 28, color: '#010101' },
    emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
    tagline: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 21, color: '#0B1226', textAlign: 'center', marginBottom: 32 },
    illustration: { width: 300, height: 300, marginBottom: 32 },
    subtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, lineHeight: 17, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
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
});

export default MatchesScreen;
