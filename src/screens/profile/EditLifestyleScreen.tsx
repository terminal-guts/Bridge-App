import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { H3, Body } from '../../components/ui/Typography';
import { Card, ScreenWrapper } from '../../components/ui';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { LifestyleSection } from './sections/LifestyleSection';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
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
  const { profile, setProfile, loading, updateProfile, originalProfileJson } = useEditProfile();

  const handleUpdateDrinking = useCallback((value: string) => {
    updateProfile({ drinkingFrequency: value });
  }, [updateProfile]);

  const handleUpdateCannabis = useCallback((value: string) => {
    updateProfile({ cannabisFrequency: value });
  }, [updateProfile]);

  const handleUpdateTobacco = useCallback((value: string) => {
    updateProfile({ tobaccoFrequency: value });
  }, [updateProfile]);

  const handleUpdateOtherDrugs = useCallback((value: string) => {
    updateProfile({ otherDrugsFrequency: value });
  }, [updateProfile]);

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
        <H3 className="mb-4">Family & Children</H3>

        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Do you have children? <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {CHILDREN_STATUS_OPTIONS.map((option) => (
            <StyledTouchableOpacity
              key={option.value}
              activeOpacity={1}
              delayPressIn={0}
              onPress={() => {
                lightHaptic();
                updateProfile({ hasChildren: option.value });
              }}
              className={`px-3 py-2 rounded-full border ${profile.hasChildren === option.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
              }`}
            >
              <Body className={`text-sm ${profile.hasChildren === option.value ? 'text-white font-medium' : 'text-neutral-700'}`}>
                {option.label}
              </Body>
            </StyledTouchableOpacity>
          ))}
        </StyledView>

        <Body className="text-xs font-medium text-neutral-700 mb-2">
          Family Plans <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>
        </Body>
        <StyledView className="flex-row flex-wrap gap-2.5 mb-4">
          {FAMILY_PLANS_OPTIONS.map((option) => (
            <StyledTouchableOpacity
              key={option.value}
              activeOpacity={1}
              delayPressIn={0}
              onPress={() => {
                lightHaptic();
                updateProfile({ familyPlans: option.value });
              }}
              className={`px-3 py-2 rounded-full border ${profile.familyPlans === option.value
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
              }`}
            >
              <Body className={`text-sm ${profile.familyPlans === option.value ? 'text-white font-medium' : 'text-neutral-700'}`}>
                {option.label}
              </Body>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
      </Card>

    </SectionScreenWrapper>
  );
};
