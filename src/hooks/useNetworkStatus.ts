/**
 * Network Status Hook
 *
 * Provides real-time network connectivity status and utilities
 * for handling offline scenarios gracefully.
 *
 * onReconnect: optional callback fired once when connectivity is restored
 * after being offline. Useful for re-fetching stale data on screens.
 */

import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
}

export const useNetworkStatus = (onReconnect?: () => void) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    type: null,
  });

  // Track whether we were previously offline so we can fire onReconnect
  const wasOfflineRef = useRef(false);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    // Get initial network state
    const getInitialState = async () => {
      const state = await NetInfo.fetch();
      const offline = state.isConnected === false || state.isInternetReachable === false;
      wasOfflineRef.current = offline;
      setNetworkStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    };

    getInitialState();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      const online = !offline && state.isConnected === true;

      // Fire reconnect callback when transitioning from offline to online
      if (wasOfflineRef.current && online && onReconnectRef.current) {
        onReconnectRef.current();
      }
      wasOfflineRef.current = offline;

      setNetworkStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  const isOffline = networkStatus.isConnected === false ||
                    networkStatus.isInternetReachable === false;

  return {
    ...networkStatus,
    isOffline,
    isOnline: !isOffline && networkStatus.isConnected === true,
  };
};
