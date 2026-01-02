import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { getBlockedUsers, blockUser, unblockUser, BlockedUser as BlockedUserType } from '../../services/blockService';
import { supabase } from '../../lib/supabase';

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
  const [phoneNumber, setPhoneNumber] = useState('');
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
      console.error('Failed to get current user:', error);
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
        console.error('Failed to load blocked users:', result.error);
        Alert.alert('Error', result.error?.message || 'Failed to load blocked users');
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
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
              console.error('Failed to unblock user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const handleBlockByPhone = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    // Validate and normalize phone number (US format)
    const cleaned = phoneNumber.replace(/\D/g, '');
    let normalizedPhone: string;

    if (cleaned.length === 10) {
      // 10-digit US number
      normalizedPhone = cleaned;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      // 11-digit with country code
      normalizedPhone = cleaned.substring(1);
    } else {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number (e.g., 555-123-4567)');
      return;
    }

    try {
      // Find user by normalized phone number
      const { data: profile, error: findError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .eq('phone_number', normalizedPhone)
        .single();

      if (findError || !profile) {
        Alert.alert('Not Found', 'No Bridge account found with this phone number');
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
                setPhoneNumber('');
                setShowAddBlock(false);
                Alert.alert('Success', `${userName} has been blocked`);
                // Reload blocked users list
                loadBlockedUsers();
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to block user');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to block by phone:', error);
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
            <Ionicons name="arrow-back" size={24} color="#101828" />
          </StyledTouchableOpacity>
          <H3>Blocked Users</H3>
        </StyledView>
        <StyledTouchableOpacity onPress={() => setShowAddBlock(!showAddBlock)}>
          <Ionicons name={showAddBlock ? "close" : "add-circle"} size={24} color="#437FFF" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Info Card */}
          <Card className="mb-6 bg-primary-50 border border-primary-200">
            <StyledView className="flex-row items-start mb-3">
              <Ionicons name="shield-checkmark" size={20} color="#437FFF" />
              <Body className="text-primary-900 font-semibold text-sm ml-3">
                When you block a user:
              </Body>
            </StyledView>
            <StyledView className="space-y-2">
              <StyledView className="flex-row items-start">
                <StyledView className="w-1.5 h-1.5 bg-primary-700 rounded-full mt-1.5 mr-2" />
                <Body className="flex-1 text-primary-700 text-sm">
                  Blocked users can't message you
                </Body>
              </StyledView>
              <StyledView className="flex-row items-start">
                <StyledView className="w-1.5 h-1.5 bg-primary-700 rounded-full mt-1.5 mr-2" />
                <Body className="flex-1 text-primary-700 text-sm">
                  You won't appear in each other's grids
                </Body>
              </StyledView>
              <StyledView className="flex-row items-start">
                <StyledView className="w-1.5 h-1.5 bg-primary-700 rounded-full mt-1.5 mr-2" />
                <Body className="flex-1 text-primary-700 text-sm">
                  You cannot match and cannot be friends
                </Body>
              </StyledView>
            </StyledView>
          </Card>

          {/* Add Block by Phone */}
          {showAddBlock && (
            <Card className="mb-6">
              <H3 className="mb-3">Block by Phone Number</H3>
              <Body className="text-neutral-600 text-sm mb-4">
                Enter a phone number to block that user from Bridge
              </Body>
              <StyledTextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                className="bg-white border border-neutral-300 rounded-lg px-4 py-3 text-neutral-900 mb-3"
              />
              <Button onPress={handleBlockByPhone} variant="primary" fullWidth>
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
                          <Ionicons name="calendar-outline" size={14} color="#667085" />
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
                  <Ionicons name="ban" size={28} color="#98A2B3" />
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
