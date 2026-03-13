import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, Text } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, Card, Button, ScreenWrapper } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile } from '../../types';
import { getCurrentUser, signOut } from '../../services/authService';
import { getUserProfile } from '../../services/profileService';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { lightHaptic } from '../../utils/haptics';
import { formatProfileValue } from '../../utils/formatProfileValue';
import { calculateEditProfileCompleteness } from '../../utils/profileCompleteness';
import { createLogger } from '../../utils/secureLogger';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';

const logger = createLogger('ProfileEditScreen');

interface ProfileEditScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ProfileEdit'>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledText = styled(Text);

// Helper to get a summary string for a section
const getPhotosSummary = (profile: UserProfile): string => {
  const count = profile.photos?.length || 0;
  return `${count}/3 photos`;
};

const getBasicsSummary = (profile: UserProfile): string => {
  const parts: string[] = [];
  if (profile.firstName) parts.push(profile.firstName);
  if (profile.age) parts.push(`${profile.age}`);
  if (profile.height) {
    // height may already be formatted as "6'1\"" or be raw inches like "73"
    if (profile.height.includes("'")) {
      parts.push(profile.height);
    } else {
      const h = parseInt(profile.height, 10);
      if (h > 0) {
        const ft = Math.floor(h / 12);
        const inches = h % 12;
        parts.push(`${ft}'${inches}"`);
      }
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'Not set';
};

const getAboutSummary = (profile: UserProfile): string => {
  const parts: string[] = [];
  if (profile.religion) parts.push(profile.religion);
  if (profile.currentJob) parts.push(profile.currentJob);
  if (profile.educationLevel) parts.push(formatProfileValue(profile.educationLevel));
  return parts.length > 0 ? parts.join(', ') : 'Not set';
};

const getInterestsSummary = (profile: UserProfile): string => {
  const interests = profile.interests?.length || 0;
  const values = profile.values?.length || 0;
  return `${interests} interests, ${values} values`;
};

const getLifestyleSummary = (profile: UserProfile): string => {
  const parts: string[] = [];
  if (profile.drinkingFrequency) parts.push(formatProfileValue(profile.drinkingFrequency));
  if (profile.cannabisFrequency) parts.push(formatProfileValue(profile.cannabisFrequency));
  if (profile.familyPlans) parts.push(formatProfileValue(profile.familyPlans));
  return parts.length > 0 ? parts.join(', ') : 'Not set';
};

interface SectionCardProps {
  title: string;
  icon: string;
  summary: string;
  onPress: () => void;
  photoUrl?: string;
}

const SectionCard: React.FC<SectionCardProps> = React.memo(({ title, icon, summary, onPress, photoUrl }) => (
  <StyledTouchableOpacity
    onPress={() => {
      lightHaptic();
      onPress();
    }}
    className="bg-white border border-neutral-200 rounded-xl px-4 py-4 mb-3 flex-row items-center"
    activeOpacity={0.7}
  >
    {photoUrl ? (
      <StyledView className="w-10 h-10 rounded-lg overflow-hidden mr-3">
        <StyledImage source={{ uri: photoUrl }} className="w-full h-full" resizeMode="cover" />
      </StyledView>
    ) : (
      <StyledView className="w-10 h-10 rounded-lg bg-primary-50 items-center justify-center mr-3">
        <EvaIcon name={icon} variant="outline" size={20} color="#437FFF" />
      </StyledView>
    )}
    <StyledView className="flex-1">
      <Body className="font-semibold text-neutral-900">{title}</Body>
      <Body className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>{summary}</Body>
    </StyledView>
    <EvaIcon name="arrow-ios-forward" variant="outline" size={18} color="#9CA3AF" />
  </StyledTouchableOpacity>
));
SectionCard.displayName = 'SectionCard';

export const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } catch (error) {
      logger.error('Failed to load profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload profile every time screen comes into focus (to pick up changes from section screens)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const profileCompletion = useMemo(() => {
    return calculateEditProfileCompleteness(profile);
  }, [profile]);

  const mainPhotoUrl = useMemo(() => {
    if (!profile?.photos?.length) return undefined;
    const main = profile.photos.find(p => p.isMain);
    return (main || profile.photos[0])?.url;
  }, [profile?.photos]);

  if (loading) {
    return (
      <ScreenWrapper>
        <StyledView className="flex-1 justify-center items-center">
          <Body className="text-neutral-500">Loading profile...</Body>
        </StyledView>
      </ScreenWrapper>
    );
  }

  if (!profile) {
    return (
      <ScreenWrapper>
        <StyledView className="absolute top-12 right-4 z-10">
          <TouchableOpacity
            onPress={async () => {
              const result = await signOut();
              if (result.ok) {
                (navigation as any).navigate('Welcome');
              } else {
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Body className="text-primary-500 font-semibold">Sign Out</Body>
          </TouchableOpacity>
        </StyledView>
        <StyledView className="flex-1 justify-center items-center px-6">
          <Body className="text-neutral-500 mb-4">Failed to load profile</Body>
          <Button onPress={loadProfile} variant="primary">
            Retry
          </Button>
        </StyledView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <OfflineBanner />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3">
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <EvaIcon name="close" variant="outline" size={24} color="#101828" />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <H3>Edit Profile</H3>
          </StyledView>
        </StyledView>

        {/* Completion Progress Bar */}
        {profileCompletion.completedCount < profileCompletion.totalCount && (
          <StyledView className="mt-3">
            <StyledView className="flex-row items-center justify-between mb-1.5">
              <Body className="text-xs text-neutral-600">
                {profileCompletion.completedCount} of {profileCompletion.totalCount} completed
              </Body>
              <Body className="text-xs font-semibold" style={{ color: COLORS.primaryAccent }}>
                {profileCompletion.percentage}%
              </Body>
            </StyledView>
            <StyledView className="bg-neutral-200 rounded-full h-1.5 overflow-hidden">
              <StyledView
                className="h-full rounded-full transition-all"
                style={{
                  width: `${profileCompletion.percentage}%`,
                  backgroundColor: COLORS.primaryAccent,
                }}
              />
            </StyledView>
          </StyledView>
        )}
      </StyledView>

      <StyledScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <StyledView className="px-4 py-6">
          {/* Preview Profile Button */}
          <StyledTouchableOpacity
            onPress={() => {
              const previewProfile = profile ? { ...profile } : undefined;
              navigation.navigate('ProfilePreview', { previewProfile });
            }}
            className="mb-5 bg-neutral-100 border border-neutral-300 rounded-lg px-4 py-3 flex-row items-center justify-center"
          >
            <EvaIcon name="eye" variant="outline" size={20} color="#437FFF" />
            <Body className="text-primary-500 font-semibold ml-2">Preview Profile</Body>
          </StyledTouchableOpacity>

          {/* Section Cards */}
          <SectionCard
            title="Photos"
            icon="camera"
            summary={getPhotosSummary(profile)}
            photoUrl={mainPhotoUrl}
            onPress={() => navigation.navigate('EditPhotos')}
          />

          <SectionCard
            title="Basics"
            icon="person"
            summary={getBasicsSummary(profile)}
            onPress={() => navigation.navigate('EditBasics')}
          />

          <SectionCard
            title="About Me"
            icon="book-open"
            summary={getAboutSummary(profile)}
            onPress={() => navigation.navigate('EditAbout')}
          />

          <SectionCard
            title="Interests & Values"
            icon="color-palette"
            summary={getInterestsSummary(profile)}
            onPress={() => navigation.navigate('EditInterests')}
          />

          <SectionCard
            title="Lifestyle & Family"
            icon="home"
            summary={getLifestyleSummary(profile)}
            onPress={() => navigation.navigate('EditLifestyle')}
          />

          <SectionCard
            title="Match Preferences"
            icon="options"
            summary="Age, height, and more"
            onPress={() => navigation.navigate('MatchPreferences')}
          />
        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};
