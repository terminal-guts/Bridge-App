import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import { GuideProvider } from './src/contexts/GuideContext';
import { GuideOverlay } from './src/components/guides/GuideOverlay';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
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
