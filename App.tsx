import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import { GuideProvider } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import { notificationService } from './src/services/notificationService';

export default function App() {
  React.useEffect(() => {
    // Initialize push notifications
    const setupNotifications = async () => {
      await notificationService.registerForPushNotifications();
    };

    setupNotifications();

    // Listen for incoming notifications while app is open
    const subscription = notificationService.addNotificationListener(notification => {
      console.log('[NOTIFICATION] Received:', notification.request.content.title);
    });

    // Listen for notification taps
    const responseSubscription = notificationService.addNotificationResponseListener(response => {
      console.log('[NOTIFICATION] Tapped:', response.notification.request.content.title);
      // Handle navigation or deep linking here
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
          <AppNavigator />
          <GuideOverlay />
          <Toast config={toastConfig} />
        </GuideProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
