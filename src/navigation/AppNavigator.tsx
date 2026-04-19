import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UsersTabIcon, HandshakeTabIcon, ProfileTabIcon } from '../components/icons/Icons';
import { AppState, View, Text, TouchableOpacity, useWindowDimensions, LayoutChangeEvent, StyleSheet as RNStyleSheet, Animated as RNAnimated } from 'react-native';
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
import { COLORS } from '../theme/colors';

// ── All screens are lazy-loaded to minimize startup parsing ──

// ── Lazy-loaded screens (only evaluated when navigated to) ──────────────────
// Solid-color fallback prevents white flash / layout shift during lazy screen loads.
// Uses the app's default background to blend seamlessly with the card style.
const LAZY_FALLBACK_STYLE = { flex: 1, backgroundColor: COLORS.screenBackground } as const;
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
// WelcomeScreen import is fired at module-evaluation time (not inside the factory fn).
// This means it starts loading during the splash/auth-check phase — so by the time
// isAuthenticated resolves to false, the module is already parsed and ready.
// New users go: splash → Welcome screen (no CommunitySkeleton flash in between).
const _welcomePreload = import('../screens/auth/WelcomeScreen');
const WelcomeScreen = withSuspense(React.lazy(() => _welcomePreload.then(m => ({ default: m.WelcomeScreen }))));
const LoginScreen = withSuspense(React.lazy(() => import('../screens/auth/LoginScreen').then(m => ({ default: m.LoginScreen }))));
const EmailVerificationScreen = withSuspense(React.lazy(() => import('../screens/auth/EmailVerificationScreen').then(m => ({ default: m.EmailVerificationScreen }))));

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

// Friends sub-screens
const ContactInviteScreen = withSuspense(React.lazy(() => import('../screens/friends/ContactInviteScreen').then(m => ({ default: m.ContactInviteScreen }))));
// ChangePhoneNumberScreen removed — email-only auth

// Types
import { RootStackParamList, MainTabParamList, MatchmakerTabParamList } from '../types';
import { createLogger } from '../utils/secureLogger';
import { slideWithFade, modalSlideUp, fadeTransition } from '../utils/screenTransitions';

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
          stroke={COLORS.primaryAccent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringCircumference * (1 - profileStrength / 100)}
        />
      </Svg>
      <ProfileTabIcon size={iconSize} color={focused ? COLORS.primaryAccent : COLORS.navInactiveIcon} />
    </View>
  );
};

