import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UsersTabIcon, HandshakeTabIcon, ProfileTabIcon } from '../components/icons/Icons';
import { AppState, View, Text, TouchableOpacity, useWindowDimensions, LayoutChangeEvent, StyleSheet as RNStyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, cancelAnimation } from 'react-native-reanimated';
import { SPRINGS } from '../constants/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuideContext } from '../contexts/GuideContext';
import { GuideTarget } from '../components/guides/GuideTarget';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../config/features';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Sentry } from '../lib/sentry';
import { fetchAndSetUserProfile, invalidateProfileCache, checkMinimalProfileStatus, getCachedMinimalProfileStatus, clearMinimalProfileStatusCache, getUserProfile, getInMemoryMinimalStatus } from '../services/profileService';
import { calculateOverallProfileStrength } from '../utils/profileCompleteness';
import Svg, { Circle } from 'react-native-svg';
import { isIntentionalSignOut, resetIntentionalSignOut } from '../services/authService';
// expo-notifications is imported dynamically to defer 84KB from startup
import { setCachedUserId, clearCachedUserId } from '../utils/auth';
import { preloadCommunityCache } from '../services/communityCache';
import { showToast } from '../utils/toast';
import { selectionHaptic } from '../utils/haptics';
import { CommunitySkeleton } from '../components/ui/SkeletonLoader';

// ── All screens are lazy-loaded to minimize startup parsing ──

// ── Lazy-loaded screens (only evaluated when navigated to) ──────────────────
// Solid-color fallback prevents white flash / layout shift during lazy screen loads.
// Uses the app's default background (#F9FAFB) to blend seamlessly with the card style.
const LAZY_FALLBACK_STYLE = { flex: 1, backgroundColor: '#F9FAFB' } as const;
const LazyFallback = () => <View style={LAZY_FALLBACK_STYLE} />;

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
const SuggestMatchScreen = withSuspense(React.lazy(() => import('../screens/community/SuggestMatchScreen')));

// Auth sub-screens
const SuspendedScreen = withSuspense(React.lazy(() => import('../screens/auth/SuspendedScreen')));

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
const TAB_ICONS = [UsersTabIcon, HandshakeTabIcon, ProfileTabIcon];
const TAB_TARGET_IDS = ['tab-community', 'tab-matches', 'tab-profile'];

// Static (non-animated) SVG ring for profile completion.
//
// WHY NOT useAnimatedProps here:
// Reanimated 4.x runs useAnimatedProps worklets on the UI thread. When the
// enclosing tab navigator unmounts during stack navigation (e.g. stale 'dater'
// cache corrected to 'matchmaker'), those worklets can fire AFTER the native
// SVG view is already destroyed → "Cannot read property 'props' of undefined".
// cancelAnimation() in useEffect cleanup does not prevent this because the
// worklet frame is already scheduled on the UI thread before cleanup runs.
//
// The static approach sets strokeDashoffset directly from profileStrength state,
// which updates on React re-renders. The ring shows accurate completion; it just
// snaps to the new value instead of animating smoothly — an acceptable trade-off.
const ProfileRingIcon: React.FC<{
  profileStrength: number;
  iconSize: number;
  focused: boolean;
}> = ({ profileStrength, iconSize, focused }) => {
  const ringSize = iconSize + 8;
  const ringRadius = ringSize / 2 - 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
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
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={ringRadius}
          fill="none"
          stroke="#437FFF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringCircumference * (1 - profileStrength / 100)}
        />
      </Svg>
      <ProfileTabIcon size={iconSize} color={focused ? '#437FFF' : '#667085'} />
    </View>
  );
};

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
  const lastProfileFetchRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastProfileFetchRef.current < 30000) return;
    lastProfileFetchRef.current = now;
    getUserProfile().then(result => {
      if (result.ok && result.data) {
        if (result.data.role === 'matchmaker') {
          setProfileStrength(100);
          setProfileCompleted(true);
          return;
        }
        const strength = calculateOverallProfileStrength(result.data);
        const completed = result.data.profileCompleted ?? false;
        setProfileStrength(prev => prev !== strength ? strength : prev);
        setProfileCompleted(prev => prev !== completed ? completed : prev);
      }
    });
  }, [state.index]);

  // ── Animated indicator ────────────────────────────────────────────────────
  // Each tab is 1/3 of screen width; indicator centers within the active tab.
  const tabWidth = screenWidth / state.routes.length;
  const indicatorX = useSharedValue(state.index * tabWidth + (tabWidth - 40) / 2);

  // Cancel spring on unmount so Reanimated doesn't flush a stale frame to the
  // Animated.View after the tab bar is destroyed (defensive, mirrors the SVG ring fix).
  useEffect(() => {
    return () => {
      cancelAnimation(indicatorX);
    };
  }, []);

  useEffect(() => {
    indicatorX.value = withSpring(
      state.index * tabWidth + (tabWidth - 40) / 2,
      SPRINGS.responsive,
    );
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
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
        // Ring only shows on the Profile tab (index 2 in 3-tab MainTabs)
        // when the dater's profile is incomplete. Never shown in MatchmakerTabs
        // (only 2 tabs, so index never reaches 2).
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
                <ProfileRingIcon profileStrength={profileStrength} iconSize={iconSize} focused={focused} />
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

// Matchmaker icons — community, profile only
const MATCHMAKER_TAB_ICONS = [UsersTabIcon, ProfileTabIcon];
const MATCHMAKER_TAB_TARGET_IDS = ['tab-community', 'tab-profile'];

// Matchmaker Tab Navigator — Community + Profile only, no Matches or Hub tab
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
      <MatchmakerTab.Screen name="Community" component={CommunityScreen} />
      <MatchmakerTab.Screen name="Profile" component={ProfileScreen} />
    </MatchmakerTab.Navigator>
  );
};

