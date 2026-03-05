import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
    ImageBackground, Image, ActivityIndicator, Dimensions, StyleSheet, PanResponder,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Star, Heart, X, Sparkles, Users } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile, getFullUserProfileById } from '../../services/profileService';
import { KarmaInfoModal } from '../../components/community/KarmaInfoModal';
import { VALUES_EMOJI, INTERESTS_EMOJI, getEmoji } from '../../utils/emojiMaps';
import { showToast } from '../../utils/toast';

const SCREEN_WIDTH = Dimensions.get('window').width;

const PROFILE_CONTENT_STYLE = { paddingBottom: 150 } as const;

export default function ProfileMatchScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const params = route.params || {};
    const insets = useSafeAreaInsets();

    // isProposal = navigated from MatchesScreen with full proposal context (show "Matched by" + community score)
    // isPreview  = navigated from ProfilePreview with no profile passed (load own profile)
    // isView     = navigated from ChatScreen / FriendsAreaView with a plain profile object
    const isProposal = !!params.partnerProfile;
    const isPreview = !params.partnerProfile && !params.profile;

    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [profileData, setProfileData] = useState<any>(params.partnerProfile || params.profile || null);
    const [loading, setLoading] = useState(isPreview);
    const [showKarmaModal, setShowKarmaModal] = useState(false);
    const isMountedRef = React.useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (isPreview) {
            getUserProfile().then(result => {
                if (isMountedRef.current && result.ok && result.data) setProfileData(result.data);
            }).finally(() => { if (isMountedRef.current) setLoading(false); });
        } else if (!isProposal && params.profile?.userId) {
            // isView — profile passed from friends list lacks deep questions; re-fetch full profile
            setLoading(true);
            getFullUserProfileById(params.profile.userId).then(full => {
                if (isMountedRef.current && full) setProfileData(full);
            }).catch(() => { /* show whatever profile data was passed */ }).finally(() => { if (isMountedRef.current) setLoading(false); });
        } else if (isProposal && params.partnerProfile?.userId) {
            // isProposal — background re-fetch to populate karma + deep questions without blocking UI
            getFullUserProfileById(params.partnerProfile.userId).then(full => {
                if (isMountedRef.current && full) setProfileData(full);
            }).catch(() => { /* profile already visible from params — silently ignore */ });
        }
    }, [isPreview, isProposal, params.profile?.userId, params.partnerProfile?.userId]);

    const partnerProfile = profileData;
    const communityScore: number = params.communityScore ?? 0;
    const endorsers: any[] = params.endorsers ?? [];
    const screenState: string = params.screenState ?? '';
    const proposalId: string = params.proposalId ?? '';
    const canRespond = isProposal && (screenState === 'awaiting_you' || screenState === 'neither_voted');

    // All hooks must be called before any early returns
    const endorserAvatars = useMemo<string[]>(() =>
        (endorsers ?? [])
            .map((e: any) => e.endorserProfile?.photos?.[0]?.url)
            .filter(Boolean),
        [endorsers]
    );

    const deepQuestions = useMemo<{ question: string; answer: string }[]>(() => {
        const allAnswered = ((partnerProfile as any)?.deepQuestions ?? [])
            .filter((q: any) => q.answer)
            .map((q: any) => ({ question: q.question, answer: q.answer }));

        const displayedIds: number[] = (partnerProfile as any)?.displayedQuestions ?? [];
        if (displayedIds.length === 0) return allAnswered;

        const fromDisplayed = displayedIds
            .map((id: number) =>
                ((partnerProfile as any)?.deepQuestions ?? []).find(
                    (q: any) => q.questionId === id
                )
            )
            .filter(Boolean)
            .map((q: any) => ({ question: q.question, answer: q.answer }));

        // If the displayedIds didn't match anything, fall back to all answered
        const result = fromDisplayed.length > 0 ? fromDisplayed : allAnswered;
        return result.filter(q => q.question && q.answer);
    }, [partnerProfile]);

    const handlePass = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            if (canRespond) await communityService.respondToMatchProposal(proposalId, false, {
                name: partnerProfile?.firstName || 'Unknown',
                photoUrl: partnerProfile?.photos?.[0]?.url,
            });
            navigation.goBack();
        } catch {
            setSubmitting(false);
            showToast.error('Could not submit response', 'Check your connection and try again.');
        }
    }, [submitting, canRespond, proposalId, navigation]);

    const handleAccept = useCallback(async () => {
        if (submitting || !canRespond) return;
        setSubmitting(true);
        try {
            await communityService.respondToMatchProposal(proposalId, true);
            navigation.goBack();
        } catch {
            setSubmitting(false);
            showToast.error('Could not submit response', 'Check your connection and try again.');
        }
    }, [submitting, canRespond, proposalId, navigation]);

    // Must be before early return — hooks cannot be called after a conditional return
    const photoCount = profileData?.photos?.length ?? 0;
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 40,
        onPanResponderRelease: (_, g) => {
            if (g.dx < -40) {
                setCurrentPhotoIndex(i => (i + 1) % photoCount);
            } else if (g.dx > 40) {
                setCurrentPhotoIndex(i => (i - 1 + photoCount) % photoCount);
            }
        },
    }), [photoCount]);

    if (loading || !partnerProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const photos = partnerProfile.photos || [];
    const photoUrl = photos[currentPhotoIndex]?.url || '';
    const karmaPts = partnerProfile.karma?.karmaPoints ?? 0;

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={PROFILE_CONTENT_STYLE}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero Image Section ────────────────────────── */}
                <View style={styles.heroContainer} {...panResponder.panHandlers}>
                    <ImageBackground
                        source={photoUrl ? { uri: photoUrl } : require('../../../assets/favicon.png')}
                        style={styles.heroImage}
                        imageStyle={styles.heroImageStyle}
                        resizeMode="cover"
                    >
                        {/* Left / right tap zones for photo navigation */}
                        {photos.length > 1 && (
                            <>
                                <TouchableWithoutFeedback onPress={() => setCurrentPhotoIndex(i => (i - 1 + photos.length) % photos.length)}>
                                    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.35 }} />
                                </TouchableWithoutFeedback>
                                <TouchableWithoutFeedback onPress={() => setCurrentPhotoIndex(i => (i + 1) % photos.length)}>
                                    <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.35 }} />
                                </TouchableWithoutFeedback>
                            </>
                        )}

                        {/* Status Bar / Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                            </TouchableOpacity>

                            {/* Pagination Indicators — driven by actual photo count */}
                            {photos.length > 1 && (
                                <View style={styles.paginationContainer}>
                                    {photos.map((_: any, i: number) => (
                                        <View
                                            key={i}
                                            style={[styles.paginationDot, i === currentPhotoIndex && styles.dotActive]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Profile Info Overlay (Bottom Left of Hero) */}
                        <View style={[styles.heroOverlayName, !isProposal && { top: 403 }]}>
                            <Text style={styles.heroName}>{partnerProfile.firstName}, {partnerProfile.age}</Text>
                        </View>

                        {isProposal && (
                            <View style={styles.heroOverlayMatched}>
                                <Sparkles size={14} color="#FFFFFF" fill="#FFFFFF" />
                                <Text style={styles.matchedByText}>Matched by</Text>
                                <View style={styles.avatarStack}>
                                    {endorserAvatars.length > 0
                                        ? endorserAvatars.map((uri, i) => (
                                            <View key={uri} style={[styles.stackAvatarContainer, { marginLeft: i === 0 ? 0 : -8 }]}>
                                                <Image source={{ uri }} style={styles.stackAvatar} />
                                            </View>
                                        ))
                                        : [0, 1, 2].map((_, i) => (
                                            <View key={i} style={[styles.stackAvatarContainer, { marginLeft: i === 0 ? 0 : -8, backgroundColor: '#D9D9D9' }]} />
                                        ))
                                    }
                                </View>
                            </View>
                        )}

                        {/* Karma Badge (Bottom Right of Hero) */}
                        <TouchableOpacity style={styles.karmaBadge} onPress={() => setShowKarmaModal(true)} activeOpacity={0.8}>
                            <Star size={14} color="#FFFFFF" strokeWidth={2} />
                            <Text style={styles.karmaText}>Karma points {karmaPts}</Text>
                        </TouchableOpacity>
                    </ImageBackground>
                </View>

                {/* ── Content Container ──────────────────────────── */}
                <View style={styles.content}>

                    {/* Community Validation Card — only shown when viewing a match proposal */}
                    {isProposal && <View style={styles.validationCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <View style={styles.iconCircle}>
                                    <Users size={18} color="#053763" />
                                </View>
                                <Text style={styles.cardTitle}>Community validation</Text>
                            </View>
                        </View>

                        <Text style={styles.scoreValue}>{communityScore}%</Text>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBackground]}>
                                <View style={[styles.progressFill, { width: `${communityScore}%` }]} />
                            </View>
                        </View>
                    </View>}

                    {/* Values Section */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeading}>Values</Text>
                        <View style={styles.tagGrid}>
                            {(partnerProfile.values ?? []).map((v: string) => (
                                <View key={v} style={styles.tag}>
                                    <Text style={styles.tagText}>{getEmoji(v, VALUES_EMOJI)} {v}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Interests Section */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeading}>Interests</Text>
                        <View style={styles.tagGrid}>
                            {(partnerProfile.interests ?? []).map((v: string) => (
                                <View key={v} style={styles.tag}>
                                    <Text style={styles.tagText}>{getEmoji(v, INTERESTS_EMOJI)} {v}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Deep Questions Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Deep questions</Text>
                        {deepQuestions.map((q, i) => (
                            <View key={i} style={styles.questionBox}>
                                <Text style={styles.questionTitle}>{i + 1}. {q.question}</Text>
                                <Text style={styles.answerText}>{q.answer}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView >

            {/* ── Action Buttons ─────────────────────────────── */}
            {isProposal && (
                canRespond ? (
                    <View style={[styles.floatingActions, { bottom: Math.max(insets.bottom + 20, 64) }]}>
                        <TouchableOpacity
                            style={[styles.btnX, submitting && { opacity: 0.5 }]}
                            onPress={handlePass}
                            disabled={submitting}
                        >
                            <X size={24} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnHeart, submitting && { opacity: 0.5 }]}
                            onPress={handleAccept}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.floatingActions, { bottom: Math.max(insets.bottom + 20, 64) }]}>
                        <View style={styles.waitingBadge}>
                            <Text style={styles.waitingText}>Waiting for their response</Text>
                        </View>
                    </View>
                )
            )}

            <KarmaInfoModal visible={showKarmaModal} onClose={() => setShowKarmaModal(false)} />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        marginBottom: 10,
    },
    waitingText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#D4AA01',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    heroContainer: {
        width: '100%',
        height: 451,
        paddingTop: 0,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroImageStyle: {
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 64,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paginationContainer: {
        position: 'absolute',
        top: 54,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationDot: {
        width: 16,
        height: 4,
        backgroundColor: '#D9D9D9',
        opacity: 0.2,
        borderRadius: 20,
    },
    dotActive: {
        backgroundColor: '#FFFFFF',
        opacity: 1,
    },
    heroOverlayName: {
        position: 'absolute',
        left: 18,
        top: 360,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderRadius: 9999,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    heroOverlayMatched: {
        position: 'absolute',
        left: 15,
        top: 403,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    heroName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 24,
        color: '#FFFFFF',
    },
    verifyBadge: {
        width: 20,
        height: 20,
        backgroundColor: '#2563EB',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    matchedByText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        color: '#FFFFFF',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    stackAvatarContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
    },
    stackAvatar: {
        width: '100%',
        height: '100%',
    },
    karmaBadge: {
        position: 'absolute',
        right: 9.34,
        top: 403,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderRadius: 9999,
        gap: 6,
    },
    karmaText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        color: '#F9FAFB',
    },
    content: {
        paddingHorizontal: 13,
        paddingTop: 13,
    },
    validationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 8,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 32,
        height: 32,
        backgroundColor: '#E8F0FF',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
        color: '#0F1724',
    },
    scoreValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 36,
        lineHeight: 36,
        color: '#2B6BE6',
        marginBottom: 8,
    },
    progressContainer: {
        marginTop: 8,
    },
    progressBackground: {
        width: '100%',
        height: 8,
        backgroundColor: '#F2F4F7',
        borderRadius: 9999,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2B6BE6',
        borderRadius: 9999,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(1, 1, 1, 0.1)',
        padding: 16,
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 16,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeading: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        lineHeight: 20,
        color: '#2563EB',
        marginBottom: 12,
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: 'rgba(1, 1, 1, 0.02)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(1, 1, 1, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#010101',
        opacity: 0.8,
    },
    questionBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(1, 1, 1, 0.1)',
        padding: 12,
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 14,
    },
    questionTitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        lineHeight: 22,
        color: '#010101',
        marginBottom: 4,
    },
    answerText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 15,
        lineHeight: 24,
        color: '#010101',
        opacity: 0.5,
    },
    floatingActions: {
        position: 'absolute',
        bottom: 64,
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 28,
        alignItems: 'center',
    },
    btnX: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#565164',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.28)',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 8,
    },
    btnHeart: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.28)',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 8,
    },
    homeIndicator: {
        position: 'absolute',
        bottom: 8,
        width: 134,
        height: 5,
        backgroundColor: '#010101',
        borderRadius: 100,
        alignSelf: 'center',
        opacity: 0.3,
    },
});