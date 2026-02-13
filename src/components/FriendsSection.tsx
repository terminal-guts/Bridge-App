import React, { useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { H2, Body } from './ui/Typography';
import { FriendCard } from './ui/FriendCard';
import { AddFriendModal } from './AddFriendModal';
import { EmptyState } from './ui/EmptyState';
import { lightHaptic, successHaptic } from '../utils/haptics';
import { shadows, gradients } from '../utils/shadows';
import { Ionicons } from '@expo/vector-icons';

interface FriendsSectionProps {
  friends: any[]; // Use any for now to support normalized friend objects
  onFriendPress: (friendId: string) => void;
  onAddFriend: (friendCode: string) => Promise<{ success: boolean; message: string }>;
  className?: string;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * FriendsSection Component
 *
 * Complete friends section with:
 * - Header with "Add Friend" and "Invite Friends" buttons
 * - Non-scrollable list showing up to 2 friends with "View All" button for more
 * - Empty state when no friends
 * - Add friend modal
 * - Invite friends flow using expo-sharing (cross-platform)
 */
export const FriendsSection: React.FC<FriendsSectionProps> = ({
  friends,
  onFriendPress,
  onAddFriend,
  className = '',
}) => {
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const handleInviteFriends = async () => {
    lightHaptic();

    // Mock invite link (replace with real invite link generation)
    const inviteLink = 'https://bridge.app/invite/ABC123';
    const message = `Join me on Bridge! ${inviteLink}`;

    try {
      // Check if sharing is available on this device
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device');
        return;
      }

      // Share using native share sheet (works consistently on iOS and Android)
      await Sharing.shareAsync(inviteLink, {
        dialogTitle: 'Invite friends to Bridge',
      });

      successHaptic();
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite link');
    }
  };

  return (
    <StyledView className={className}>
      {/* Header with Icon Buttons */}
      <StyledView className="flex-row items-center justify-between mb-3 px-4">
        <H2 className="text-lg font-bold" style={{ letterSpacing: -0.3 }}>Friends</H2>
        <StyledView className="flex-row items-center gap-3">
          {/* Add Friend Icon Button */}
          <StyledTouchableOpacity
            onPress={() => {
              lightHaptic();
              setShowAddFriendModal(true);
            }}
            activeOpacity={0.7}
            className="w-9 h-9 bg-neutral-100 rounded-full items-center justify-center active:scale-95"
          >
            <Ionicons name="person-add" size={18} color="#437FFF" />
          </StyledTouchableOpacity>

          {/* Invite Friends Icon Button */}
          <StyledTouchableOpacity
            onPress={handleInviteFriends}
            activeOpacity={0.7}
            className="w-9 h-9 bg-primary-500 rounded-full items-center justify-center active:scale-95"
          >
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Friends List */}
      {friends.length === 0 ? (
        // Empty State - Compact with shadows
        <StyledView className="px-0">
          <StyledView
            style={[
              shadows.medium,
              { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
            ]}
          >
            {/* Top light shadow overlay */}
            <LinearGradient
              colors={gradients.cardShine.colors}
              start={gradients.cardShine.start}
              end={gradients.cardShine.end}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '100%',
                borderRadius: 12,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            <StyledView className="bg-neutral-50 rounded-xl py-2">
              <EmptyState
                icon={<Ionicons name="people-outline" size={40} color="#98A2B3" />}
                title="No friends yet"
                description="Invite friends and start matching together!"
                action={{
                  label: 'Invite Friends',
                  onPress: handleInviteFriends,
                }}
              />
            </StyledView>
          </StyledView>
        </StyledView>
      ) : (
        // Friend Cards (non-scrollable, show up to 2 with "View All" button)
        <StyledView className="px-4">
          {friends.slice(0, 2).map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onPress={() => onFriendPress(friend.id)}
            />
          ))}

          {/* View All Button - shown when more than 2 friends */}
          {friends.length > 2 && (
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                // TODO: Navigate to FriendList screen
                Alert.alert('Coming Soon', 'View all friends feature coming soon!');
              }}
              activeOpacity={0.7}
              className="mt-2 py-3 bg-white rounded-xl items-center justify-center"
              style={[
                shadows.small,
                {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                },
              ]}
            >
              <StyledView className="flex-row items-center">
                <Body className="text-primary-600 font-semibold mr-1">
                  View All {friends.length} Friends
                </Body>
                <Ionicons name="chevron-forward" size={16} color="#437FFF" />
              </StyledView>
            </StyledTouchableOpacity>
          )}
        </StyledView>
      )}

      {/* Add Friend Modal */}
      <AddFriendModal
        visible={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        onSubmit={onAddFriend}
      />
    </StyledView>
  );
};
