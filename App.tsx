import React from 'react';
import { enableScreens, enableFreeze } from 'react-native-screens';

// Enable native screen optimizations before any component renders.
// enableScreens: uses native screen containers for stack navigators (faster transitions).
// enableFreeze: background screens stop rendering entirely while frozen — up to 70% faster navigation.
enableScreens(true);
enableFreeze(true);

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/ToastConfig';
import { GuideProvider, useGuideContext } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary, CardErrorBoundary } from './src/components/ui/ErrorBoundary';
import { createLogger } from './src/utils/secureLogger';
import { initSentry } from './src/lib/sentry';
// Side-effect import: patches Text/TextInput defaults before first render.
// ES import (not require) so Metro's inlineRequires can't defer it.
import './src/utils/setDefaultFonts';

/**
 * Wraps GuideOverlay with crash protection. Must be INSIDE GuideProvider
 * so it can access the context to permanently disable a crashing guide.
 *
 * When the guide crashes:
 * 1. CardErrorBoundary catches it → renders nothing (guide hidden)
 * 2. onError calls stopGuide() → clears isPlaying + marks guide as skipped in AsyncStorage
 * 3. Guide never restarts — not on this session, not on any future app open
 *
 * This prevents the infinite crash loop that bricked Boyan's app.
 */
const SafeGuideOverlay = () => {
  const { stopGuide } = useGuideContext();
  return (
    <CardErrorBoundary
      onError={(error) => {
        console.error('[App] GuideOverlay crashed — permanently disabling guide:', error.message);
        try { stopGuide(); } catch {} // Belt + suspenders: don't crash in the crash handler
      }}
      fallback={() => null}
    >
      <GuideOverlay />
    </CardErrorBoundary>
  );
};

/**
 * ToastWithOffsets — wraps react-native-toast-message with safe-area-aware
 * offsets so bottom toasts don't sit behind the tab bar on notched devices
 * and top toasts don't collide with the Dynamic Island / notch.
 *
 * Must render inside SafeAreaProvider (useSafeAreaInsets requirement).
 * bottomOffset of 60 covers the locked 49pt+ tab bar contentHeight plus a
 * small breathing margin; adjust if the tab bar ever changes height.
 */
const ToastWithOffsets = () => {
  const insets = useSafeAreaInsets();
  return (
    <Toast
      config={toastConfig}
      topOffset={insets.top + 8}
      bottomOffset={insets.bottom + 60}
    />
  );
};

// Keep the native splash screen visible until the navigator signals it is ready.
// Called at module level per Expo docs — must not be inside a component or hook.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Kick off Sentry init immediately — the dynamic import is already async and
// non-blocking, so the ~610KB module loads in parallel with the rest of module
// parsing. This widens the crash-capture window to include cold-start failures
// (auth bootstrap, font loading, splash handoff). Queued exceptions flush once
// the SDK is ready (see src/lib/sentry.ts).
initSentry().catch(() => {});

// Configure Google Sign-In before any auth checks.
// Wrapped in try-catch: app must load even if Google SDK fails.
import { configureGoogleSignIn } from './src/services/authService';
try { configureGoogleSignIn(); } catch (e) { console.warn('Google Sign-In config failed:', e); }

const logger = createLogger('App');

export default function App() {
  // useFonts removed: the expo-font config plugin in app.json embeds all five Plus Jakarta Sans
  // variants as native resources at build time. Fonts are registered before JS starts — no async
  // wait needed. Font.isLoaded('PlusJakartaSans_400Regular') returns true synchronously.
  // Removing useFonts eliminates one async round-trip from the startup critical path.

  // appReady is set by AppNavigator once it has a definitive auth state AND the
  // first screen's module is loaded. Hiding splash here (not on font load) means:
  //   - New users: splash → Welcome screen directly, no CommunitySkeleton flash
  //   - Returning users (warm start): AppNavigator signals ready immediately
  //   - Returning users (cold start): signals after fast AsyncStorage auth cache read
  const [appReady, setAppReady] = React.useState(false);
  React.useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  // Safety net: if AppNavigator.onReady never fires (deep-link crash, auth hang,
  // preload rejection before the inner catch), force-hide splash after 8s so the
  // user never sees a frozen brand screen. 8s is long enough that normal warm
  // starts complete well before firing, but short enough to avoid a hostile wait.
  React.useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Notification listeners are registered inside AppNavigator (which performs
  // the actual routing on tap). The previous duplicate listeners here only
  // logged titles — redundant with AppNavigator's handling — so they were
  // removed. `logger` remains in use by other call sites.

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <GuideProvider>
            <View style={{ flex: 1 }}>
              <AppNavigator onReady={() => setAppReady(true)} />
              <SafeGuideOverlay />
            </View>
            <ToastWithOffsets />
          </GuideProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
