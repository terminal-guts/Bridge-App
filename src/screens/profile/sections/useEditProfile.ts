import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { UserProfile } from '../../../types';
import { getCurrentUser } from '../../../services/authService';
import { getUserProfile } from '../../../services/profileService';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('useEditProfile');

/**
 * Shared hook for section edit screens.
 * Loads the user's profile and provides a stable update function.
 */
export function useEditProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const originalProfileRef = useRef<string | null>(null);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const userResult = await getCurrentUser();
        if (!userResult.ok || !userResult.data) {
          Alert.alert('Error', 'User not authenticated');
          if (mounted) setLoading(false);
          return;
        }

        const profileResult = await getUserProfile();
        if (profileResult.ok && profileResult.data && mounted) {
          setProfile(profileResult.data);
          originalProfileRef.current = JSON.stringify(profileResult.data);
        } else if (mounted) {
          Alert.alert('Error', 'Failed to load profile');
        }
      } catch (error) {
        logger.error('Failed to load profile:', error);
        if (mounted) Alert.alert('Error', 'An unexpected error occurred');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, []);

  return {
    profile,
    setProfile,
    loading,
    updateProfile,
    originalProfileJson: originalProfileRef.current,
  };
}
