import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../../services/authService';
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

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
          </Card>
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};