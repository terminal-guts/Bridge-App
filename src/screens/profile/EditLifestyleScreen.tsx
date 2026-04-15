import React from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Body } from '../../components/ui/Typography';
import { ScreenWrapper } from '../../components/ui';
import { COLORS } from '../../theme/colors';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { LifestyleSection } from './sections/LifestyleSection';

const StyledView = styled(View);

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

    </SectionScreenWrapper>
  );
};