// Root Stack Navigator
export const AppNavigator = () => {
  // ── EARLIEST POSSIBLE CACHE WARM ────────────────────────────────────────────
  // useRef initializer fires synchronously during render, BEFORE any useEffect.
  // We start both AsyncStorage reads immediately — in parallel — so that by the
  // time initializeAuth() awaits the result, both are already complete (or almost).
  // This also means CommunityScreen hits warm in-memory mirrors on first mount
  // instead of triggering a second round of AsyncStorage reads.
  const startupDataRef = useRef(
    Promise.all([
      getCachedMinimalProfileStatus(),
      preloadCommunityCache(),
    ] as const)
  );

  // Lazy initializers read the module-level in-memory mirror synchronously.
  // On a warm start (app backgrounded → foregrounded), inMemoryMinimalStatus is
  // already populated from the previous session → isAuthenticated starts as true
  // and NO skeleton is ever rendered. On a cold start the mirror is null and we
  // fall through to the async path in initializeAuth() as before.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    const warm = getInMemoryMinimalStatus();
    if (warm?.userId) {
      setCachedUserId(warm.userId); // enable instant service calls before useEffect fires
    }
    return warm?.userId ? true : null;
  });
  const [isSuspended, setIsSuspended] = useState(() => getInMemoryMinimalStatus()?.isSuspended ?? false);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(() => getInMemoryMinimalStatus()?.reason ?? null);
  const [userRole, setUserRole] = useState<'dater' | 'matchmaker'>(() => getInMemoryMinimalStatus()?.role ?? 'dater');
  const { stopGuide, isPlaying } = useGuideContext();
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
        // Validate token format: 8 alphanumeric chars (base-36 uppercase), e.g. "A1B2C3D4"
        if (!/^[A-Z0-9]{8}$/.test(token)) {
          console.warn('[DeepLink] claim token failed format validation:', token);
          return;
        }
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
    // Strategy: read the small cached status entry first (fast AsyncStorage read).
    // If it contains a userId, render the main UI IMMEDIATELY (optimistic auth) and
    // validate the Supabase session in the background — no skeleton flash for returning users.
    // If no userId is cached, fall back to the full getSession() path (new/signed-out users).
    const initializeAuth = async () => {
      try {
        if (FEATURES.DEVELOPMENT_FORCE_FRESH_SESSION) {
          await supabase.auth.signOut();
          // Also clear minimal status so optimistic path doesn't fire with stale userId
          clearMinimalProfileStatusCache();
        }

        // ── FAST PATH: optimistic auth from cached userId ─────────────────────────
        // Await the startupDataRef promise (started during render, before useEffect).
        // Both reads ran in parallel: getCachedMinimalProfileStatus() + preloadCommunityCache().
        // By the time we await here, they are likely already complete.
        // Community in-memory mirrors are now warm — CommunityScreen renders from cache.
        const [cachedStatus] = await startupDataRef.current;
        if (!isMountedRef.current) return;

        if (cachedStatus?.userId) {
          const userId = cachedStatus.userId;
          logger.info('[AppNavigator] Optimistic auth — userId from cache:', userId);
          setCachedUserId(userId);
          setIsSuspended(cachedStatus.isSuspended);
          setSuspensionReason(cachedStatus.reason);
          setUserRole(cachedStatus.role);
          // Render main app immediately — no waiting for JWT validation
          setIsAuthenticated(true);

          // Network prefetches (community cache already warmed above)
          if (cachedStatus.role === 'dater') {
            import('../services/communityServiceIndex').then(({ communityService }) => {
              communityService.getCommunityTaskProgress().catch(() => {});
              communityService.getProposalsToVote().catch(() => {});
              communityService.getFriendsAreaData().catch(() => {});
            });
          }

          // Background: validate JWT. If expired/invalid, kick to login.
          supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!isMountedRef.current) return;
            if (error || !session?.user) {
              logger.info('[AppNavigator] Background session check failed — signing out');
              clearCachedUserId();
              clearMinimalProfileStatusCache();
              setIsAuthenticated(false);
              showToast.error('Session expired. Please sign in again.');
              return;
            }
            // Session valid — verify status and load full profile in background
            checkMinimalProfileStatus().then(freshStatus => {
              if (!isMountedRef.current) return;
              if (freshStatus.isSuspended !== cachedStatus.isSuspended) setIsSuspended(freshStatus.isSuspended);
              if (freshStatus.reason !== cachedStatus.reason) setSuspensionReason(freshStatus.reason);
              if (freshStatus.role !== cachedStatus.role) {
                setUserRole(freshStatus.role);
                if (freshStatus.role === 'matchmaker' && navigationRef.current) {
                  if (isPlaying) stopGuide();
                  navigationRef.current.navigate('MatchmakerTabs' as never);
                }
              }
            });
            fetchAndSetUserProfile(session.user.id).then(profileResult => {
              if (!isMountedRef.current) return;
              if (!profileResult.ok) {
                if (profileResult.error?.code === 'PROFILE_NOT_FOUND') {
                  logger.info('[AppNavigator] No profile found — resuming onboarding');
                  navigationRef.current?.reset({ index: 0, routes: [{ name: 'Onboarding' as any }] });
                } else {
                  logger.warn('[AppNavigator] Could not load profile:', profileResult.error?.message);
                }
              }
            });
          });
          return;
        }

        // ── SLOW PATH: no cached userId (new user or explicit sign-out) ──────────
        // Must validate session synchronously before deciding what to show.
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMountedRef.current) return;

        if (error || !session?.user) {
          if (error) logger.info('Auth session check failed:', error.message);
          clearCachedUserId();
          setIsAuthenticated(false);
        } else {
          const user = session.user;
          setCachedUserId(user.id);
          logger.info('[AppNavigator] Authenticated user (slow path):', user.id);

          // Defaults — checkMinimalProfileStatus() will fill in real values in background
          // Community cache already warmed by startupDataRef (ran in parallel before this path)
          setIsSuspended(false);
          setSuspensionReason(null);
          setUserRole('dater');
          setIsAuthenticated(true);
          import('../services/communityServiceIndex').then(({ communityService }) => {
            communityService.getCommunityTaskProgress().catch(() => {});
            communityService.getProposalsToVote().catch(() => {});
            communityService.getFriendsAreaData().catch(() => {});
          });

          checkMinimalProfileStatus().then(freshStatus => {
            if (!isMountedRef.current) return;
            setIsSuspended(freshStatus.isSuspended);
            setSuspensionReason(freshStatus.reason);
            if (freshStatus.role !== 'dater') {
              setUserRole(freshStatus.role);
              if (freshStatus.role === 'matchmaker' && navigationRef.current) {
                if (isPlaying) stopGuide();
                navigationRef.current.navigate('MatchmakerTabs' as never);
              }
            }
          });

          fetchAndSetUserProfile(user.id).then(profileResult => {
            if (!isMountedRef.current) return;
            if (!profileResult.ok) {
              if (profileResult.error?.code === 'PROFILE_NOT_FOUND') {
                logger.info('[AppNavigator] No profile found — resuming onboarding');
                navigationRef.current?.reset({ index: 0, routes: [{ name: 'Onboarding' as any }] });
              } else {
                logger.warn('[AppNavigator] Could not load profile:', profileResult.error?.message);
              }
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
              if (status.role === 'matchmaker' && navigationRef.current) {
                const rootState = navigationRef.current.getState();
                const currentRootRoute = rootState?.routes?.[rootState.index ?? 0]?.name;
                if (currentRootRoute !== 'MatchmakerTabs') {
                  if (isPlaying) stopGuide();
                  navigationRef.current.navigate('MatchmakerTabs' as never);
                }
              }
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
        clearMinimalProfileStatusCache();
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
          <Stack.Screen name="SuggestMatch" component={SuggestMatchScreen} />
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