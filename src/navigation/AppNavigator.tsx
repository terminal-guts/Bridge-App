import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UsersTabIcon, HandshakeTabIcon, ProfileTabIcon } from '../components/icons/Icons';
import { ActivityIndicator, AppState, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuideTarget, useGuideContext } from '../components/guides';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../config/features';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Sentry } from '../lib/sentry';
import { fetchAndSetUserProfile, invalidateProfileCache } from '../services/profileService';
import { isIntentionalSignOut, resetIntentionalSignOut } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { setCachedUserId, clearCachedUserId } from '../utils/auth';
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
import { FriendProposalScreen } from '../screens/community/FriendProposalScreen';

// Onboarding
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

// Match Screens (eagerly loaded — part of main tab flow)
import { MatchesScreen } from '../screens/match/MatchesScreen';
import ChatScreen from '../screens/match/ChatScreen';

// Profile Screens (eagerly loaded)
import { SettingsScreen } from '../screens/profile/SettingsScreen';

// ── Lazy-loaded screens (only evaluated when navigated to) ──────────────────
const LazyFallback = () => <ActivityIndicator style={{ flex: 1 }} color="#437FFF" />;

function withSuspense<P extends object>(LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>) {
  return function SuspenseWrapped(props: P) {
    return (
      <React.Suspense fallback={<LazyFallback />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

// Match sub-screens
const MatchRevealScreen = withSuspense(React.lazy(() => import('../screens/match/MatchRevealScreen').then(m => ({ default: m.MatchRevealScreen }))));
const MatchDetailScreen = withSuspense(React.lazy(() => import('../screens/match/MatchDetailScreen').then(m => ({ default: m.MatchDetailScreen }))));
const MatchProposalScreen = withSuspense(React.lazy(() => import('../screens/match/MatchProposalScreen').then(m => ({ default: m.MatchProposalScreen }))));

// Profile sub-screens
const ProfileEditScreen = withSuspense(React.lazy(() => import('../screens/profile/ProfileEditScreen').then(m => ({ default: m.ProfileEditScreen }))));
const MatchPreferencesScreen = withSuspense(React.lazy(() => import('../screens/profile/MatchPreferencesScreen').then(m => ({ default: m.MatchPreferencesScreen }))));
const BlockedUsersScreen = withSuspense(React.lazy(() => import('../screens/profile/BlockedUsersScreen').then(m => ({ default: m.BlockedUsersScreen }))));
const PauseProfileScreen = withSuspense(React.lazy(() => import('../screens/profile/PauseProfileScreen').then(m => ({ default: m.PauseProfileScreen }))));
const ProfileMatchScreen = withSuspense(React.lazy(() => import('../screens/profile/ProfileMatchScreen')));

// Legal & Support
const TermsOfService = withSuspense(React.lazy(() => import('../screens/legal/TermsOfService').then(m => ({ default: m.TermsOfService }))));
const PrivacyPolicy = withSuspense(React.lazy(() => import('../screens/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy }))));
const HelpSupportScreen = withSuspense(React.lazy(() => import('../screens/support/HelpSupportScreen').then(m => ({ default: m.HelpSupportScreen }))));
const SupportChatScreen = withSuspense(React.lazy(() => import('../screens/support/SupportChatScreen').then(m => ({ default: m.SupportChatScreen }))));

// Community sub-screens
const LeaderboardScreen = withSuspense(React.lazy(() => import('../screens/community/LeaderboardScreen').then(m => ({ default: m.LeaderboardScreen }))));

// Friends sub-screens
const ContactInviteScreen = withSuspense(React.lazy(() => import('../screens/friends/ContactInviteScreen').then(m => ({ default: m.ContactInviteScreen }))));
// ChangePhoneNumberScreen removed — email-only auth

// Types
import { RootStackParamList, MainTabParamList } from '../types';
import { createDevelopmentData } from '../services/developmentDataService';
import { DevStateToggle } from '../components/dev/DevStateToggle';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('AppNavigator');

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Custom Tab Bar ───────────────────────────────────────────────────────────
const TAB_ICONS = [UsersTabIcon, HandshakeTabIcon, ProfileTabIcon];
const TAB_TARGET_IDS = ['tab-community', 'tab-matches', 'tab-profile'];

const CustomTabBar = ({ state, navigation }: any) => {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeGuide, currentStep, nextStep } = useGuideContext();
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

            // Advance guide if it's waiting for this tab press
            const currentGuideStep = activeGuide?.steps[currentStep];
            if (currentGuideStep?.interactive && currentGuideStep?.targetElement === TAB_TARGET_IDS[index]) {
              nextStep();
            }
          }
        };

        return (
          <GuideTarget key={route.key} id={TAB_TARGET_IDS[index]} style={{ flex: 1 }}>
            <TouchableOpacity
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
          </GuideTarget>
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
  const pendingInviteCode = useRef<string | null>(null);

  // Handle deep links: bridge://invite/BRIDGE-XXXX-XXXX
  const handleDeepLink = useCallback((url: string) => {
    const parsed = Linking.parse(url);
    if (parsed.path?.startsWith('invite/')) {
      const code = parsed.path.replace('invite/', '').toUpperCase();
      if (/^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
        if (authStateRef.current && navigationRef.current) {
          // App is ready — navigate and auto-add
          navigationRef.current.navigate('ContactInvite', { autoAddCode: code });
        } else {
          // App not ready yet — save for later
          pendingInviteCode.current = code;
        }
      }
    }
  }, []);

  // Listen for deep links while app is open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => subscription.remove();
  }, [handleDeepLink]);

  // Process pending invite code once authenticated
  useEffect(() => {
    if (isAuthenticated && pendingInviteCode.current && navigationRef.current) {
      const code = pendingInviteCode.current;
      pendingInviteCode.current = null;
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        navigationRef.current?.navigate('ContactInvite', { autoAddCode: code });
      }, 500);
    }
  }, [isAuthenticated]);

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

        // Read cached session from AsyncStorage (no network call) for fast startup.
        // The onAuthStateChange listener handles expired sessions automatically.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        if (error || !session?.user) {
          if (error) {
            logger.info('Auth session check failed:', error.message);
          }
          clearCachedUserId();
          setIsAuthenticated(false);
        } else {
          const user = session.user;
          setCachedUserId(user.id);
          logger.info('[AppNavigator] Authenticated user:', user.id);
          const profileResult = await fetchAndSetUserProfile(user.id);
          if (!profileResult.ok && profileResult.error?.code !== 'PROFILE_NOT_FOUND') {
            logger.warn('[AppNavigator] Could not load profile:', profileResult.error?.message);
          }
          if (!isMountedRef.current) return;
          setIsAuthenticated(true);
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
    let appStateSubscription: any;

    const setupNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();
        cleanupNotifications = await notificationService.subscribeToRealtimeNotifications();

        // Run inactivity + profile completion checks on sign-in
        notificationService.scheduleAppOpenChecks();

        // Also run checks when app comes back to foreground
        appStateSubscription = AppState.addEventListener('change', (nextState) => {
          if (nextState === 'active') {
            notificationService.scheduleAppOpenChecks();
          }
        });
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
        invalidateProfileCache();
        setCachedUserId(session.user.id);
        setupNotifications();
        if (FEATURES.DEVELOPMENT_CREATE_MOCK_DATA) {
          createDevelopmentData(session.user.id);
        }
      } else if (event === 'SIGNED_OUT' && wasAuthenticated) {
        clearCachedUserId();
        invalidateProfileCache();
        if (isIntentionalSignOut()) {
          resetIntentionalSignOut();
          logger.info('[AppNavigator] Intentional sign-out');
        } else {
          logger.info('[AppNavigator] Unexpected SIGNED_OUT — session expired');
          showToast.error('Session Expired', 'Your session expired. Please sign in again.');
        }
        if (navigationRef.current) {
          navigationRef.current.navigate('Welcome');
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      cleanupNotifications?.();
      appStateSubscription?.remove();
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
          Sentry.captureException(error, {
            contexts: { react: { componentStack: errorInfo.componentStack } },
          });
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
          {/* ChangePhoneNumber removed — email-only auth */}

          {/* Legal & Support */}
          <Stack.Screen name="TermsOfService" component={TermsOfService} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="SupportChat" component={SupportChatScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />

          {/* Friends */}
          <Stack.Screen name="ContactInvite" component={ContactInviteScreen} />

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