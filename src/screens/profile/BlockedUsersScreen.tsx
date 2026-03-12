import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { styled } from 'nativewind';
import { Body, Card, ScreenWrapper } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { getBlockedUsers, blockUser, unblockUser, BlockedUser as BlockedUserType } from '../../services/blockService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';
import { FONTS } from '../../constants/typography';
import { EvaIcon } from '../../components/icons';

const logger = createLogger('BlockedUsersScreen');

interface BlockedUsersScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

export const BlockedUsersScreen: React.FC<BlockedUsersScreenProps> = ({ navigation }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserType[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadBlockedUsers();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadBlockedUsers = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const result = await getBlockedUsers();
      if (result.ok && result.data) {
        setBlockedUsers(result.data);
      } else {
        logger.error('Failed to load blocked users:', result.error);
        Alert.alert('Error', result.error?.message || 'Failed to load blocked users');
      }
    } catch (error) {
      logger.error('Failed to load blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = (blockedUserId: string, userName: string) => {
    if (!currentUserId) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}? They will be able to see your profile and match with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await unblockUser(blockedUserId);
              if (result.ok) {
                setBlockedUsers(prev => prev.filter(u => u.blockedUserId !== blockedUserId));
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to unblock user');
              }
            } catch (error) {
              logger.error('Failed to unblock user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const handleBlockByEmail = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    Keyboard.dismiss();
    setBlocking(true);

    try {
      const { data: profile, error: findError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .eq('email', trimmed)
        .single();

      if (findError || !profile) {
        setBlocking(false);
        Alert.alert('Not Found', 'No Bridge account found with this email');
        return;
      }

      if (profile.user_id === currentUserId) {
        setBlocking(false);
        Alert.alert('Error', 'You cannot block yourself');
        return;
      }

      const userName = `${profile.first_name} ${profile.last_name}`;
      setBlocking(false);

      Alert.alert(
        'Block User',
        `Block ${userName}? They won't be able to see your profile or match with you.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              const result = await blockUser(profile.user_id);
              if (result.ok) {
                setEmailInput('');
                loadBlockedUsers();
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to block user');
              }
            },
          },
        ]
      );
    } catch (error) {
      setBlocking(false);
      logger.error('Failed to block by email:', error);
      Alert.alert('Error', 'Failed to block user');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <ScreenWrapper>

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <EvaIcon name="arrow-back" variant="outline" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <Body className="text-neutral-900 font-semibold text-lg">Blocked Users</Body>
      </StyledView>

      <StyledScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <StyledView className="px-4 py-4">

          {/* Block Input — primary action, right at the top */}
          <StyledView className="mb-5">
            <Body className="text-neutral-500 text-xs mb-2 ml-1">BLOCK SOMEONE BY EMAIL</Body>
            <StyledView className="flex-row items-center bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <StyledTextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="email@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleBlockByEmail}
                className="flex-1 px-4 py-3.5 text-neutral-900 text-sm"
                editable={!blocking}
              />
              <StyledTouchableOpacity
                onPress={handleBlockByEmail}
                disabled={!emailInput.trim() || blocking}
                className="px-4 py-3.5"
              >
                {blocking ? (
                  <ActivityIndicator size="small" color="#437FFF" />
                ) : (
                  <EvaIcon
                    name="arrow-circle-right"
                    variant="outline"
                    size={26}
                    color={emailInput.trim() ? '#437FFF' : '#D1D5DB'}
                  />
                )}
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Blocked Users List */}
          {loading ? (
            <StyledView className="items-center py-12">
              <ActivityIndicator size="large" color="#437FFF" />
            </StyledView>
          ) : blockedUsers.length > 0 ? (
            <>
              <Body className="text-neutral-400 text-xs mb-3 ml-1">
                {blockedUsers.length} BLOCKED
              </Body>

              {blockedUsers.map((user) => {
                const userName = user.blockedUserProfile
                  ? `${user.blockedUserProfile.firstName} ${user.blockedUserProfile.lastName || ''}`.trim()
                  : 'Unknown User';

                return (
                  <StyledView key={user.id} className="bg-white rounded-xl mb-2 px-4 py-3.5 flex-row items-center justify-between border border-neutral-100">
                    <StyledView className="flex-1 mr-3">
                      <Body className="text-neutral-900 font-semibold text-sm">
                        {userName}
                      </Body>
                      <Body className="text-neutral-400 text-xs mt-0.5">
                        {formatDate(user.blockedAt)}
                      </Body>
                    </StyledView>
                    <StyledTouchableOpacity
                      onPress={() => handleUnblock(user.blockedUserId, userName)}
                      className="border border-neutral-200 px-3.5 py-1.5 rounded-lg"
                    >
                      <Body className="text-neutral-600 font-medium text-xs">Unblock</Body>
                    </StyledTouchableOpacity>
                  </StyledView>
                );
              })}
            </>
          ) : null}

          {/* Info footer — compact, secondary */}
          {!loading && (
            <StyledView className="mt-6 px-2">
              <StyledView className="flex-row items-center mb-2">
                <EvaIcon name="info" variant="outline" size={15} color="#9CA3AF" />
                <Body className="text-neutral-400 text-xs ml-1.5 font-medium">What happens when you block someone</Body>
              </StyledView>
              <Body className="text-neutral-400 text-xs leading-5 ml-0.5">
                Active proposals and matches are cancelled. You won't appear in each other's proposals. Your friendship is removed.
              </Body>
            </StyledView>
          )}

        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};
