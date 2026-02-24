import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ImageBackground, Image, ActivityIndicator, StyleSheet, Dimensions
} from 'react-native';
import { ArrowLeft, Check, Star, Heart, X, Sparkles, Users } from 'lucide-react-native';
import { getProfileById } from '../services/profileService';
import { Profile } from '../types/profile';

export default function ProfileMatchScreen() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // Returns elsa by default now from profileService
                const data = await getProfileById('elsa');
                setProfile(data);
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Profile not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 150 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero Image Section ────────────────────────── */}
                <View style={styles.heroContainer}>
                    <ImageBackground
                        source={typeof profile.image === 'string' ? { uri: profile.image } : profile.image}
                        style={styles.heroImage}
                        imageStyle={styles.heroImageStyle}
                        resizeMode="cover"
                    >
                        {/* Status Bar / Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton}>
                                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                            </TouchableOpacity>

                            {/* Pagination Indicators */}
                            <View style={styles.paginationContainer}>
                                <View style={[styles.paginationDot, styles.dotActive]} />
                                <View style={styles.paginationDot} />
                                <View style={styles.paginationDot} />
                                <View style={styles.paginationDot} />
                                <View style={styles.paginationDot} />
                                <View style={styles.paginationDot} />
                            </View>
                        </View>

                        {/* Profile Info Overlay (Bottom Left of Hero) */}
                        <View style={styles.heroOverlayName}>
                            <Text style={styles.heroName}>{profile.name}, {profile.age}</Text>
                            {profile.isVerified && (
                                <View style={styles.verifyBadge}>
                                    <Check size={10} color="#FFFFFF" strokeWidth={4} />
                                </View>
                            )}
                        </View>

                        <View style={styles.heroOverlayMatched}>
                            <Sparkles size={14} color="#FFFFFF" fill="#FFFFFF" />
                            <Text style={styles.matchedByText}>Matched by</Text>
                            <View style={styles.avatarStack}>
                                {profile.matchedBy.map((uri, i) => (
                                    <View key={i} style={[styles.stackAvatarContainer, { marginLeft: i === 0 ? 0 : -8 }]}>
                                        <Image
                                            source={{ uri }}
                                            style={styles.stackAvatar}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Karma Badge (Bottom Right of Hero) */}
                        <View style={styles.karmaBadge}>
                            <Star size={14} color="#FFFFFF" strokeWidth={2} />
                            <Text style={styles.karmaText}>Karma points {profile.karmaPoints}</Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── Content Container ──────────────────────────── */}
                <View style={styles.content}>

                    {/* Community Validation Card */}
                    <View style={styles.validationCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <View style={styles.iconCircle}>
                                    <Users size={18} color="#053763" />
                                </View>
                                <Text style={styles.cardTitle}>Community validation</Text>
                            </View>
                            <TouchableOpacity style={styles.whyMatchButton}>
                                <View style={styles.whyMatchIconCircle}>
                                    <Sparkles size={10} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
                                </View>
                                <Text style={styles.whyMatchText}>Why this match</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.scoreValue}>{profile.matchPercentage}%</Text>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBackground]}>
                                <View style={[styles.progressFill, { width: `${profile.matchPercentage}%` }]} />
                            </View>
                        </View>
                    </View>

                    {/* Values Section */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeading}>Values</Text>
                        <View style={styles.tagGrid}>
                            {profile.values.map((v, i) => (
                                <View key={i} style={styles.tag}>
                                    <Text style={styles.tagText}>{v.emoji} {v.text}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Interests Section */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeading}>Interests</Text>
                        <View style={styles.tagGrid}>
                            {profile.interests.map((v, i) => (
                                <View key={i} style={styles.tag}>
                                    <Text style={styles.tagText}>{v.emoji} {v.text}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Deep Questions Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Deep questions</Text>
                        {profile.questions.map((q, i) => (
                            <View key={i} style={styles.questionBox}>
                                <Text style={styles.questionTitle}>{i + 1}. {q.q}</Text>
                                <Text style={styles.answerText}>{q.a}</Text>
                            </View>
                        ))}
                    </View>

                </View>
            </ScrollView>

            {/* ── Action Buttons ─────────────────────────────── */}
            <View style={styles.floatingActions}>
                <TouchableOpacity style={styles.btnX}>
                    <X size={24} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnHeart}>
                    <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Home Indicator */}
            <View style={styles.homeIndicator} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        width: 24,
        height: 24,
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
    },
    heroOverlayMatched: {
        position: 'absolute',
        left: 15,
        top: 403,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        opacity: 0.92,
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
        justifyContent: 'space-between',
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
    whyMatchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F0FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        gap: 6,
    },
    whyMatchIconCircle: {
        width: 18,
        height: 18,
        backgroundColor: '#2B6BE6',
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    whyMatchText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        color: '#154F9C',
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
