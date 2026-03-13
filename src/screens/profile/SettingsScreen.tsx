import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card, Button, ScreenWrapper } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { signOut } from '../../services/authService';
import { supabase } from '../../lib/supabase';
import { resetGuide } from '../../services/guideService';
import { createLogger } from '../../utils/secureLogger';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { deleteAccount } from '../../services/accountService';
import { notificationPreferencesService } from '../../services/notificationPreferencesService';
import { showToast } from '../../utils/toast';
import { EvaIcon } from '../../components/icons';
import { selectionHaptic } from '../../utils/haptics';

const logger = createLogger('SettingsScreen');

interface SettingsScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSwitch = styled(Switch);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Preferences
  const [matchesEnabled, setMatchesEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [nudgesEnabled, setNudgesEnabled] = useState(true);
  const [showNameIfWinner, setShowNameIfWinner] = useState(true);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const prefs = await notificationPreferencesService.getPreferences();
    setMatchesEnabled(prefs.matchesEnabled);
    setMessagesEnabled(prefs.messagesEnabled);
    setNudgesEnabled(prefs.nudgesEnabled);
    setShowNameIfWinner(prefs.showNameIfWinner);
    setLeaderboardVisible(prefs.leaderboardVisible);
  };

  const updatePreference = async (key: 'matchesEnabled' | 'messagesEnabled' | 'nudgesEnabled' | 'showNameIfWinner' | 'leaderboardVisible', value: boolean) => {
    selectionHaptic();
    // Optimistic UI update
    if (key === 'matchesEnabled') setMatchesEnabled(value);
    if (key === 'messagesEnabled') setMessagesEnabled(value);
    if (key === 'nudgesEnabled') setNudgesEnabled(value);
    if (key === 'showNameIfWinner') setShowNameIfWinner(value);
    if (key === 'leaderboardVisible') setLeaderboardVisible(value);

    await notificationPreferencesService.updatePreferences({ [key]: value });
  };

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
          <EvaIcon name={icon} variant="outline" size={20} color="#667085" />
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
            trackColor={{ false: '#D0D5DD', true: COLORS.primaryAccent }}
            thumbColor="white"
            ios_backgroundColor="#D0D5DD"
          />
        ) : showArrow ? (
          <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color="#98A2B3" />
        ) : null}
      </StyledView>
    </StyledTouchableOpacity>
  );

  return (
    <ScreenWrapper>

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
        <StyledTouchableOpacity onPress={() => navigation.goBack()}>
          <EvaIcon name="arrow-back" variant="outline" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Settings</H3>
        <StyledView style={{ width: 24 }} />
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Account */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-4">
              <H3>Account</H3>
              <Body className="text-neutral-500 text-xs">v1.0.0</Body>
            </StyledView>
            <SettingRow
              icon="award"
              title="Leaderboard"
              subtitle="Best matchmaker wins $100!"
              onPress={() => navigation.navigate('Leaderboard')}
            />
            <SettingRow
              icon="message-circle"
              title="Feedback"
              subtitle="Improve the app to win $50!"
              onPress={() => navigation.navigate('SupportChat')}
            />
            <SettingRow
              icon="bar-chart"
              title="Your Stats"
              subtitle="See your matchmaking stats"
              onPress={() => navigation.navigate('Stats')}
            />
          </Card>

          {/* Preferences */}
          <Card className="mb-6">
            <H3 className="mb-4">Preferences</H3>
            <SettingRow
              icon="pause-circle"
              title="Pause Profile"
              subtitle="Take a break from Bridge"
              onPress={() => navigation.navigate('PauseProfile')}
            />
            <SettingRow
              icon="slash"
              title="Blocked Users"
              subtitle="Manage blocked profiles"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <SettingRow
              icon="eye"
              title="Show me on Leaderboard"
              subtitle="Friends always see you regardless"
              toggle
              toggleValue={leaderboardVisible}
              onToggle={() => updatePreference('leaderboardVisible', !leaderboardVisible)}
              showArrow={false}
            />
            <SettingRow
              icon="book"
              title="Tutorial"
              subtitle="Replay the app walkthrough"
              toggle
              toggleValue={tutorialEnabled}
              onToggle={async () => {
                selectionHaptic();
                const newValue = !tutorialEnabled;
                setTutorialEnabled(newValue);
                if (newValue) {
                  await resetGuide('beginner_tour' as any);
                }
              }}
              showArrow={false}
            />
          </Card>

          {/* Notifications */}
          <Card className="mb-6">
            <H3 className="mb-4">Notifications</H3>
            <SettingRow
              icon="heart"
              title="Matches & Proposals"
              subtitle="Matches, voting, accuracy bonuses"
              toggle
              toggleValue={matchesEnabled}
              onToggle={() => updatePreference('matchesEnabled', !matchesEnabled)}
              showArrow={false}
            />
            <SettingRow
              icon="message-square"
              title="Messages"
              subtitle="New messages and ghosting alerts"
              toggle
              toggleValue={messagesEnabled}
              onToggle={() => updatePreference('messagesEnabled', !messagesEnabled)}
              showArrow={false}
            />
            <SettingRow
              icon="bell"
              title="Streaks & Reminders"
              subtitle="Streak alerts and friend nudges"
              toggle
              toggleValue={nudgesEnabled}
              onToggle={() => updatePreference('nudgesEnabled', !nudgesEnabled)}
              showArrow={false}
            />
            <SettingRow
              icon="trophy"
              title="Include my name if I win"
              subtitle="Show your name in weekly winner announcements"
              toggle
              toggleValue={showNameIfWinner}
              onToggle={() => updatePreference('showNameIfWinner', !showNameIfWinner)}
              showArrow={false}
            />
          </Card>

          {/* Legal & Support */}
          <Card className="mb-6">
            <H3 className="mb-4">Legal & Support</H3>
            <SettingRow
              icon="email"
              title="Help & Support"
              subtitle=""
              onPress={() => navigation.navigate('HelpSupport')}
            />
            <SettingRow
              icon="file-text"
              title="Terms of Service"
              onPress={() => navigation.navigate('TermsOfService')}
            />
            <SettingRow
              icon="lock"
              title="Privacy Policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
          </Card>

          {/* Danger Zone */}
          <Card className="mb-8 border border-error/20">
            <H3 className="mb-4 text-error">Danger Zone</H3>
            <SettingRow
              icon="log-out"
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
              icon="trash"
              title="Delete Account"
              subtitle="Permanently delete your account"
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account, profile, matches, and all associated data. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: () => {
                        // Second confirmation
                        Alert.alert(
                          'Are you absolutely sure?',
                          'All your data will be permanently removed. You will not be able to recover your account.',
                          [
                            { text: 'Go Back', style: 'cancel' },
                            {
                              text: 'Yes, Delete Everything',
                              style: 'destructive',
                              onPress: async () => {
                                setIsDeleting(true);
                                const result = await deleteAccount();
                                setIsDeleting(false);
                                if (result.ok) {
                                  showToast.success('Account Deleted', 'Your account has been permanently removed.');
                                  navigation.navigate('Welcome');
                                } else {
                                  Alert.alert('Error', result.error?.message || 'Failed to delete account. Please contact support.');
                                }
                              },
                            },
                          ]
                        );
                      },
                    },
                  ]
                );
              }}
            />
            {isDeleting && (
              <Body className="text-neutral-500 text-sm text-center mt-2">Deleting your account...</Body>
            )}
          </Card>
        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};