import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
    ImageBackground, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { ArrowLeft, Star, Heart, Sparkles } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { communityService } from '../../services/communityServiceIndex';
import { RootStackParamList } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(1,1,1,0.1)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 2,
    padding: 12,
    marginBottom: 16,
};

function Tag({ text }: { text: string }) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 6, paddingHorizontal: 10,
            backgroundColor: 'rgba(1,1,1,0.02)', borderRadius: 40,
            marginRight: 10, marginBottom: 10,
        }}>
            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 18, color: 'rgba(1,1,1,0.8)' }}>
                {text}
            </Text>
        </View>
    );
}

export default function ProfileMatchScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'ProposalProfile'>>();
    const { partnerProfile, communityScore, endorsers, screenState, proposalId } = route.params;

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
            if (canRespond) {
                await communityService.respondToMatchProposal(proposalId, false);
            }
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
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero Image ─────────────────────────────────── */}
                <View style={{ width: '100%', height: 451, position: 'relative' }}>
                    <ImageBackground
                        source={photoUrl ? { uri: photoUrl } : require('../../../assets/favicon.png')}
                        style={{ width: '100%', height: '100%' }}
                        imageStyle={{ borderRadius: 30, backgroundColor: '#D9D9D9' }}
                        resizeMode="cover"
                    >
                        {/* Back arrow */}
                        <View style={{ position: 'absolute', top: 64, left: 16 }}>
                            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        {/* Photo pagination dots */}
                        {photos.length > 1 && (
                            <View style={{
                                position: 'absolute', top: 50, left: 0, right: 0,
                                alignItems: 'center', flexDirection: 'row',
                                justifyContent: 'center', gap: 8,
                            }}>
                                {photos.map((_, i) => (
                                    <View
                                        key={i}
                                        style={{
                                            width: 16, height: 4, borderRadius: 20,
                                            backgroundColor: i === currentPhotoIndex
                                                ? '#FFFFFF'
                                                : 'rgba(217,217,217,0.4)',
                                        }}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Prev / next photo tap zones */}
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

                        {/* Karma badge */}
                        <View style={{
                            position: 'absolute', bottom: 40, right: 16,
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingVertical: 8, paddingHorizontal: 10,
                            backgroundColor: 'rgba(52,199,89,0.1)',
                            borderWidth: 1, borderColor: '#34C759',
                            borderRadius: 8,
                        }}>
                            <Star size={14} color="#34C759" />
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: '#34C759' }}>
                                Karma Pts : {karmaPts} pts
                            </Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── Cards ──────────────────────────────────────── */}
                <View style={{ paddingHorizontal: 16, marginTop: -24 }}>

                    {/* Name + karma + matched by */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 24, lineHeight: 30, color: '#010101' }}>
                                {partnerProfile.firstName}, {partnerProfile.age}
                            </Text>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                                paddingVertical: 3, paddingHorizontal: 8,
                                backgroundColor: 'rgba(52,199,89,0.1)',
                                borderWidth: 1, borderColor: '#34C759', borderRadius: 8,
                            }}>
                                <Star size={11} color="#34C759" />
                                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: '#34C759' }}>
                                    {karmaPts} pts
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Heart size={22} color="#010101" />
                            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: 'rgba(1,1,1,0.7)' }}>
                                Matched by :
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                {endorserAvatars.length > 0
                                    ? endorserAvatars.map((uri, i) => (
                                        <Image
                                            key={i}
                                            source={{ uri }}
                                            style={{
                                                width: 22, height: 22, borderRadius: 11,
                                                borderWidth: 1, borderColor: '#fff',
                                                marginLeft: i === 0 ? 0 : -6,
                                            }}
                                        />
                                    ))
                                    : [0, 1, 2].map((_, i) => (
                                        <View
                                            key={i}
                                            style={{
                                                width: 22, height: 22, borderRadius: 11,
                                                borderWidth: 1, borderColor: '#fff',
                                                marginLeft: i === 0 ? 0 : -6,
                                                backgroundColor: '#D9D9D9',
                                            }}
                                        />
                                    ))
                                }
                            </View>
                        </View>
                    </View>

                    {/* Community validation */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB' }}>
                                Community validation
                            </Text>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingVertical: 6, paddingHorizontal: 8,
                                backgroundColor: 'rgba(37,99,235,0.1)',
                                borderWidth: 1, borderColor: '#2563EB', borderRadius: 20,
                            }}>
                                <Sparkles size={15} color="#2563EB" />
                                <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: '#2563EB' }}>
                                    Why this match
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(1,1,1,0.04)', borderRadius: 40, overflow: 'hidden' }}>
                                <View style={{ width: `${communityScore}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: 40 }} />
                            </View>
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 21, color: '#010101' }}>
                                {communityScore}%
                            </Text>
                        </View>
                    </View>

                    {/* Values */}
                    {(partnerProfile.values ?? []).length > 0 && (
                        <View style={cardStyle}>
                            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 10 }}>
                                Values
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {(partnerProfile.values ?? []).map((v, i) => <Tag key={i} text={v} />)}
                            </View>
                        </View>
                    )}

                    {/* Interests */}
                    {(partnerProfile.interests ?? []).length > 0 && (
                        <View style={cardStyle}>
                            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 10 }}>
                                Interests
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {(partnerProfile.interests ?? []).map((v, i) => <Tag key={i} text={v} />)}
                            </View>
                        </View>
                    )}

                    {/* Deep questions */}
                    {deepQuestions.length > 0 && (
                        <>
                            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 12 }}>
                                Deep questions
                            </Text>
                            {deepQuestions.map((item, index) => (
                                <View key={index} style={cardStyle}>
                                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 14, lineHeight: 20, color: '#010101', marginBottom: 4 }}>
                                        {index + 1}. {item.question}
                                    </Text>
                                    <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 20, color: 'rgba(1,1,1,0.5)' }}>
                                        {item.answer}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}

                </View>
            </ScrollView>

            {/* ── Bottom action area ──────────────────────────── */}
            {canRespond ? (
                /* Awaiting your vote or neither voted — show Pass + Accept */
                <View style={{
                    position: 'absolute', bottom: 34,
                    left: 0, right: 0,
                    flexDirection: 'row',
                    justifyContent: 'center', alignItems: 'center',
                    gap: 28,
                }}>
                    <TouchableOpacity
                        onPress={handlePass}
                        disabled={submitting}
                        style={{
                            width: 62, height: 62, borderRadius: 31,
                            backgroundColor: '#565164',
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#000', shadowOpacity: 0.28,
                            shadowOffset: { width: 0, height: -5 }, shadowRadius: 24,
                            elevation: 8, opacity: submitting ? 0.5 : 1,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleAccept}
                        disabled={submitting}
                        style={{
                            width: 62, height: 62, borderRadius: 31,
                            backgroundColor: '#2563EB',
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#000', shadowOpacity: 0.28,
                            shadowOffset: { width: 0, height: -5 }, shadowRadius: 24,
                            elevation: 8, opacity: submitting ? 0.5 : 1,
                        }}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <Text style={{ color: '#fff', fontSize: 26 }}>♡</Text>
                        }
                    </TouchableOpacity>
                </View>
            ) : (
                /* Awaiting their vote — show status strip */
                <View style={{
                    position: 'absolute', bottom: 34,
                    left: 0, right: 0,
                    alignItems: 'center',
                }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingVertical: 12, paddingHorizontal: 20,
                        backgroundColor: 'rgba(212,170,1,0.12)',
                        borderWidth: 1, borderColor: 'rgba(212,170,1,0.4)',
                        borderRadius: 40,
                    }}>
                        <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 14, color: '#D4AA01' }}>
                            Waiting for their response
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
