import React from 'react';
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
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

// Keep the native splash screen visible until fonts are loaded.
// This avoids showing a blank screen or spinner during font loading —
// users see the designed splash image the entire time.
SplashScreen.preventAutoHideAsync();

const logger = createLogger('App');

const fontsPatchApplied = { current: false };

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Apply global font patch once fonts are loaded, then hide the splash screen
  React.useEffect(() => {
    if (fontsLoaded && !fontsPatchApplied.current) {
      require('./src/utils/setDefaultFonts');
      fontsPatchApplied.current = true;
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

  // Keep splash screen visible until fonts are ready
  if (!fontsLoaded) return null;

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
