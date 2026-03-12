/**
 * AnchorPreferencesSection Component
 *
 * Displays the anchor's photo and synthesized match preferences.
 * Takes up approximately top 50% of the screen.
 * No names shown - focus on what they're looking for in a partner.
 */

import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon  } from '../../../components/icons';
import { UserProfile, Photo } from '../../../types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);

interface AnchorPreferencesSectionProps {
  anchor: UserProfile;
}

export function AnchorPreferencesSection({ anchor }: AnchorPreferencesSectionProps) {
  // Get primary photo
  const mainPhoto = anchor.photos.find((p: Photo) => p.isMain) || anchor.photos[0];

  // Helper to format height from inches
  const formatHeight = (inches: number | undefined): string => {
    if (!inches) return 'Any';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  // Helper to format height range
  const formatHeightRange = (): string => {
    const minHeight = anchor.preferences?.heightMin;
    const maxHeight = anchor.preferences?.heightMax;
    if (!minHeight && !maxHeight) return 'Any height';
    if (!minHeight) return `Up to ${formatHeight(maxHeight)}`;
    if (!maxHeight) return `${formatHeight(minHeight)}+`;
    return `${formatHeight(minHeight)} - ${formatHeight(maxHeight)}`;
  };

  // Helper to capitalize first letter
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Helper to normalize string | string[] to string
  const toSingleValue = (val: string | string[] | undefined): string | undefined => {
    if (Array.isArray(val)) return val[0];
    return val;
  };

  // Helper to format frequency
  const formatFrequency = (freq: string | undefined): string => {
    if (!freq) return 'Any';
    return capitalize(freq);
  };

  // Helper to format gender preference
  const formatGenderPreference = (): string => {
    const pref = anchor.preferences?.gender;
    if (!pref || pref === 'both') return 'Open to all genders';
    return capitalize(pref);
  };

  return (
    <StyledView style={{ flex: 1, width: '100%', paddingHorizontal: 24, paddingTop: 32 }}>
      {/* Anchor Photo - Large, centered, no name */}
      <StyledView style={{ alignItems: 'center', marginBottom: 24, width: '100%' }}>
        <StyledImage
          source={{ uri: mainPhoto?.url || 'https://via.placeholder.com/150' }}
          style={{
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: '#E5E7EB'
          }}
          resizeMode="cover"
        />
        <StyledText style={{
          fontSize: 16,
          color: '#6B7280',
          marginTop: 12,
          textAlign: 'center'
        }}>
          Looking for someone who matches:
        </StyledText>
      </StyledView>

      {/* Scrollable Preferences Section */}
      <StyledScrollView
        style={{ flex: 1, width: '100%' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* Demographics */}
        <StyledView style={{ marginBottom: 20, width: '100%' }}>
          <StyledText className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
            Demographics
          </StyledText>

          <StyledView style={{ width: '100%' }}>
            {/* Age Range */}
            <StyledView className="flex-row items-center py-2">
              <EvaIcon name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
              <StyledText className="text-neutral-900 flex-1">
                Age: {anchor.preferences?.ageMin || 18} - {anchor.preferences?.ageMax || 99}
              </StyledText>
            </StyledView>

            {/* Gender Preference */}
            <StyledView className="flex-row items-center py-2">
              <EvaIcon name="person-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
              <StyledText className="text-neutral-900 flex-1">
                {formatGenderPreference()}
              </StyledText>
            </StyledView>

            {/* Height Range */}
            <StyledView className="flex-row items-center py-2">
              <EvaIcon name="resize-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
              <StyledText className="text-neutral-900 flex-1">
                Height: {formatHeightRange()}
              </StyledText>
            </StyledView>

            {/* Ethnicity Preferences */}
            {anchor.preferredEthnicities && anchor.preferredEthnicities.length > 0 && (
              <StyledView className="flex-row items-start py-2">
                <EvaIcon name="globe-outline" size={18} color="#64748B" style={{ marginRight: 12, marginTop: 2 }} />
                <StyledView className="flex-1 flex-row flex-wrap">
                  {anchor.preferredEthnicities.map((ethnicity: string, index: number) => (
                    <StyledView
                      key={index}
                      className="bg-neutral-100 rounded-full px-3 py-1 mr-2 mb-2"
                    >
                      <StyledText className="text-neutral-900 text-sm">{ethnicity}</StyledText>
                    </StyledView>
                  ))}
                </StyledView>
              </StyledView>
            )}
          </StyledView>
        </StyledView>

        {/* Lifestyle Preferences */}
        {(anchor.partnerLifestylePreferences?.drinking ||
          anchor.partnerLifestylePreferences?.cannabis ||
          anchor.partnerLifestylePreferences?.tobacco ||
          anchor.partnerLifestylePreferences?.otherDrugs) && (
          <StyledView style={{ marginBottom: 20, width: '100%' }}>
            <StyledText className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Lifestyle Preferences
            </StyledText>

            <StyledView style={{ width: '100%' }}>
              {anchor.partnerLifestylePreferences?.drinking && (
                <StyledView className="flex-row items-center py-2">
                  <EvaIcon name="wine-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <StyledText className="text-neutral-900 flex-1">
                    Drinking: {formatFrequency(toSingleValue(anchor.partnerLifestylePreferences.drinking))}
                  </StyledText>
                </StyledView>
              )}

              {anchor.partnerLifestylePreferences?.cannabis && (
                <StyledView className="flex-row items-center py-2">
                  <EvaIcon name="leaf-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <StyledText className="text-neutral-900 flex-1">
                    Cannabis: {formatFrequency(toSingleValue(anchor.partnerLifestylePreferences.cannabis))}
                  </StyledText>
                </StyledView>
              )}

              {anchor.partnerLifestylePreferences?.tobacco && (
                <StyledView className="flex-row items-center py-2">
                  <EvaIcon name="ban-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <StyledText className="text-neutral-900 flex-1">
                    Tobacco: {formatFrequency(toSingleValue(anchor.partnerLifestylePreferences.tobacco))}
                  </StyledText>
                </StyledView>
              )}

              {anchor.partnerLifestylePreferences?.otherDrugs && (
                <StyledView className="flex-row items-center py-2">
                  <EvaIcon name="medical-outline" size={18} color="#64748B" style={{ marginRight: 12 }} />
                  <StyledText className="text-neutral-900 flex-1">
                    Other drugs: {formatFrequency(toSingleValue(anchor.partnerLifestylePreferences.otherDrugs))}
                  </StyledText>
                </StyledView>
              )}
            </StyledView>
          </StyledView>
        )}

      </StyledScrollView>
    </StyledView>
  );
}

export default AnchorPreferencesSection;
