import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet,
    Modal, Pressable, Alert, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, X, Sparkles, Users, Star, Eye } from '../../components/icons/LucideReplacements';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile, getFullUserProfileById } from '../../services/profileService';
import { getOptimizedImageUrl, getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { KarmaInfoModal } from '../../components/community/karma/KarmaInfoModal';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { IconScoutIcon, EvaIcon } from '../../components/icons';
import { WineGlassIcon, CigaretteIcon, PillIcon } from '../../components/icons/Icons';
import { formatProfileValue } from '../../utils/formatProfileValue';
import { showToast } from '../../utils/toast';
import { removeFriend } from '../../services/friendService';
import { blockUser } from '../../services/blockService';
import { submitUserReport } from '../../services/matchService';
import { getCurrentUserId } from '../../services/communityBackendService.helpers';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { SHADOWS, OVERLAYS } from '../../theme/shadows';
import Svg, { Circle } from 'react-native-svg';
import { ProfileBadgesSection } from '../../components/badges/ProfileBadgesSection';

const REPORT_REASONS = [
    'Inappropriate content',
    'Harassment or bullying',
    'Spam or fake profile',
    'Makes me uncomfortable',
    'Other',
] as const;

const MoreVerticalIcon = ({ size = 24, color = '#FFF' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="5" r="1.5" fill={color} />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        <Circle cx="12" cy="19" r="1.5" fill={color} />
    </Svg>
);

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

export default function ProfileMatchScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const params = route.params || {};
    const insets = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const heroPhotoHeight = Math.round(screenHeight * 0.55);

    const isProposal = !!params.partnerProfile;
    const isPreview = !params.partnerProfile && !params.profile;

    const [submitting, setSubmitting] = useState(false);
    const [profileData, setProfileData] = useState<any>(params.partnerProfile || params.profile || null);
    const [loading, setLoading] = useState(isPreview);
    const [showKarmaModal, setShowKarmaModal] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showReportSheet, setShowReportSheet] = useState(false);
    const isMountedRef = React.useRef(true);

    const isProfileView = !isProposal && !isPreview && !!params.profile;
    const viewedUserId: string | undefined = params.profile?.userId;

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
            setLoading(true);
            getFullUserProfileById(params.profile.userId).then(full => {
                if (!isMountedRef.current || !full) return;
                const mergedPhotos = (full.photos && full.photos.length > 0)
                    ? full.photos
                    : (params.profile?.photos ?? []);
                setProfileData({ ...full, photos: mergedPhotos });
            }).catch(() => { /* keep whatever was passed */ }).finally(() => { if (isMountedRef.current) setLoading(false); });
        } else if (isProposal && params.partnerProfile?.userId) {
            getFullUserProfileById(params.partnerProfile.userId).then(full => {
                if (!isMountedRef.current || !full) return;
                const mergedPhotos = (full.photos && full.photos.length > 0)
                    ? full.photos
                    : (params.partnerProfile?.photos ?? []);
                setProfileData({ ...full, photos: mergedPhotos });
            }).catch(() => { /* profile already visible from params */ });
        }
    }, [isPreview, isProposal, params.profile?.userId, params.partnerProfile?.userId]);

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

    const allPhotos = useMemo(() => partnerProfile?.photos ?? [], [partnerProfile]);
    const inlinePhotos = useMemo(() => allPhotos.slice(1), [allPhotos]);

    const interleavedContent = useMemo(() => {
        const items: { type: 'photo' | 'question'; data: any }[] = [];
        let pIdx = 0;
        let qIdx = 0;
        while (pIdx < inlinePhotos.length || qIdx < deepQuestions.length) {
            if (qIdx < deepQuestions.length) {
                items.push({ type: 'question', data: deepQuestions[qIdx] });
                qIdx++;
            }
            if (pIdx < inlinePhotos.length) {
                items.push({ type: 'photo', data: inlinePhotos[pIdx] });
                pIdx++;
            }
        }
        return items;
    }, [inlinePhotos, deepQuestions]);

    const lifestyleItems = useMemo(() => {
        if (!partnerProfile) return [];
        const items: { label: string; value: string; icon: 'wine' | 'smiley' | 'cigarette' | 'pill' }[] = [];
        const { drinkingFrequency, cannabisFrequency, tobaccoFrequency, otherDrugsFrequency } = partnerProfile;
        if (drinkingFrequency && drinkingFrequency !== 'never' && drinkingFrequency !== 'irrelevant') {
            items.push({ label: 'Drinking', value: formatProfileValue(drinkingFrequency), icon: 'wine' });
        }
        if (cannabisFrequency && cannabisFrequency !== 'never' && cannabisFrequency !== 'irrelevant') {
            items.push({ label: 'Cannabis', value: formatProfileValue(cannabisFrequency), icon: 'smiley' });
        }
        if (tobaccoFrequency && tobaccoFrequency !== 'never' && tobaccoFrequency !== 'irrelevant') {
            items.push({ label: 'Tobacco', value: formatProfileValue(tobaccoFrequency), icon: 'cigarette' });
        }
        if (otherDrugsFrequency && otherDrugsFrequency !== 'never' && otherDrugsFrequency !== 'irrelevant') {
            items.push({ label: 'Other Drugs', value: formatProfileValue(otherDrugsFrequency), icon: 'pill' });
        }
        return items;
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

    const handleRemoveFriend = useCallback(() => {
        if (!viewedUserId) return;
        setShowActionSheet(false);
        Alert.alert(
            'Remove Friend',
            `Are you sure you want to remove ${partnerProfile?.firstName ?? 'this person'} as a friend?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await removeFriend(viewedUserId);
                        if (result.ok) {
                            showToast.success('Friend removed');
                            navigation.goBack();
                        } else {
                            showToast.error('Failed to remove friend');
                        }
                    },
                },
            ],
        );
    }, [viewedUserId, partnerProfile, navigation]);

    const handleBlockUser = useCallback(() => {
        if (!viewedUserId) return;
        setShowActionSheet(false);
        Alert.alert(
            'Block User',
            `Block ${partnerProfile?.firstName ?? 'this person'}? This will remove your friendship, cancel any active proposals, and end any matches between you.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await blockUser(viewedUserId);
                        if (result.ok) {
                            showToast.success('User blocked');
                            navigation.goBack();
                        } else {
                            showToast.error('Failed to block user');
                        }
                    },
                },
            ],
        );
    }, [viewedUserId, partnerProfile, navigation]);

    const handleReportUser = useCallback((reason: string) => {
        if (!viewedUserId) return;
        setShowReportSheet(false);
        Alert.alert(
            'Report User',
            `Report ${partnerProfile?.firstName ?? 'this person'} for "${reason}"? Our team will review this.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Report',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const reporterId = await getCurrentUserId();
                            await submitUserReport({
                                reporterId,
                                reportedUserId: viewedUserId,
                                reportedUserName: partnerProfile?.firstName ?? 'Unknown',
                                reason,
                                details: '',
                            });
                            showToast.success('Report submitted', 'Our team will review this.');
                        } catch {
                            showToast.error('Failed to submit report');
                        }
                    },
                },
            ],
        );
    }, [viewedUserId, partnerProfile]);

    if (loading || !partnerProfile) {
        return (
            <View style={styles.loadingContainer} accessibilityLabel="Loading profile">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (partnerProfile.role === 'matchmaker') {
        const matchmakerPhoto = allPhotos[0]?.url;
        const matchmakerKarma = partnerProfile.karma?.karma_points ?? 0;
        return (
            <View style={styles.container}>
                <View style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
                    <View style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10 }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.backButton}
                            accessibilityLabel="Go back"
                            accessibilityRole="button"
                        >
                            <ArrowLeft size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'center', paddingTop: insets.top + 60, paddingHorizontal: 24 }}>
                        {matchmakerPhoto ? (
                            <Image
                                source={{ uri: getOptimizedPhotoUrl(matchmakerPhoto, 'card') }}
                                style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#E5E7EB' }}
                                contentFit="cover"
                                accessibilityLabel={`${partnerProfile.firstName}'s photo`}
                            />
                        ) : (
                            <View style={styles.photoPlaceholder} accessibilityLabel="No photo available">
                                <EvaIcon name="person" variant="outline" size={48} color="#9CA3AF" />
                            </View>
                        )}

                        <Text
                            style={{ fontFamily: FONTS.bold, fontSize: FONT_SIZES['3xl'], color: '#1F2937', marginTop: 16, textAlign: 'center' }}
                            numberOfLines={2}
                            accessibilityRole="header"
                        >
                            {partnerProfile.firstName}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12, gap: 6 }}>
                            <EvaIcon name="lock" variant="fill" size={16} color={COLORS.primary} />
                            <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.sm, color: COLORS.primary }}>
                                Matchmaker
                            </Text>
                        </View>

                        <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.md, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
                            Not in the dating pool
                        </Text>

                        <View style={{ flexDirection: 'row', marginTop: 24, gap: 32 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontFamily: FONTS.bold, fontSize: FONT_SIZES.xl, color: '#1F2937' }}>
                                    {matchmakerKarma}
                                </Text>
                                <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: '#9CA3AF', marginTop: 2 }}>
                                    Karma
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    const heroPhoto = allPhotos[0]?.url ?? '';
    const karmaPts = partnerProfile.karma?.karma_points ?? 0;
    const heightStr = formatHeight(partnerProfile.height);
    const sharedInterestsSet = new Set(inCommon.interests.map((i: string) => i.toLowerCase()));
    const sharedValuesSet = new Set(inCommon.values.map((v: string) => v.toLowerCase()));

    const subtitleParts: string[] = [];
    if (partnerProfile.school) subtitleParts.push(partnerProfile.school);
    if (partnerProfile.education) subtitleParts.push(partnerProfile.education);
    if (partnerProfile.currentJob) subtitleParts.push(partnerProfile.currentJob);
    const heroSubtitleStr = subtitleParts.join(' \u00B7 ');

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: isProposal ? 150 : 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.heroContainer, { height: heroPhotoHeight }]}>
                    {heroPhoto ? (
                        <Image
                            source={{ uri: getOptimizedPhotoUrl(heroPhoto, 'profile') }}
                            style={{ width: '100%', height: heroPhotoHeight }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            priority="high"
                            transition={300}
                            accessibilityLabel={`${partnerProfile.firstName}'s profile photo`}
                        />
                    ) : (
                        <View style={[styles.heroPlaceholder, { height: heroPhotoHeight }]} accessibilityLabel="No photo available">
                            <EvaIcon name="person" variant="outline" size={64} color="#9CA3AF" />
                        </View>
                    )}
                    <LinearGradient
                        colors={[OVERLAYS.light, 'transparent', OVERLAYS.heavy]}
                        locations={[0, 0.35, 1]}
                        style={StyleSheet.absoluteFillObject}
                    />

                    <View style={[styles.header, { position: 'absolute', top: insets.top + 8, left: 0, right: 0 }]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            accessibilityLabel="Go back"
                            accessibilityRole="button"
                        >
                            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                        </TouchableOpacity>
                        {isProfileView ? (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setShowActionSheet(true)}
                                accessibilityLabel="More options"
                                accessibilityRole="button"
                            >
                                <MoreVerticalIcon size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        ) : (
                            <View />
                        )}
                    </View>

                    <View style={styles.heroBottom}>
                        <View style={styles.heroInfoLeft}>
                            <Text style={styles.heroName} numberOfLines={1} accessibilityRole="header">
                                {partnerProfile.firstName}, {partnerProfile.age}
                            </Text>

                            {(heightStr || heroSubtitleStr.length > 0) && (
                                <Text style={styles.heroSubtitle} numberOfLines={2}>
                                    {[heightStr, heroSubtitleStr].filter(Boolean).join(' \u00B7 ')}
                                </Text>
                            )}

                            {isProposal && (
                                <View style={styles.matchedByRow} accessibilityLabel={`Matched by ${endorserAvatars.length} friends`}>
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
                                                        transition={0}
                                                        cachePolicy="memory-disk"
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

                        <TouchableOpacity
                            style={styles.karmaPill}
                            onPress={() => setShowKarmaModal(true)}
                            activeOpacity={0.8}
                            accessibilityLabel={`${karmaPts} karma points. Tap to learn more`}
                            accessibilityRole="button"
                        >
                            <Star size={12} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.karmaText}>{karmaPts}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.content}>
                    {isPreview && (
                        <View style={styles.previewBanner} accessibilityLabel="Profile preview mode">
                            <Eye size={16} color={COLORS.primary} strokeWidth={2} />
                            <Text style={styles.previewBannerText}>This is how others see your profile</Text>
                        </View>
                    )}

                    {isProposal && (
                        <View style={styles.validationCard} accessibilityLabel={`Community validation score: ${communityScore} percent`}>
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

                    {partnerProfile.userId && (
                        <ProfileBadgesSection userId={partnerProfile.userId} revealAuthor={false} />
                    )}

                    {interleavedContent.map((item, idx) => {
                        if (item.type === 'photo') {
                            return (
                                <View key={`il-${idx}`} style={styles.inlinePhotoWrap}>
                                    <Image
                                        source={{ uri: getOptimizedPhotoUrl(item.data.url, 'match') ?? item.data.url }}
                                        style={styles.inlinePhoto}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        priority="normal"
                                        transition={300}
                                        accessibilityLabel={`${partnerProfile.firstName}'s photo ${idx + 2}`}
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

                    {((partnerProfile.values?.length > 0) || (partnerProfile.interests?.length > 0)) && (
                        <View style={styles.card}>
                            {partnerProfile.values?.length > 0 && (
                                <>
                                    <Text style={styles.chipSectionLabel}>VALUES</Text>
                                    <View style={styles.chipRow}>
                                        {partnerProfile.values.map((v: string) => {
                                            const shared = sharedValuesSet.has(v.toLowerCase());
                                            return (
                                                <View key={v} style={[styles.tag, styles.tagValue, shared && styles.tagSharedValue]}>
                                                    {valueIconName(v) && <IconScoutIcon name={valueIconName(v)!} size={15} style={{ marginRight: 5 }} />}
                                                    <Text style={[styles.tagText, styles.tagTextValue, shared && styles.tagTextSharedValue]}>{v}</Text>
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
                                                <View key={i} style={[styles.tag, styles.tagInterest, shared && styles.tagSharedInterest]}>
                                                    {interestIconName(i) && <IconScoutIcon name={interestIconName(i)!} size={15} style={{ marginRight: 5 }} />}
                                                    <Text style={[styles.tagText, styles.tagTextInterest, shared && styles.tagTextSharedInterest]}>{i}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </View>
                    )}

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
                                        {item.icon === 'smiley' && <EvaIcon name="smiling-face" variant="outline" size={16} color={COLORS.text.secondary} />}
                                        {item.icon === 'cigarette' && <CigaretteIcon size={16} color={COLORS.text.secondary} />}
                                        {item.icon === 'pill' && <PillIcon size={16} color={COLORS.text.secondary} />}
                                        <Text style={styles.lifestyleLabel}>{item.label}</Text>
                                    </View>
                                    <Text style={styles.lifestyleValue}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {isProposal && (
                canRespond ? (
                    <View style={[styles.floatingActions, { bottom: insets.bottom + 20 }]}>
                        <TouchableOpacity
                            style={[styles.btnX, submitting && { opacity: 0.5 }]}
                            onPress={handlePass}
                            disabled={submitting}
                            accessibilityLabel="Pass on this match"
                            accessibilityRole="button"
                        >
                            <X size={24} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnHeart, submitting && { opacity: 0.5 }]}
                            onPress={handleAccept}
                            disabled={submitting}
                            accessibilityLabel="Accept this match"
                            accessibilityRole="button"
                        >
                            {submitting
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.floatingActions, { bottom: insets.bottom + 20 }]}>
                        <View style={styles.waitingBadge} accessibilityLabel="Waiting for their response">
                            <Text style={styles.waitingText}>Waiting for their response</Text>
                        </View>
                    </View>
                )
            )}

            <KarmaInfoModal visible={showKarmaModal} onClose={() => setShowKarmaModal(false)} />

            <Modal
                visible={showActionSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowActionSheet(false)}
            >
                <Pressable style={styles.sheetOverlay} onPress={() => setShowActionSheet(false)}>
                    <Pressable style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}>
                        <TouchableOpacity style={styles.sheetOption} onPress={handleRemoveFriend} accessibilityLabel="Remove friend" accessibilityRole="button">
                            <Text style={styles.sheetOptionText}>Remove Friend</Text>
                        </TouchableOpacity>
                        <View style={styles.sheetDivider} />
                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => { setShowActionSheet(false); setTimeout(() => setShowReportSheet(true), 300); }}
                            accessibilityLabel="Report user"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.sheetOptionText, styles.sheetDestructive]}>Report User</Text>
                        </TouchableOpacity>
                        <View style={styles.sheetDivider} />
                        <TouchableOpacity style={styles.sheetOption} onPress={handleBlockUser} accessibilityLabel="Block user" accessibilityRole="button">
                            <Text style={[styles.sheetOptionText, styles.sheetDestructive]}>Block User</Text>
                        </TouchableOpacity>
                        <View style={styles.sheetDivider} />
                        <TouchableOpacity style={styles.sheetOption} onPress={() => setShowActionSheet(false)} accessibilityLabel="Cancel" accessibilityRole="button">
                            <Text style={styles.sheetCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showReportSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReportSheet(false)}
            >
                <Pressable style={styles.sheetOverlay} onPress={() => setShowReportSheet(false)}>
                    <Pressable style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}>
                        <Text style={styles.reportSheetTitle}>Why are you reporting this person?</Text>
                        {REPORT_REASONS.map((reason, idx) => (
                            <React.Fragment key={reason}>
                                {idx > 0 && <View style={styles.sheetDivider} />}
                                <TouchableOpacity
                                    style={styles.sheetOption}
                                    onPress={() => handleReportUser(reason)}
                                    accessibilityLabel={`Report for: ${reason}`}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.sheetOptionText}>{reason}</Text>
                                </TouchableOpacity>
                            </React.Fragment>
                        ))}
                        <View style={styles.sheetDivider} />
                        <TouchableOpacity style={styles.sheetOption} onPress={() => setShowReportSheet(false)} accessibilityLabel="Cancel report" accessibilityRole="button">
                            <Text style={styles.sheetCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

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
    heroContainer: {
        width: '100%',
        overflow: 'hidden',
    },
    heroPlaceholder: {
        width: '100%',
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: OVERLAYS.light,
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
        backgroundColor: OVERLAYS.light,
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
        backgroundColor: OVERLAYS.light,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
        marginBottom: 4,
        minHeight: 44,
    },
    karmaText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.md,
        color: '#FFFFFF',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
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
    },
    promptQuestion: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.base,
        color: COLORS.primary,
        marginBottom: 8,
        lineHeight: LINE_HEIGHTS.base,
    },
    promptAnswer: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.heading,
        lineHeight: LINE_HEIGHTS['2xl'],
    },
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
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F7F5',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E8E5E0',
    },
    tagValue: {
        backgroundColor: '#F0FDF4',
        borderColor: '#D1FAE5',
    },
    tagInterest: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FED7AA',
    },
    tagSharedValue: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    tagSharedInterest: {
        backgroundColor: '#FFEDD5',
        borderColor: '#FB923C',
    },
    tagText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.base,
        color: COLORS.text.primary,
    },
    tagTextValue: {
        color: '#166534',
    },
    tagTextInterest: {
        color: '#9A3412',
    },
    tagTextSharedValue: {
        color: '#14532D',
        fontFamily: FONTS.bold,
    },
    tagTextSharedInterest: {
        color: '#7C2D12',
        fontFamily: FONTS.bold,
    },
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
    sheetOverlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        ...SHADOWS.lg,
    },
    sheetOption: {
        paddingVertical: 18,
        alignItems: 'center',
        minHeight: 44,
    },
    sheetOptionText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.primary,
    },
    sheetDestructive: {
        color: '#EF4444',
    },
    sheetCancelText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.secondary,
    },
    sheetDivider: {
        height: 1,
        backgroundColor: COLORS.borderSubtle,
        marginHorizontal: 20,
    },
    reportSheetTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.heading,
        textAlign: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
});
