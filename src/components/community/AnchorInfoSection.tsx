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
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../types';
import { ProfileView } from '../profile/ProfileView';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface AnchorInfoSectionProps {
  anchor: UserProfile;
}

export function AnchorInfoSection({ anchor }: AnchorInfoSectionProps) {
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Helper to capitalize
  const capitalize = (str: string | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

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

  // Helper to format gender preference
  const formatGenderPreference = (): string => {
    const pref = anchor.preferences?.gender;
    if (!pref || pref === 'both') return 'Open to all';
    return capitalize(pref);
  };

  return (
    <>
    <StyledView
      style={{
        flex: 1,
        backgroundColor: '#FBF9F6', // Warm cream background
        borderRadius: 24,
        margin: 8,
        marginLeft: 4,
        paddingHorizontal: 16,
        paddingVertical: 18,
        shadowColor: 'rgba(139, 92, 47, 0.15)', // Warm brown shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* TOP HALF: Profile Information */}
      <StyledView style={{ flex: 1, marginBottom: 12 }}>
        <StyledScrollView showsVerticalScrollIndicator={false}>
          {/* Section Header */}
          <StyledText style={{ fontSize: 13, fontWeight: '700', color: '#4A4540', marginBottom: 10 }}>
            Profile
          </StyledText>

          {/* Age */}
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <StyledText style={{ fontSize: 20, fontWeight: '700', color: '#4A4540', marginRight: 6 }}>
              {anchor.age}
            </StyledText>
            <StyledText style={{ fontSize: 13, color: '#78716C', fontWeight: '500' }}>years old</StyledText>
          </StyledView>

          {/* Height */}
          {anchor.height && (
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="resize-outline" size={14} color="#10B981" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 12, color: '#6B5B4F', fontWeight: '500' }}>
                {formatHeight(anchor.height)}
              </StyledText>
            </StyledView>
          )}

          {/* Ethnicity */}
          {anchor.ethnicity && (
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="globe-outline" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 12, color: '#6B5B4F', fontWeight: '500' }}>
                {anchor.ethnicity}
              </StyledText>
            </StyledView>
          )}

          {/* Occupation */}
          {anchor.currentJob && (
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="briefcase" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 12, color: '#6B5B4F', fontWeight: '500' }}>
                {anchor.currentJob}
              </StyledText>
            </StyledView>
          )}

          {/* Values */}
          {anchor.values && anchor.values.length > 0 && (
            <StyledView style={{ marginBottom: 6, marginTop: 4 }}>
              <StyledText style={{ fontSize: 11, color: '#78716C', fontWeight: '600', marginBottom: 3 }}>
                Values
              </StyledText>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {anchor.values.slice(0, 3).map((value: string, index: number) => (
                  <StyledView
                    key={index}
                    style={{
                      backgroundColor: '#F3E8FF',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}
                  >
                    <StyledText style={{ fontSize: 10, color: '#7C3AED', fontWeight: '600' }}>
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
              <StyledText style={{ fontSize: 11, color: '#78716C', fontWeight: '600', marginBottom: 3 }}>
                Interests
              </StyledText>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {anchor.interests.slice(0, 3).map((interest: string, index: number) => (
                  <StyledView
                    key={index}
                    style={{
                      backgroundColor: '#FFE8DD',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}
                  >
                    <StyledText style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>
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
      <StyledView style={{
        width: '100%',
        height: 1,
        backgroundColor: '#E7DED4',
        marginVertical: 8,
      }} />

      {/* BOTTOM HALF: Match Preferences */}
      <StyledView style={{ flex: 1 }}>
        <StyledText style={{ fontSize: 13, fontWeight: '700', color: '#4A4540', marginBottom: 6 }}>
          Match Preferences
        </StyledText>

        {/* Age Preference */}
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="calendar-outline" size={12} color="#EC4899" style={{ marginRight: 6 }} />
          <StyledText style={{ fontSize: 11, color: '#6B5B4F', fontWeight: '500' }}>
            Ages {anchor.preferences?.ageMin || 18}-{anchor.preferences?.ageMax || 99}
          </StyledText>
        </StyledView>

        {/* Height Preference */}
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="resize-outline" size={12} color="#10B981" style={{ marginRight: 6 }} />
          <StyledText style={{ fontSize: 11, color: '#6B5B4F', fontWeight: '500' }}>
            {formatHeightRange()}
          </StyledText>
        </StyledView>

        {/* Preferred Ethnicities */}
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="globe-outline" size={12} color="#8B5CF6" style={{ marginRight: 6 }} />
          <StyledText style={{ fontSize: 11, color: '#6B5B4F', fontWeight: '500' }}>
            {anchor.preferredEthnicities && anchor.preferredEthnicities.length > 0
              ? anchor.preferredEthnicities.join(', ')
              : 'Open to all'}
          </StyledText>
        </StyledView>

        {/* View Full Profile Button */}
        <StyledTouchableOpacity
          onPress={() => setShowFullProfile(true)}
          style={{
            backgroundColor: '#7C3AED',
            paddingVertical: 7,
            paddingHorizontal: 10,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 2,
          }}
        >
          <StyledText style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
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
