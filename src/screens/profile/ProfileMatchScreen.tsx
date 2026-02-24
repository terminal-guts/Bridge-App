import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
    ImageBackground, Image, ActivityIndicator, Dimensions, StyleSheet,
} from 'react-native';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { communityService } from '../../services/communityServiceIndex';
import { RootStackParamList } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Emoji maps ────────────────────────────────────────────────────────────────
const VALUES_EMOJI: Record<string, string> = {
    'Kindness': '💗', 'Honesty': '💛', 'Growth': '🌱', 'Family': '🎁',
    'Ambition': '🎯', 'Humor': '😄', 'Empathy': '🧡', 'Curiosity': '🔍',
    'Creativity': '🎨', 'Loyalty': '🤝', 'Adventure': '🌍', 'Health': '💪',
    'Fun': '🎉', 'Faith': '🙏', 'Justice': '⚖️', 'Wisdom': '🦉',
    'Respect': '🌟', 'Integrity': '💎', 'Freedom': '🦋', 'Love': '❤️',
};

const INTERESTS_EMOJI: Record<string, string> = {
    'Travel': '✈️', 'Live music': '🎵', 'Coffee chats': '☕', 'Hiking': '🥾',
    'Book clubs': '📚', 'Food walks': '🥘', 'Weekend getaways': '✨',
    'Art galleries': '🎨', 'Board games': '🎲', 'Cooking': '🍳',
    'Photography': '📷', 'Sports': '⚽', 'Music': '🎸', 'Dancing': '💃',
    'Gaming': '🎮', 'Movies': '🎬', 'Yoga': '🧘', 'Running': '🏃',
    'Swimming': '🏊', 'Reading': '📖', 'Fitness': '💪', 'Wine tasting': '🍷',
    'Cycling': '🚴', 'Rock climbing': '🧗',
};

function getEmoji(text: string, map: Record<string, string>): string {
    const key = Object.keys(map).find(
        k => k.toLowerCase() === text.toLowerCase()
    );
    return key ? map[key] : '•';
}

function Tag({ text, emojiMap }: { text: string; emojiMap: Record<string, string> }) {
    const emoji = getEmoji(text, emojiMap);
    return (
        <View style={styles.tag}>
            <Text style={styles.tagText}>{emoji} {text}</Text>
        </View>
    );
}

