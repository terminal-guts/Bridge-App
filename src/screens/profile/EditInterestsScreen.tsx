import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Body } from '../../components/ui/Typography';
import { ScreenWrapper } from '../../components/ui';
import { SectionScreenWrapper } from './sections/SectionScreenWrapper';
import { useEditProfile } from './sections/useEditProfile';
import { InterestsSection } from './sections/InterestsSection';
import { ValuesSection } from './sections/ValuesSection';
import { CustomInputModal } from './sections/CustomInputModal';

const StyledView = styled(View);

const MIN_INTERESTS = 3;
const MIN_VALUES = 3;
const MAX_INTERESTS = 5;
const MAX_VALUES = 5;

interface EditInterestsScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditInterests'>;
}

export const EditInterestsScreen: React.FC<EditInterestsScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, originalProfileJson } = useEditProfile();
  const [showCustomInterestModal, setShowCustomInterestModal] = useState(false);
  const [showCustomValueModal, setShowCustomValueModal] = useState(false);

  const handleToggleInterest = (interest: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const currentInterests = prev.interests || [];
      const isSelected = currentInterests.includes(interest);
      if (isSelected) {
        return { ...prev, interests: currentInterests.filter(i => i !== interest) };
      }
      if (currentInterests.length >= MAX_INTERESTS) {
        return prev;
      }
      return { ...prev, interests: [...currentInterests, interest] };
    });
  };

  const handleToggleValue = (value: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const currentValues = prev.values || [];
      const isSelected = currentValues.includes(value);
      if (isSelected) {
        return { ...prev, values: currentValues.filter(v => v !== value) };
      }
      if (currentValues.length >= MAX_VALUES) {
        return prev;
      }
      return { ...prev, values: [...currentValues, value] };
    });
  };

  const handleAddInterest = (interest: string) => {
    setProfile(prev => {
      if (!prev || prev.interests.includes(interest)) return prev;
      if (prev.interests.length >= MAX_INTERESTS) return prev;
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleAddValue = (value: string) => {
    setProfile(prev => {
      if (!prev || prev.values.includes(value)) return prev;
      if (prev.values.length >= MAX_VALUES) return prev;
      return { ...prev, values: [...prev.values, value] };
    });
  };

  const validateBeforeSave = (): string | null => {
    if (!profile) return null;
    const interestCount = (profile.interests || []).length;
    const valueCount = (profile.values || []).length;
    if (interestCount < MIN_INTERESTS && valueCount < MIN_VALUES) {
      return `Please select at least ${MIN_INTERESTS} interests and ${MIN_VALUES} values.`;
    }
    if (interestCount < MIN_INTERESTS) {
      return `Please select at least ${MIN_INTERESTS} interests. You have ${interestCount}.`;
    }
    if (valueCount < MIN_VALUES) {
      return `Please select at least ${MIN_VALUES} values. You have ${valueCount}.`;
    }
    return null;
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

  const interestsAtLimit = (profile.interests || []).length >= MAX_INTERESTS;
  const valuesAtLimit = (profile.values || []).length >= MAX_VALUES;

  return (
    <SectionScreenWrapper
      title="Interests & Values"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
      validateBeforeSave={validateBeforeSave}
    >
      <InterestsSection
        interests={profile.interests}
        onToggleInterest={handleToggleInterest}
        onShowCustomInterestModal={() => setShowCustomInterestModal(true)}
        atLimit={interestsAtLimit}
      />

      <ValuesSection
        values={profile.values}
        onToggleValue={handleToggleValue}
        onShowCustomValueModal={() => setShowCustomValueModal(true)}
        atLimit={valuesAtLimit}
      />

      <CustomInputModal
        visible={showCustomInterestModal}
        title="Add Interest"
        subtitle="Enter your interest"
        placeholder="Type your interest"
        maxLength={30}
        existingItems={profile.interests}
        onClose={() => setShowCustomInterestModal(false)}
        onSubmit={(value) => {
          handleAddInterest(value);
          setShowCustomInterestModal(false);
        }}
      />
      <CustomInputModal
        visible={showCustomValueModal}
        title="Add Value"
        subtitle="Enter a value that matters to you"
        placeholder="Type your value"
        maxLength={30}
        existingItems={profile.values}
        onClose={() => setShowCustomValueModal(false)}
        onSubmit={(value) => {
          handleAddValue(value);
          setShowCustomValueModal(false);
        }}
      />
    </SectionScreenWrapper>
  );
};