const CustomTabBar = ({ state, navigation, icons: iconsProp, targetIds: targetIdsProp }: any) => {
  const resolvedIcons = iconsProp ?? TAB_ICONS;
  const resolvedTargetIds = targetIdsProp ?? TAB_TARGET_IDS;
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeGuide, currentStep, nextStep } = useGuideContext();
  // Content height (above home indicator) scales with device.
  // Floor at 49pt — Apple's standard UITabBar height and minimum for reliable touch targets.
  // Only affects small devices (iPhone SE: 38pt → 49pt). Larger phones unchanged.
  const contentHeight = Math.max(Math.round(screenHeight * 0.057), 49);
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
  // Uses RN Animated (not Reanimated) so cleanup is synchronous and cannot
  // fire after the native view is destroyed during role-correction navigation.
  const tabWidth = screenWidth / state.routes.length;
  const indicatorX = useRef(new RNAnimated.Value(state.index * tabWidth + (tabWidth - 40) / 2)).current;

  useEffect(() => {
    RNAnimated.spring(indicatorX, {
      toValue: state.index * tabWidth + (tabWidth - 40) / 2,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  }, [state.index, tabWidth]);

  // Stop animation synchronously on unmount — guaranteed before native view destruction.
  useEffect(() => {
    return () => { indicatorX.stopAnimation(); };
  }, []);

  return (
    <View style={{
      flexDirection: 'row',
      height: contentHeight + insets.bottom,
      backgroundColor: COLORS.card,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingBottom: insets.bottom,
      shadowColor: '#4A3428',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 5,
    }}>
      {/* Sliding indicator — sits flush at the very top of the bar */}
      <RNAnimated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 3,
        backgroundColor: COLORS.primaryAccent,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        zIndex: 1,
        transform: [{ translateX: indicatorX }],
      }} />

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
                <Icon size={iconSize} color={focused ? COLORS.primaryAccent : COLORS.navInactiveIcon} />
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
export const AppNavigator = ({ onReady }: { onReady?: () => void }) => {
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
  const onReadyCalledRef = React.useRef(false);
  const pendingInviteCode = useRef<string | null>(null);
  const pendingNotificationData = useRef<Record<string, any> | null>(null);
  // pendingClaimToken removed — ghost profile claim flow deferred

  // Signal App.tsx that the navigator has a definitive auth state and the first
  // screen is ready to show. App.tsx holds the splash screen until this fires,
  // so new users go: native splash → Welcome screen (no skeleton flash between).
  // For new users (isAuthenticated === false): we wait for _welcomePreload so the
  // lazy component is already parsed before the splash hides — zero loading flash.
  // For returning users (isAuthenticated === true): signal immediately.
  useEffect(() => {
    if (isAuthenticated === null || onReadyCalledRef.current) return;
    onReadyCalledRef.current = true;
    if (isAuthenticated === false) {
      _welcomePreload.then(() => onReady?.()).catch(() => onReady?.());
    } else {
      onReady?.();
    }
  }, [isAuthenticated, onReady]);

  // Handle deep links: bridge://invite/BRIDGE-XXXX-XXXX
  const handleDeepLink = useCallback((url: string) => {
    try {
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
      // Ghost profile claim deep links deferred
    } catch (e) {
      logger.warn('[AppNavigator] Failed to parse deep link:', url);
    }
  }, []);

  // Route to the correct screen when a push notification is tapped.
  // If the user isn't authenticated yet, stash the payload so it can be
  // replayed once auth resolves (see the pending-notification effect below).
  const handleNotificationNavigation = useCallback((data: Record<string, any>) => {
    const nav = navigationRef.current;
    if (!nav || !authStateRef.current) {
      // Not ready — queue for replay after auth
      pendingNotificationData.current = data;
      return;
    }

    // Sanitize: only allow known string fields through to prevent injection
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const VALID_SCREENS = ['Community', 'Matches', 'Chat', 'Profile', 'Leaderboard', 'SupportChat'];
    const screen = typeof data?.screen === 'string' && VALID_SCREENS.includes(data.screen) ? data.screen : undefined;
    const type = typeof data?.type === 'string' ? data.type : undefined;
    const safeMatchId = typeof data?.matchId === 'string' && UUID_RE.test(data.matchId) ? data.matchId : undefined;

    // Role-aware tab navigator: matchmakers use MatchmakerTabs (no Matches tab)
    const isMatchmaker = getInMemoryMinimalStatus()?.role === 'matchmaker';
    const tabs = isMatchmaker ? 'MatchmakerTabs' : 'MainTabs';

    // Explicit screen routing (set in notification data payload)
    if (screen === 'Leaderboard') {
      nav.navigate('Leaderboard');
      return;
    }
    if (screen === 'SupportChat') {
      nav.navigate('SupportChat');
      return;
    }
    if (screen === 'Chat' && safeMatchId) {
      nav.navigate('Chat', { matchId: safeMatchId });
      return;
    }
    if (screen === 'Chat' || screen === 'Matches') {
      // Matchmakers have no Matches tab — route to Community instead
      nav.navigate(tabs, { screen: isMatchmaker ? 'Community' : 'Matches' });
      return;
    }
    if (screen === 'Community') {
      nav.navigate(tabs, { screen: 'Community' });
      return;
    }
    if (screen === 'Profile') {
      nav.navigate(tabs, { screen: 'Profile' });
      return;
    }

    // Fallback: route by notification type
    if (type === 'match' || type === 'pending_decision' || type === 'proposal_deciding' || type === 'match_expiring') {
      nav.navigate(tabs, { screen: isMatchmaker ? 'Community' : 'Matches' });
      return;
    }
    if (type === 'message' || type === 'ghosting') {
      // Only deep-link to Chat if we have a valid matchId; otherwise go to Matches list
      if (safeMatchId) {
        nav.navigate('Chat', { matchId: safeMatchId });
      } else {
        nav.navigate(tabs, { screen: isMatchmaker ? 'Community' : 'Matches' });
      }
      return;
    }
    if (type === 'ice_breaker') {
      if (safeMatchId) {
        nav.navigate('Chat', { matchId: safeMatchId });
      } else {
        nav.navigate(tabs, { screen: isMatchmaker ? 'Community' : 'Matches' });
      }
      return;
    }
    if (type === 'new_proposals' || type === 'vote_reminder' || type === 'streak_at_risk' || type === 'shared_celebration' || type === 'dormant') {
      nav.navigate(tabs, { screen: 'Community' });
      return;
    }
    if (type === 'weekly_summary' || type === 'leaderboard' || type === 'morning_leaderboard') {
      nav.navigate('Leaderboard');
      return;
    }
    if (type === 'profile_incomplete') {
      nav.navigate(tabs, { screen: 'Profile' });
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
    }).catch(() => {
      // getInitialURL can reject on some Android devices — non-critical
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

  // Process pending invite or notification once authenticated
  useEffect(() => {
    if (isAuthenticated && navigationRef.current) {
      if (pendingInviteCode.current) {
        const code = pendingInviteCode.current;
        pendingInviteCode.current = null;
        setTimeout(() => {
          navigationRef.current?.navigate('ContactInvite', { autoAddCode: code });
        }, 800);
      }
      // Replay any notification tap that arrived before auth was ready
      if (pendingNotificationData.current) {
        const data = pendingNotificationData.current;
        pendingNotificationData.current = null;
        setTimeout(() => handleNotificationNavigation(data), 800);
      }
    }
  }, [isAuthenticated, handleNotificationNavigation]);

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
                  navigationRef.current.reset({ index: 0, routes: [{ name: 'MatchmakerTabs' as never }] });
                }
              }
            });
            fetchAndSetUserProfile(session.user.id).then(async profileResult => {
              if (!isMountedRef.current) return;
              if (!profileResult.ok && profileResult.error?.code === 'PROFILE_NOT_FOUND') {
                // Retry once after 2s — transient errors shouldn't dump users into fresh onboarding
                logger.info('[AppNavigator] Profile not found, retrying in 2s...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (!isMountedRef.current) return;
                const retry = await fetchAndSetUserProfile(session.user.id);
                if (!isMountedRef.current) return;
                if (!retry.ok && retry.error?.code === 'PROFILE_NOT_FOUND') {
                  logger.info('[AppNavigator] No profile found after retry — resuming onboarding');
                  navigationRef.current?.reset({ index: 0, routes: [{ name: 'Onboarding' as any }] });
                }
              } else if (!profileResult.ok) {
                logger.warn('[AppNavigator] Could not load profile:', profileResult.error?.message);
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
                navigationRef.current.reset({ index: 0, routes: [{ name: 'MatchmakerTabs' as never }] });
              }
            }
          });

          fetchAndSetUserProfile(user.id).then(async profileResult => {
            if (!isMountedRef.current) return;
            if (!profileResult.ok && profileResult.error?.code === 'PROFILE_NOT_FOUND') {
              // Retry once after 2s — transient errors shouldn't dump users into fresh onboarding
              logger.info('[AppNavigator] Profile not found (slow path), retrying in 2s...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              if (!isMountedRef.current) return;
              const retry = await fetchAndSetUserProfile(user.id);
              if (!isMountedRef.current) return;
              if (!retry.ok && retry.error?.code === 'PROFILE_NOT_FOUND') {
                logger.info('[AppNavigator] No profile found after retry — resuming onboarding');
                navigationRef.current?.reset({ index: 0, routes: [{ name: 'Onboarding' as any }] });
              }
            } else if (!profileResult.ok) {
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

            // Check if the daily cycle boundary (7 PM Central) passed while
            // backgrounded. Resets stale vote counts and invalidates caches so
            // screens show fresh data instead of yesterday's state.
            try {
              const { communityBackendService } = await import('../services/communityBackendService');
              communityBackendService.checkForegroundStaleness();
            } catch {}

            // Validate session is still alive after returning from background.
            // autoRefreshToken handles normal expiry, but the refresh token itself
            // can expire (e.g. user backgrounds the app for days) or be revoked.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (!isMountedRef.current) return;
            if (sessionError || !session?.user) {
              logger.info('[AppNavigator] Foreground session check failed — signing out');
              clearCachedUserId();
              clearMinimalProfileStatusCache();
              setIsAuthenticated(false);
              showToast.error('Session Expired', 'Your session expired. Please sign in again.');
              if (navigationRef.current) {
                navigationRef.current.navigate('Welcome');
              }
              return;
            }

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
                  navigationRef.current.reset({ index: 0, routes: [{ name: 'MatchmakerTabs' as never }] });
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
        Sentry.setUser({ id: session.user.id, email: session.user.email });
        setupNotifications();
        // Development mock data creation removed — use real Supabase data
      } else if (event === 'TOKEN_REFRESHED' && !session) {
        // Auto-refresh failed (refresh token expired or revoked) — treat as sign-out
        logger.info('[AppNavigator] TOKEN_REFRESHED with null session — forcing sign-out');
        Sentry.setUser(null);
        clearCachedUserId();
        invalidateProfileCache();
        clearMinimalProfileStatusCache();
        setIsAuthenticated(false);
        showToast.error('Session Expired', 'Your session expired. Please sign in again.');
        if (navigationRef.current) {
          navigationRef.current.navigate('Welcome');
        }
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
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        if (__DEV__ && state) {
          const routeNames = JSON.stringify(state.routes.map((r: any) => r.name));
          console.log('[NAV_DEBUG] Root state routes:', routeNames);
        }
      }}
    >
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // Route through secureLogger so the sanitizer strips PII (route params
          // can contain matchId/userId). Also avoids leaking full nav state JSON
          // to native device logs in production.
          let routesAtCrash: string[] | undefined;
          try {
            const navState = navigationRef.current?.getState();
            routesAtCrash = navState?.routes?.map((r: any) => r.name);
          } catch {}
          logger.error('[App Error Boundary]', error, {
            routesAtCrash,
            componentStack: errorInfo.componentStack,
          });
          Sentry.captureException(error, {
            contexts: {
              react: { componentStack: errorInfo.componentStack },
              navigation: { routesAtCrash },
            },
          });
        }}
      >
        <Stack.Navigator
          initialRouteName={isAuthenticated ? (isSuspended ? 'Suspended' : (userRole === 'matchmaker' ? 'MatchmakerTabs' : 'MainTabs')) : 'Welcome'}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: COLORS.screenBackground },
            gestureEnabled: true,
            ...slideWithFade,
          }}
        >
          {/* Auth Stack — fade transitions for state changes */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={fadeTransition} />
          <Stack.Screen name="Login" component={LoginScreen} options={fadeTransition} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={fadeTransition} />

          {/* Onboarding — fade in from auth flow */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ ...fadeTransition, gestureEnabled: false }} />

          {/* Main App — fade in from auth/onboarding */}
          <Stack.Screen name="MainTabs" component={MainTabs} options={fadeTransition} />

          {/* Matchmaker Experience */}
          <Stack.Screen name="MatchmakerTabs" component={MatchmakerTabs} options={fadeTransition} />

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
      </ErrorBoundary>
    </NavigationContainer>
  );
};