import React from 'react';
import { AppNavigator } from './Bridge-Version1/src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './Bridge-Version1/src/components/ToastConfig';
import { GuideProvider } from './Bridge-Version1/src/contexts/GuideContext';
import { GuideOverlay } from './Bridge-Version1/src/components/guides/GuideOverlay';

export default function App() {
  return (
    <GuideProvider>
      <AppNavigator />
      <GuideOverlay />
      <Toast config={toastConfig} />
    </GuideProvider>
  );
}
