import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UsersTabIcon, HandshakeTabIcon, ProfileTabIcon } from '../components/icons/Icons';
import { AppState, View, Text, TouchableOpacity, useWindowDimensions, LayoutChangeEvent, StyleSheet as RNStyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withSpring, withTiming } from 'react-native-reanimated';
import { SPRINGS } from '../constants/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuideContext } from '../contexts/GuideContext';
import { GuideTarget } from '../components/guides/GuideTarget';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../config/features';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Sentry } from '../lib/sentry';
import { fetchAndSetUserProfile, invalidateProfileCache, checkMinimalProfileStatus, getUserProfile } from '../services/profileService';
import { calculateOverallProfileStrength } from '../utils/profileCompleteness';
import Svg, { Circle } from 'react-native-svg';
import { isIntentionalSignOut, resetIntentionalSignOut } from '../services/authService';
// expo-notifications is imported dynamically to defer 84KB from startup
import { setCachedUserId, clearCachedUserId } from '../utils/auth';
import { showToast } from '../utils/toast';
import { selectionHaptic } from '../utils/haptics';
import { CommunitySkeleton } from '../components/ui/SkeletonLoader';

// ── All screens are lazy-loaded to minimize startup parsing ──

// ── Lazy-loaded screens (only evaluated when navigated to) ──────────────────
const LazyFallback = () => <CommunitySkeleton />;

