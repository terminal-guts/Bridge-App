import React, { useState, useEffect } from 'react';
import { View, ScrollView, Switch, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, BodySmall, Card, ScreenWrapper, BackHeader } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { getUserProfile, updateProfilePauseStatus } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';
import { FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';
import { showToast } from '../../utils/toast';

const logger = createLogger('PauseProfileScreen');

interface PauseProfileScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledSwitch = styled(Switch);

/** Reusable bullet row for the "what happens" lists */
const BulletRow = ({
  type,
  text,
}: {
  type: 'allowed' | 'blocked';
  text: string;
}) => {
  const isAllowed = type === 'allowed';
  return (
    <StyledView className="flex-row items-start" style={{ marginBottom: 12 }}>
      <StyledView
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: isAllowed ? 'rgba(52, 199, 89, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          marginTop: 1,
        }}
      >
        <EvaIcon
          name={isAllowed ? 'checkmark' : 'close'}
          variant="outline"
          size={12}
          color={isAllowed ? 'success' : 'error'}
        />
      </StyledView>
      <Body
        className="flex-1"
        style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.base }}
      >
        {text}
      </Body>
    </StyledView>
  );
};

export const PauseProfileScreen: React.FC<PauseProfileScreenProps> = ({ navigation }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadPauseStatus();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        showToast.error('Please log in to manage your profile');
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
      showToast.error('Could not load your account');
    }
  };

  const loadPauseStatus = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const result = await getUserProfile();
      if (result.ok && result.data) {
        setIsPaused(result.data.isPaused || false);
      } else {
        logger.error('Failed to load profile:', result.error);
        showToast.error('Could not load pause status');
      }
    } catch (error) {
      logger.error('Failed to load pause status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!currentUserId) {
      showToast.error('Please log in to manage your profile');
      return;
    }

    if (isPaused) {
      // Resuming — no confirmation needed
      setSaving(true);
      try {
        const result = await updateProfilePauseStatus(false);
        if (result.ok) {
          setIsPaused(false);
          showToast.success('Welcome back! Your profile is active again.');
        } else {
          showToast.error(result.error?.message || 'Could not resume your profile');
        }
      } catch (error: any) {
        showToast.error('Something went wrong. Please try again.');
        logger.error('Failed to resume profile:', error);
      } finally {
        setSaving(false);
      }
    } else {
      // Pausing — destructive confirmation is appropriate here
      Alert.alert(
        'Take a break?',
        'You won\'t receive new matches while paused. Your existing matches and conversations stay right where they are.',
        [
          { text: 'Never mind', style: 'cancel' },
          {
            text: 'Pause',
            style: 'destructive',
            onPress: async () => {
              setSaving(true);
              try {
                const result = await updateProfilePauseStatus(true);
                if (result.ok) {
                  setIsPaused(true);
                  showToast.info('Profile paused. Resume anytime from Settings.');
                } else {
                  showToast.error(result.error?.message || 'Could not pause your profile');
                }
              } catch (error: any) {
                showToast.error('Something went wrong. Please try again.');
                logger.error('Failed to pause profile:', error);
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <BackHeader title="Pause Profile" />

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {loading ? (
            <StyledView className="flex-1 items-center justify-center py-20">
              <EvaIcon name="pause-circle" variant="outline" size={32} color="secondary" />
              <Body className="mt-4" style={{ color: COLORS.text.secondary }}>
                Loading pause status...
              </Body>
            </StyledView>
          ) : (
            <>
              {/* Status Card */}
              <Card
                className="mb-6 border"
                style={{
                  backgroundColor: isPaused ? 'rgba(245, 158, 11, 0.08)' : 'rgba(52, 199, 89, 0.08)',
                  borderColor: isPaused
                    ? COLORS.amber + '4D' // 30% opacity
                    : COLORS.success + '4D',
                }}
              >
                <StyledView className="flex-row items-center justify-between">
                  <StyledView className="flex-1 mr-4">
                    <StyledView className="flex-row items-center mb-2">
                      <EvaIcon
                        name={isPaused ? 'pause-circle' : 'checkmark-circle-2'}
                        variant="outline"
                        size={24}
                        color={isPaused ? 'warning' : 'success'}
                      />
                      <H3 className="ml-2">
                        {isPaused ? 'Profile Paused' : 'Profile Active'}
                      </H3>
                    </StyledView>
                    <BodySmall style={{ color: COLORS.text.secondary }}>
                      {isPaused
                        ? 'You\'re taking a break from Bridge'
                        : 'You\'re in the matching pool and visible to friends'}
                    </BodySmall>
                  </StyledView>
                  <StyledSwitch
                    value={isPaused}
                    onValueChange={handleTogglePause}
                    disabled={saving}
                    trackColor={{
                      false: COLORS.success,
                      true: COLORS.amber,
                    }}
                    thumbColor="white"
                    ios_backgroundColor={COLORS.success}
                  />
                </StyledView>
              </Card>

              {/* What Happens When Paused */}
              <Card className="mb-6">
                <H3 className="mb-4">While You're Paused</H3>
                <BulletRow
                  type="blocked"
                  text="No new matches or proposals will come your way"
                />
                <BulletRow
                  type="blocked"
                  text="Friends won't see you as a candidate to match"
                />
                <BulletRow
                  type="blocked"
                  text="You won't appear in anyone's proposal cycle"
                />
              </Card>

              {/* What Stays Active */}
              <Card className="mb-6">
                <H3 className="mb-4">What Stays the Same</H3>
                <BulletRow
                  type="allowed"
                  text="You can still vote on friends' proposals"
                />
                <BulletRow
                  type="allowed"
                  text="Your existing matches and chats stay put"
                />
                <BulletRow
                  type="allowed"
                  text="All your profile info is saved"
                />
                <BulletRow
                  type="allowed"
                  text="Resume anytime with one tap"
                />
              </Card>

              {/* Help Text */}
              <StyledView className="mt-4 mb-8">
                <BodySmall
                  className="text-center"
                  style={{ color: COLORS.text.secondary }}
                >
                  Taking a break is totally fine. Come back whenever you're ready.
                </BodySmall>
              </StyledView>
            </>
          )}
        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};
