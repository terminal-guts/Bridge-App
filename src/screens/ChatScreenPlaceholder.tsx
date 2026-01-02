/**
 * Chat Screen Placeholder
 *
 * Temporary placeholder for chat functionality.
 * Shows a friendly message that chat is coming soon.
 *
 * Used for:
 * - Friend chats
 * - Active match chats
 * - Community messaging
 */

import React from 'react';
import { View, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Body } from '../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface ChatScreenPlaceholderProps {
  navigation: NavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const ChatScreenPlaceholder: React.FC<ChatScreenPlaceholderProps> = ({ navigation, route }) => {
  const { recipientName, isFriendChat } = route.params || {};

  const chatType = isFriendChat ? 'friend' : 'match';
  const displayName = recipientName || 'them';

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="flex-row items-center px-4 py-3 border-b border-neutral-200">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={28} color="#1F2937" />
        </StyledTouchableOpacity>

        <StyledView className="flex-1">
          <Body className="text-lg font-semibold text-neutral-900">{displayName}</Body>
          <Body className="text-sm text-neutral-500">
            {isFriendChat ? 'Friend' : 'Active Match'}
          </Body>
        </StyledView>
      </StyledView>

      {/* Placeholder Content */}
      <StyledView className="flex-1 items-center justify-center px-8">
        <StyledView className="items-center mb-6">
          <StyledView
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: '#FFF0F0' }}
          >
            <Ionicons name="chatbubbles-outline" size={40} color="#FF6B6B" />
          </StyledView>

          <Body className="text-2xl font-bold text-neutral-900 mb-2 text-center">
            Chat Coming Soon! 💬
          </Body>

          <Body className="text-base text-neutral-600 text-center" style={{ lineHeight: 24 }}>
            You'll be able to chat with {displayName} once messaging is ready.
            {'\n\n'}
            We're building something special!
          </Body>
        </StyledView>

        {/* Info Box */}
        <StyledView
          className="w-full p-4 rounded-2xl"
          style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' }}
        >
          <StyledView className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" style={{ marginTop: 2 }} />
            <Body className="flex-1 ml-3 text-sm text-neutral-600" style={{ lineHeight: 20 }}>
              {isFriendChat
                ? 'Friend messaging will let you coordinate matches, share feedback, and stay connected.'
                : 'Match messaging will include icebreaker prompts, conversation starters, and smart suggestions to help you connect.'}
            </Body>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Bottom Button */}
      <StyledView className="px-4 pb-6">
        <StyledTouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-rose-500 rounded-2xl py-4 items-center justify-center"
          style={{
            shadowColor: '#FF6B6B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
          activeOpacity={0.8}
        >
          <Body className="text-white font-bold text-lg">
            Go Back
          </Body>
        </StyledTouchableOpacity>
      </StyledView>
    </StyledSafeAreaView>
  );
};

export default ChatScreenPlaceholder;
