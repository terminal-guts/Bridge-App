import React from 'react';
import { enableScreens, enableFreeze } from 'react-native-screens';

// Enable native screen optimizations before any component renders.
// enableScreens: uses native screen containers for stack navigators (faster transitions).
// enableFreeze: background screens stop rendering entirely while frozen — up to 70% faster navigation.
enableScreens(true);
enableFreeze(true);

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, InteractionManager } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/ToastConfig';
import { GuideProvider, useGuideContext } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary, CardErrorBoundary } from './src/components/ui/ErrorBoundary';
import { createLogger } from './src/utils/secureLogger';

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

// Keep the native splash screen visible until the navigator signals it is ready.
// Called at module level per Expo docs — must not be inside a component or hook.
SplashScreen.preventAutoHideAsync();

// Apply font patch at module level — fonts are embedded natively via the expo-font
// config plugin in app.json, so they're registered before JS starts. Running the
// patch here (not in useEffect) ensures the very first React render already has
// the correct fontFamily mappings applied to Text and TextInput.
require('./src/utils/setDefaultFonts');

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
      SplashScreen.hide(); // synchronous; preferred over hideAsync per Expo docs
    }
  }, [appReady]);

  // Defer Sentry init until after the first frame renders — avoids blocking
  // the JS thread during startup with Sentry's SDK initialization (~610KB module).
  React.useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      import('./src/lib/sentry').then(({ initSentry }) => initSentry());
    });
    return () => handle.cancel();
  }, []);

  React.useEffect(() => {
    // Defer notification service import — expo-notifications (84KB) doesn't need to
    // load at startup. Listeners only matter once the app is mounted.
    let sub: { remove(): void } | undefined;
    let responseSub: { remove(): void } | undefined;
    import('./src/services/notificationService').then(({ notificationService }) => {
      sub = notificationService.addNotificationListener(notification => {
        logger.info('[NOTIFICATION] Received:', notification.request.content.title);
      });
      responseSub = notificationService.addNotificationResponseListener(response => {
        logger.info('[NOTIFICATION] Tapped:', response.notification.request.content.title);
      });
    });
    return () => {
      sub?.remove();
      responseSub?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <GuideProvider>
            <View style={{ flex: 1 }}>
              <AppNavigator onReady={() => setAppReady(true)} />
              <SafeGuideOverlay />
            </View>
            <Toast config={toastConfig} />
          </GuideProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
