import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ImageBackground, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, X, Sparkles, Users, Star, Eye } from '../../components/icons/LucideReplacements';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile, getFullUserProfileById } from '../../services/profileService';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { KarmaInfoModal } from '../../components/community/karma/KarmaInfoModal';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { IconScoutIcon } from '../../components/icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon } from '../../components/icons/Icons';
import { formatProfileValue } from '../../utils/formatProfileValue';
import { showToast } from '../../utils/toast';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SHADOWS } from '../../theme/shadows';

// ── Helpers (module-level, no re-creation) ─────────────────────────

const formatHeight = (height: any): string | null => {
    if (!height) return null;
    if (typeof height === 'string') return height;
    if (typeof height === 'number') {
        const feet = Math.floor(height / 12);
        const inches = height % 12;
        return `${feet}'${inches}"`;
    }
    return null;
};

// ════════════════════════════════════════════════════════════════════

export default function ProfileMatchScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const params = route.params || {};
    const insets = useSafeAreaInsets();

    // Mode detection
    const isProposal = !!params.partnerProfile;
    const isPreview = !params.partnerProfile && !params.profile;

    const [submitting, setSubmitting] = useState(false);
    const [profileData, setProfileData] = useState<any>(params.partnerProfile || params.profile || null);
    const [loading, setLoading] = useState(isPreview);
    const [showKarmaModal, setShowKarmaModal] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const isMountedRef = React.useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Fetch the profile being viewed
    useEffect(() => {
        if (isPreview) {
            getUserProfile().then(result => {
                if (isMountedRef.current && result.ok && result.data) setProfileData(result.data);
            }).finally(() => { if (isMountedRef.current) setLoading(false); });
        } else if (!isProposal && params.profile?.userId) {
            setLoading(true);
            getFullUserProfileById(params.profile.userId).then(full => {
                if (isMountedRef.current && full) setProfileData(full);
            }).catch(() => { /* keep whatever was passed */ }).finally(() => { if (isMountedRef.current) setLoading(false); });
        } else if (isProposal && params.partnerProfile?.userId) {
            getFullUserProfileById(params.partnerProfile.userId).then(full => {
                if (isMountedRef.current && full) setProfileData(full);
            }).catch(() => { /* profile already visible from params */ });
        }
    }, [isPreview, isProposal, params.profile?.userId, params.partnerProfile?.userId]);

    // Fetch current user's profile for "in common" highlighting
    useEffect(() => {
        if (!isPreview) {
            getUserProfile().then(result => {
                if (isMountedRef.current && result.ok && result.data) setCurrentUserProfile(result.data);
            });
        }
    }, [isPreview]);

    const partnerProfile = profileData;
    const communityScore: number = params.communityScore ?? 0;
    const endorsers: any[] = params.endorsers ?? [];
    const screenState: string = params.screenState ?? '';
    const proposalId: string = params.proposalId ?? '';
    const canRespond = isProposal && (screenState === 'awaiting_you' || screenState === 'neither_voted');

    // ── Derived data (all hooks before early return) ────────────────

    const endorserAvatars = useMemo<string[]>(() =>
        (endorsers ?? [])
            .map((e: any) => {
                const profile = e.endorserProfile ?? e;
                return profile?.photos?.[0]?.url ?? profile?.photoUrl ?? profile?.photo ?? null;
            })
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
                ((partnerProfile as any)?.deepQuestions ?? []).find((q: any) => q.questionId === id)
            )
            .filter(Boolean)
            .map((q: any) => ({ question: q.question, answer: q.answer }));

        const result = fromDisplayed.length > 0 ? fromDisplayed : allAnswered;
        return result.filter((q: { question: string; answer: string }) => q.question && q.answer);
    }, [partnerProfile]);

    const inCommon = useMemo(() => {
        if (!currentUserProfile || !partnerProfile) return { interests: [] as string[], values: [] as string[] };
        const myInterests = new Set((currentUserProfile.interests ?? []).map((i: string) => i.toLowerCase()));
        const myValues = new Set((currentUserProfile.values ?? []).map((v: string) => v.toLowerCase()));
        return {
            interests: (partnerProfile.interests ?? []).filter((i: string) => myInterests.has(i.toLowerCase())),
            values: (partnerProfile.values ?? []).filter((v: string) => myValues.has(v.toLowerCase())),
        };
    }, [currentUserProfile, partnerProfile]);

    // Photos: hero = first, inline = rest (for photo-prompt interleave)
    const allPhotos = useMemo(() => partnerProfile?.photos ?? [], [partnerProfile]);
    const inlinePhotos = useMemo(() => allPhotos.slice(1), [allPhotos]);

    // Interleave: photo, question, photo, question...
    const interleavedContent = useMemo(() => {
        const items: { type: 'photo' | 'question'; data: any }[] = [];
        let pIdx = 0;
        let qIdx = 0;
        while (pIdx < inlinePhotos.length || qIdx < deepQuestions.length) {
            if (pIdx < inlinePhotos.length) {
                items.push({ type: 'photo', data: inlinePhotos[pIdx] });
                pIdx++;
            }
            if (qIdx < deepQuestions.length) {
                items.push({ type: 'question', data: deepQuestions[qIdx] });
                qIdx++;
            }
        }
        return items;
    }, [inlinePhotos, deepQuestions]);

    const lifestyleItems = useMemo(() => {
        if (!partnerProfile) return [];
        const items: { label: string; value: string; icon: 'wine' | 'leaf' | 'cigarette' }[] = [];
        const { drinkingFrequency, cannabisFrequency, tobaccoFrequency } = partnerProfile;
        if (drinkingFrequency && drinkingFrequency !== 'never' && drinkingFrequency !== 'irrelevant') {
            items.push({ label: 'Drinking', value: formatProfileValue(drinkingFrequency), icon: 'wine' });
        }
        if (cannabisFrequency && cannabisFrequency !== 'never' && cannabisFrequency !== 'irrelevant') {
            items.push({ label: 'Cannabis', value: formatProfileValue(cannabisFrequency), icon: 'leaf' });
        }
        if (tobaccoFrequency && tobaccoFrequency !== 'never' && tobaccoFrequency !== 'irrelevant') {
            items.push({ label: 'Tobacco', value: formatProfileValue(tobaccoFrequency), icon: 'cigarette' });
        }
        return items;
    }, [partnerProfile]);

    // ── Actions ─────────────────────────────────────────────────────

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
    }, [submitting, canRespond, proposalId, partnerProfile, navigation]);

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

    // ── Early return ────────────────────────────────────────────────

    if (loading || !partnerProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const heroPhoto = allPhotos[0]?.url ?? '';
    const karmaPts = partnerProfile.karma?.karma_points ?? 0;
    const heightStr = formatHeight(partnerProfile.height);
    const hasInCommon = !isPreview && (inCommon.interests.length > 0 || inCommon.values.length > 0);
    const sharedInterestsSet = new Set(inCommon.interests.map((i: string) => i.toLowerCase()));
    const sharedValuesSet = new Set(inCommon.values.map((v: string) => v.toLowerCase()));
    const totalInCommon = inCommon.interests.length + inCommon.values.length;

    // Build hero subtitle: "School · Education · Job" (only non-empty parts)
    const subtitleParts: string[] = [];
    if (partnerProfile.school) subtitleParts.push(partnerProfile.school);
    if (partnerProfile.education) subtitleParts.push(partnerProfile.education);
    if (partnerProfile.currentJob) subtitleParts.push(partnerProfile.currentJob);
    const heroSubtitleStr = subtitleParts.join(' \u00B7 ');

    // ════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: isProposal ? 150 : 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero Photo ───────────────────────────────────── */}
                <View style={styles.heroContainer}>
                    <ImageBackground
                        source={heroPhoto ? { uri: heroPhoto } : require('../../../assets/favicon.png')}
                        style={styles.heroImage}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.65)']}
                            locations={[0, 0.35, 1]}
                            style={StyleSheet.absoluteFillObject}
                        />

                        {/* Header row — back button + photo count */}
                        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                            </TouchableOpacity>
                            {allPhotos.length > 1 && (
                                <View style={styles.photoCountPill}>
                                    <Text style={styles.photoCountText}>1 / {allPhotos.length}</Text>
                                </View>
                            )}
                        </View>

                        {/* Bottom overlay — name, subtitle, matched-by */}
                        <View style={styles.heroBottom}>
                            <View style={styles.heroInfoLeft}>
                                <Text style={styles.heroName}>
                                    {partnerProfile.firstName}, {partnerProfile.age}
                                    {heightStr ? <Text style={styles.heroDetail}>{`  ${heightStr}`}</Text> : null}
                                </Text>

                                {heroSubtitleStr.length > 0 && (
                                    <Text style={styles.heroSubtitle} numberOfLines={2}>
                                        {heroSubtitleStr}
                                    </Text>
                                )}

                                {isProposal && (
                                    <View style={styles.matchedByRow}>
                                        <Sparkles size={12} color="#FFFFFF" fill="#FFFFFF" />
                                        <Text style={styles.matchedByText}>Matched by</Text>
                                        <View style={styles.avatarStack}>
                                            {endorserAvatars.length > 0
                                                ? endorserAvatars.map((uri, i) => (
                                                    <View key={`endorser-${i}`} style={[styles.stackAvatarWrap, { marginLeft: i === 0 ? 0 : -8 }]}>
                                                        <Image
                                                            source={{ uri: getOptimizedImageUrl(uri, 24) }}
                                                            style={styles.stackAvatar}
                                                            contentFit="cover"
                                                            transition={200}
                                                            cachePolicy="disk"
                                                        />
                                                    </View>
                                                ))
                                                : [0, 1, 2].map((_, i) => (
                                                    <View key={i} style={[styles.stackAvatarWrap, { marginLeft: i === 0 ? 0 : -8, backgroundColor: COLORS.paginationInactive }]} />
                                                ))
                                            }
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Karma — subtle pill */}
                            <TouchableOpacity style={styles.karmaPill} onPress={() => setShowKarmaModal(true)} activeOpacity={0.8}>
                                <Star size={12} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.karmaText}>{karmaPts}</Text>
                            </TouchableOpacity>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── Content Below Hero ────────────────────────────── */}
                <View style={styles.content}>

                    {/* Preview Mode Banner */}
                    {isPreview && (
                        <View style={styles.previewBanner}>
                            <Eye size={16} color={COLORS.primary} strokeWidth={2} />
                            <Text style={styles.previewBannerText}>This is how others see your profile</Text>
                        </View>
                    )}

                    {/* Community Validation — match proposals only */}
                    {isProposal && (
                        <View style={styles.validationCard}>
                            <View style={styles.cardHeaderRow}>
                                <View style={styles.iconCircle}>
                                    <Users size={16} color={COLORS.primary} />
                                </View>
                                <Text style={styles.cardTitle}>Community validation</Text>
                            </View>
                            <Text style={styles.scoreValue}>{communityScore}%</Text>
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFill, { width: `${communityScore}%` }]} />
                            </View>
                        </View>
                    )}

                    {/* "What You Have in Common" */}
                    {hasInCommon && (
                        <View style={styles.inCommonCard}>
                            <View style={styles.inCommonHeader}>
                                <View style={styles.inCommonIconCircle}>
                                    <Sparkles size={14} color="#166534" />
                                </View>
                                <View>
                                    <Text style={styles.inCommonTitle}>What you have in common</Text>
                                    <Text style={styles.inCommonCount}>{totalInCommon} shared trait{totalInCommon !== 1 ? 's' : ''}</Text>
                                </View>
                            </View>
                            <View style={styles.chipRow}>
                                {inCommon.values.map((v: string) => (
                                    <View key={`cv-${v}`} style={styles.inCommonChip}>
                                        {valueIconName(v) && <IconScoutIcon name={valueIconName(v)!} size={14} style={{ marginRight: 4 }} />}
                                        <Text style={styles.inCommonChipText}>{v}</Text>
                                    </View>
                                ))}
                                {inCommon.interests.map((i: string) => (
                                    <View key={`ci-${i}`} style={styles.inCommonChip}>
                                        {interestIconName(i) && <IconScoutIcon name={interestIconName(i)!} size={14} style={{ marginRight: 4 }} />}
                                        <Text style={styles.inCommonChipText}>{i}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Photo + Prompt Interleave ────────────────── */}
                    {interleavedContent.map((item, idx) => {
                        if (item.type === 'photo') {
                            return (
                                <View key={`il-${idx}`} style={styles.inlinePhotoWrap}>
                                    <Image
                                        source={{ uri: item.data.url }}
                                        style={styles.inlinePhoto}
                                        contentFit="cover"
                                        transition={300}
                                    />
                                </View>
                            );
                        }
                        return (
                            <View key={`il-${idx}`} style={styles.promptCard}>
                                <View style={styles.promptAccent} />
                                <View style={styles.promptContent}>
                                    <Text style={styles.promptQuestion}>{item.data.question}</Text>
                                    <Text style={styles.promptAnswer}>{item.data.answer}</Text>
                                </View>
                            </View>
                        );
                    })}

                    {/* ── Interests & Values ────────────────────────── */}
                    {((partnerProfile.values?.length > 0) || (partnerProfile.interests?.length > 0)) && (
                        <View style={styles.card}>
                            {partnerProfile.values?.length > 0 && (
                                <>
                                    <Text style={styles.chipSectionLabel}>VALUES</Text>
                                    <View style={styles.chipRow}>
                                        {partnerProfile.values.map((v: string) => {
                                            const shared = sharedValuesSet.has(v.toLowerCase());
                                            return (
                                                <View key={v} style={[styles.tag, shared && styles.tagShared]}>
                                                    {valueIconName(v) && <IconScoutIcon name={valueIconName(v)!} size={15} style={{ marginRight: 5 }} />}
                                                    <Text style={[styles.tagText, shared && styles.tagTextShared]}>{v}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                            {partnerProfile.interests?.length > 0 && (
                                <>
                                    <Text style={[styles.chipSectionLabel, partnerProfile.values?.length > 0 && { marginTop: 18 }]}>INTERESTS</Text>
                                    <View style={styles.chipRow}>
                                        {partnerProfile.interests.map((i: string) => {
                                            const shared = sharedInterestsSet.has(i.toLowerCase());
                                            return (
                                                <View key={i} style={[styles.tag, shared && styles.tagShared]}>
                                                    {interestIconName(i) && <IconScoutIcon name={interestIconName(i)!} size={15} style={{ marginRight: 5 }} />}
                                                    <Text style={[styles.tagText, shared && styles.tagTextShared]}>{i}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {/* ── Lifestyle ─────────────────────────────────── */}
                    {lifestyleItems.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardSectionTitle}>Lifestyle</Text>
                            {lifestyleItems.map((item, idx) => (
                                <View
                                    key={idx}
                                    style={[styles.lifestyleRow, idx < lifestyleItems.length - 1 && styles.lifestyleRowBorder]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {item.icon === 'wine' && <WineGlassIcon size={16} color={COLORS.text.secondary} />}
                                        {item.icon === 'leaf' && <LeafIcon size={16} color={COLORS.text.secondary} />}
                                        {item.icon === 'cigarette' && <CigaretteIcon size={16} color={COLORS.text.secondary} />}
                                        <Text style={styles.lifestyleLabel}>{item.label}</Text>
                                    </View>
                                    <Text style={styles.lifestyleValue}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Floating Action Buttons (match proposals only) ───── */}
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
                            {submitting
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />}
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
        </View>
    );
}

// ════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.screenBackground,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.screenBackground,
    },

    // ── Hero ──────────────────────────────────────────────────────

    heroContainer: {
        width: '100%',
        height: 480,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    heroInfoLeft: {
        flex: 1,
        marginRight: 12,
    },
    heroName: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES['5xl'],
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    heroDetail: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES['3xl'],
        color: 'rgba(255,255,255,0.9)',
    },
    heroSubtitle: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.lg,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 3,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    matchedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 6,
    },
    matchedByText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.md,
        color: '#FFFFFF',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 2,
    },
    stackAvatarWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.6)',
        overflow: 'hidden',
    },
    stackAvatar: {
        width: '100%',
        height: '100%',
    },
    karmaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
        marginBottom: 4,
    },
    karmaText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.md,
        color: '#FFFFFF',
    },
    photoCountPill: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    photoCountText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: '#FFFFFF',
    },

    // ── Content Area ─────────────────────────────────────────────

    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // ── Preview Banner ───────────────────────────────────────────

    previewBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.backgroundInfoBlue,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.borderBlue,
    },
    previewBannerText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.base,
        color: COLORS.primary,
    },

    // ── Community Validation Card ────────────────────────────────

    validationCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 18,
        ...SHADOWS.md,
        marginBottom: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        backgroundColor: COLORS.backgroundIconBlue,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.heading,
    },
    scoreValue: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES['6xl'],
        color: COLORS.scoreBlue,
        marginBottom: 8,
    },
    progressBg: {
        width: '100%',
        height: 6,
        backgroundColor: COLORS.backgroundProgressTrack,
        borderRadius: 3,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.scoreBlue,
        borderRadius: 3,
    },

    // ── "What You Have in Common" ────────────────────────────────

    inCommonCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    inCommonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    inCommonIconCircle: {
        width: 32,
        height: 32,
        backgroundColor: '#DCFCE7',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inCommonTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: '#166534',
    },
    inCommonCount: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: '#15803D',
        marginTop: 1,
    },

    // ── Inline Photo ─────────────────────────────────────────────

    inlinePhotoWrap: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    inlinePhoto: {
        width: '100%',
        height: 420,
        borderRadius: 20,
    },

    // ── Prompt Card ──────────────────────────────────────────────

    promptCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        paddingLeft: 0,
        marginBottom: 16,
        flexDirection: 'row',
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    promptAccent: {
        width: 4,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        backgroundColor: COLORS.primary,
        marginRight: 16,
    },
    promptContent: {
        flex: 1,
        paddingVertical: 0,
    },
    promptQuestion: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.base,
        color: COLORS.primary,
        marginBottom: 8,
        lineHeight: 18,
    },
    promptAnswer: {
        fontFamily: FONTS.regular,
        fontSize: 17,
        color: COLORS.text.heading,
        lineHeight: 26,
    },

    // ── Generic Card ─────────────────────────────────────────────

    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        ...SHADOWS.sm,
    },
    cardSectionTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.text.heading,
        marginBottom: 12,
    },

    // ── Chip Rows (shared between In Common + Values/Interests) ──

    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chipSectionLabel: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
        marginBottom: 10,
        letterSpacing: 1,
    },
    inCommonChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    inCommonChipText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.md,
        color: '#166534',
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundGray,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tagShared: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    tagText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: COLORS.text.primary,
    },
    tagTextShared: {
        color: '#166534',
        fontFamily: FONTS.medium,
    },

    // ── Lifestyle ────────────────────────────────────────────────

    lifestyleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    lifestyleRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderSubtle,
    },
    lifestyleLabel: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.primary,
        marginLeft: 10,
    },
    lifestyleValue: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.secondary,
    },

    // ── Floating Actions ─────────────────────────────────────────

    floatingActions: {
        position: 'absolute',
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 28,
        alignItems: 'center',
    },
    btnX: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: COLORS.passButton,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.lg,
    },
    btnHeart: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.lg,
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
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.base,
        color: COLORS.waitingAmber,
    },
});
