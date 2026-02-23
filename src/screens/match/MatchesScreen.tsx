import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { MatchCard, MatchStatus } from '../../components/matches/MatchCard';
import { communityService } from '../../services/communityServiceIndex';
import { ActiveMatch, MatchProposal } from '../../types/community';

export function MatchesScreen() {
    const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
    const [pendingProposals, setPendingProposals] = useState<MatchProposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMatches = async () => {
            try {
                const data = await communityService.getFriendsAreaData();
                setActiveMatch(data.activeMatch);
                setPendingProposals(data.pendingProposals || []);
            } catch (error) {
                console.error("Failed to load match data", error);
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 }}>
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 22, lineHeight: 28, color: '#010101' }}>
                    Match
                </Text>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 8 }}>
                {activeMatch && (
                    <View style={{ marginBottom: 16 }}>
                        <MatchCard
                            key={activeMatch.matchId || 'active_match'}
                            status="active_match"
                            name={activeMatch.partnerProfile?.firstName || 'Unknown'}
                            age={activeMatch.partnerProfile?.age || 0}
                            matchDate={new Date(activeMatch.matchedAt).toLocaleDateString()}
                            imageUrl={activeMatch.partnerProfile?.photos?.[0]?.url || 'https://via.placeholder.com/150'}
                            matchedByAvatars={[]}
                        />
                    </View>
                )}

                {pendingProposals.map((proposal) => (
                    <View key={proposal.proposalId} style={{ marginBottom: 16 }}>
                        <MatchCard
                            status="awaiting_you"
                            name={proposal.partnerProfile?.firstName || 'Unknown'}
                            age={proposal.partnerProfile?.age || 0}
                            matchDate={new Date(proposal.approvedAt).toLocaleDateString()}
                            imageUrl={proposal.partnerProfile?.photos?.[0]?.url || 'https://via.placeholder.com/150'}
                            matchedByAvatars={proposal.endorsers?.map((e: any) => e.endorserProfile?.photos?.[0]?.url).filter(Boolean) || []}
                        />
                    </View>
                ))}

                {!activeMatch && pendingProposals.length === 0 && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ fontFamily: 'Outfit_400Regular', color: '#667085', fontSize: 16 }}>
                            No active matches yet. Check back soon!
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

export default MatchesScreen;
