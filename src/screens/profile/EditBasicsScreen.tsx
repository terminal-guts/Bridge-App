import React, { useState, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, Alert, Text } from 'react-native';
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

const PRONOUN_OPTIONS = [
  'He', 'Him', 'His',
  'She', 'Her', 'Hers',
  'They', 'Them', 'Theirs',
  'Ze', 'Zir',
];
const MAX_PRONOUNS = 4;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

const ETHNICITY_OPTIONS = [
  'Black', 'East Asian', 'Hispanic', 'Middle Eastern', 'Native American',
  'Pacific Islander', 'South Asian', 'Southeast Asian', 'White', 'Other',
];

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <StyledView className="mb-3 mt-2">
    <Body className="text-neutral-500 text-xs font-semibold tracking-wider">{title}</Body>
  </StyledView>
);

interface EditBasicsScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditBasics'>;
}

export const EditBasicsScreen: React.FC<EditBasicsScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, updateProfile, originalProfileJson } = useEditProfile();
  const [isHeightFocused, setIsHeightFocused] = useState(false);
  const [heightError, setHeightError] = useState('');
  const ethnicityArray = useMemo(() => {
    return profile?.ethnicity
      ? profile.ethnicity.split(' / ').filter(e => e.trim() !== '')
      : [];
  }, [profile?.ethnicity]);

  const formatHeight = (value: string): string => {
    if (!value || value === '0') return '';
    if (value.includes("'")) return value;
    const inchesNum = parseInt(value, 10);
    if (isNaN(inchesNum)) return '';
    const feet = Math.floor(inchesNum / 12);
    const remainingInches = inchesNum % 12;
    return `${feet}'${remainingInches}"`;
  };

  const parseHeightToInches = (value: string): string => {
    if (/^\d+$/.test(value)) return value;
    const match = value.match(/(\d+)'(\d+)/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseInt(match[2], 10);
      return (feet * 12 + inches).toString();
    }
    return value;
  };

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
      title="Basics"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
    >
      <Card className="mb-6">
        <H3 className="mb-4">Demographics</H3>

        <Input
          label="First Name"
          required
          value={profile.firstName}
          onChangeText={(text) => {
            const lettersOnly = text.replace(/[^a-zA-Z\s'-]/g, '');
            updateProfile({ firstName: lettersOnly });
          }}
          placeholder="Enter your first name"
          containerClassName="mb-4"
        />
        <Input
          label="Last Name"
          required
          value={profile.lastName}
          onChangeText={(text) => {
            const lettersOnly = text.replace(/[^a-zA-Z\s'-]/g, '');
            updateProfile({ lastName: lettersOnly });
          }}
          placeholder="Enter your last name"
          containerClassName="mb-4"
        />
        <Input
          label="Age"
          required
          value={profile.age.toString()}
          onChangeText={(text) => {
            const numericOnly = text.replace(/[^0-9]/g, '');
            const age = numericOnly ? parseInt(numericOnly, 10) : 0;
            updateProfile({ age });
          }}
          keyboardType="numeric"
          placeholder="Enter your age (18+)"
          containerClassName="mb-4"
        />
        <Input
          label="Height (inches)"
          required
          value={isHeightFocused ? profile.height : formatHeight(profile.height)}
          onChangeText={(text) => {
            const numericOnly = text.replace(/[^0-9]/g, '');
            updateProfile({ height: numericOnly });
            setHeightError('');
          }}
          onFocus={() => {
            setIsHeightFocused(true);
            setHeightError('');
          }}
          onBlur={() => {
            setIsHeightFocused(false);
            if (profile.height) {
              const inches = parseHeightToInches(profile.height);
              let validatedHeight = parseInt(inches, 10);
              if (validatedHeight < 48) {
                validatedHeight = 48;
                setHeightError('Height must be at least 48 inches');
              } else if (validatedHeight > 84) {
                validatedHeight = 84;
                setHeightError('Height cannot exceed 84 inches');
              } else {
                setHeightError('');
              }
              updateProfile({ height: validatedHeight.toString() });
            }
          }}
          placeholder="e.g., 68"
          keyboardType="numeric"
          containerClassName="mb-4"
        />
        {heightError ? (
          <Body className="text-error text-sm -mt-2 mb-4">{heightError}</Body>
        ) : null}

        {/* Ethnicity */}
        <Body className="text-xs font-medium text-neutral-700 mb-2 mt-4">
          Ethnicity <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText> (Select all that apply)
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {ETHNICITY_OPTIONS.map((option) => {
            const isSelected = ethnicityArray.includes(option);
            return (
              <StyledTouchableOpacity
                key={option}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => {
                  lightHaptic();
                  let updated: string[];
                  if (isSelected) {
                    updated = ethnicityArray.filter(e => e !== option);
                  } else {
                    updated = [...ethnicityArray, option];
                  }
                  updateProfile({ ethnicity: updated.filter(e => e.trim() !== '').join(' / ') });
                }}
                className={`px-3 py-2 rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
                accessibilityRole="checkbox"
                accessibilityLabel={option}
                accessibilityState={{ checked: isSelected }}
              >
                <Body className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-neutral-700'}`}>
                  {option}
                </Body>
              </StyledTouchableOpacity>
            );
          })}

          {/* Legacy custom ethnicity chips (from before standardization) */}
          {ethnicityArray.filter(e => !ETHNICITY_OPTIONS.includes(e) && e.trim() !== '').map((custom) => (
            <StyledTouchableOpacity
              key={custom}
              onPress={() => {
                const updated = ethnicityArray.filter(e => e !== custom);
                updateProfile({ ethnicity: updated.filter(e => e.trim() !== '').join(' / ') });
                mediumHaptic();
              }}
              className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
            >
              <Body className="text-sm text-white font-medium">{custom}</Body>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
      </Card>

      {/* Identity & Attraction */}
      <Card className="mb-6">
        <H3 className="mb-4">Identity & Attraction</H3>

        {/* Pronouns */}
        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Pronouns <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText> (Select up to {MAX_PRONOUNS})
        </Body>
        <Body className="text-primary-500 text-xs font-semibold mb-2">
          {(profile.pronounsList?.length || 0)}/{MAX_PRONOUNS} selected
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {PRONOUN_OPTIONS.map((pronoun) => {
            const isSelected = profile.pronounsList?.includes(pronoun);
            return (
              <StyledTouchableOpacity
                key={pronoun}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => {
                  lightHaptic();
                  const currentPronouns = profile.pronounsList || [];
                  let updatedPronouns: string[];
                  if (isSelected) {
                    updatedPronouns = currentPronouns.filter(p => p !== pronoun);
                  } else {
                    if (currentPronouns.length >= MAX_PRONOUNS) {
                      Alert.alert('Limit Reached', `You can only select up to ${MAX_PRONOUNS} pronouns`);
                      return;
                    }
                    updatedPronouns = [...currentPronouns, pronoun];
                  }
                  updateProfile({ pronounsList: updatedPronouns });
                }}
                className={`px-3 py-2 rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
              >
                <Body className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-neutral-700'}`}>
                  {pronoun}
                </Body>
              </StyledTouchableOpacity>
            );
          })}
        </StyledView>

        {/* Gender Identity */}
        <Body className="text-xs font-medium text-neutral-700 mb-2 mt-4">
          Gender <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText> (Select all that apply)
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {GENDER_OPTIONS.map((option) => {
            const isSelected = profile.gender?.includes(option.value);
            return (
              <StyledTouchableOpacity
                key={option.value}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => {
                  lightHaptic();
                  const currentGenders = profile.gender || [];
                  let updatedGenders: string[];
                  if (isSelected) {
                    updatedGenders = currentGenders.filter(g => g !== option.value);
                  } else {
                    updatedGenders = [...currentGenders, option.value];
                  }
                  updateProfile({ gender: updatedGenders });
                }}
                className={`px-3 py-2 rounded-full border ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
              >
                <Body className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-neutral-700'}`}>
                  {option.label}
                </Body>
              </StyledTouchableOpacity>
            );
          })}

        </StyledView>
      </Card>

    </SectionScreenWrapper>
  );
};
