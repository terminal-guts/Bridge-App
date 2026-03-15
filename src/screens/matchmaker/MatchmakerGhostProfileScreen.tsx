import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, Body, Button, Input, ScreenWrapper } from '../../components/ui';
import { EvaIcon } from '../../components/icons';
import { COLORS } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const MatchmakerGhostProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!firstName || !age) {
      Alert.alert('Missing Info', 'Please provide at least a name and age.');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Ghost Profile Created',
        `You've created a profile for ${firstName}. It's currently invisible to everyone.`,
        [{ text: 'Great', onPress: () => navigation.goBack() }]
      );
    }, 1500);
  };

  return (
    <ScreenWrapper>
      <SafeAreaView className="flex-1 bg-white">
        <StyledView className="px-6 pt-4 flex-row items-center">
          <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <EvaIcon name="arrow-back" size={24} color={COLORS.text.primary} />
          </StyledTouchableOpacity>
          <H2>New Ghost Profile</H2>
        </StyledView>

        <StyledScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
          <StyledView className="mb-8 items-center">
            <StyledTouchableOpacity className="w-32 h-32 rounded-[40px] bg-neutral-100 items-center justify-center border-2 border-dashed border-neutral-300">
              <EvaIcon name="camera-outline" size={32} color={COLORS.text.placeholder} />
              <Body className="text-neutral-400 mt-2 text-xs">Add Photo</Body>
            </StyledTouchableOpacity>
          </StyledView>

          <StyledView className="mb-6">
            <Body className="font-bold mb-2">First Name</Body>
            <Input
              placeholder="Their first name"
              value={firstName}
              onChangeText={setFirstName}
            />
          </StyledView>

          <StyledView className="mb-6">
            <Body className="font-bold mb-2">Age</Body>
            <Input
              placeholder="e.g. 21"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
          </StyledView>

          <StyledView className="mb-8">
            <Body className="font-bold mb-2">Bio / Hype Text</Body>
            <Input
              placeholder="What makes them a catch?"
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={setBio}
              className="h-32 pt-4"
              style={{ textAlignVertical: 'top' }}
            />
            <Body className="text-neutral-400 mt-2 text-xs">
              Be their hype-man! This will be the first thing people see.
            </Body>
          </StyledView>

          <Button 
            onPress={handleSave} 
            loading={loading}
            className="mb-10"
          >
            Create Ghost Profile
          </Button>
        </StyledScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};
