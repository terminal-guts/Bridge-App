import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Body, ScreenWrapper, BackHeader } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { getBlockedUsers, blockUser, unblockUser, BlockedUser as BlockedUserType } from '../../services/blockService';
import { getCurrentUser } from '../../services/authService';
import { findProfileByEmail } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { EvaIcon } from '../../components/icons';

const logger = createLogger('BlockedUsersScreen');

interface BlockedUsersScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

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
      const result = await getCurrentUser();
      if (result.ok && result.data) {
        setCurrentUserId(result.data.id);
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
      const profile = await findProfileByEmail(trimmed);

      if (!profile) {
        setBlocking(false);
        Alert.alert('Not Found', 'No Bridge account found with this email');
        return;
      }

      if (profile.userId === currentUserId) {
        setBlocking(false);
        Alert.alert('Error', 'You cannot block yourself');
        return;
      }

      const userName = `${profile.firstName} ${profile.lastName}`;
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
              const result = await blockUser(profile.userId);
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

      <BackHeader title="Blocked Users" />

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>

          {/* Block Input */}
          <View style={{ marginBottom: 20 }}>
            <Body style={{
              fontFamily: FONTS.medium,
              fontSize: FONT_SIZES.xs,
              lineHeight: LINE_HEIGHTS.xs,
              color: COLORS.text.secondary,
              marginBottom: 8,
              marginLeft: 4,
              letterSpacing: 0.5,
            }}>
              BLOCK SOMEONE BY EMAIL
            </Body>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: COLORS.borderNeutral,
              borderRadius: 12,
              overflow: 'hidden',
              ...SHADOWS.sm,
            }}>
              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="email@example.com"
                placeholderTextColor={COLORS.text.disabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleBlockByEmail}
                editable={!blocking}
                style={{
                  flex: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: FONTS.regular,
                  fontSize: FONT_SIZES.base,
                  lineHeight: LINE_HEIGHTS.base,
                  color: COLORS.text.primary,
                }}
              />
              <TouchableOpacity
                onPress={handleBlockByEmail}
                disabled={!emailInput.trim() || blocking}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                }}
              >
                {blocking ? (
                  <ActivityIndicator size="small" color={COLORS.primaryAccent} />
                ) : (
                  <EvaIcon
                    name="arrow-circle-right"
                    variant="outline"
                    size={26}
                    color={emailInput.trim() ? COLORS.primaryAccent : COLORS.borderGray}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Blocked Users List */}
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={COLORS.primaryAccent} />
            </View>
          ) : blockedUsers.length > 0 ? (
            <>
              <Body style={{
                fontFamily: FONTS.medium,
                fontSize: FONT_SIZES.xs,
                lineHeight: LINE_HEIGHTS.xs,
                color: COLORS.text.light,
                marginBottom: 12,
                marginLeft: 4,
                letterSpacing: 0.5,
              }}>
                {blockedUsers.length} BLOCKED
              </Body>

              {blockedUsers.map((user) => {
                const userName = user.blockedUserProfile
                  ? `${user.blockedUserProfile.firstName} ${user.blockedUserProfile.lastName || ''}`.trim()
                  : 'Unknown User';

                return (
                  <View key={user.id} style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 12,
                    marginBottom: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: COLORS.borderSubtle,
                    ...SHADOWS.sm,
                  }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Body style={{
                        fontFamily: FONTS.semiBold,
                        fontSize: FONT_SIZES.base,
                        lineHeight: LINE_HEIGHTS.base,
                        color: COLORS.text.heading,
                      }}>
                        {userName}
                      </Body>
                      <Body style={{
                        fontFamily: FONTS.regular,
                        fontSize: FONT_SIZES.xs,
                        lineHeight: LINE_HEIGHTS.xs,
                        color: COLORS.text.light,
                        marginTop: 2,
                      }}>
                        {formatDate(user.blockedAt)}
                      </Body>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnblock(user.blockedUserId, userName)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        paddingHorizontal: 14,
                        minHeight: 44,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: 8,
                      }}
                    >
                      <Body style={{
                        fontFamily: FONTS.medium,
                        fontSize: FONT_SIZES.sm,
                        lineHeight: LINE_HEIGHTS.sm,
                        color: COLORS.text.muted,
                      }}>
                        Unblock
                      </Body>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            /* Empty state */
            <View style={{
              alignItems: 'center',
              paddingVertical: 48,
              paddingHorizontal: 24,
            }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: COLORS.backgroundGray,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <EvaIcon name="shield-off" variant="outline" size={28} color={COLORS.text.light} />
              </View>
              <Body style={{
                fontFamily: FONTS.semiBold,
                fontSize: FONT_SIZES.xl,
                lineHeight: LINE_HEIGHTS.xl,
                color: COLORS.text.heading,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                No blocked users
              </Body>
              <Body style={{
                fontFamily: FONTS.regular,
                fontSize: FONT_SIZES.base,
                lineHeight: LINE_HEIGHTS.lg,
                color: COLORS.text.secondary,
                textAlign: 'center',
              }}>
                If you block someone, they will appear here. You can always unblock them later.
              </Body>
            </View>
          )}

          {/* Info footer */}
          {!loading && (
            <View style={{ marginTop: 24, paddingHorizontal: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <EvaIcon name="info" variant="outline" size={15} color={COLORS.text.disabled} />
                <Body style={{
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.xs,
                  lineHeight: LINE_HEIGHTS.xs,
                  color: COLORS.text.light,
                  marginLeft: 6,
                }}>
                  What happens when you block someone
                </Body>
              </View>
              <Body style={{
                fontFamily: FONTS.regular,
                fontSize: FONT_SIZES.xs,
                lineHeight: LINE_HEIGHTS.lg,
                color: COLORS.text.light,
                marginLeft: 2,
              }}>
                Active proposals and matches are cancelled. You won't appear in each other's proposals. Your friendship is removed.
              </Body>
            </View>
          )}

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};
