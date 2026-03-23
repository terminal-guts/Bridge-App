import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { H3, Body } from '../../components/ui/Typography';
import { Card, Input, ScreenWrapper } from '../../components/ui';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

const RELIGION_OPTIONS = [
  'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim',
  'Spiritual', 'Agnostic', 'Atheist', 'Other',
];

const POLITICAL_OPTIONS = [
  { value: 'very_liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very_conservative', label: 'Very Conservative' },
  { value: 'not_political', label: 'Not Political' },
  { value: 'other', label: 'Other' },
];

const EDUCATION_LEVELS = [
  { value: 'no_high_school', label: 'No High School Degree' },
  { value: 'high_school', label: 'High School' },
  { value: 'trade_school', label: 'Trade School' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'beyond_masters', label: 'Beyond Masters' },
  { value: 'other', label: 'Other' },
];

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <StyledView className="mb-3 mt-2">
    <Body className="text-neutral-500 text-xs font-semibold tracking-wider">{title}</Body>
  </StyledView>
);

interface EditAboutScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditAbout'>;
}

export const EditAboutScreen: React.FC<EditAboutScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, updateProfile, originalProfileJson } = useEditProfile();

  if (loading || !profile) {
    return (
      <ScreenWrapper>
        <StyledView className="flex-1 justify-center items-center">
          <Body className="text-neutral-500">{loading ? 'Loading...' : 'Failed to load profile'}</Body>
        </StyledView>
      </ScreenWrapper>
    );
  }

  return (
    <SectionScreenWrapper
      title="About Me"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
    >
      {/* Background & Beliefs */}
      <Card className="mb-6">
        <H3 className="mb-4">Background & Beliefs</H3>

        {/* Religion */}
        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Religion <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {RELIGION_OPTIONS.map((option) => {
            const religionArray = profile.religion ? profile.religion.split(' / ').map((s: string) => s.trim()).filter(Boolean) : [];
            const isSelected = religionArray.includes(option);
            return (
              <StyledTouchableOpacity
                key={option}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => {
                  lightHaptic();
                  const updated = isSelected
                    ? religionArray.filter((r: string) => r !== option)
                    : [...religionArray, option];
                  updateProfile({ religion: updated.join(' / ') });
                }}
                className={`px-3 py-2 rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
              >
                <Body className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-neutral-700'}`}>
                  {option}
                </Body>
              </StyledTouchableOpacity>
            );
          })}
        </StyledView>

        {/* Political Leaning */}
        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Political Leaning <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5">
          {POLITICAL_OPTIONS.map((option) => (
            <StyledTouchableOpacity
              key={option.value}
              activeOpacity={1}
              delayPressIn={0}
              onPress={() => {
                lightHaptic();
                updateProfile({ politicalLeaning: profile.politicalLeaning === option.value ? '' : option.value });
              }}
              className={`px-3 py-2 rounded-full border ${profile.politicalLeaning === option.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
              }`}
            >
              <Body className={`text-sm ${profile.politicalLeaning === option.value ? 'text-white font-medium' : 'text-neutral-700'}`}>
                {option.label}
              </Body>
            </StyledTouchableOpacity>
          ))}

          {profile.politicalLeaning === 'other' && profile.customPoliticalLeaning && (
            <StyledTouchableOpacity
              onPress={() => {
                updateProfile({ politicalLeaning: '', customPoliticalLeaning: '' });
                mediumHaptic();
              }}
              className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
            >
              <Body className="text-sm text-white font-medium">{profile.customPoliticalLeaning}</Body>
            </StyledTouchableOpacity>
          )}

        </StyledView>
      </Card>

      {/* Professional & Education */}
      <Card className="mb-6">
        <H3 className="mb-4">Professional & Education</H3>

        <StyledView className="mb-4">
          <Body className="text-xs font-medium text-neutral-700 mb-2">
            Occupation <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>
          </Body>
          <Input
            value={profile.currentJob || ''}
            onChangeText={(text) => updateProfile({ currentJob: text })}
            placeholder="What do you do?"
            maxLength={80}
          />
        </StyledView>
        <StyledView className="mb-4">
          <Body className="text-xs font-medium text-neutral-700 mb-2">
            Company/Position <Body className="text-[11px] text-neutral-400">(optional)</Body>
          </Body>
          <Input
            value={profile.companyPosition || ''}
            onChangeText={(text) => updateProfile({ companyPosition: text })}
            placeholder="Where do you work?"
            maxLength={80}
          />
        </StyledView>

        {/* Education Level */}
        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Education Level <Body className="text-[11px] text-neutral-400">(optional)</Body>
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {EDUCATION_LEVELS.map((option) => (
            <StyledTouchableOpacity
              key={option.value}
              activeOpacity={1}
              delayPressIn={0}
              onPress={() => {
                lightHaptic();
                if (profile.educationLevel === option.value) {
                  updateProfile({ educationLevel: '' });
                } else {
                  updateProfile({ educationLevel: option.value });
                }
              }}
              className={`px-3 py-2 rounded-full border ${profile.educationLevel === option.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
              }`}
            >
              <Body className={`text-sm ${profile.educationLevel === option.value ? 'text-white font-medium' : 'text-neutral-700'}`}>
                {option.label}
              </Body>
            </StyledTouchableOpacity>
          ))}

          {profile.educationLevel === 'other' && profile.customEducationLevel && (
            <StyledTouchableOpacity
              onPress={() => {
                updateProfile({ educationLevel: '', customEducationLevel: '' });
                mediumHaptic();
              }}
              className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
            >
              <Body className="text-sm text-white font-medium">{profile.customEducationLevel}</Body>
            </StyledTouchableOpacity>
          )}

        </StyledView>

        <StyledView className="mb-4">
          <Body className="text-xs font-medium text-neutral-700 mb-2">
            School / University <Body className="text-[11px] text-neutral-400">(optional)</Body>
          </Body>
          <Input
            value={profile.school || ''}
            onChangeText={(text) => updateProfile({ school: text })}
            placeholder="e.g., Harvard Business School"
            maxLength={100}
          />
        </StyledView>
      </Card>

      {/* Custom Modals */}
    </SectionScreenWrapper>
  );
};
