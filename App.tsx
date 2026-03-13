import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/ToastConfig';
import { GuideProvider } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { createLogger } from './src/utils/secureLogger';
import { initSentry } from './src/lib/sentry';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { notificationService } from './src/services/notificationService';

initSentry();

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

  // Apply global font patch once fonts are loaded (in effect, not during render)
  React.useEffect(() => {
    if (fontsLoaded && !fontsPatchApplied.current) {
      require('./src/utils/setDefaultFonts');
      fontsPatchApplied.current = true;
    }
  }, [fontsLoaded]);

  React.useEffect(() => {
    // Push notification registration is handled in AppNavigator on SIGNED_IN.
    // Here we only set up listeners for incoming notifications while the app is open.
    const subscription = notificationService.addNotificationListener(notification => {
      logger.info('[NOTIFICATION] Received:', notification.request.content.title);
    });

    const responseSubscription = notificationService.addNotificationResponseListener(response => {
      logger.info('[NOTIFICATION] Tapped:', response.notification.request.content.title);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFAF7' }}>
        <ActivityIndicator size="large" color="#437FFF" />
      </View>
    );
  }

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
