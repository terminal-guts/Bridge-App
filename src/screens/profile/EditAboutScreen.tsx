import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { H3, Body } from '../../components/ui/Typography';
import { Card, Input, ScreenWrapper } from '../../components/ui';
import { selectionHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';

/** Minimum touch target height per iOS HIG (44px) */
const MIN_TOUCH_TARGET = 44;

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

/** Pill text styles using design system constants */
const pillSelectedStyle = {
  fontSize: FONT_SIZES.base,
  fontFamily: FONTS.medium,
  color: '#FFFFFF' as const,
};
const pillUnselectedStyle = {
  fontSize: FONT_SIZES.base,
  fontFamily: FONTS.regular,
  color: COLORS.text.secondary,
};

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

/** Reusable field label with required asterisk or optional hint */
const FieldLabel: React.FC<{ label: string; required?: boolean; optional?: boolean }> = ({ label, required, optional }) => (
  <Body style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.medium, color: COLORS.text.secondary, marginBottom: 8 }}>
    {label}{' '}
    {required && <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>}
    {optional && (
      <Body style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.tertiary }}>(optional)</Body>
    )}
  </Body>
);

interface EditAboutScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditAbout'>;
}

export const EditAboutScreen: React.FC<EditAboutScreenProps> = ({ navigation }) => {
  const { profile, loading, updateProfile, originalProfileJson } = useEditProfile();

  if (loading || !profile) {
    return (
      <ScreenWrapper>
        <StyledView className="flex-1 justify-center items-center">
          <Body style={{ color: COLORS.text.secondary }}>{loading ? 'Loading...' : 'Failed to load profile'}</Body>
        </StyledView>
      </ScreenWrapper>
    );
  }

  const religionArray = profile.religion
    ? profile.religion.split(' / ').map((s: string) => s.trim()).filter(Boolean)
    : [];

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
        <FieldLabel label="Religion" required />
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {RELIGION_OPTIONS.map((option) => {
            const isSelected = religionArray.includes(option);
            return (
              <StyledTouchableOpacity
                key={option}
                activeOpacity={1}
                delayPressIn={0}
                style={{ minHeight: MIN_TOUCH_TARGET }}
                onPress={() => {
                  selectionHaptic();
                  const updated = isSelected
                    ? religionArray.filter((r: string) => r !== option)
                    : [...religionArray, option];
                  updateProfile({ religion: updated.join(' / ') });
                }}
                className={`px-3 justify-center rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
              >
                <Body style={isSelected ? pillSelectedStyle : pillUnselectedStyle}>
                  {option}
                </Body>
              </StyledTouchableOpacity>
            );
          })}
        </StyledView>

        {/* Political Leaning */}
        <FieldLabel label="Political Leaning" required />
        <StyledView className="flex-row flex-wrap gap-2.5">
          {POLITICAL_OPTIONS.map((option) => {
            const isSelected = profile.politicalLeaning === option.value;
            return (
              <StyledTouchableOpacity
                key={option.value}
                activeOpacity={1}
                delayPressIn={0}
                style={{ minHeight: MIN_TOUCH_TARGET }}
                onPress={() => {
                  selectionHaptic();
                  updateProfile({ politicalLeaning: isSelected ? '' : option.value });
                }}
                className={`px-3 justify-center rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
              >
                <Body style={isSelected ? pillSelectedStyle : pillUnselectedStyle}>
                  {option.label}
                </Body>
              </StyledTouchableOpacity>
            );
          })}

          {profile.politicalLeaning === 'other' && profile.customPoliticalLeaning && (
            <StyledTouchableOpacity
              style={{ minHeight: MIN_TOUCH_TARGET }}
              onPress={() => {
                updateProfile({ politicalLeaning: '', customPoliticalLeaning: '' });
                mediumHaptic();
              }}
              className="px-3 justify-center rounded-full border bg-primary-500 border-primary-500"
            >
              <Body style={pillSelectedStyle}>{profile.customPoliticalLeaning}</Body>
            </StyledTouchableOpacity>
          )}
        </StyledView>
      </Card>

      {/* Professional & Education */}
      <Card className="mb-6">
        <H3 className="mb-4">Professional & Education</H3>

        <StyledView className="mb-4">
          <FieldLabel label="Company/Position" optional />
          <Input
            value={profile.companyPosition || ''}
            onChangeText={(text) => updateProfile({ companyPosition: text })}
            placeholder="Where do you work?"
            maxLength={80}
          />
        </StyledView>

        {/* Education Level */}
        <FieldLabel label="Education Level" optional />
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {EDUCATION_LEVELS.map((option) => {
            const isSelected = profile.educationLevel === option.value;
            return (
              <StyledTouchableOpacity
                key={option.value}
                activeOpacity={1}
                delayPressIn={0}
                style={{ minHeight: MIN_TOUCH_TARGET }}
                onPress={() => {
                  selectionHaptic();
                  updateProfile({ educationLevel: isSelected ? '' : option.value });
                }}
                className={`px-3 justify-center rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
              >
                <Body style={isSelected ? pillSelectedStyle : pillUnselectedStyle}>
                  {option.label}
                </Body>
              </StyledTouchableOpacity>
            );
          })}

          {profile.educationLevel === 'other' && profile.customEducationLevel && (
            <StyledTouchableOpacity
              style={{ minHeight: MIN_TOUCH_TARGET }}
              onPress={() => {
                updateProfile({ educationLevel: '', customEducationLevel: '' });
                mediumHaptic();
              }}
              className="px-3 justify-center rounded-full border bg-primary-500 border-primary-500"
            >
              <Body style={pillSelectedStyle}>{profile.customEducationLevel}</Body>
            </StyledTouchableOpacity>
          )}
        </StyledView>

        <StyledView className="mb-4">
          <FieldLabel label="School / University" optional />
          <Input
            value={profile.school || ''}
            onChangeText={(text) => updateProfile({ school: text })}
            placeholder="e.g., Harvard Business School"
            maxLength={100}
          />
        </StyledView>
      </Card>
    </SectionScreenWrapper>
  );
};
