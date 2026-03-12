/**
 * Offline Banner Component
 *
 * Displays a notification banner when the user is offline.
 * Can be used at the top of any screen to indicate network status.
 */

import React from 'react';
import { View, Animated } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon  } from '../../components/icons';
import { Body } from '.';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <StyledView className="bg-warning px-4 py-3 flex-row items-center">
      <EvaIcon name="wifi-off" size={20} color="#FFFFFF" />
      <Body className="text-white ml-2 font-medium text-sm">
        You're offline. Some features may not work.
      </Body>
    </StyledView>
  );
};

interface OfflineMessageProps {
  message?: string;
}

export const OfflineMessage: React.FC<OfflineMessageProps> = ({
  message = "No internet connection. Please check your network settings."
}) => {
  return (
    <StyledView className="flex-1 items-center justify-center px-6">
      <EvaIcon name="wifi-off-outline" size={80} color="#D0D5DD" />
      <Body className="text-neutral-700 text-center mt-4 text-base font-medium">
        You're Offline
      </Body>
      <Body className="text-neutral-500 text-center mt-2 text-sm">
        {message}
      </Body>
    </StyledView>
  );
};
