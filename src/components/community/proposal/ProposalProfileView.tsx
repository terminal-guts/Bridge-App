import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../../types/community';
import { valueEmoji, interestEmoji } from '../../../utils/emojiMaps';
import { FONTS } from '../../../constants/typography';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

interface ProposalProfileViewProps {
    user: UserProfile;
}

const capitalize = (str: string | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatHeight = (inches: number | undefined): string => {
    if (!inches) return 'Not specified';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
};

/**
 * ProposalProfileView
 * 
 * Standardized profile view used within the Proposal Review process.
 * Refactored from ProposalReviewView.tsx to reduce redundancy and improve maintainability.
 */
export const ProposalProfileView: React.FC<ProposalProfileViewProps> = ({ user }) => {
    const userPhotos = user.photos?.slice(0, 6) || [];
    const mainPhoto = userPhotos.find((p: any) => p.isMain) || userPhotos[0];

    return (
        <StyledScrollView
            style={{ flex: 1, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
            {/* Photo */}
            {mainPhoto && (
                <StyledView style={{ marginBottom: 20, alignItems: 'center' }}>
                    <Image
                        source={{ uri: mainPhoto.url }}
                        style={{
                            width: '100%',
                            height: 400,
                            borderRadius: 16,
                        }}
                        resizeMode="cover"
                    />
                </StyledView>
            )}

            {/* Basic Info Row */}
            <StyledView style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 20,
            }}>
                {/* Gender */}
                {user.gender && user.gender.length > 0 && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="person" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {capitalize(user.gender[0])}
                        </StyledText>
                    </StyledView>
                )}

                {/* Pronouns */}
                {user.pronouns && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="chatbubble-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.pronouns.replace('_', '/')}
                        </StyledText>
                    </StyledView>
                )}

                {/* Age */}
                <StyledView style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                }}>
                    <Ionicons name="calendar-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
                    <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                        {user.age}
                    </StyledText>
                </StyledView>

                {/* Height */}
                {user.height && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="resize-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatHeight(user.height as any)}
                        </StyledText>
                    </StyledView>
                )}

                {/* Occupation */}
                {user.currentJob && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="briefcase" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.currentJob}
                        </StyledText>
                    </StyledView>
                )}


                {/* Ethnicity */}
                {user.ethnicity && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="globe-outline" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.ethnicity}
                        </StyledText>
                    </StyledView>
                )}

                {/* Religion */}
                {user.religion && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="moon-outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.religion}
                        </StyledText>
                    </StyledView>
                )}

                {/* Political Leaning */}
                {user.politicalLeaning && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <Ionicons name="flag-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {capitalize(user.politicalLeaning.replace(/_/g, ' '))}
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>

            {/* Interests */}
            {user.interests && user.interests.length > 0 && (
                <StyledView style={{ marginBottom: 20 }}>
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="star" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600', fontFamily: FONTS.semiBold }}>Interests</StyledText>
                    </StyledView>
                    <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {user.interests.map((interest: string, index: number) => (
                            <StyledView
                                key={index}
                                style={{
                                    backgroundColor: '#DBEAFE',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                }}
                            >
                                <StyledText style={{ fontSize: 13, color: '#1E40AF', fontWeight: '500', fontFamily: FONTS.medium }}>
                                    {interestEmoji(interest)} {interest}
                                </StyledText>
                            </StyledView>
                        ))}
                    </StyledView>
                </StyledView>
            )}

            {/* Values */}
            {user.values && user.values.length > 0 && (
                <StyledView style={{ marginBottom: 20 }}>
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="diamond" size={18} color="#10B981" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600', fontFamily: FONTS.semiBold }}>Values</StyledText>
                    </StyledView>
                    <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {user.values.map((value: string, index: number) => (
                            <StyledView
                                key={index}
                                style={{
                                    backgroundColor: '#D1FAE5',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                }}
                            >
                                <StyledText style={{ fontSize: 13, color: '#065F46', fontWeight: '500', fontFamily: FONTS.medium }}>
                                    {valueEmoji(value)} {value}
                                </StyledText>
                            </StyledView>
                        ))}
                    </StyledView>
                </StyledView>
            )}

            {/* Family */}
            <StyledView style={{ marginBottom: 20 }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="people" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                    <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600', fontFamily: FONTS.semiBold }}>Family</StyledText>
                </StyledView>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="person-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                    <StyledText style={{ fontSize: 14, color: '#4A4540', fontFamily: FONTS.regular }}>
                        {user.hasChildren === 'no' ? 'No children' : user.hasChildren === 'yes' ? 'Has children' : 'Prefer not to say'}
                    </StyledText>
                </StyledView>
                {user.familyPlans && (
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="heart-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                        <StyledText style={{ fontSize: 14, color: '#4A4540', fontFamily: FONTS.regular }}>
                            {user.familyPlans === 'want_children' ? 'Want children someday' :
                                user.familyPlans === 'open_to_children' ? 'Open to children' :
                                    user.familyPlans === 'dont_want_children' ? 'Don\'t want children' : 'Not sure yet'}
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>

            {/* Lifestyle */}
            <StyledView style={{ marginBottom: 20 }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="leaf" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600', fontFamily: FONTS.semiBold }}>Lifestyle</StyledText>
                </StyledView>

                {user.drinkingFrequency && (
                    <StyledView style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                    }}>
                        <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="wine" size={16} color="#78716C" style={{ marginRight: 8 }} />
                            <StyledText style={{ fontSize: 14, color: '#4A4540', fontFamily: FONTS.regular }}>Drinking</StyledText>
                        </StyledView>
                        <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {capitalize(user.drinkingFrequency)}
                        </StyledText>
                    </StyledView>
                )}

                {user.cannabisFrequency && (
                    <StyledView style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                    }}>
                        <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="leaf-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                            <StyledText style={{ fontSize: 14, color: '#4A4540', fontFamily: FONTS.regular }}>Cannabis</StyledText>
                        </StyledView>
                        <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {capitalize(user.cannabisFrequency)}
                        </StyledText>
                    </StyledView>
                )}

                {user.tobaccoFrequency && (
                    <StyledView style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="fitness-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                            <StyledText style={{ fontSize: 14, color: '#4A4540', fontFamily: FONTS.regular }}>Tobacco</StyledText>
                        </StyledView>
                        <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500', fontFamily: FONTS.medium }}>
                            {capitalize(user.tobaccoFrequency)}
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>

            {/* deep question responses */}
            {user.deepQuestions && user.deepQuestions.length > 0 && (
                <StyledView style={{ marginBottom: 20 }}>
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="help-circle" size={18} color="#F43F5E" style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600', fontFamily: FONTS.semiBold }}>Bio</StyledText>
                    </StyledView>
                    {user.deepQuestions.filter(q => q.tier === 1).map((q, i) => (
                        <StyledView key={i} style={{ marginBottom: 12 }}>
                            <StyledText style={{ fontSize: 14, color: '#4A4540', lineHeight: 20, fontFamily: FONTS.regular }}>
                                {q.answer}
                            </StyledText>
                        </StyledView>
                    ))}
                </StyledView>
            )}
        </StyledScrollView>
    );
};

export default ProposalProfileView;
