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
import { GuideProvider } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { createLogger } from './src/utils/secureLogger';

// Keep the native splash screen visible until the navigator signals it is ready.
// Called at module level per Expo docs — must not be inside a component or hook.
SplashScreen.preventAutoHideAsync();

const logger = createLogger('App');

const fontsPatchApplied = { current: false };

export default function App() {
  // useFonts removed: the expo-font config plugin in app.json embeds all five Plus Jakarta Sans
  // variants as native resources at build time. Fonts are registered before JS starts — no async
  // wait needed. Font.isLoaded('PlusJakartaSans_400Regular') returns true synchronously.
  // Removing useFonts eliminates one async round-trip from the startup critical path.

  // Apply font patch immediately on first mount — fonts are embedded natively so they're
  // already registered before JS starts. No need to wait for any font loading.
  React.useEffect(() => {
    if (!fontsPatchApplied.current) {
      require('./src/utils/setDefaultFonts');
      fontsPatchApplied.current = true;
    }
  }, []);

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
              <GuideOverlay />
            </View>
            <Toast config={toastConfig} />
          </GuideProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
