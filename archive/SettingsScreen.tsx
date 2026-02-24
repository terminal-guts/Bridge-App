import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../../services/authService';
import { getUserSettings, updatePrivacySettings, UserSettings } from '../../services/settingsService';
import { deleteUserAccount } from '../../services/accountService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('SettingsScreen');

interface SettingsScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSwitch = styled(Switch);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [privacy, setPrivacy] = useState({
    showLastActive: true,
    readReceipts: true,
    shareProfile: false,
  });

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user and settings
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadSettings();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
    }
  };

  const loadSettings = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const result = await getUserSettings(currentUserId);
      if (result.ok && result.data) {
        setPrivacy(result.data.privacy);
      } else {
        logger.error('Failed to load settings:', result.error);
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePrivacy = async (key: keyof typeof privacy) => {
    if (!currentUserId) return;

    const newValue = !privacy[key];
    setPrivacy(prev => ({ ...prev, [key]: newValue }));

    // Save to backend
    const result = await updatePrivacySettings(currentUserId, {
      [key]: newValue,
    });

    if (!result.ok) {
      // Revert on error
      setPrivacy(prev => ({ ...prev, [key]: !newValue }));
      Alert.alert('Error', result.error?.message || 'Failed to update privacy settings');
    }
  };

  const handleDeleteAccount = () => {
    if (!currentUserId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account?\n\nThis will permanently delete:\n• Your profile and photos\n• All your matches and messages\n• Your preferences and settings\n• All your data from Bridge\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'Type DELETE to confirm account deletion.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      Alert.alert(
                        'Deleting Account',
                        'Please wait while we delete your data...',
                        [],
                        { cancelable: false }
                      );

                      const result = await deleteUserAccount(currentUserId);

                      if (result.ok) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been permanently deleted. We\'re sorry to see you go.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                // Sign out will happen automatically from auth deletion
                                navigation.navigate('Welcome');
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert(
                          'Deletion Error',
                          result.error?.message || 'Failed to delete account. Please contact support.',
                          [
                            {
                              text: 'OK',
                            },
                          ]
                        );
                      }
                    } catch (error: any) {
                      Alert.alert(
                        'Error',
                        'An unexpected error occurred. Please try again or contact support.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    toggle,
    toggleValue,
    onToggle,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    toggle?: boolean;
    toggleValue?: boolean;
    onToggle?: () => void;
  }) => (
    <StyledTouchableOpacity
      onPress={toggle ? undefined : onPress}
      disabled={toggle && !onPress}
      className="py-3"
    >
      <StyledView className="flex-row items-center">
        <StyledView className="w-10 h-10 bg-neutral-100 rounded-lg items-center justify-center mr-3">
          <Ionicons name={icon as any} size={20} color="#667085" />
        </StyledView>
        <StyledView className="flex-1">
          <Body className="text-neutral-900 mb-1">{title}</Body>
          {subtitle && (
            <Body className="text-neutral-500 text-sm">{subtitle}</Body>
          )}
        </StyledView>
        {toggle ? (
          <StyledSwitch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: '#D0D5DD', true: '#437FFF' }}
            thumbColor="white"
            ios_backgroundColor="#D0D5DD"
          />
        ) : showArrow ? (
          <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
        ) : null}
      </StyledView>
    </StyledTouchableOpacity>
  );

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
        <StyledTouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Settings</H3>
        <StyledView style={{ width: 24 }} />
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Account Settings */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-4">
              <H3>Account</H3>
              <Body className="text-neutral-500 text-xs">v1.0.0</Body>
            </StyledView>
            <SettingRow
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your photos and information"
              onPress={() => navigation.navigate('ProfileEdit')}
            />
            <SettingRow
              icon="heart-outline"
              title="Match Preferences"
              subtitle="Age, distance, and more"
              onPress={() => navigation.navigate('MatchPreferences')}
            />
            <SettingRow
              icon="pause-circle-outline"
              title="Pause Profile"
              subtitle="Take a break from Bridge"
              onPress={() => navigation.navigate('PauseProfile')}
            />
            <SettingRow
              icon="call-outline"
              title="Change Phone Number"
              subtitle="Update your phone number"
              onPress={() => navigation.navigate('ChangePhoneNumber')}
            />
          </Card>

          {/* Privacy */}
          <Card className="mb-6">
            <H3 className="mb-4">Privacy</H3>
            <SettingRow
              icon="eye-outline"
              title="Show Last Active"
              subtitle="Let matches see when you were last online"
              toggle
              toggleValue={privacy.showLastActive}
              onToggle={() => togglePrivacy('showLastActive')}
            />
            <SettingRow
              icon="checkmark-done-outline"
              title="Read Receipts"
              subtitle="Show when you've read messages"
              toggle
              toggleValue={privacy.readReceipts}
              onToggle={() => togglePrivacy('readReceipts')}
            />
            <SettingRow
              icon="share-outline"
              title="Profile Sharing"
              subtitle="Allow friends to share your profile"
              toggle
              toggleValue={privacy.shareProfile}
              onToggle={() => togglePrivacy('shareProfile')}
            />
            <SettingRow
              icon="ban-outline"
              title="Blocked Users"
              subtitle="Manage blocked profiles"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
          </Card>

          {/* Support */}
          <Card className="mb-6">
            <H3 className="mb-4">Support & Legal</H3>
            <SettingRow
              icon="mail-outline"
              title="Help & Support"
              subtitle="Get help or report an issue"
              onPress={() => navigation.navigate('HelpSupport')}
            />
            <SettingRow
              icon="document-text-outline"
              title="Terms of Service"
              onPress={() => navigation.navigate('TermsOfService')}
            />
            <SettingRow
              icon="lock-closed-outline"
              title="Privacy Policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
          </Card>

          {/* Danger Zone */}
          <Card className="mb-8 border border-error/20">
            <H3 className="mb-4 text-error">Danger Zone</H3>
            <SettingRow
              icon="log-out-outline"
              title="Sign Out"
              subtitle="You'll need to sign in again"
              onPress={() => {
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out? You\'ll need to sign in again to access your account.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Sign Out',
                      style: 'destructive',
                      onPress: async () => {
                        const result = await signOut();
                        if (result.ok) {
                          navigation.navigate('Welcome');
                        } else {
                          Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                      },
                    },
                  ]
                );
              }}
            />
            <SettingRow
              icon="trash-outline"
              title="Delete Account"
              subtitle="Permanently delete your account and data"
              onPress={handleDeleteAccount}
            />
          </Card>
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};