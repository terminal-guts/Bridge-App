import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ImageBackground, Image, ActivityIndicator
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { getProfileById } from '../services/profileService';
import { Profile } from '../types/profile';

const STAR_ICON = require('../../assets/star-icon.png');
const HEART_ICON = require('../../assets/heart-icon.png');
const WHY_MATCH_ICON = require('../../assets/why-match-icon.png');

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

function Tag({ emoji, text }: { emoji: string; text: string }) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 6, paddingHorizontal: 10,
            backgroundColor: 'rgba(1,1,1,0.02)', borderRadius: 40,
            marginRight: 10, marginBottom: 10,
        }}>
            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 18, color: 'rgba(1,1,1,0.8)' }}>
                {emoji} {text}
            </Text>
        </View>
    );
}

export default function ProfileMatchScreen() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // In a real app, this ID might come from navigation params
                const data = await getProfileById('brooklyn');
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <Text>Profile not found</Text>
            </View>
        );
    }

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
                        source={profile.image}
                        style={{ width: '100%', height: '100%' }}
                        imageStyle={{ borderRadius: 30 }}
                        resizeMode="cover"
                    >
                        {/* Back arrow */}
                        <View style={{ position: 'absolute', top: 64, left: 16 }}>
                            <TouchableOpacity>
                                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                        {/* Pagination dots — centered top */}
                        <View style={{
                            position: 'absolute', top: 50, left: 0, right: 0,
                            alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'row', gap: 8,
                        }}>
                            <View style={{ width: 16, height: 4, backgroundColor: '#FFFFFF', borderRadius: 20 }} />
                            {[1, 2, 3, 4, 5].map(i => (
                                <View key={i} style={{ width: 16, height: 4, backgroundColor: 'rgba(217,217,217,0.4)', borderRadius: 20 }} />
                            ))}
                        </View>

                        {/* Karma Pts badge — bottom right of image */}
                        <View style={{
                            position: 'absolute', bottom: 40, right: 16,
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingVertical: 8, paddingHorizontal: 10,
                            backgroundColor: 'rgba(52,199,89,0.1)',
                            borderWidth: 1, borderColor: '#34C759',
                            borderRadius: 8,
                        }}>
                            <Image source={STAR_ICON} style={{ width: 14, height: 14 }} resizeMode="contain" />
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: '#34C759' }}>
                                Karma Pts : {profile.karmaPoints} pts
                            </Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── Cards container ─────────────────────────────── */}
                <View style={{ paddingHorizontal: 16, marginTop: -24 }}>

                    {/* Name card */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 24, lineHeight: 30, color: '#010101' }}>
                                {profile.name}, {profile.age}
                            </Text>
                            {/* Blue verification badge */}
                            {profile.isVerified && (
                                <View style={{
                                    width: 21, height: 21, borderRadius: 11,
                                    backgroundColor: '#2563EB',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
                                </View>
                            )}
                        </View>
                        {/* Matched by row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Image source={HEART_ICON} style={{ width: 22, height: 22 }} resizeMode="contain" />
                            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: 'rgba(1,1,1,0.7)' }}>
                                Matched by :
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                {profile.matchedBy.map((uri, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri }}
                                        style={{
                                            width: 22, height: 22, borderRadius: 11,
                                            borderWidth: 1, borderColor: '#fff',
                                            marginLeft: i === 0 ? 0 : -6,
                                        }}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Community validation card */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB' }}>
                                Community validation
                            </Text>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingVertical: 6, paddingHorizontal: 8,
                                backgroundColor: 'rgba(37,99,235,0.1)',
                                borderWidth: 1, borderColor: '#2563EB',
                                borderRadius: 20,
                            }}>
                                <Image source={WHY_MATCH_ICON} style={{ width: 15, height: 15 }} resizeMode="contain" />
                                <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: '#2563EB' }}>
                                    Why this match
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(1,1,1,0.04)', borderRadius: 40, overflow: 'hidden' }}>
                                <View style={{ width: `${profile.matchPercentage}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: 40 }} />
                            </View>
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 21, color: '#010101' }}>
                                {profile.matchPercentage}%
                            </Text>
                        </View>
                    </View>

                    {/* Values card */}
                    <View style={cardStyle}>
                        <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 10 }}>
                            Values
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {profile.values.map((v, i) => <Tag key={i} emoji={v.emoji} text={v.text} />)}
                        </View>
                    </View>

                    {/* Interests card */}
                    <View style={cardStyle}>
                        <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 10 }}>
                            Interests
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {profile.interests.map((v, i) => <Tag key={i} emoji={v.emoji} text={v.text} />)}
                        </View>
                    </View>

                    {/* Deep questions */}
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 12 }}>
                        Deep questions
                    </Text>
                    {profile.questions.map((item, index) => (
                        <View key={index} style={cardStyle}>
                            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, lineHeight: 22, color: '#010101', marginBottom: 4 }}>
                                {index + 1}. {item.q}
                            </Text>
                            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 15, lineHeight: 22, color: 'rgba(1,1,1,0.5)' }}>
                                {item.a}
                            </Text>
                        </View>
                    ))}

                </View>
            </ScrollView>

            {/* ── Floating action buttons ─────────────────────── */}
            <View style={{
                position: 'absolute', bottom: 34,
                left: 0, right: 0,
                flexDirection: 'row',
                justifyContent: 'center', alignItems: 'center',
                gap: 28,
            }}>
                <TouchableOpacity style={{
                    width: 62, height: 62, borderRadius: 31,
                    backgroundColor: '#565164',
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000', shadowOpacity: 0.28, shadowOffset: { width: 0, height: -5 }, shadowRadius: 24,
                    elevation: 8,
                }}>
                    <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{
                    width: 62, height: 62, borderRadius: 31,
                    backgroundColor: '#2563EB',
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000', shadowOpacity: 0.28, shadowOffset: { width: 0, height: -5 }, shadowRadius: 24,
                    elevation: 8,
                }}>
                    <Text style={{ color: '#fff', fontSize: 26 }}>♡</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
