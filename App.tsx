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
// Import useFonts from expo-font directly (not the @expo-google-fonts package root).
// The package root index.js has require() calls for all 16 font variants — importing
// from there causes Metro to bundle ~1.5MB of TTF files we never use. Importing
// useFonts directly and requiring only the 5 needed TTF files saves ~1MB of bundle assets.
import { useFonts } from 'expo-font';

// Keep the native splash screen visible until fonts are loaded.
// This avoids showing a blank screen or spinner during font loading —
// users see the designed splash image the entire time.
SplashScreen.preventAutoHideAsync();

const logger = createLogger('App');

const fontsPatchApplied = { current: false };

export default function App() {
  const [fontsLoaded] = useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlusJakartaSans_400Regular: require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlusJakartaSans_500Medium: require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlusJakartaSans_600SemiBold: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlusJakartaSans_700Bold: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlusJakartaSans_800ExtraBold: require('@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf'),
  });

  // Apply font patch immediately on first mount — fonts are embedded natively via the
  // expo-font plugin so they're already registered before JS starts. We don't need to
  // wait for useFonts() to confirm before patching Text defaults.
  React.useEffect(() => {
    if (!fontsPatchApplied.current) {
      require('./src/utils/setDefaultFonts');
      fontsPatchApplied.current = true;
    }
  }, []);

  // Hide splash screen once fonts are confirmed loaded
  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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

  // NOTE: We intentionally do NOT gate rendering on fontsLoaded here.
  // Fonts are embedded natively via the expo-font plugin so they're already registered
  // before JS starts. The splash screen stays visible until SplashScreen.hideAsync() fires
  // (which happens when fontsLoaded=true above), so users never see the pre-font frame.
  // Removing this gate lets AppNavigator mount and start its cache reads one frame earlier.

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <GuideProvider>
            <View style={{ flex: 1 }}>
              <AppNavigator />
              <GuideOverlay />
            </View>
            <Toast config={toastConfig} />
          </GuideProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
