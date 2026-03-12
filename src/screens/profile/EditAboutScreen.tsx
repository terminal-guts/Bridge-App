import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { H3, Body } from '../../components/ui/Typography';
import { Card, Input, ScreenWrapper } from '../../components/ui';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { CustomInputModal } from './sections/CustomInputModal';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

const RELIGION_OPTIONS = [
  'Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu',
  'Jewish', 'Mormon', 'Muslim', 'Sikh', 'Spiritual', 'Orthodox',
  'Protestant', 'Evangelical', "Baha'i", 'Jain', 'Shinto', 'Taoist',
  'Pagan', 'Unitarian', 'Non-religious',
];

const POLITICAL_OPTIONS = [
  { value: 'very_liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very_conservative', label: 'Very Conservative' },
  { value: 'not_political', label: 'Not Political' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const EDUCATION_LEVELS = [
  { value: 'no_high_school', label: 'No High School Degree' },
  { value: 'high_school', label: 'High School' },
  { value: 'trade_school', label: 'Trade School' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'beyond_masters', label: 'Beyond Masters' },
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
  const [showCustomReligionModal, setShowCustomReligionModal] = useState(false);
  const [showCustomPoliticalModal, setShowCustomPoliticalModal] = useState(false);
  const [showCustomEducationModal, setShowCustomEducationModal] = useState(false);

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
          Religion <StyledText style={{ color: '#EF4444', fontFamily: FONTS.regular }}>*</StyledText>
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {RELIGION_OPTIONS.map((option) => (
            <StyledTouchableOpacity
              key={option}
              activeOpacity={1}
              delayPressIn={0}
              onPress={() => {
                lightHaptic();
                updateProfile({ religion: profile.religion === option ? '' : option });
              }}
              className={`px-3 py-2 rounded-full border ${profile.religion === option
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
              }`}
            >
              <Body className={`text-sm ${profile.religion === option ? 'text-white font-medium' : 'text-neutral-700'}`}>
                {option}
              </Body>
            </StyledTouchableOpacity>
          ))}
          <StyledTouchableOpacity
            onPress={() => { lightHaptic(); setShowCustomReligionModal(true); }}
            className="px-3 py-2 rounded-full border bg-white border-neutral-300"
          >
            <Body className="text-sm text-neutral-700">Other</Body>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Political Leaning */}
        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Political Leaning <StyledText style={{ color: '#EF4444', fontFamily: FONTS.regular }}>*</StyledText>
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

          <StyledTouchableOpacity
            onPress={() => { lightHaptic(); setShowCustomPoliticalModal(true); }}
            className="px-3 py-2 rounded-full border bg-white border-neutral-300"
          >
            <Body className="text-sm text-neutral-700">Other</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </Card>

      {/* Professional & Education */}
      <Card className="mb-6">
        <H3 className="mb-4">Professional & Education</H3>

        <StyledView className="mb-4">
          <Body className="text-xs font-medium text-neutral-700 mb-2">
            Occupation <StyledText style={{ color: '#EF4444', fontFamily: FONTS.regular }}>*</StyledText>
          </Body>
          <Input
            value={profile.currentJob || ''}
            onChangeText={(text) => updateProfile({ currentJob: text })}
            placeholder="What do you do?"
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

          <StyledTouchableOpacity
            onPress={() => { lightHaptic(); setShowCustomEducationModal(true); }}
            className="px-3 py-2 rounded-full border bg-white border-neutral-300"
          >
            <Body className="text-sm text-neutral-700">Other</Body>
          </StyledTouchableOpacity>
        </StyledView>

        <StyledView className="mb-4">
          <Body className="text-xs font-medium text-neutral-700 mb-2">
            School / University <Body className="text-[11px] text-neutral-400">(optional)</Body>
          </Body>
          <Input
            value={profile.school || ''}
            onChangeText={(text) => updateProfile({ school: text })}
            placeholder="e.g., Harvard Business School"
          />
        </StyledView>
      </Card>

      {/* Custom Modals */}
      <CustomInputModal
        visible={showCustomReligionModal}
        title="Add Custom Religion"
        subtitle="Enter your religious belief"
        placeholder="Type your religion"
        onClose={() => setShowCustomReligionModal(false)}
        onSubmit={(value) => {
          const matchingOption = RELIGION_OPTIONS.find(
            opt => opt.toLowerCase() === value.toLowerCase()
          );
          updateProfile({ religion: matchingOption || value });
          mediumHaptic();
          setShowCustomReligionModal(false);
        }}
      />
      <CustomInputModal
        visible={showCustomPoliticalModal}
        title="Add Custom Political Leaning"
        subtitle="Enter your political leaning"
        placeholder="Type your political leaning"
        onClose={() => setShowCustomPoliticalModal(false)}
        onSubmit={(value) => {
          const matchingOption = POLITICAL_OPTIONS.find(
            opt => opt.label.toLowerCase() === value.toLowerCase()
          );
          if (matchingOption) {
            setProfile({ ...profile, politicalLeaning: matchingOption.value, customPoliticalLeaning: '' });
          } else {
            setProfile({ ...profile, politicalLeaning: 'other', customPoliticalLeaning: value });
          }
          mediumHaptic();
          setShowCustomPoliticalModal(false);
        }}
      />
      <CustomInputModal
        visible={showCustomEducationModal}
        title="Add Custom Education Level"
        subtitle="Enter your education level"
        placeholder="Type your education level"
        onClose={() => setShowCustomEducationModal(false)}
        onSubmit={(value) => {
          setProfile({ ...profile, educationLevel: 'other', customEducationLevel: value });
          mediumHaptic();
          setShowCustomEducationModal(false);
        }}
      />
    </SectionScreenWrapper>
  );
};
