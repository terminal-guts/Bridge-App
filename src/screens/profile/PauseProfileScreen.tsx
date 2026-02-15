import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile, updateProfilePauseStatus } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('PauseProfileScreen');

interface PauseProfileScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSwitch = styled(Switch);

export const PauseProfileScreen: React.FC<PauseProfileScreenProps> = ({ navigation }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user and profile on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadPauseStatus();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        Alert.alert('Error', 'You must be logged in to pause your profile');
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadPauseStatus = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const result = await getUserProfile();
      if (result.ok && result.data) {
        setIsPaused(result.data.isPaused || false);
      } else {
        logger.error('Failed to load profile:', result.error);
        Alert.alert('Error', 'Failed to load pause status');
      }
    } catch (error) {
      logger.error('Failed to load pause status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to pause your profile');
      return;
    }

    if (isPaused) {
      // Resuming profile - silently without modal
      setSaving(true);
      try {
        const result = await updateProfilePauseStatus(false);

        if (result.ok) {
          setIsPaused(false);
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to resume profile');
        }
      } catch (error: any) {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        logger.error('Failed to resume profile:', error);
      } finally {
        setSaving(false);
      }
    } else {
      // Pausing profile
      Alert.alert(
        'Pause Profile',
        'You won\'t receive new matches or surveys while paused. Your existing matches will remain available.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause',
            style: 'destructive',
            onPress: async () => {
              setSaving(true);
              try {
                const result = await updateProfilePauseStatus(true);

                if (result.ok) {
                  setIsPaused(true);
                  Alert.alert('Profile Paused', 'You can resume anytime from Settings');
                } else {
                  Alert.alert('Error', result.error?.message || 'Failed to pause profile');
                }
              } catch (error: any) {
                Alert.alert('Error', 'An unexpected error occurred. Please try again.');
                logger.error('Failed to pause profile:', error);
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Pause Profile</H3>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Loading State */}
          {loading ? (
            <StyledView className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#437FFF" />
              <Body className="text-neutral-500 mt-4">Loading pause status...</Body>
            </StyledView>
          ) : (
            <>
              {/* Status Card */}
              <Card className={`mb-6 border ${isPaused ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
            <StyledView className="flex-row items-center justify-between">
              <StyledView className="flex-1 mr-4">
                <StyledView className="flex-row items-center mb-2">
                  <Ionicons
                    name={isPaused ? "pause-circle" : "checkmark-circle"}
                    size={24}
                    color={isPaused ? "#F59E0B" : "#12B981"}
                  />
                  <H3 className="ml-2">{isPaused ? 'Profile Paused' : 'Profile Active'}</H3>
                </StyledView>
                <Body className="text-neutral-600 text-sm">
                  {isPaused
                    ? 'You\'re taking a break from Bridge'
                    : 'Your profile is visible and active'}
                </Body>
              </StyledView>
              <StyledSwitch
                value={isPaused}
                onValueChange={handleTogglePause}
                disabled={saving}
                trackColor={{ false: '#12B981', true: '#F59E0B' }}
                thumbColor="white"
                ios_backgroundColor="#12B981"
              />
            </StyledView>
          </Card>

          {/* What Happens When Paused */}
          <Card className="mb-6">
            <H3 className="mb-4">When Your Profile is Paused</H3>
            <StyledView className="space-y-3">
              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-error/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="close" size={12} color="#EF4444" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  You won't appear in daily surveys
                </Body>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-error/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="close" size={12} color="#EF4444" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  You won't receive new matches
                </Body>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-error/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="close" size={12} color="#EF4444" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  You won't participate in matchmaking surveys
                </Body>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-error/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="close" size={12} color="#EF4444" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  Your profile is hidden from the community
                </Body>
              </StyledView>
            </StyledView>
          </Card>

          {/* What Stays Active */}
          <Card className="mb-6">
            <H3 className="mb-4">What Stays Active</H3>
            <StyledView className="space-y-3">
              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-success/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="checkmark" size={12} color="#12B981" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  Your existing matches remain available
                </Body>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-success/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="checkmark" size={12} color="#12B981" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  You can still chat with current matches
                </Body>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-success/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="checkmark" size={12} color="#12B981" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  Your profile data is preserved
                </Body>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-5 h-5 bg-success/20 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="checkmark" size={12} color="#12B981" />
                </StyledView>
                <Body className="flex-1 text-neutral-700 text-sm">
                  You can resume anytime with one tap
                </Body>
              </StyledView>
            </StyledView>
          </Card>

          {/* Help Text */}
          <StyledView className="mt-6">
            <Body className="text-neutral-500 text-sm text-center">
              Taking a break is healthy! You can pause and resume as often as you need.
            </Body>
          </StyledView>
            </>
          )}
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};
