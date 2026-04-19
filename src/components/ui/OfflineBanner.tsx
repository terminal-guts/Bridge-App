/**
 * Offline Banner Component
 *
 * Displays a notification banner when the user is offline.
 * Can be used at the top of any screen to indicate network status.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { Body } from '.';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { errorHaptic } from '../../utils/haptics';
import { EvaIcon } from '../icons';
import { COLORS } from '../../theme/colors';

const StyledView = styled(View);

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    if (isOffline) {
      errorHaptic();
    }
  }, [isOffline]);

  if (!isOffline) {
    return null;
  }

  return (
    <StyledView
      className="px-4 py-3 flex-row items-center"
      style={{ backgroundColor: COLORS.amber }}
    >
      <EvaIcon name="wifi-off" variant="outline" size={20} color={COLORS.card} />
      <Body className="ml-2 font-medium text-sm" style={{ color: COLORS.card }}>
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
      <EvaIcon name="wifi-off" variant="outline" size={80} color={COLORS.text.disabled} />
      <Body className="text-center mt-4 text-base font-medium" style={{ color: COLORS.text.primary }}>
        You're Offline
      </Body>
      <Body className="text-center mt-2 text-sm" style={{ color: COLORS.text.secondary }}>
        {message}
      </Body>
    </StyledView>
  );
};
