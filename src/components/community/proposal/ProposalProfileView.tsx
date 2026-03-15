import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { UserProfile } from '../../../types/community';
import { valueIconName, interestIconName } from '../../../utils/emojiMaps';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { EvaIcon, IconScoutIcon } from '../../icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon } from '../../icons/Icons';
import { ProfileBadgesSection } from '../../badges/ProfileBadgesSection';
import { formatProfileValue, formatGenderDisplay } from '../../../utils/formatProfileValue';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

interface ProposalProfileViewProps {
    user: UserProfile;
}

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
                        contentFit="cover"
                        accessibilityLabel={`${user.firstName || 'Profile'} photo`}
                    />
                </StyledView>
            )}

            {/* Friend Badges (no author reveal in voting context) */}
            {user.userId && (
                <ProfileBadgesSection userId={user.userId} revealAuthor={false} />
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
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="person" variant="outline" size={16} color={COLORS.purple} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatGenderDisplay(user.gender[0])}
                        </StyledText>
                    </StyledView>
                )}

                {/* Pronouns */}
                {user.pronouns && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="message-circle" variant="outline" size={16} color={COLORS.pink} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.pronouns.replace('_', '/')}
                        </StyledText>
                    </StyledView>
                )}

                {/* Age */}
                <StyledView style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.backgroundGray,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                }}>
                    <EvaIcon name="calendar" variant="outline" size={16} color={COLORS.pink} style={{ marginRight: 6 }} />
                    <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                        {user.age}
                    </StyledText>
                </StyledView>

                {/* Height */}
                {user.height && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="maximize" variant="outline" size={16} color={COLORS.emerald} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatHeight(user.height as any)}
                        </StyledText>
                    </StyledView>
                )}

                {/* Occupation */}
                {user.currentJob && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="briefcase" variant="outline" size={16} color={COLORS.tier1.icon} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.currentJob}
                        </StyledText>
                    </StyledView>
                )}


                {/* Ethnicity */}
                {user.ethnicity && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="globe" variant="outline" size={16} color={COLORS.violet} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.ethnicity}
                        </StyledText>
                    </StyledView>
                )}

                {/* Religion */}
                {user.religion && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="moon" variant="outline" size={16} color={COLORS.tier2.icon} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {user.religion}
                        </StyledText>
                    </StyledView>
                )}

                {/* Political Leaning */}
                {user.politicalLeaning && (
                    <StyledView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.backgroundGray,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}>
                        <EvaIcon name="flag" variant="outline" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatProfileValue(user.politicalLeaning)}
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>

            {/* Interests */}
            {user.interests && user.interests.length > 0 && (
                <StyledView style={{ marginBottom: 20 }}>
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <EvaIcon name="star" variant="outline" size={18} color={COLORS.tier1.icon} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Interests</StyledText>
                    </StyledView>
                    <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {user.interests.map((interest: string, index: number) => (
                            <StyledView
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: COLORS.backgroundInterestTag,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                }}
                            >
                                <IconScoutIcon name={interestIconName(interest) ?? ''} size={14} style={{ marginRight: 3 }} />
                                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.tier1.text, fontWeight: '500', fontFamily: FONTS.medium }}>
                                    {interest}
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
                        <EvaIcon name="award" variant="outline" size={18} color={COLORS.emerald} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Values</StyledText>
                    </StyledView>
                    <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {user.values.map((value: string, index: number) => (
                            <StyledView
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: COLORS.backgroundValuesTag,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                }}
                            >
                                <IconScoutIcon name={valueIconName(value) ?? ''} size={14} style={{ marginRight: 3 }} />
                                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.emeraldText, fontWeight: '500', fontFamily: FONTS.medium }}>
                                    {value}
                                </StyledText>
                            </StyledView>
                        ))}
                    </StyledView>
                </StyledView>
            )}

            {/* Family */}
            <StyledView style={{ marginBottom: 20 }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <EvaIcon name="people" variant="outline" size={18} color={COLORS.warning.icon} style={{ marginRight: 6 }} />
                    <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Family</StyledText>
                </StyledView>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <EvaIcon name="person" variant="outline" size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                    <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.warmNeutral, fontFamily: FONTS.regular }}>
                        {user.hasChildren === 'no' ? 'No Children' : user.hasChildren === 'yes' ? 'Has Children' : 'Prefer Not to Say'}
                    </StyledText>
                </StyledView>
                {user.familyPlans && (
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <EvaIcon name="heart" variant="outline" size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.warmNeutral, fontFamily: FONTS.regular }}>
                            {user.familyPlans === 'want_children' ? 'Want Children Someday' :
                                user.familyPlans === 'open_to_children' ? 'Open to Children' :
                                    user.familyPlans === 'dont_want_children' ? "Don't Want Children" : 'Not Sure Yet'}
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>

            {/* Lifestyle */}
            <StyledView style={{ marginBottom: 20 }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <EvaIcon name="trending-up" variant="outline" size={18} color={COLORS.violet} style={{ marginRight: 6 }} />
                    <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Lifestyle</StyledText>
                </StyledView>

                {user.drinkingFrequency && (
                    <StyledView style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                    }}>
                        <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <WineGlassIcon size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                            <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.warmNeutral, fontFamily: FONTS.regular }}>Drinking</StyledText>
                        </StyledView>
                        <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatProfileValue(user.drinkingFrequency)}
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
                            <LeafIcon size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                            <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.warmNeutral, fontFamily: FONTS.regular }}>Cannabis</StyledText>
                        </StyledView>
                        <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatProfileValue(user.cannabisFrequency)}
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
                            <CigaretteIcon size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                            <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.warmNeutral, fontFamily: FONTS.regular }}>Tobacco</StyledText>
                        </StyledView>
                        <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                            {formatProfileValue(user.tobaccoFrequency)}
                        </StyledText>
                    </StyledView>
                )}
            </StyledView>

            {/* deep question responses */}
            {user.deepQuestions && user.deepQuestions.length > 0 && (
                <StyledView style={{ marginBottom: 20 }}>
                    <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <EvaIcon name="question-mark-circle" variant="outline" size={18} color={COLORS.rose} style={{ marginRight: 6 }} />
                        <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Bio</StyledText>
                    </StyledView>
                    {user.deepQuestions.filter(q => q.tier === 1).map((q, i) => (
                        <StyledView key={i} style={{ marginBottom: 12 }}>
                            <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.warmNeutral, lineHeight: 20, fontFamily: FONTS.regular }}>
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
