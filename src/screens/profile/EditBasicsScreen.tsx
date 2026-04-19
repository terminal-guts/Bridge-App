import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { H3, BodySmall, Label } from '../../components/ui/Typography';
import { Card, Input } from '../../components/ui';
import { selectionHaptic, mediumHaptic } from '../../utils/haptics';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { PhotosSection } from './sections/PhotosSection';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

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

interface EditBasicsScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditBasics'>;
}

export const EditBasicsScreen: React.FC<EditBasicsScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, updateProfile, originalProfileJson } = useEditProfile();
  const [isHeightFocused, setIsHeightFocused] = useState(false);
  const [heightError, setHeightError] = useState('');
  // True while any photo is mid-upload/moderation — disables Back so the user
  // can't navigate away before the photo either passes or fails moderation.
  const [photosUploading, setPhotosUploading] = useState(false);
  const ethnicityArray = profile?.ethnicity
    ? profile.ethnicity.split(' / ').filter(e => e.trim() !== '')
    : [];

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
      <SectionScreenWrapper
        title="Basics"
        profile={null}
        originalProfileJson=""
        onGoBack={() => navigation.goBack()}
      >
        <StyledView className="flex-1 justify-center items-center py-20">
          <BodySmall style={{ color: COLORS.text.secondary }}>
            {loading ? 'Loading...' : 'Failed to load profile'}
          </BodySmall>
        </StyledView>
      </SectionScreenWrapper>
    );
  }

  return (
    <SectionScreenWrapper
      title="Basics"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
      backDisabled={photosUploading}
    >
      {/* Photos — Hinge-style grid, first photo = main, tap to promote */}
      <PhotosSection
        profile={profile}
        setProfile={setProfile}
        onUploadingChange={setPhotosUploading}
      />

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
          value={profile.age != null ? profile.age.toString() : ''}
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
          <BodySmall style={{ color: COLORS.error }} className="-mt-2 mb-4">{heightError}</BodySmall>
        ) : null}

        {/* Ethnicity */}
        <Label style={{ color: COLORS.text.secondary }} className="mb-2 mt-4">
          Ethnicity <StyledText style={{ color: COLORS.error }}>*</StyledText> (Select all that apply)
        </Label>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {ETHNICITY_OPTIONS.map((option) => {
            const isSelected = ethnicityArray.includes(option);
            return (
              <StyledTouchableOpacity
                key={option}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => {
                  selectionHaptic();
                  let updated: string[];
                  if (isSelected) {
                    updated = ethnicityArray.filter(e => e !== option);
                  } else {
                    updated = [...ethnicityArray, option];
                  }
                  updateProfile({ ethnicity: updated.filter(e => e.trim() !== '').join(' / ') });
                }}
                style={{ minHeight: 44 }}
                className={`px-4 py-2.5 rounded-full border items-center justify-center ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
                accessibilityRole="checkbox"
                accessibilityLabel={option}
                accessibilityState={{ checked: isSelected }}
              >
                <BodySmall className={isSelected ? 'text-white font-medium' : 'text-neutral-700'}>
                  {option}
                </BodySmall>
              </StyledTouchableOpacity>
            );
          })}

          {ethnicityArray.filter(e => !ETHNICITY_OPTIONS.includes(e) && e.trim() !== '').map((custom) => (
            <StyledTouchableOpacity
              key={custom}
              onPress={() => {
                const updated = ethnicityArray.filter(e => e !== custom);
                updateProfile({ ethnicity: updated.filter(e => e.trim() !== '').join(' / ') });
                mediumHaptic();
              }}
              style={{ minHeight: 44 }}
              className="px-4 py-2.5 rounded-full border bg-primary-500 border-primary-500 items-center justify-center"
              accessibilityRole="checkbox"
              accessibilityLabel={custom}
              accessibilityState={{ checked: true }}
            >
              <BodySmall className="text-white font-medium">{custom}</BodySmall>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
        {/* Gender Identity */}
        <Label style={{ color: COLORS.text.secondary }} className="mb-2 mt-4">
          Gender <StyledText style={{ color: COLORS.error }}>*</StyledText> (Select all that apply)
        </Label>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {GENDER_OPTIONS.map((option) => {
            const isSelected = profile.gender?.includes(option.value);
            return (
              <StyledTouchableOpacity
                key={option.value}
                activeOpacity={1}
                delayPressIn={0}
                onPress={() => {
                  selectionHaptic();
                  const currentGenders = profile.gender || [];
                  let updatedGenders: string[];
                  if (isSelected) {
                    updatedGenders = currentGenders.filter(g => g !== option.value);
                  } else {
                    updatedGenders = [...currentGenders, option.value];
                  }
                  updateProfile({ gender: updatedGenders });
                }}
                style={{ minHeight: 44 }}
                className={`px-4 py-2.5 rounded-full border items-center justify-center ${isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
                accessibilityRole="checkbox"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: !!isSelected }}
              >
                <BodySmall className={isSelected ? 'text-white font-medium' : 'text-neutral-700'}>
                  {option.label}
                </BodySmall>
              </StyledTouchableOpacity>
            );
          })}

        </StyledView>
      </Card>

    </SectionScreenWrapper>
  );
};