function withSuspense<P extends object>(LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>) {
  return function SuspenseWrapped(props: P) {
    return (
      <React.Suspense fallback={<LazyFallback />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

// Auth screens — lazy (only parsed when unauthenticated)
const WelcomeScreen = withSuspense(React.lazy(() => import('../screens/auth/WelcomeScreen').then(m => ({ default: m.WelcomeScreen }))));
const LoginScreen = withSuspense(React.lazy(() => import('../screens/auth/LoginScreen').then(m => ({ default: m.LoginScreen }))));
const PhoneVerificationScreen = withSuspense(React.lazy(() => import('../screens/auth/PhoneVerificationScreen').then(m => ({ default: m.PhoneVerificationScreen }))));

// Main tab screens — all lazy (parsed on first navigation, not at startup)
const CommunityScreen = withSuspense(React.lazy(() => import('../screens/main/CommunityScreen').then(m => ({ default: m.CommunityScreen }))));
const ProfileScreen = withSuspense(React.lazy(() => import('../screens/main/ProfileScreen').then(m => ({ default: m.ProfileScreen }))));
const MatchesScreen = withSuspense(React.lazy(() => import('../screens/match/MatchesScreen').then(m => ({ default: m.MatchesScreen }))));

// Stack screens — lazy (navigated to on demand)
const OnboardingScreen = withSuspense(React.lazy(() => import('../screens/onboarding/OnboardingScreen').then(m => ({ default: m.OnboardingScreen }))));
const FriendProposalScreen = withSuspense(React.lazy(() => import('../screens/community/FriendProposalScreen').then(m => ({ default: m.FriendProposalScreen }))));
const ChatScreen = withSuspense(React.lazy(() => import('../screens/match/ChatScreen')));
const SettingsScreen = withSuspense(React.lazy(() => import('../screens/profile/SettingsScreen').then(m => ({ default: m.SettingsScreen }))));

// Match sub-screens
// MatchRevealScreen removed — dead code, real flow uses MatchProposalScreen

const MatchProposalScreen = withSuspense(React.lazy(() => import('../screens/match/MatchProposalScreen').then(m => ({ default: m.MatchProposalScreen }))));

// Profile sub-screens
const ProfileEditScreen = withSuspense(React.lazy(() => import('../screens/profile/ProfileEditScreen').then(m => ({ default: m.ProfileEditScreen }))));
const MatchPreferencesScreen = withSuspense(React.lazy(() => import('../screens/profile/MatchPreferencesScreen').then(m => ({ default: m.MatchPreferencesScreen }))));
const BlockedUsersScreen = withSuspense(React.lazy(() => import('../screens/profile/BlockedUsersScreen').then(m => ({ default: m.BlockedUsersScreen }))));
const PauseProfileScreen = withSuspense(React.lazy(() => import('../screens/profile/PauseProfileScreen').then(m => ({ default: m.PauseProfileScreen }))));
const ProfileMatchScreen = withSuspense(React.lazy(() => import('../screens/profile/ProfileMatchScreen')));
const EditPhotosScreen = withSuspense(React.lazy(() => import('../screens/profile/EditPhotosScreen').then(m => ({ default: m.EditPhotosScreen }))));
const EditBasicsScreen = withSuspense(React.lazy(() => import('../screens/profile/EditBasicsScreen').then(m => ({ default: m.EditBasicsScreen }))));
const EditAboutScreen = withSuspense(React.lazy(() => import('../screens/profile/EditAboutScreen').then(m => ({ default: m.EditAboutScreen }))));
const EditInterestsScreen = withSuspense(React.lazy(() => import('../screens/profile/EditInterestsScreen').then(m => ({ default: m.EditInterestsScreen }))));
const EditLifestyleScreen = withSuspense(React.lazy(() => import('../screens/profile/EditLifestyleScreen').then(m => ({ default: m.EditLifestyleScreen }))));

// Legal & Support
const TermsOfService = withSuspense(React.lazy(() => import('../screens/legal/TermsOfService').then(m => ({ default: m.TermsOfService }))));
const PrivacyPolicy = withSuspense(React.lazy(() => import('../screens/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy }))));
const HelpSupportScreen = withSuspense(React.lazy(() => import('../screens/support/HelpSupportScreen').then(m => ({ default: m.HelpSupportScreen }))));
const SupportChatScreen = withSuspense(React.lazy(() => import('../screens/support/SupportChatScreen').then(m => ({ default: m.SupportChatScreen }))));

// Community sub-screens
const LeaderboardScreen = withSuspense(React.lazy(() => import('../screens/community/LeaderboardScreen').then(m => ({ default: m.LeaderboardScreen }))));
const StatsScreen = withSuspense(React.lazy(() => import('../screens/community/StatsScreen').then(m => ({ default: m.StatsScreen }))));

// Auth sub-screens
const SuspendedScreen = withSuspense(React.lazy(() => import('../screens/auth/SuspendedScreen')));

// Badge management
const BadgeManagementScreen = withSuspense(React.lazy(() => import('../screens/profile/BadgeManagementScreen').then(m => ({ default: m.BadgeManagementScreen }))));

// Matchmaker screens
const MatchmakerHomeScreen = withSuspense(React.lazy(() => import('../screens/matchmaker/MatchmakerHomeScreen').then(m => ({ default: m.MatchmakerHomeScreen }))));
const MatchmakerGhostProfileScreen = withSuspense(React.lazy(() => import('../screens/matchmaker/MatchmakerGhostProfileScreen').then(m => ({ default: m.MatchmakerGhostProfileScreen }))));
const MatchmakerClaimScreen = withSuspense(React.lazy(() => import('../screens/matchmaker/MatchmakerClaimScreen').then(m => ({ default: m.MatchmakerClaimScreen }))));

// Friends sub-screens
const ContactInviteScreen = withSuspense(React.lazy(() => import('../screens/friends/ContactInviteScreen').then(m => ({ default: m.ContactInviteScreen }))));
// ChangePhoneNumberScreen removed — email-only auth

// Types
import { RootStackParamList, MainTabParamList, MatchmakerTabParamList } from '../types';
import { createLogger } from '../utils/secureLogger';
import { slideWithFade, modalSlideUp, fadeTransition } from '../utils/screenTransitions';

// Dev tools — only bundled in __DEV__ builds, lazy-loaded when feature flag is on
const LazyDevStateToggle = __DEV__ && FEATURES.ENABLE_DEV_STATE_TOGGLE
  ? withSuspense(React.lazy(() => import('../components/dev/DevStateToggle').then(m => ({ default: m.DevStateToggle }))))
  : () => null;

const logger = createLogger('AppNavigator');

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MatchmakerTab = createBottomTabNavigator<MatchmakerTabParamList>();

// ── Custom Tab Bar ───────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TAB_ICONS = [UsersTabIcon, HandshakeTabIcon, ProfileTabIcon];
const TAB_TARGET_IDS = ['tab-community', 'tab-matches', 'tab-profile'];

const CustomTabBar = ({ state, navigation, icons: iconsProp, targetIds: targetIdsProp }: any) => {
  const resolvedIcons = iconsProp ?? TAB_ICONS;
  const resolvedTargetIds = targetIdsProp ?? TAB_TARGET_IDS;
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeGuide, currentStep, nextStep } = useGuideContext();
  // Content height (above home indicator) scales with device
  const contentHeight = Math.round(screenHeight * 0.057);
  // Icon size and vertical offset are both proportional to content height
  const iconSize = Math.round(contentHeight * 0.65);
  const iconPaddingTop = Math.round(contentHeight * 0.25);

  // ── Profile completeness ring ───────────────────────────────────────────
  // Re-fetch on every tab change so the ring updates after editing profile sections
  // One-way gate: once profileCompleted is true, never show the ring again
  const [profileStrength, setProfileStrength] = useState(100);
  const [profileCompleted, setProfileCompleted] = useState(true); // default true = hidden until loaded
  const ringProgress = useSharedValue(profileStrength < 100 ? profileStrength / 100 : 1);
  useEffect(() => {
    getUserProfile().then(result => {
      if (result.ok && result.data) {
        const strength = calculateOverallProfileStrength(result.data);
        setProfileStrength(strength);
        setProfileCompleted(result.data.profileCompleted ?? false);
        ringProgress.value = withTiming(strength / 100, { duration: 800 });
      }
    });
  }, [state.index]);

  // ── Animated indicator ────────────────────────────────────────────────────
  // Each tab is 1/3 of screen width; indicator centers within the active tab.
  const tabWidth = screenWidth / state.routes.length;
  const indicatorX = useSharedValue(state.index * tabWidth + (tabWidth - 40) / 2);

  useEffect(() => {
    indicatorX.value = withSpring(
      state.index * tabWidth + (tabWidth - 40) / 2,
      SPRINGS.responsive,
    );
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  // ── Animated ring props (for profile tab completion ring) ─────────────────
  const ringSize = iconSize + 8;
  const ringRadius = ringSize / 2 - 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringCircumference * (1 - ringProgress.value),
  }));

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
      {/* Sliding indicator — sits flush at the very top of the bar */}
      <Animated.View style={[indicatorStyle, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 3,
        backgroundColor: '#437FFF',
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        zIndex: 1,
      }]} />

      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const Icon = resolvedIcons[index];
        const showRing = index === 2 && profileStrength < 100 && !profileCompleted;

        const onPress = () => {
          selectionHaptic();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);

            // Advance guide if it's waiting for this tab press
            const currentGuideStep = activeGuide?.steps[currentStep];
            if (currentGuideStep?.interactive && currentGuideStep?.targetElement === resolvedTargetIds[index]) {
              nextStep();
            }
          }
        };

        return (
          <GuideTarget key={route.key} id={resolvedTargetIds[index]} style={{ flex: 1 }}>
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: iconPaddingTop }}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {showRing ? (
                <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg
                    width={ringSize}
                    height={ringSize}
                    style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
                  >
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(103,112,133,0.15)"
                      strokeWidth={2.5}
                    />
                    <AnimatedCircle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="#437FFF"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      animatedProps={ringAnimatedProps}
                    />
                  </Svg>
                  <Icon size={iconSize} color={focused ? '#437FFF' : '#667085'} />
                </View>
              ) : (
                <Icon size={iconSize} color={focused ? '#437FFF' : '#667085'} />
              )}
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

// Matchmaker icons — handshake (hub), users (community), profile
const MATCHMAKER_TAB_ICONS = [HandshakeTabIcon, UsersTabIcon, ProfileTabIcon];
const MATCHMAKER_TAB_TARGET_IDS = ['tab-matchmaker', 'tab-community', 'tab-profile'];

// Matchmaker Tab Navigator — same visual bar, no Matches tab
const MatchmakerTabs = () => {
  return (
    <MatchmakerTab.Navigator
      tabBar={props => (
        <CustomTabBar
          {...props}
          icons={MATCHMAKER_TAB_ICONS}
          targetIds={MATCHMAKER_TAB_TARGET_IDS}
        />
      )}
      screenOptions={{ headerShown: false }}
    >
      <MatchmakerTab.Screen name="MatchmakerHub" component={MatchmakerHomeScreen} />
      <MatchmakerTab.Screen name="Community" component={CommunityScreen} />
      <MatchmakerTab.Screen name="Profile" component={ProfileScreen} />
    </MatchmakerTab.Navigator>
  );
};

// Root Stack Navigator
export const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'dater' | 'matchmaker'>('dater');
  const navigationRef = React.useRef<any>(null);
  const authStateRef = React.useRef<boolean | null>(null);
  const pendingInviteCode = useRef<string | null>(null);
  const pendingClaimToken = useRef<string | null>(null);

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
    } else if (parsed.path?.startsWith('claim/')) {
        const token = parsed.path.replace('claim/', '');
        if (authStateRef.current && navigationRef.current) {
            navigationRef.current.navigate('MatchmakerClaim', { token });
        } else {
            pendingClaimToken.current = token;
        }
    }
  }, []);

  // Route to the correct screen when a push notification is tapped
  const handleNotificationNavigation = useCallback((data: Record<string, any>) => {
    const nav = navigationRef.current;
    if (!nav || !authStateRef.current) return;

    const screen = data?.screen as string | undefined;
    const type = data?.type as string | undefined;

    // Explicit screen routing (set in notification data payload)
    if (screen === 'Leaderboard') {
      nav.navigate('Leaderboard');
      return;
    }
    if (screen === 'SupportChat') {
      nav.navigate('SupportChat');
      return;
    }
    if (screen === 'Chat' && data?.matchId) {
      nav.navigate('Chat', { matchId: data.matchId });
      return;
    }
    if (screen === 'Chat') {
      nav.navigate('MainTabs', { screen: 'Matches' });
      return;
    }
    if (screen === 'Matches') {
      nav.navigate('MainTabs', { screen: 'Matches' });
      return;
    }
    if (screen === 'Community') {
      nav.navigate('MainTabs', { screen: 'Community' });
      return;
    }
    if (screen === 'Profile') {
      nav.navigate('MainTabs', { screen: 'Profile' });
      return;
    }

    // Fallback: route by notification type
    if (type === 'match' || type === 'pending_decision' || type === 'proposal_deciding' || type === 'match_expiring') {
      nav.navigate('MainTabs', { screen: 'Matches' });
      return;
    }
    if (type === 'message' || type === 'ghosting') {
      nav.navigate('MainTabs', { screen: 'Matches' });
      return;
    }
    if (type === 'ice_breaker') {
      if (data?.matchId) {
        nav.navigate('Chat', { matchId: data.matchId });
      } else {
        nav.navigate('MainTabs', { screen: 'Matches' });
      }
      return;
    }
    if (type === 'new_proposals' || type === 'vote_reminder' || type === 'streak_at_risk' || type === 'shared_celebration' || type === 'dormant') {
      nav.navigate('MainTabs', { screen: 'Community' });
      return;
    }
    if (type === 'weekly_summary' || type === 'leaderboard' || type === 'morning_leaderboard') {
      nav.navigate('Leaderboard');
      return;
    }
    if (type === 'profile_incomplete') {
      nav.navigate('MainTabs', { screen: 'Profile' });
      return;
    }

    // Default — just open the app (no extra navigation)
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

  // Route to the correct screen when a push notification is tapped
  useEffect(() => {
    let responseSubscription: { remove(): void } | undefined;

    import('expo-notifications').then((Notifications) => {
      // Handle taps on notifications that arrive while app is running
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data || {};
        handleNotificationNavigation(data);
      });

      // Handle the case where the app was opened from a killed state by a notification tap
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          const data = response.notification.request.content.data || {};
          setTimeout(() => handleNotificationNavigation(data), 500);
        }
      });
    });

    return () => responseSubscription?.remove();
  }, [handleNotificationNavigation]);

  // Process pending invite or claim once authenticated
  useEffect(() => {
    if (isAuthenticated && navigationRef.current) {
      if (pendingInviteCode.current) {
        const code = pendingInviteCode.current;
        pendingInviteCode.current = null;
        setTimeout(() => {
          navigationRef.current?.navigate('ContactInvite', { autoAddCode: code });
        }, 800);
      } else if (pendingClaimToken.current) {
        const token = pendingClaimToken.current;
        pendingClaimToken.current = null;
        setTimeout(() => {
          navigationRef.current?.navigate('MatchmakerClaim', { token });
        }, 800);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    authStateRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    // Use ref object instead of closure variable to avoid staleness in async callbacks
    const isMountedRef = { current: true };

    // Check for existing Supabase session on app start.
    // Strategy: confirm auth + lightweight suspension check → render MainTabs ASAP,
    // then fetch full profile in background so screens have data when needed.
    const initializeAuth = async () => {
      try {
        if (FEATURES.DEVELOPMENT_FORCE_FRESH_SESSION) {
          await supabase.auth.signOut();
        }

        // Read cached session from AsyncStorage (no network call) for fast startup.
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

          // Lightweight status check (suspension + role) — unblocks navigation fast
          const status = await checkMinimalProfileStatus();
          if (!isMountedRef.current) return;
          setIsSuspended(status.isSuspended);
          setSuspensionReason(status.reason);
          setUserRole(status.role);

          // Render MainTabs or MatchmakerHome NOW — don't wait for full profile
          setIsAuthenticated(true);

          // Full profile fetch runs in background — populates cache for screens
          fetchAndSetUserProfile(user.id).then(profileResult => {
            if (!profileResult.ok && profileResult.error?.code !== 'PROFILE_NOT_FOUND') {
              logger.warn('[AppNavigator] Could not load profile:', profileResult.error?.message);
            }
          });
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
        const { notificationService } = await import('../services/notificationService');
        await notificationService.registerForPushNotifications();
        cleanupNotifications = await notificationService.subscribeToRealtimeNotifications();

        // Run inactivity + profile completion checks on sign-in
        notificationService.scheduleAppOpenChecks();

        // Also run checks when app comes back to foreground
        appStateSubscription = AppState.addEventListener('change', async (nextState) => {
          if (nextState === 'active') {
            notificationService.scheduleAppOpenChecks();
            // Re-check suspension status on foreground
            try {
              const status = await checkMinimalProfileStatus();
              setIsSuspended(status.isSuspended);
              setSuspensionReason(status.reason);
              setUserRole(status.role);
            } catch {}
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
        // Development mock data creation removed — use real Supabase data
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

  // Show skeleton while checking auth — matches what CommunityScreen shows while loading,
  // so the transition is seamless instead of a gray spinner → nav bar flash → skeleton.
  if (isAuthenticated === null) {
    return <CommunitySkeleton />;
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
          initialRouteName={isAuthenticated ? (isSuspended ? 'Suspended' : (userRole === 'matchmaker' ? 'MatchmakerTabs' : 'MainTabs')) : 'Welcome'}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#F9FAFB' },
            gestureEnabled: true,
            ...slideWithFade,
          }}
        >
          {/* Auth Stack — fade transitions for state changes */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={fadeTransition} />
          <Stack.Screen name="Login" component={LoginScreen} options={fadeTransition} />
          <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} options={fadeTransition} />

          {/* Onboarding — fade in from auth flow */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ ...fadeTransition, gestureEnabled: false }} />

          {/* Main App — fade in from auth/onboarding */}
          <Stack.Screen name="MainTabs" component={MainTabs} options={fadeTransition} />

          {/* Matchmaker Experience */}
          <Stack.Screen name="MatchmakerTabs" component={MatchmakerTabs} options={fadeTransition} />
          <Stack.Screen name="MatchmakerHome" component={MatchmakerHomeScreen} options={fadeTransition} />
          <Stack.Screen name="MatchmakerGhostProfile" component={MatchmakerGhostProfileScreen} options={fadeTransition} />
          <Stack.Screen name="MatchmakerClaim" component={MatchmakerClaimScreen} options={fadeTransition} />

          {/* Community Screens */}
          <Stack.Screen name="FriendProposal" component={FriendProposalScreen} />

          {/* Match Screens */}
          {/* MatchReveal removed — dead screen, real flow uses MatchProposal */}
          <Stack.Screen name="MatchProposal" component={MatchProposalScreen} />
          <Stack.Screen name="ProposalProfile" component={ProfileMatchScreen} options={{ headerShown: false, ...modalSlideUp }} />

          {/* Chat — slides up as modal overlay */}
          <Stack.Screen name="Chat" component={ChatScreen} options={modalSlideUp} />

          {/* Profile & Settings */}
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="EditPhotos" component={EditPhotosScreen} />
          <Stack.Screen name="EditBasics" component={EditBasicsScreen} />
          <Stack.Screen name="EditAbout" component={EditAboutScreen} />
          <Stack.Screen name="EditInterests" component={EditInterestsScreen} />
          <Stack.Screen name="EditLifestyle" component={EditLifestyleScreen} />
          <Stack.Screen name="ProfilePreview" component={ProfileMatchScreen} options={{ headerShown: false, ...modalSlideUp }} />
          <Stack.Screen name="ProfileView" component={ProfileMatchScreen} options={{ headerShown: false, ...modalSlideUp }} />
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
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="BadgeManagement" component={BadgeManagementScreen} />

          {/* Friends */}
          <Stack.Screen name="ContactInvite" component={ContactInviteScreen} />

          {/* Suspension */}
          <Stack.Screen name="Suspended" component={SuspendedScreen} options={{ gestureEnabled: false }} />
        </Stack.Navigator>
        {/* Dev State Toggle - quick UI state switcher */}
        {FEATURES.ENABLE_DEV_STATE_TOGGLE && <LazyDevStateToggle />}
      </ErrorBoundary>
    </NavigationContainer>
  );
};