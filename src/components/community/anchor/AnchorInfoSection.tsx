/**
 * AnchorInfoSection Component
 *
 * Top-right quadrant: Info about the anchor and what they're looking for.
 * Warm, friendly, scannable format.
 *
 * Top half: Profile information
 * Bottom half: Match preferences
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { styled } from 'nativewind';
import { SHADOWS } from '../../../theme/shadows';
import { UserProfile } from '../../../types';
import { ProfileView } from '../../profile/ProfileView';
import { valueIconName, interestIconName } from '../../../utils/emojiMaps';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';

import { EvaIcon, IconScoutIcon } from '../../icons';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface AnchorInfoSectionProps {
  anchor: UserProfile;
}

export function AnchorInfoSection({ anchor }: AnchorInfoSectionProps) {
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Helper to format height
  const formatHeight = (height: any): string => {
    if (!height) return 'Not specified';

    // If already a string (e.g., "5'10\""), return as-is
    if (typeof height === 'string') return height;

    // If number (inches), convert to feet/inches
    if (typeof height === 'number') {
      const feet = Math.floor(height / 12);
      const remainingInches = height % 12;
      return `${feet}'${remainingInches}"`;
    }

    return 'Not specified';
  };

  // Helper to format height range
  const formatHeightRange = (): string => {
    const minHeight = anchor.preferences?.heightMin;
    const maxHeight = anchor.preferences?.heightMax;
    if (!minHeight && !maxHeight) return 'Any height';

    if (!minHeight) return `Up to ${formatHeight(maxHeight!)}`;
    if (!maxHeight) return `${formatHeight(minHeight)}+`;
    return `${formatHeight(minHeight)} - ${formatHeight(maxHeight)}`;
  };

  return (
    <>
    <StyledView style={anchorStyles.container}>
      {/* TOP HALF: Profile Information */}
      <StyledView style={{ flex: 1, marginBottom: 12 }}>
        <StyledScrollView showsVerticalScrollIndicator={false}>
          {/* Section Header */}
          <StyledText style={anchorStyles.sectionLabel}>
            Profile
          </StyledText>

          {/* Age */}
          <StyledView style={anchorStyles.infoRow}>
            <StyledText style={anchorStyles.ageText}>
              {anchor.age}
            </StyledText>
            <StyledText style={anchorStyles.ageLabel}>years old</StyledText>
          </StyledView>

          {/* Height */}
          {anchor.height && (
            <StyledView style={anchorStyles.detailRow}>
              <EvaIcon name="maximize" variant="outline" size={14} color={COLORS.emerald} style={{ marginRight: 6 }} />
              <StyledText style={anchorStyles.detailText}>
                {formatHeight(anchor.height)}
              </StyledText>
            </StyledView>
          )}

          {/* Ethnicity */}
          {anchor.ethnicity && (
            <StyledView style={anchorStyles.detailRow}>
              <EvaIcon name="globe" variant="outline" size={14} color={COLORS.violet} style={{ marginRight: 6 }} />
              <StyledText style={anchorStyles.detailText}>
                {anchor.ethnicity}
              </StyledText>
            </StyledView>
          )}

          {/* Occupation */}
          {anchor.currentJob && (
            <StyledView style={anchorStyles.detailRow}>
              <EvaIcon name="briefcase" variant="outline" size={14} color={COLORS.tier1.icon} style={{ marginRight: 6 }} />
              <StyledText style={anchorStyles.detailText}>
                {anchor.currentJob}
              </StyledText>
            </StyledView>
          )}

          {/* Values */}
          {anchor.values && anchor.values.length > 0 && (
            <StyledView style={{ marginBottom: 6, marginTop: 4 }}>
              <StyledText style={anchorStyles.tagSectionLabel}>
                Values
              </StyledText>
              <StyledView style={anchorStyles.tagWrap}>
                {anchor.values.slice(0, 3).map((value: string, index: number) => (
                  <StyledView key={index} style={anchorStyles.valueTag}>
                    <IconScoutIcon name={valueIconName(value) ?? ''} size={14} style={{ marginRight: 3 }} />
                    <StyledText style={anchorStyles.valueTagText}>
                      {value}
                    </StyledText>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          )}

          {/* Interests */}
          {anchor.interests && anchor.interests.length > 0 && (
            <StyledView style={{ marginBottom: 6 }}>
              <StyledText style={anchorStyles.tagSectionLabel}>
                Interests
              </StyledText>
              <StyledView style={anchorStyles.tagWrap}>
                {anchor.interests.slice(0, 3).map((interest: string, index: number) => (
                  <StyledView key={index} style={anchorStyles.interestTag}>
                    <IconScoutIcon name={interestIconName(interest) ?? ''} size={14} style={{ marginRight: 3 }} />
                    <StyledText style={anchorStyles.interestTagText}>
                      {interest}
                    </StyledText>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          )}
        </StyledScrollView>
      </StyledView>

      {/* Divider */}
      <StyledView style={anchorStyles.divider} />

      {/* BOTTOM HALF: Match Preferences */}
      <StyledView style={{ flex: 1 }}>
        <StyledText style={[anchorStyles.sectionLabel, { marginBottom: 6 }]}>
          Match Preferences
        </StyledText>

        {/* Age Preference */}
        <StyledView style={anchorStyles.prefRow}>
          <EvaIcon name="calendar" variant="outline" size={12} color={COLORS.pink} style={{ marginRight: 6 }} />
          <StyledText style={anchorStyles.prefText}>
            Ages {anchor.preferences?.ageMin || 18}-{anchor.preferences?.ageMax || 99}
          </StyledText>
        </StyledView>

        {/* Height Preference */}
        <StyledView style={anchorStyles.prefRow}>
          <EvaIcon name="maximize" variant="outline" size={12} color={COLORS.emerald} style={{ marginRight: 6 }} />
          <StyledText style={anchorStyles.prefText}>
            {formatHeightRange()}
          </StyledText>
        </StyledView>

        {/* Preferred Ethnicities */}
        <StyledView style={anchorStyles.prefRow}>
          <EvaIcon name="globe" variant="outline" size={12} color={COLORS.violet} style={{ marginRight: 6 }} />
          <StyledText style={anchorStyles.prefText}>
            {anchor.preferredEthnicities && anchor.preferredEthnicities.length > 0
              ? anchor.preferredEthnicities.join(', ')
              : 'Open to all'}
          </StyledText>
        </StyledView>

        {/* View Full Profile Button */}
        <StyledTouchableOpacity
          onPress={() => setShowFullProfile(true)}
          style={anchorStyles.viewProfileBtn}
          accessibilityRole="button"
          accessibilityLabel={`View ${anchor.firstName || 'anchor'}'s full profile`}
        >
          <StyledText style={anchorStyles.viewProfileBtnText}>
            View Full Profile
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>

    {/* Full Profile Modal */}
    <ProfileView
      visible={showFullProfile}
      profile={anchor}
      onClose={() => setShowFullProfile(false)}
      showName={false}
      showDeepQuestions={false}
      showCompatibility={false}
    />
    </>
  );
}

export default AnchorInfoSection;

const anchorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundWarmCream,
    borderRadius: 24,
    margin: 8,
    marginLeft: 4,
    paddingHorizontal: 16,
    paddingVertical: 18,
    ...SHADOWS.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.text.warmNeutral,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ageText: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.text.warmNeutral,
    marginRight: 6,
  },
  ageLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.subtle,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.warmInfo,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  tagSectionLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.subtle,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
    marginBottom: 3,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  valueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundPurpleTag,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  valueTagText: {
    fontSize: 10,
    color: COLORS.purple,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAmberTag,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  interestTagText: {
    fontSize: 10,
    color: COLORS.darkAmber,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.borderWarm,
    marginVertical: 8,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prefText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.warmInfo,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  viewProfileBtn: {
    backgroundColor: COLORS.purple,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  viewProfileBtnText: {
    color: COLORS.card,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
});
