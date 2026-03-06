import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/ToastConfig';
import { GuideProvider } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { createLogger } from './src/utils/secureLogger';

import { notificationService } from './src/services/notificationService';

const logger = createLogger('App');

export default function App() {
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

  return (
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
  );
}
