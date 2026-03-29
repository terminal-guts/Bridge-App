import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { H3, Body } from '../../components/ui/Typography';
import { Card, ScreenWrapper } from '../../components/ui';
import { Chip } from '../../components/ui/Chip';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { LifestyleSection } from './sections/LifestyleSection';

const StyledView = styled(View);
const StyledText = styled(Text);

const CHILDREN_STATUS_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const FAMILY_PLANS_OPTIONS = [
  { value: 'want_children', label: 'Want Children' },
  { value: 'dont_want_children', label: "Don't Want Children" },
  { value: 'not_sure', label: 'Not Sure Yet' },
];

interface EditLifestyleScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditLifestyle'>;
}

export const EditLifestyleScreen: React.FC<EditLifestyleScreenProps> = ({ navigation }) => {
  const { profile, loading, updateProfile, originalProfileJson } = useEditProfile();

  const handleUpdateDrinking = (value: string) => {
    updateProfile({ drinkingFrequency: value });
  };

  const handleUpdateCannabis = (value: string) => {
    updateProfile({ cannabisFrequency: value });
  };

  const handleUpdateTobacco = (value: string) => {
    updateProfile({ tobaccoFrequency: value });
  };

  const handleUpdateOtherDrugs = (value: string) => {
    updateProfile({ otherDrugsFrequency: value });
  };

  if (loading || !profile) {
    return (
      <ScreenWrapper>
        <StyledView className="flex-1 justify-center items-center">
          <Body style={{ color: COLORS.text.secondary }}>{loading ? 'Loading...' : 'Failed to load profile'}</Body>
        </StyledView>
      </ScreenWrapper>
    );
  }

  return (
    <SectionScreenWrapper
      title="Lifestyle"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
    >
      {/* Lifestyle Habits */}
      <LifestyleSection
        drinkingFrequency={profile.drinkingFrequency}
        cannabisFrequency={profile.cannabisFrequency}
        tobaccoFrequency={profile.tobaccoFrequency}
        otherDrugsFrequency={profile.otherDrugsFrequency}
        onUpdateDrinking={handleUpdateDrinking}
        onUpdateCannabis={handleUpdateCannabis}
        onUpdateTobacco={handleUpdateTobacco}
        onUpdateOtherDrugs={handleUpdateOtherDrugs}
      />

      {/* Family & Children */}
      <Card className="mb-6">
        <H3 className="mb-4">Family &amp; Children</H3>

        {/* Children Status */}
        <StyledView className="mb-3 mt-2">
          <Body style={{ fontFamily: FONTS.semiBold, fontSize: 11, lineHeight: 14, color: COLORS.text.secondary, letterSpacing: 0.8 }}>
            DO YOU HAVE CHILDREN?<StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}> *</StyledText>
          </Body>
        </StyledView>
        <StyledView className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
          {CHILDREN_STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.hasChildren === option.value}
              onPress={() => updateProfile({ hasChildren: profile.hasChildren === option.value ? '' : option.value })}
            />
          ))}
        </StyledView>

        {/* Family Plans */}
        <StyledView className="mb-3 mt-2">
          <Body style={{ fontFamily: FONTS.semiBold, fontSize: 11, lineHeight: 14, color: COLORS.text.secondary, letterSpacing: 0.8 }}>
            FAMILY PLANS<StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}> *</StyledText>
          </Body>
        </StyledView>
        <StyledView className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
          {FAMILY_PLANS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.familyPlans === option.value}
              onPress={() => updateProfile({ familyPlans: profile.familyPlans === option.value ? '' : option.value })}
            />
          ))}
        </StyledView>
      </Card>

    </SectionScreenWrapper>
  );
};