export default function ProfileMatchScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'ProposalProfile'>>();
    const { partnerProfile, communityScore, endorsers, screenState, proposalId } = route.params;
    const insets = useSafeAreaInsets();

    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const photos = partnerProfile.photos || [];
    const photoUrl = photos[currentPhotoIndex]?.url || '';
    const karmaPts = (partnerProfile as any).karma?.score ?? 80;
    const canRespond = screenState === 'awaiting_you' || screenState === 'neither_voted';

    const endorserAvatars: string[] = (endorsers ?? [])
        .map((e: any) => e.endorserProfile?.photos?.[0]?.url)
        .filter(Boolean);

    const deepQuestions: { question: string; answer: string }[] =
        ((partnerProfile as any).displayedQuestions ?? [])
            .map((id: number) =>
                ((partnerProfile as any).deepQuestions ?? []).find(
                    (q: any) => q.questionId === id
                )
            )
            .filter(Boolean)
            .map((q: any) => ({ question: q.question, answer: q.answer }));

    const handlePass = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            if (canRespond) await communityService.respondToMatchProposal(proposalId, false);
        } catch { /* silent */ }
        navigation.goBack();
    };

    const handleAccept = async () => {
        if (submitting || !canRespond) return;
        setSubmitting(true);
        try {
            await communityService.respondToMatchProposal(proposalId, true);
        } catch { /* silent */ }
        navigation.goBack();
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero photo ──────────────────────────────────── */}
                <View style={{ width: '100%', height: 420 }}>
                    <ImageBackground
                        source={photoUrl ? { uri: photoUrl } : require('../../../assets/favicon.png')}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    >
                        {/* Back arrow */}
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={[styles.backBtn, { top: insets.top + 12 }]}
                        >
                            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>

                        {/* Pagination dots — top right */}
                        {photos.length > 1 && (
                            <View style={[styles.dotsRow, { top: insets.top + 18 }]}>
                                {photos.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.dot,
                                            { backgroundColor: i === currentPhotoIndex ? '#FFFFFF' : 'rgba(255,255,255,0.35)' },
                                        ]}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Prev / next tap zones */}
                        {photos.length > 1 && (
                            <>
                                <TouchableWithoutFeedback
                                    onPress={() => currentPhotoIndex > 0 && setCurrentPhotoIndex(currentPhotoIndex - 1)}
                                >
                                    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.35 }} />
                                </TouchableWithoutFeedback>
                                <TouchableWithoutFeedback
                                    onPress={() => currentPhotoIndex < photos.length - 1 && setCurrentPhotoIndex(currentPhotoIndex + 1)}
                                >
                                    <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.35 }} />
                                </TouchableWithoutFeedback>
                            </>
                        )}
                    </ImageBackground>
                </View>

                {/* ── Cards ──────────────────────────────────────── */}
                <View style={{ paddingHorizontal: 16, marginTop: -20 }}>

                    {/* Name + karma + matched by */}
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={styles.nameText}>
                                {partnerProfile.firstName}, {partnerProfile.age}
                            </Text>
                            <View style={styles.karmaBadge}>
                                <Ionicons name="star-outline" size={13} color="#34C759" />
                                <Text style={styles.karmaText}>Karma Pts : {karmaPts} pts</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="heart-outline" size={18} color="#34C759" />
                            <Text style={styles.matchedByLabel}>Matched by :</Text>
                            <View style={{ flexDirection: 'row' }}>
                                {endorserAvatars.length > 0
                                    ? endorserAvatars.map((uri, i) => (
                                        <Image
                                            key={i}
                                            source={{ uri }}
                                            style={[styles.avatar, { marginLeft: i === 0 ? 0 : -7 }]}
                                        />
                                    ))
                                    : [0, 1, 2].map((_, i) => (
                                        <View
                                            key={i}
                                            style={[styles.avatarPlaceholder, { marginLeft: i === 0 ? 0 : -7 }]}
                                        />
                                    ))
                                }
                            </View>
                        </View>
                    </View>

                    {/* Community validation */}
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={styles.sectionTitle}>Community validation</Text>
                            <View style={styles.whyMatchBtn}>
                                <Sparkles size={13} color="#2563EB" />
                                <Text style={styles.whyMatchText}>Why this match</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${communityScore}%` }]} />
                            </View>
                            <Text style={styles.scoreText}>{communityScore}%</Text>
                        </View>
                    </View>

                    {/* Values */}
                    {(partnerProfile.values ?? []).length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Values</Text>
                            <View style={styles.tagRow}>
                                {(partnerProfile.values ?? []).map((v, i) => (
                                    <Tag key={i} text={v} emojiMap={VALUES_EMOJI} />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Interests */}
                    {(partnerProfile.interests ?? []).length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Interests</Text>
                            <View style={styles.tagRow}>
                                {(partnerProfile.interests ?? []).map((v, i) => (
                                    <Tag key={i} text={v} emojiMap={INTERESTS_EMOJI} />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Deep questions */}
                    {deepQuestions.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { marginBottom: 12, marginLeft: 4 }]}>
                                Deep questions
                            </Text>
                            {deepQuestions.map((item, index) => (
                                <View key={index} style={styles.card}>
                                    <Text style={styles.questionText}>
                                        {index + 1}. {item.question}
                                    </Text>
                                    <Text style={styles.answerText}>{item.answer}</Text>
                                </View>
                            ))}
                        </>
                    )}

                </View>
            </ScrollView>

            {/* ── Bottom action bar ────────────────────────────── */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                {canRespond ? (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity
                            onPress={handlePass}
                            disabled={submitting}
                            style={[styles.passBtn, { opacity: submitting ? 0.5 : 1 }]}
                        >
                            <Text style={{ color: '#fff', fontSize: 22, lineHeight: 26 }}>✕</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleAccept}
                            disabled={submitting}
                            style={[styles.acceptBtn, { opacity: submitting ? 0.5 : 1 }]}
                        >
                            {submitting
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Ionicons name="heart" size={26} color="#fff" />
                            }
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.waitingBadge}>
                        <Text style={styles.waitingText}>Waiting for their response</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Back button
    backBtn: {
        position: 'absolute',
        left: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Pagination dots
    dotsRow: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
    },
    dot: {
        width: 20,
        height: 4,
        borderRadius: 2,
    },

    // Card
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(1,1,1,0.08)',
        borderRadius: 14,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
        padding: 14,
        marginBottom: 14,
    },

    // Name row
    nameText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 26,
        lineHeight: 32,
        color: '#010101',
        letterSpacing: -0.3,
    },
    karmaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 9,
        backgroundColor: 'rgba(52,199,89,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(52,199,89,0.5)',
        borderRadius: 8,
    },
    karmaText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#34C759',
    },
    matchedByLabel: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: 'rgba(1,1,1,0.6)',
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#fff',
        backgroundColor: '#D9D9D9',
    },

    // Community validation
    sectionTitle: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 16,
        color: '#2563EB',
        marginBottom: 10,
    },
    whyMatchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(37,99,235,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(37,99,235,0.4)',
        borderRadius: 20,
    },
    whyMatchText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#2563EB',
    },
    progressTrack: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(1,1,1,0.06)',
        borderRadius: 40,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 40,
    },
    scoreText: {
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
        fontSize: 22,
        color: '#010101',
        minWidth: 48,
        textAlign: 'right',
    },

    // Tags
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    tag: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(1,1,1,0.03)',
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(1,1,1,0.06)',
    },
    tagText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: 'rgba(1,1,1,0.8)',
    },

    // Deep questions
    questionText: {
        fontFamily: 'Outfit_600SemiBold',
        fontWeight: '600',
        fontSize: 14,
        lineHeight: 20,
        color: '#010101',
        marginBottom: 5,
    },
    answerText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 13,
        lineHeight: 20,
        color: 'rgba(1,1,1,0.5)',
    },

    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: 'rgba(1,1,1,0.06)',
        paddingTop: 14,
        paddingHorizontal: 32,
    },
    bottomBtns: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
    },
    passBtn: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#565164',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 6,
    },
    acceptBtn: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 6,
    },
    waitingBadge: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(212,170,1,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(212,170,1,0.4)',
        borderRadius: 40,
    },
    waitingText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#D4AA01',
    },
});
