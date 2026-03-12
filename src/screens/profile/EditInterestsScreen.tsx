import React, { useState, useCallback } from 'react';
import { View, Alert } from 'react-native';
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

const MAX_INTERESTS = 5;
const MAX_VALUES = 5;

interface EditInterestsScreenProps {
  navigation: NavigationProp<RootStackParamList, 'EditInterests'>;
}

export const EditInterestsScreen: React.FC<EditInterestsScreenProps> = ({ navigation }) => {
  const { profile, setProfile, loading, originalProfileJson } = useEditProfile();
  const [showCustomInterestModal, setShowCustomInterestModal] = useState(false);
  const [showCustomValueModal, setShowCustomValueModal] = useState(false);

  const handleToggleInterest = useCallback((interest: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const currentInterests = prev.interests || [];
      const isSelected = currentInterests.includes(interest);
      if (isSelected) {
        return { ...prev, interests: currentInterests.filter(i => i !== interest) };
      } else {
        if (currentInterests.length >= MAX_INTERESTS) {
          Alert.alert(
            'Maximum Interests Reached',
            'You can only select up to 5 interests. Please deselect one before adding another.',
            [{ text: 'OK' }]
          );
          return prev;
        }
        return { ...prev, interests: [...currentInterests, interest] };
      }
    });
  }, [setProfile]);

  const handleToggleValue = useCallback((value: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const currentValues = prev.values || [];
      const isSelected = currentValues.includes(value);
      if (isSelected) {
        return { ...prev, values: currentValues.filter(v => v !== value) };
      } else {
        if (currentValues.length >= MAX_VALUES) {
          Alert.alert(
            'Maximum Values Reached',
            'You can only select up to 5 values. Please deselect one before adding another.',
            [{ text: 'OK' }]
          );
          return prev;
        }
        return { ...prev, values: [...currentValues, value] };
      }
    });
  }, [setProfile]);

  const handleShowCustomInterestModal = useCallback(() => {
    setShowCustomInterestModal(true);
  }, []);

  const handleShowCustomValueModal = useCallback(() => {
    setShowCustomValueModal(true);
  }, []);

  const handleAddInterest = useCallback((interest: string) => {
    setProfile(prev => {
      if (!prev || prev.interests.includes(interest)) return prev;
      if (prev.interests.length >= MAX_INTERESTS) {
        Alert.alert('Maximum Interests Reached', `You can only select up to ${MAX_INTERESTS} interests.`, [{ text: 'OK' }]);
        return prev;
      }
      return { ...prev, interests: [...prev.interests, interest] };
    });
  }, [setProfile]);

  const handleAddValue = useCallback((value: string) => {
    setProfile(prev => {
      if (!prev || prev.values.includes(value)) return prev;
      if (prev.values.length >= MAX_VALUES) {
        Alert.alert('Maximum Values Reached', `You can only select up to ${MAX_VALUES} values.`, [{ text: 'OK' }]);
        return prev;
      }
      return { ...prev, values: [...prev.values, value] };
    });
  }, [setProfile]);

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
      title="Interests & Values"
      profile={profile}
      originalProfileJson={originalProfileJson}
      onGoBack={() => navigation.goBack()}
    >
      <InterestsSection
        interests={profile.interests}
        onToggleInterest={handleToggleInterest}
        onShowCustomInterestModal={handleShowCustomInterestModal}
      />

      <ValuesSection
        values={profile.values}
        onToggleValue={handleToggleValue}
        onShowCustomValueModal={handleShowCustomValueModal}
      />

      <CustomInputModal
        visible={showCustomInterestModal}
        title="Add Interest"
        subtitle="Enter your interest"
        placeholder="Type your interest"
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
        onClose={() => setShowCustomValueModal(false)}
        onSubmit={(value) => {
          handleAddValue(value);
          setShowCustomValueModal(false);
        }}
      />
    </SectionScreenWrapper>
  );
};
