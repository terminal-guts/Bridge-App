import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UsersTabIcon, HandshakeTabIcon, ProfileTabIcon } from '../components/icons/Icons';
import { ActivityIndicator, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../config/features';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { fetchAndSetUserProfile } from '../services/profileService';
import { notificationService } from '../services/notificationService';
import { showToast } from '../utils/toast';

// Auth Screens
import {
  WelcomeScreen,
  LoginScreen,
  PhoneVerificationScreen,
} from '../screens/auth';

// Main Screens
import {
  ProfileScreen,
  CommunityScreen,
} from '../screens/main';
import { DeepQuestionsScreen } from '../screens/main/DeepQuestionsScreen';
import { FriendGridScreen } from '../screens/community/FriendGridScreen';
import { FriendProposalScreen } from '../screens/community/FriendProposalScreen';

// Onboarding
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

// Match Screens
import { MatchRevealScreen } from '../screens/match/MatchRevealScreen';
import { MatchDetailScreen } from '../screens/match/MatchDetailScreen';
import { MatchProposalScreen } from '../screens/match/MatchProposalScreen';
import { MatchesScreen } from '../screens/match/MatchesScreen';

// Chat
import ChatScreen from '../screens/ChatScreen';

// Profile Screens
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { MatchPreferencesScreen } from '../screens/profile/MatchPreferencesScreen';
import { BlockedUsersScreen } from '../screens/profile/BlockedUsersScreen';
import { PauseProfileScreen } from '../screens/profile/PauseProfileScreen';
import { ChangePhoneNumberScreen } from '../screens/profile/ChangePhoneNumberScreen';
import ProfileMatchScreen from '../screens/profile/ProfileMatchScreen';

// Legal Screens
import { TermsOfService } from '../screens/legal/TermsOfService';
import { PrivacyPolicy } from '../screens/legal/PrivacyPolicy';

// Support Screens
import { HelpSupportScreen } from '../screens/support/HelpSupportScreen';

// Friend Screens
import { FriendCodeScreen } from '../screens/friends/FriendCodeScreen';
import { FriendListScreen } from '../screens/friends/FriendListScreen';

// Types
import { RootStackParamList, MainTabParamList } from '../types';
import { createDevelopmentData } from '../services/developmentDataService';
import { DevStateToggle } from '../components/DevStateToggle';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('AppNavigator');

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Custom Tab Bar ───────────────────────────────────────────────────────────
const TAB_ICONS = [UsersTabIcon, HandshakeTabIcon, ProfileTabIcon];

const CustomTabBar = ({ state, navigation }: any) => {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Content height (above home indicator) scales with device
  const contentHeight = Math.round(screenHeight * 0.057);
  // Icon size and vertical offset are both proportional to content height
  const iconSize = Math.round(contentHeight * 0.65);
  const iconPaddingTop = Math.round(contentHeight * 0.25);

  return (
    <View style={{
      flexDirection: 'row',
      height: contentHeight + insets.bottom,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E4E7EC',
      paddingBottom: insets.bottom,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 5,
    }}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const Icon = TAB_ICONS[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: iconPaddingTop }}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {/* Indicator sits flush at the very top of the touchable area */}
            {focused && (
              <View style={{
                position: 'absolute',
                top: 0,
                width: 40,
                height: 3,
                backgroundColor: '#437FFF',
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
              }} />
            )}
            <Icon size={iconSize} color={focused ? '#437FFF' : '#667085'} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root Stack Navigator
export const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigationRef = React.useRef<any>(null);
  const authStateRef = React.useRef<boolean | null>(null);

  useEffect(() => {
    authStateRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    // Use ref object instead of closure variable to avoid staleness in async callbacks
    const isMountedRef = { current: true };

    // Check for existing Supabase session on app start
    const initializeAuth = async () => {
      try {
        if (FEATURES.DEVELOPMENT_FORCE_FRESH_SESSION) {
          await supabase.auth.signOut();
        }

        // Validate session with Supabase server (not just local cache)
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!isMountedRef.current) return;

        if (error) {
          logger.info('Auth verification failed:', error.message);
          await supabase.auth.signOut();
          if (!isMountedRef.current) return;
          setIsAuthenticated(false);
        } else if (user) {
          logger.info('[AppNavigator] Authenticated user:', user.id);
          const profileResult = await fetchAndSetUserProfile(user.id);
          if (!profileResult.ok && profileResult.error?.code !== 'PROFILE_NOT_FOUND') {
            logger.warn('[AppNavigator] Could not load profile:', profileResult.error?.message);
          }
          if (!isMountedRef.current) return;
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        logger.error('Error initializing auth:', err);
        if (isMountedRef.current) {
          setIsAuthenticated(false);
        }
      }
    };

    initializeAuth();

    // Register push notifications
    let cleanupNotifications: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();
        cleanupNotifications = await notificationService.subscribeToRealtimeNotifications();
      } catch (err) {
        // Non-critical - app works without notifications
      }
    };

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      const wasAuthenticated = authStateRef.current;
      setIsAuthenticated(!!session);

      if (event === 'SIGNED_IN' && session?.user) {
        setupNotifications();
      } else if (event === 'SIGNED_OUT' && wasAuthenticated) {
        logger.info('[AppNavigator] Unexpected SIGNED_OUT event');
        showToast.error('Session Expired', 'Your session expired. Please sign in again.');
        if (navigationRef.current) {
          navigationRef.current.navigate('Welcome');
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      cleanupNotifications?.();
    };
  }, []);

  // Show loading screen while checking auth
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#437FFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          logger.error('[App Error Boundary]', error, errorInfo);
          // TODO: Send to error reporting service (Sentry, Bugsnag, etc.)
        }}
      >
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#F9FAFB' },
          }}
        >
          {/* Auth Stack */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />

          {/* Onboarding */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />

          {/* Main App */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Community Screens */}
          <Stack.Screen name="FriendGrid" component={FriendGridScreen} />
          <Stack.Screen name="FriendProposal" component={FriendProposalScreen} />

          {/* Match Screens */}
          <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
          <Stack.Screen name="MatchReveal" component={MatchRevealScreen} />
          <Stack.Screen name="MatchProposal" component={MatchProposalScreen} />
          <Stack.Screen name="ProposalProfile" component={ProfileMatchScreen} options={{ headerShown: false }} />

          {/* Chat */}
          <Stack.Screen name="Chat" component={ChatScreen} />

          {/* Profile & Settings */}
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="ProfilePreview" component={ProfileMatchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProfileView" component={ProfileMatchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DeepQuestions" component={DeepQuestionsScreen} />
          <Stack.Screen name="MatchPreferences" component={MatchPreferencesScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="PauseProfile" component={PauseProfileScreen} />
          <Stack.Screen name="ChangePhoneNumber" component={ChangePhoneNumberScreen} />

          {/* Legal & Support */}
          <Stack.Screen name="TermsOfService" component={TermsOfService} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />

          {/* Friends */}
          <Stack.Screen name="FriendCode" component={FriendCodeScreen} />
          <Stack.Screen name="FriendList" component={FriendListScreen} />

          {/* Additional Screens - To be implemented */}
          {/*
          - ProfileEdit
          - ShareCandidate
          - ReportUser
          - StrikeWarning
          */}
        </Stack.Navigator>
        {/* Dev State Toggle - quick UI state switcher */}
        {FEATURES.ENABLE_DEV_STATE_TOGGLE && <DevStateToggle />}
      </ErrorBoundary>
    </NavigationContainer>
  );
};