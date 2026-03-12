import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';
import { getBlockedUsers, blockUser, unblockUser, BlockedUser as BlockedUserType } from '../../services/blockService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('BlockedUsersScreen');

interface BlockedUsersScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

export const BlockedUsersScreen: React.FC<BlockedUsersScreenProps> = ({ navigation }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserType[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user and load blocked users
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
                // Remove from local state
                setBlockedUsers(prev => prev.filter(u => u.blockedUserId !== blockedUserId));
                Alert.alert('Success', `${userName} has been unblocked`);
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

    // Basic email validation
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      // Find user by email
      const { data: profile, error: findError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .eq('email', trimmed)
        .single();

      if (findError || !profile) {
        Alert.alert('Not Found', 'No Bridge account found with this email');
        return;
      }

      if (profile.user_id === currentUserId) {
        Alert.alert('Error', 'You cannot block yourself');
        return;
      }

      const userName = `${profile.first_name} ${profile.last_name}`;

      Alert.alert(
        'Block User',
        `Block ${userName}? They will not be able to see your profile or match with you.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              const result = await blockUser(profile.user_id);
              if (result.ok) {
                setEmailInput('');
                setShowAddBlock(false);
                Alert.alert('Success', `${userName} has been blocked`);
                loadBlockedUsers();
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to block user');
              }
            },
          },
        ]
      );
    } catch (error) {
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
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center justify-between">
        <StyledView className="flex-row items-center flex-1">
          <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <EvaIcon name="arrow-back" size={24} color="#101828" />
          </StyledTouchableOpacity>
          <H3>Blocked Users</H3>
        </StyledView>
        <StyledTouchableOpacity onPress={() => setShowAddBlock(!showAddBlock)}>
          <EvaIcon name={showAddBlock ? "close" : "add-circle"} size={24} color="#437FFF" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Info Card */}
          <Card className="mb-6 bg-primary-50 border border-primary-200">
            <StyledView className="flex-row items-start mb-3">
              <EvaIcon name="shield" size={20} color="#437FFF" />
              <Body className="text-primary-900 font-semibold text-sm ml-3">
                When you block a user:
              </Body>
            </StyledView>
            <StyledView className="space-y-2">
              <StyledView className="flex-row items-start">
                <StyledView className="w-1.5 h-1.5 bg-primary-700 rounded-full mt-1.5 mr-2" />
                <Body className="flex-1 text-primary-700 text-sm">
                  Any active proposal or match between you is cancelled
                </Body>
              </StyledView>
              <StyledView className="flex-row items-start">
                <StyledView className="w-1.5 h-1.5 bg-primary-700 rounded-full mt-1.5 mr-2" />
                <Body className="flex-1 text-primary-700 text-sm">
                  You'll never appear in each other's proposals
                </Body>
              </StyledView>
              <StyledView className="flex-row items-start">
                <StyledView className="w-1.5 h-1.5 bg-primary-700 rounded-full mt-1.5 mr-2" />
                <Body className="flex-1 text-primary-700 text-sm">
                  Your friendship is removed and you can't message each other
                </Body>
              </StyledView>
            </StyledView>
          </Card>

          {/* Add Block by Email */}
          {showAddBlock && (
            <Card className="mb-6">
              <H3 className="mb-3">Block by Email</H3>
              <Body className="text-neutral-600 text-sm mb-4">
                Enter an email address to block that user from Bridge
              </Body>
              <StyledTextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="user@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white border border-neutral-300 rounded-lg px-4 py-3 text-neutral-900 mb-3"
              />
              <Button onPress={handleBlockByEmail} variant="primary" fullWidth>
                Block User
              </Button>
            </Card>
          )}

          {/* Blocked Users List */}
          {loading ? (
            <Card className="bg-neutral-50 py-8">
              <StyledView className="items-center">
                <ActivityIndicator size="large" color="#437FFF" />
                <Body className="text-neutral-600 mt-3">Loading blocked users...</Body>
              </StyledView>
            </Card>
          ) : blockedUsers.length > 0 ? (
            <>
              <StyledView className="mb-3">
                <Body className="text-neutral-600 text-sm">
                  {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
                </Body>
              </StyledView>

              {blockedUsers.map((user) => {
                const userName = user.blockedUserProfile
                  ? `${user.blockedUserProfile.firstName} ${user.blockedUserProfile.lastName || ''}`.trim()
                  : 'Unknown User';

                return (
                  <Card key={user.id} className="mb-3">
                    <StyledView className="flex-row items-center justify-between">
                      <StyledView className="flex-1">
                        <Body className="text-neutral-900 font-semibold mb-1">
                          {userName}
                        </Body>
                        <StyledView className="flex-row items-center">
                          <EvaIcon name="calendar-outline" size={14} color="#667085" />
                          <Body className="text-neutral-500 text-xs ml-1">
                            Blocked {formatDate(user.blockedAt)}
                          </Body>
                        </StyledView>
                      </StyledView>
                      <StyledTouchableOpacity
                        onPress={() => handleUnblock(user.blockedUserId, userName)}
                        className="bg-neutral-100 px-4 py-2 rounded-lg"
                      >
                        <Body className="text-neutral-700 font-medium text-sm">Unblock</Body>
                      </StyledTouchableOpacity>
                    </StyledView>
                  </Card>
                );
              })}
            </>
          ) : (
            <Card className="bg-neutral-50 py-8">
              <StyledView className="items-center">
                <StyledView className="w-16 h-16 bg-neutral-100 rounded-full items-center justify-center mb-3">
                  <EvaIcon name="slash" size={28} color="#98A2B3" />
                </StyledView>
                <Body className="text-neutral-700 font-medium mb-1">No Blocked Users</Body>
                <Body className="text-neutral-500 text-sm text-center px-8">
                  You haven't blocked anyone yet. Blocked users won't be able to see your profile or match with you.
                </Body>
              </StyledView>
            </Card>
          )}
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};
