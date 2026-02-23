import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckmarkIcon, ClockIcon, ChatIcon, HeartsIcon } from '../Icons/Icons';

export type MatchStatus = 'active_match' | 'awaiting_you' | 'awaiting_them' | 'no_match' | 'new_match';

const STATUS_CONFIG: Record<MatchStatus, { label: string; topBgColor?: string; bottomBgColor?: string; Icon: React.FC<any> }> = {
    active_match: {
        label: 'Active match',
        topBgColor: '#34C759',
        bottomBgColor: 'rgba(52, 199, 89, 0.2)', // From CSS
        Icon: CheckmarkIcon,
    },
    awaiting_you: {
        label: 'Awaiting your response',
        topBgColor: '#FF9F0A',
        Icon: ClockIcon,
    },
    awaiting_them: {
        label: 'Awaiting their response',
        topBgColor: '#1C1C1E',
        Icon: ClockIcon,
    },
    no_match: {
        label: 'No match',
        topBgColor: '#8E8E93',
        Icon: ClockIcon,
    },
    new_match: {
        label: 'New match',
        topBgColor: '#2B65F9',
        Icon: CheckmarkIcon,
    }
};

interface MatchCardProps {
    status: MatchStatus;
    name: string;
    age: number;
    matchDate: string;
    imageUrl: string;
    matchedByAvatars: string[];
}

export const MatchCard: React.FC<MatchCardProps> = ({
    status,
    name,
    age,
    matchDate,
    imageUrl,
    matchedByAvatars,
}) => {
    const config = STATUS_CONFIG[status];
    const isReadyToChat = true;

    return (
        <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: 'black' }}>
            <ImageBackground
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                imageStyle={{ borderRadius: 16 }}
            >
                {/* CSS gradient overlay */}
                <LinearGradient
                    colors={['rgba(9, 18, 46, 0)', 'rgba(9, 18, 46, 0.2)', 'rgba(9, 18, 46, 0.6)']}
                    locations={[0.5, 0.75, 1.0]}
                    style={StyleSheet.absoluteFillObject}
                />

                <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
                    {/* Top Section - Status Badge */}
                    <View style={{ flexDirection: 'row' }}>
                        {config.topBgColor && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                    backgroundColor: config.topBgColor,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    gap: 6
                                }}
                            >
                                <config.Icon size={16} color="#FFF" />
                                <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Outfit_600SemiBold' }}>
                                    {config.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom Section */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 8 }}>
                        {/* Text Details Area */}
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            {/* Secondary badge (Match complete) */}
                            {status === 'active_match' && config.bottomBgColor && (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderRadius: 6,
                                        backgroundColor: config.bottomBgColor,
                                        paddingHorizontal: 8,
                                        paddingVertical: 5,
                                        gap: 6,
                                        alignSelf: 'flex-start',
                                        marginBottom: 10
                                    }}
                                >
                                    <CheckmarkIcon size={14} color="#FFF" />
                                    <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                                        Match complete
                                    </Text>
                                </View>
                            )}

                            {/* Name and Age */}
                            <Text
                                style={{
                                    color: 'white',
                                    fontSize: 28,
                                    fontFamily: 'Outfit_600SemiBold',
                                    marginBottom: 6,
                                    textShadowColor: 'rgba(0,0,0,0.3)',
                                    textShadowOffset: { width: 0, height: 1 },
                                    textShadowRadius: 3
                                }}
                            >
                                {name}, {age}
                            </Text>

                            {/* Matched By Section */}
                            {matchedByAvatars.length > 0 && (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 6
                                    }}
                                >
                                    <HeartsIcon size={20} color="#00C8B3" />
                                    <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                                        Matched by :
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {matchedByAvatars.map((avatar, idx) => (
                                            <View
                                                key={idx}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    borderWidth: 1.5,
                                                    borderColor: 'white',
                                                    overflow: 'hidden',
                                                    marginLeft: idx > 0 ? -8 : 0
                                                }}
                                            >
                                                <ImageBackground source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Date */}
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: 13,
                                    fontFamily: 'Outfit_300Light',
                                }}
                            >
                                Matched {matchDate}
                            </Text>
                        </View>

                        {/* Action Button */}
                        {isReadyToChat && (
                            <TouchableOpacity
                                style={{
                                    width: 60,
                                    height: 60,
                                    backgroundColor: 'white',
                                    borderRadius: 30,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 10,
                                    elevation: 6
                                }}
                            >
                                <ChatIcon size={28} color="#2563EB" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}
