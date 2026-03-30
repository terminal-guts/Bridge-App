import React, { useState, useEffect } from 'react';
import { View, ScrollView, Switch, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, Card, ScreenWrapper, AnimatedPressable, BackHeader } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { signOut } from '../../services/authService';
import { getUserProfile } from '../../services/profileService';
import { resetGuide } from '../../services/guideService';
import { FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { deleteAccount } from '../../services/accountService';
import { notificationPreferencesService } from '../../services/notificationPreferencesService';
import { showToast } from '../../utils/toast';
import { EvaIcon } from '../../components/icons';
import { selectionHaptic } from '../../utils/haptics';

interface SettingsScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);

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
  onToggle?: (value: boolean) => void;
}) => (
  <AnimatedPressable
    onPress={toggle ? undefined : onPress}
    disabled={toggle && !onPress}
    style={{ paddingVertical: 14, minHeight: 44 }}
  >
    <StyledView className="flex-row items-center">
      <StyledView
        className="w-10 h-10 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: COLORS.card }}
      >
        <EvaIcon name={icon} variant="outline" size={20} color={COLORS.navInactiveIcon} />
      </StyledView>
      <StyledView className="flex-1">
        <Body style={{ color: COLORS.text.primary, marginBottom: 2 }}>{title}</Body>
        {subtitle ? (
          <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.md }}>{subtitle}</Body>
        ) : null}
      </StyledView>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={(val: boolean) => onToggle?.(val)}
          trackColor={{ false: COLORS.border, true: COLORS.primaryAccent }}
          thumbColor="white"
          ios_backgroundColor={COLORS.border}
        />
      ) : showArrow ? (
        <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color={COLORS.text.tertiary} />
      ) : null}
    </StyledView>
  </AnimatedPressable>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string>('dater');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Notification Preferences — all default false until loaded from storage
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [matchesEnabled, setMatchesEnabled] = useState(false);
  const [messagesEnabled, setMessagesEnabled] = useState(false);
  const [showNameIfWinner, setShowNameIfWinner] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);

  useEffect(() => {
    loadPreferences();
    getUserProfile().then(res => {
      if (res.ok && res.data) {
        setUserRole(res.data.role || 'dater');
        setUserProfile(res.data);
      }
    });
  }, []);

  const loadPreferences = async () => {
    const prefs = await notificationPreferencesService.getPreferences();
    setMatchesEnabled(prefs.matchesEnabled);
    setMessagesEnabled(prefs.messagesEnabled);
    setShowNameIfWinner(prefs.showNameIfWinner);
    setLeaderboardVisible(prefs.leaderboardVisible);
    setPrefsLoaded(true);
  };

  const updatePreference = async (key: 'matchesEnabled' | 'messagesEnabled' | 'showNameIfWinner' | 'leaderboardVisible', value: boolean) => {
    if (!prefsLoaded) return;
    selectionHaptic();
    // Optimistic UI update
    if (key === 'matchesEnabled') setMatchesEnabled(value);
    if (key === 'messagesEnabled') setMessagesEnabled(value);
    if (key === 'showNameIfWinner') setShowNameIfWinner(value);
    if (key === 'leaderboardVisible') setLeaderboardVisible(value);

    await notificationPreferencesService.updatePreferences({ [key]: value });
  };

  return (
    <ScreenWrapper>

      <BackHeader title="Settings" titleAlign="center" />

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Matchmaking / Account — top card with navigation items */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-4">
              <H3>{userRole === 'matchmaker' ? 'Matchmaking' : 'Account'}</H3>
              <Body style={{ color: COLORS.text.tertiary, fontSize: FONT_SIZES.xs }}>v1.0.0</Body>
            </StyledView>
            <SettingRow
              icon="award"
              title="Leaderboard"
              subtitle="Best matchmaker wins $50!"
              onPress={() => navigation.navigate('Leaderboard')}
            />
            <SettingRow
              icon="message-circle"
              title="Feedback"
              subtitle="Improve the app to win $25!"
              onPress={() => navigation.navigate('SupportChat')}
            />
            <SettingRow
              icon="bar-chart"
              title="Your Stats"
              subtitle="See your matchmaking stats"
              onPress={() => navigation.navigate('Stats')}
            />
          </Card>

          {/* Preferences — consolidates toggles, settings, and role switch */}
          <Card className="mb-6">
            <H3 className="mb-4">Preferences</H3>
            <SettingRow
              icon="heart"
              title={userRole === 'matchmaker' ? 'Voting & Karma' : 'Matches & Proposals'}
              subtitle={userRole === 'matchmaker' ? 'New proposals, vote reminders, accuracy bonuses' : 'Matches, voting, accuracy bonuses'}
              toggle
              toggleValue={matchesEnabled}
              onToggle={(val: boolean) => updatePreference('matchesEnabled', val)}
              showArrow={false}
            />
            {userRole !== 'matchmaker' && (
            <SettingRow
              icon="message-square"
              title="Messages"
              subtitle="New messages and ghosting alerts"
              toggle
              toggleValue={messagesEnabled}
              onToggle={(val: boolean) => updatePreference('messagesEnabled', val)}
              showArrow={false}
            />
            )}
            <SettingRow
              icon="eye"
              title="Show me on Leaderboard"
              subtitle="Friends always see you regardless"
              toggle
              toggleValue={leaderboardVisible}
              onToggle={async (newValue: boolean) => {
                if (!prefsLoaded) return;
                selectionHaptic();
                setLeaderboardVisible(newValue);
                setShowNameIfWinner(newValue);
                await notificationPreferencesService.updatePreferences({
                  leaderboardVisible: newValue,
                  showNameIfWinner: newValue,
                });
              }}
              showArrow={false}
            />
            {userRole !== 'matchmaker' && (
            <SettingRow
              icon="pause-circle"
              title="Pause Profile"
              subtitle="Take a break from Bridge"
              onPress={() => navigation.navigate('PauseProfile')}
            />
            )}
            <SettingRow
              icon="slash"
              title="Blocked Users"
              subtitle="Manage blocked profiles"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            {userRole !== 'matchmaker' && (
              <SettingRow
                icon="book"
                title="Tutorial"
                subtitle="Replay the app walkthrough"
                onPress={async () => {
                  selectionHaptic();
                  await resetGuide('beginner_tour' as any);
                  navigation.navigate('MainTabs' as any, { screen: 'Community' });
                }}
              />
            )}
            {userRole === 'matchmaker' && (
              <SettingRow
                icon="swap"
                title="Switch to Standard"
                subtitle="Join the matching pool yourself"
                onPress={() => {
                  Alert.alert(
                    'Switch to Standard?',
                    "You'll need to complete your profile (age, photos, interests, etc.) to enter the matching pool.",
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Switch',
                        onPress: () => {
                          navigation.navigate('Onboarding', {
                            isRoleSwitch: true,
                            initialData: {
                              role: 'dater',
                              firstName: userProfile?.firstName || '',
                              photos: userProfile?.photos || [],
                            },
                          });
                        },
                      },
                    ]
                  );
                }}
              />
            )}
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
          <Card className="mb-8" style={{ borderWidth: 1, borderColor: COLORS.error + '33' }}>
            <H3 className="mb-4" style={{ color: COLORS.error }}>Danger Zone</H3>
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
                          showToast.error('Failed to sign out. Please try again.');
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
                  userRole === 'matchmaker'
                    ? 'This will permanently delete your account, karma, voting history, and all associated data. This action cannot be undone.'
                    : 'This will permanently delete your account, profile, matches, and all associated data. This action cannot be undone.',
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
                                  showToast.success('Account Deleted', 'All data permanently removed.');
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
              <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.md, textAlign: 'center', marginTop: 8 }}>
                Deleting your account...
              </Body>
            )}
          </Card>
        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};
